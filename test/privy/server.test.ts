import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockVerify = vi.fn()
vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn().mockImplementation(() => ({ verifyAuthToken: mockVerify })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-app'
  process.env.PRIVY_APP_SECRET = 'test-secret'
})

import { verifyPrivyToken, maskDid } from '@/lib/privy/server'

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
