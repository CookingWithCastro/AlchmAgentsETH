import { loadAlchmSyncConfig } from './alchmSyncConfig'
import { TransactionSourceType } from './services/economyService'

/**
 * Syncs a token credit to the alchm.kitchen platform.
 * Used for cosmic yield claims and other rewards.
 */
export async function syncCreditToAlchm(params: {
  userEmail: string
  amounts: {
    spirit?: string
    essence?: string
    matter?: string
    substance?: string
  }
  source: TransactionSourceType | string
  idempotencyKey: string
  metadata?: {
    agentName?: string
    agentProfile?: {
      bio?: string | null
      monicaCreationStory?: string | null
      natalChart?: any
      natalPositions?: Array<{ planet: string; sign: string; degree: number }>
      dominantElement?: string
      monicaConstant?: number | null
      birthDate?: string
      birthTime?: string | null
      birthLocation?: string
    }
    // Sky-economy transit-attunement context, forwarded verbatim to alchm.kitchen
    // so it can render the "🌠 Sky Drop" feed event + bell notification.
    planet?: string
    sign?: string
    degree?: number
    totalTokens?: number
    degreeAgentId?: string
    historicalAgentId?: string
    planetaryAgentId?: string
    amount?: number
  }
}): Promise<{ ok: boolean; error?: string; balances?: any }> {
  const alchmConfig = (() => {
    try {
      return loadAlchmSyncConfig()
    } catch {
      return null
    }
  })()
  if (!alchmConfig) {
    console.error('[alchm-credit-sync] Missing ALCHM_KITCHEN_SYNC_URL or ALCHM_KITCHEN_SYNC_SECRET')
    return { ok: false, error: 'Internal configuration error' }
  }
  const { baseUrl, secret } = alchmConfig

  try {
    const response = await fetch(`${baseUrl}/api/economy/sync-credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': secret,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 409) {
        // Idempotency hit - treat as success
        console.log(
          `[alchm-credit-sync] Idempotency hit for ${params.userEmail} (key: ${params.idempotencyKey})`
        )
        return { ok: true }
      }

      const errorMsg = data.message || data.error || `HTTP ${response.status}`
      console.error(`[alchm-credit-sync] Failed to sync credit: ${errorMsg}`)
      return { ok: false, error: errorMsg }
    }

    console.log(`[alchm-credit-sync] Credit applied for ${params.userEmail}: ${params.source}`)
    return { ok: true, balances: data.balances }
  } catch (err: any) {
    console.error(`[alchm-credit-sync] Network or fetch error: ${err.message}`)
    return { ok: false, error: err.message }
  }
}
