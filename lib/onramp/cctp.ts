/**
 * Circle CCTP V2 — bridge USDC from Base (a 1inch chain) → Arc (leg 2 of the onramp).
 *
 * Flow:
 *   1. approve + depositForBurn(amount, destinationDomain=ARC, mintRecipient, USDC)
 *      on Base's TokenMessenger.
 *   2. Fetch the attestation for the burn from Circle's Iris API.
 *   3. receiveMessage(message, attestation) on Arc's MessageTransmitter → USDC minted.
 *
 * ⚠️ Arc's CCTP domain id is UNCONFIRMED — Circle's contract page showed 26, a
 * secondary source said 7. VERIFY against developers.circle.com/cctp before wiring;
 * a wrong domain silently misroutes funds. Set CCTP_ARC_DOMAIN to override.
 */

export const CCTP = {
  base: {
    domain: 6,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  arc: {
    domain: Number(process.env.CCTP_ARC_DOMAIN ?? 26), // ⚠️ confirm (26 vs 7)
    usdc: '0x3600000000000000000000000000000000000000',
  },
  /** Iris attestation service (testnet sandbox). */
  irisApi: process.env.CCTP_IRIS_API ?? 'https://iris-api-sandbox.circle.com',
} as const

/** Poll Circle's Iris API for a burn message's attestation (ready once status=complete). */
export async function fetchCctpAttestation(messageHash: string): Promise<string | null> {
  const res = await fetch(`${CCTP.irisApi}/attestations/${messageHash}`)
  if (!res.ok) return null
  const json = (await res.json()) as { status?: string; attestation?: string }
  return json.status === 'complete' ? (json.attestation ?? null) : null
}
