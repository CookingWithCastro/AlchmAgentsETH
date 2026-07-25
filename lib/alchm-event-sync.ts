/**
 * Syncs a quest event to the alchm.kitchen platform.
 * Used for agents performing "demo" actions like meal planning or pantry updates.
 */
import { loadAlchmSyncConfig } from './alchmSyncConfig'

export async function syncEventToAlchm(params: {
  userEmail: string
  event: string
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
  }
}): Promise<{ ok: boolean; error?: string; completed?: any[] }> {
  const alchmConfig = (() => {
    try {
      return loadAlchmSyncConfig()
    } catch {
      return null
    }
  })()
  if (!alchmConfig) {
    console.error('[alchm-event-sync] Missing ALCHM_KITCHEN_SYNC_URL or ALCHM_KITCHEN_SYNC_SECRET')
    return { ok: false, error: 'Internal configuration error' }
  }
  const { baseUrl, secret } = alchmConfig

  try {
    const response = await fetch(`${baseUrl}/api/economy/sync-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': secret,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP ${response.status}`
      console.error(`[alchm-event-sync] Failed to sync event: ${errorMsg}`)
      return { ok: false, error: errorMsg }
    }

    console.log(`[alchm-event-sync] Event reported for ${params.userEmail}: ${params.event}`)
    return { ok: true, completed: data.completed }
  } catch (err: any) {
    console.error(`[alchm-event-sync] Network or fetch error: ${err.message}`)
    return { ok: false, error: err.message }
  }
}
