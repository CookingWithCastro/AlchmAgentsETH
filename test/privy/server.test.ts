import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockVerify = vi.fn()
const mockGetUser = vi.fn()
vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi
    .fn()
    .mockImplementation(() => ({ verifyAuthToken: mockVerify, getUser: mockGetUser })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-app'
  process.env.PRIVY_APP_SECRET = 'test-secret'
})

import { verifyPrivyToken, getPrivyWallet, maskDid } from '@/lib/privy/server'

describe('verifyPrivyToken', () => {
  it('returns the Privy DID for a valid token', async () => {
    mockVerify.mockResolvedValue({ userId: 'did:privy:abc123def456' })
    expect(await verifyPrivyToken('valid-token')).toEqual({ did: 'did:privy:abc123def456' })
  })

  it('returns null for an invalid/expired token', async () => {
    mockVerify.mockRejectedValue(new Error('invalid token'))
    expect(await verifyPrivyToken('bad-token')).toBeNull()
  })

  it('returns null (and never calls Privy) for an empty token', async () => {
    expect(await verifyPrivyToken('')).toBeNull()
    expect(mockVerify).not.toHaveBeenCalled()
  })
})

describe('maskDid', () => {
  it('masks all but the last 6 chars', () => {
    expect(maskDid('did:privy:abc123def456')).toBe('did:privy:••••def456')
  })
})

describe('getPrivyWallet', () => {
  it('returns the embedded EVM wallet address from linkedAccounts', async () => {
    mockGetUser.mockResolvedValue({
      linkedAccounts: [
        { type: 'email', address: 'a@b.com' },
        { type: 'wallet', walletClientType: 'privy', chainType: 'ethereum', address: '0xABC123' },
      ],
    })
    expect(await getPrivyWallet('did:privy:x')).toBe('0xABC123')
  })

  it('falls back to any wallet account when no embedded ethereum wallet', async () => {
    mockGetUser.mockResolvedValue({
      linkedAccounts: [{ type: 'wallet', walletClientType: 'metamask', address: '0xEXT' }],
    })
    expect(await getPrivyWallet('did:privy:x')).toBe('0xEXT')
  })

  it('returns null when there is no wallet', async () => {
    mockGetUser.mockResolvedValue({ linkedAccounts: [{ type: 'email', address: 'a@b.com' }] })
    expect(await getPrivyWallet('did:privy:x')).toBeNull()
  })

  it('returns null on error', async () => {
    mockGetUser.mockRejectedValue(new Error('not found'))
    expect(await getPrivyWallet('did:privy:x')).toBeNull()
  })
})
