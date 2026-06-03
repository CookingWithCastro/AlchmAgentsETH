import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const mockStripeCreate = vi.fn()
vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
    },
  },
}))

import { POST as checkoutTokensPost } from '@/app/api/stripe/checkout-tokens/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/stripe/checkout-tokens', () => {
  const mockReq = (body: any) => {
    return new Request('http://localhost/api/stripe/checkout-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any
  }

  it('should return 401 when unauthorized', async () => {
    ;(auth as any).mockResolvedValue(null)
    const res = await checkoutTokensPost(mockReq({ tier: '10' }))
    expect(res.status).toBe(401)
  })

  it('should create a Stripe checkout session with one-time payment mode', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-123', email: 'test@example.com' } })
    ;(prisma.userSubscription.findUnique as any).mockResolvedValue({ stripeCustomerId: 'cus-123' })
    mockStripeCreate.mockResolvedValue({ url: 'https://stripe.checkout/session-abc' })

    const res = await checkoutTokensPost(mockReq({ tier: '10' }))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.url).toBe('https://stripe.checkout/session-abc')
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer: 'cus-123',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 1000,
              product_data: expect.objectContaining({
                name: '240 Cosmic ESMS Tokens',
              }),
            }),
          }),
        ],
        metadata: expect.objectContaining({
          userId: 'user-123',
          type: 'token_purchase',
          tokenCount: '240',
        }),
      })
    )
  })
})
