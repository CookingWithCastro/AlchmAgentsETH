import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { users: { findUnique: vi.fn() } } }))
vi.mock('@/lib/shop/entitlement', () => ({
  hasUnlock: vi.fn(),
  grantPurchase: vi.fn(),
  listUnlocks: vi.fn(),
}))
vi.mock('@/lib/esms-chain/contract', () => ({
  buildRedeemAuthChallenge: vi.fn(),
  esmsOnchainConfigured: vi.fn(),
  readEsmsBalances: vi.fn(),
  readEsmsRedeemed: vi.fn(),
}))
vi.mock('@/lib/esms-chain/redeemer', () => ({
  redeemEsmsFor: vi.fn(),
  redeemerConfigured: vi.fn(),
  toOnchainAmounts: vi.fn(),
  verifyRedeem: vi.fn(),
}))

import { POST } from '@/app/api/shop/purchase/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasUnlock, grantPurchase } from '@/lib/shop/entitlement'
import {
  buildRedeemAuthChallenge,
  esmsOnchainConfigured,
  readEsmsBalances,
  readEsmsRedeemed,
} from '@/lib/esms-chain/contract'
import {
  redeemEsmsFor,
  redeemerConfigured,
  toOnchainAmounts,
  verifyRedeem,
} from '@/lib/esms-chain/redeemer'

const e18 = (n: number) => BigInt(n) * 10n ** 18n
const FULL = { spirit: e18(100), essence: e18(100), matter: e18(100), substance: e18(100) }
const TXHASH = `0x${'a'.repeat(64)}`

const req = (body: unknown) =>
  new Request('http://localhost/api/shop/purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any

const authed = () => (auth as any).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } })

beforeEach(() => {
  vi.clearAllMocks()
  authed()
  ;(prisma.users.findUnique as any).mockResolvedValue({ walletAddress: `0x${'b'.repeat(40)}` })
  ;(esmsOnchainConfigured as any).mockReturnValue(true)
  ;(readEsmsRedeemed as any).mockResolvedValue(false)
  ;(readEsmsBalances as any).mockResolvedValue(FULL)
  ;(redeemerConfigured as any).mockReturnValue(true)
  ;(redeemEsmsFor as any).mockResolvedValue(TXHASH)
  ;(toOnchainAmounts as any).mockImplementation((amounts: any) => amounts)
  ;(buildRedeemAuthChallenge as any).mockReturnValue({
    domain: { name: 'EsmsToken' },
    types: {},
    primaryType: 'RedeemAuthorization',
    message: {},
  })
  ;(verifyRedeem as any).mockResolvedValue(true)
  ;(hasUnlock as any).mockResolvedValue(false)
  ;(grantPurchase as any).mockResolvedValue(true)
})

