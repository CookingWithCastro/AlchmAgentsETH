import { beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to declare mock functions before mocks are evaluated
const {
  mockStripeCheckoutCreate,
  mockStripePortalCreate,
  mockStripeConstructEvent,
  mockStripeRetrieveSubscription,
  mockUserSubscriptionFindUnique,
  mockUserSubscriptionFindFirst,
  mockUserSubscriptionUpsert,
  mockUsersFindUnique,
  mockUsersUpdate,
  mockCreditTokens,
} = vi.hoisted(() => ({
  mockStripeCheckoutCreate: vi.fn(),
  mockStripePortalCreate: vi.fn(),
  mockStripeConstructEvent: vi.fn(),
  mockStripeRetrieveSubscription: vi.fn(),
  mockUserSubscriptionFindUnique: vi.fn(),
  mockUserSubscriptionFindFirst: vi.fn(),
  mockUserSubscriptionUpsert: vi.fn(),
  mockUsersFindUnique: vi.fn(),
  mockUsersUpdate: vi.fn(),
  mockCreditTokens: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeCheckoutCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockStripePortalCreate,
      },
    },
    webhooks: {
      constructEvent: mockStripeConstructEvent,
    },
    subscriptions: {
      retrieve: mockStripeRetrieveSubscription,
    },
  })),
  planForPrice: vi.fn().mockImplementation((priceId: string) => {
    if (priceId === 'price-monthly' || priceId === 'price-yearly') return 'alchemist'
    return null
  }),
  ALCHEMIST_PRICE_IDS: {
    monthly: 'price-monthly',
    yearly: 'price-yearly',
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    users: {
      findUnique: mockUsersFindUnique,
      update: mockUsersUpdate,
    },
    userSubscription: {
      findUnique: mockUserSubscriptionFindUnique,
      findFirst: mockUserSubscriptionFindFirst,
      upsert: mockUserSubscriptionUpsert,
    },
  },
}))

vi.mock('@/lib/services/economyService', () => ({
  EconomyService: {
    creditTokens: mockCreditTokens,
  },
}))

// Import actual code after mocks are set up
import { POST as checkoutPost } from '@/app/api/stripe/checkout/route'
import { POST as portalPost } from '@/app/api/stripe/portal/route'
import { POST as webhookPost } from '@/app/api/stripe/webhook/route'
import { auth } from '@/lib/auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'
})

describe('POST /api/stripe/checkout', () => {
  const mockReq = (body: any) => {
    return new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any
  }

  it('should return 401 when unauthorized', async () => {
    ;(auth as any).mockResolvedValue(null)
    const res = await checkoutPost(mockReq({ interval: 'monthly' }))
    expect(res.status).toBe(401)
  })

  it('should redirect to checkout URL on success', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-123', email: 'test@example.com' } })
    mockUserSubscriptionFindUnique.mockResolvedValue(null)
    mockStripeCheckoutCreate.mockResolvedValue({ url: 'https://stripe.checkout/session-123' })

    const res = await checkoutPost(mockReq({ interval: 'yearly' }))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.url).toBe('https://stripe.checkout/session-123')
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price-yearly', quantity: 1 }],
        client_reference_id: 'user-123',
      })
    )
  })
})

describe('POST /api/stripe/portal', () => {
  const mockReq = () => {
    return new Request('http://localhost/api/stripe/portal', {
      method: 'POST',
    }) as any
  }

  it('should return 401 when unauthorized', async () => {
    ;(auth as any).mockResolvedValue(null)
    const res = await portalPost(mockReq())
    expect(res.status).toBe(401)
  })

  it('should return 404 when no subscription exists for user', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-123' } })
    mockUserSubscriptionFindUnique.mockResolvedValue(null)

    const res = await portalPost(mockReq())
    expect(res.status).toBe(404)
  })

  it('should redirect to Stripe portal URL on success', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-123' } })
    mockUserSubscriptionFindUnique.mockResolvedValue({ stripeCustomerId: 'cus-123' })
    mockStripePortalCreate.mockResolvedValue({ url: 'https://stripe.portal/session-123' })

    const res = await portalPost(mockReq())
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.url).toBe('https://stripe.portal/session-123')
    expect(mockStripePortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus-123',
      })
    )
  })
})

describe('POST /api/stripe/webhook', () => {
  const mockReq = (body: string, sig: string) => {
    return new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': sig,
      },
      body,
    }) as any
  }

  it('should return 400 when signature is missing', async () => {
    const res = await webhookPost(
      new Request('http://localhost/api/stripe/webhook', { method: 'POST' }) as any
    )
    expect(res.status).toBe(400)
  })

  it('should return 400 when constructEvent throws error', async () => {
    mockStripeConstructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })
    const res = await webhookPost(mockReq('{}', 'invalid-sig'))
    expect(res.status).toBe(400)
  })

  it('should handle checkout.session.completed for subscription sync', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          subscription: 'sub-123',
          client_reference_id: 'user-123',
          metadata: { userId: 'user-123' },
        },
      },
    }
    mockStripeConstructEvent.mockReturnValue(event)
    mockStripeRetrieveSubscription.mockResolvedValue({
      id: 'sub-123',
      customer: 'cus-123',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [{ price: { id: 'price-monthly' } }],
      },
    })

    const res = await webhookPost(mockReq(JSON.stringify(event), 'valid-sig'))
    expect(res.status).toBe(200)
    expect(mockUserSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        create: expect.objectContaining({
          tier: 'alchemist',
          status: 'active',
        }),
      })
    )
  })

  it('should handle checkout.session.completed for token purchase', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          client_reference_id: 'user-123',
          metadata: {
            type: 'token_purchase',
            userId: 'user-123',
            spirit: '25',
            essence: '25',
            matter: '25',
            substance: '25',
          },
        },
      },
    }
    mockStripeConstructEvent.mockReturnValue(event)

    const res = await webhookPost(mockReq(JSON.stringify(event), 'valid-sig'))
    expect(res.status).toBe(200)
    expect(mockCreditTokens).toHaveBeenCalledWith(
      'user-123',
      { spirit: 25, essence: 25, matter: 25, substance: 25 },
      'token_purchase',
      'Cosmic Token Purchase (Stripe)',
      'cs_test_123'
    )
  })
})
