/**
 * Server-side Privy verification. Privy is layered as a shared cross-site
 * IDENTITY (a Privy DID) on top of NextAuth — it is not the primary login.
 *
 * Lazily constructed so importing this module never throws when PRIVY_APP_SECRET
 * is unset (build/tests/unconfigured envs). A missing secret surfaces as a thrown
 * config error at call time (the route turns it into a clear 500); an invalid
 * token returns null (the route turns it into a 401).
 */

import { PrivyClient } from '@privy-io/server-auth'

let _client: PrivyClient | null = null

export function getPrivyClient(): PrivyClient {
  if (_client) return _client
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error(
      'NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET are required for server-side Privy verification'
    )
  }
  _client = new PrivyClient(appId, appSecret)
  return _client
}

export type VerifiedPrivyUser = { did: string }

/**
 * Verify a Privy access token. Returns the Privy DID, or null if the token is
 * invalid/expired. Throws if Privy isn't configured (missing app id/secret) so
 * the caller can distinguish "not configured" (500) from "bad token" (401).
 */
export async function verifyPrivyToken(accessToken: string): Promise<VerifiedPrivyUser | null> {
  if (!accessToken) return null
  const client = getPrivyClient() // throws if unconfigured — let it propagate
  try {
    const claims = await client.verifyAuthToken(accessToken)
    return { did: claims.userId }
  } catch (err) {
    console.warn('[privy] token verification failed:', err)
    return null
  }
}

/**
 * Resolve the user's embedded EVM (Privy) wallet address from their DID — server
 * authoritative (don't trust a client-sent address). Returns null if none / on error.
 */
export async function getPrivyWallet(did: string): Promise<string | null> {
  try {
    const user = await getPrivyClient().getUser(did)
    const accounts = ((user as { linkedAccounts?: any[] }).linkedAccounts || []) as any[]
    const embedded = accounts.find(
      a => a?.type === 'wallet' && a?.walletClientType === 'privy' && a?.chainType === 'ethereum'
    )
    const anyWallet = accounts.find(a => a?.type === 'wallet')
    return embedded?.address ?? anyWallet?.address ?? null
  } catch (err) {
    console.warn('[privy] getPrivyWallet failed:', err)
    return null
  }
}

/** Mask a DID for display: did:privy:••••<last6>. */
export function maskDid(did: string): string {
  return `did:privy:••••${did.slice(-6)}`
}