describe('POST /api/shop/purchase', () => {
  it('401 when unauthenticated', async () => {
    ;(auth as any).mockResolvedValue(null)
    expect((await POST(req({ itemId: 'unlock-philosophers-stone' }))).status).toBe(401)
  })

  it('404 for an unknown item', async () => {
    expect((await POST(req({ itemId: 'nope' }))).status).toBe(404)
  })

  it('food items bridge to the kitchen (no burn)', async () => {
    const res = await POST(req({ itemId: 'food-elemental-tasting' }))
    const data = await res.json()
    expect(data.mode).toBe('bridge')
    expect(data.url).toContain('/restaurants')
    expect(redeemEsmsFor).not.toHaveBeenCalled()
  })

  it('routes USDC/Card buyers of digital goods to the token store', async () => {
    const res = await POST(req({ itemId: 'unlock-philosophers-stone', payWith: 'card' }))
    const data = await res.json()
    expect(data.mode).toBe('topup')
    expect(data.url).toContain('/upgrade')
    expect(redeemEsmsFor).not.toHaveBeenCalled()
  })

  it('already-owned unlock is an idempotent success without a burn', async () => {
    ;(hasUnlock as any).mockResolvedValue(true)
    const res = await POST(req({ itemId: 'unlock-philosophers-stone' }))
    const data = await res.json()
    expect(data).toMatchObject({ ok: true, alreadyOwned: true })
    expect(redeemEsmsFor).not.toHaveBeenCalled()
  })

  it('503 when the on-chain contract is not configured', async () => {
    ;(esmsOnchainConfigured as any).mockReturnValue(false)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe('onchain_unconfigured')
  })

  it('400 when the buyer has no wallet linked', async () => {
    ;(prisma.users.findUnique as any).mockResolvedValue({ walletAddress: null })
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('no_wallet')
  })

  it('400 when a repeatable item is purchased without a nonce', async () => {
    const res = await POST(req({ itemId: 'elixir-mercury-retrograde' }))
    expect(res.status).toBe(400)
    expect(redeemEsmsFor).not.toHaveBeenCalled()
  })

  it('reconciles when the order already burned on-chain', async () => {
    ;(readEsmsRedeemed as any).mockResolvedValue(true)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    const data = await res.json()
    expect(data).toMatchObject({ ok: true, reconciled: true })
    expect(grantPurchase).toHaveBeenCalled()
    expect(redeemEsmsFor).not.toHaveBeenCalled()
  })

  it('402 with a shortfall when on-chain ESMS is insufficient', async () => {
    ;(readEsmsBalances as any).mockResolvedValue({
      spirit: 0n,
      essence: 0n,
      matter: 0n,
      substance: 0n,
    })
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    expect(res.status).toBe(402)
    const data = await res.json()
    expect(data.code).toBe('insufficient_esms')
    expect(data.shortfall.matter).toBeGreaterThan(0)
    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('sponsored burn without a signature returns an EIP-712 signing challenge', async () => {
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    const data = await res.json()
    expect(data.mode).toBe('sign')
    expect(data.challenge).toBeTruthy()
    expect(data.orderId).toBeTruthy()
    expect(data.deadline).toBeTruthy()
    expect(buildRedeemAuthChallenge).toHaveBeenCalledTimes(1)
    expect(redeemEsmsFor).not.toHaveBeenCalled()
    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('sponsored burn: redeems then grants once the buyer signs the challenge', async () => {
    const sig = `0x${'c'.repeat(130)}`
    const deadline = String(Math.floor(Date.now() / 1000) + 600)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise', signature: sig, deadline }))
    const data = await res.json()
    expect(data).toMatchObject({ ok: true, txHash: TXHASH })
    expect(redeemEsmsFor).toHaveBeenCalledTimes(1)
    expect((redeemEsmsFor as any).mock.calls[0][0]).toMatchObject({ sig })
    expect(grantPurchase).toHaveBeenCalledTimes(1)
  })

  it('sponsored burn: 400 when the signing window has expired', async () => {
    const sig = `0x${'c'.repeat(130)}`
    const deadline = String(Math.floor(Date.now() / 1000) - 10)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise', signature: sig, deadline }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('sig_expired')
    expect(redeemEsmsFor).not.toHaveBeenCalled()
    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('user-signed path: verifies the provided txHash, no sponsored burn', async () => {
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise', txHash: TXHASH }))
    const data = await res.json()
    expect(data).toMatchObject({ ok: true, txHash: TXHASH })
    expect(verifyRedeem).toHaveBeenCalledTimes(1)
    expect(redeemEsmsFor).not.toHaveBeenCalled()
    expect(grantPurchase).toHaveBeenCalledTimes(1)
  })

  it('user-signed path: 502 when the burn cannot be verified', async () => {
    ;(verifyRedeem as any).mockResolvedValue(false)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise', txHash: TXHASH }))
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('verify_failed')
    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('503 when no settlement wallet is configured for a sponsored burn', async () => {
    ;(redeemerConfigured as any).mockReturnValue(false)
    const res = await POST(req({ itemId: 'recipe-saturn-slow-braise' }))
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe('redeemer_unconfigured')
  })
})
