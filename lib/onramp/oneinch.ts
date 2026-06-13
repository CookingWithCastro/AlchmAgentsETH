/**
 * 1inch onramp — quote a swap of any token → USDC on **Base** (a 1inch-supported
 * chain), gasless via Fusion+. 1inch does NOT support Circle Arc, so the full path
 * is two legs: swap → USDC on Base (this file) → bridge Base→Arc via Circle CCTP V2
 * (see cctp.ts). Never pass Arc's chainId (5042002) to 1inch — it will reject it.
 *
 * Server-side only (uses ONEINCH_API_KEY). Always call via /api/onramp/quote so the
 * key never reaches the browser.
 */

const ONEINCH_BASE = process.env.ONEINCH_API_URL ?? 'https://api.1inch.dev'

export const BASE_CHAIN_ID = 8453
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
/** Arc is NOT a 1inch chain — bridge to it via CCTP (cctp.ts), don't pass to 1inch. */
export const ARC_CHAIN_ID = 5042002

function apiKey(): string {
  const k = process.env.ONEINCH_API_KEY
  if (!k) throw new Error('ONEINCH_API_KEY is not set')
  return k
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${apiKey()}`, accept: 'application/json' }
}

export interface FusionQuoteParams {
  srcChainId: number
  srcToken: string
  /** Amount in base units (string). */
  amount: string
  wallet: string
  dstChainId?: number
  dstToken?: string
}

export interface FusionQuote {
  quoteId?: string
  dstTokenAmount?: string
  recommendedPreset?: string
  presets?: Record<string, unknown>
  [k: string]: unknown
}

/** Fusion+ cross-chain quote → USDC on Base (gasless/intent-based for the user). */
export async function getFusionQuote(p: FusionQuoteParams): Promise<FusionQuote> {
  const qs = new URLSearchParams({
    srcChain: String(p.srcChainId),
    dstChain: String(p.dstChainId ?? BASE_CHAIN_ID),
    srcTokenAddress: p.srcToken,
    dstTokenAddress: p.dstToken ?? USDC_BASE,
    amount: p.amount,
    walletAddress: p.wallet,
    enableEstimate: 'true',
  })
  const res = await fetch(`${ONEINCH_BASE}/fusion-plus/quoter/v1.0/quote/receive?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok)
    throw new Error(`1inch fusion quote ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

/** Classic single-chain swap quote (user pays gas) — e.g. WETH→USDC on Base. */
export async function getClassicQuote(
  chainId: number,
  src: string,
  dst: string,
  amount: string
): Promise<{ dstAmount?: string; [k: string]: unknown }> {
  const qs = new URLSearchParams({ src, dst, amount })
  const res = await fetch(`${ONEINCH_BASE}/swap/v6.0/${chainId}/quote?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`1inch classic quote ${res.status}`)
  return res.json()
}
