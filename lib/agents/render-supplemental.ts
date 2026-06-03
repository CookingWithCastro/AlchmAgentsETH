import { normalizeRenderBirthInfo } from './render-post-image'
import { wakeRenderBackend } from './render-wake'
import type { BirthInfo } from '@/lib/schemas'

export interface RenderSupplementalData {
  success: boolean
  astrologyTotals?: Record<string, any>
  alchemyTotals?: Record<string, any>
  imaginizerInfo?: Record<string, any>
  raw?: any
}

const DEFAULT_RENDER_BASE = 'https://alchm-backend.onrender.com'

function getRenderBaseUrl(): string {
  return (
    process.env.ALCHM_RENDER_BACKEND_URL ||
    process.env.ALCHM_BACKEND_URL ||
    DEFAULT_RENDER_BASE
  ).replace(/\/$/, '')
}

export async function fetchRenderSupplementalData(
  birthInfo: BirthInfo
): Promise<RenderSupplementalData> {
  const renderBirthInfo = normalizeRenderBirthInfo(birthInfo, birthInfo.name || 'Subject')
  if (!renderBirthInfo) {
    throw new Error('Invalid birth info provided for Render supplemental data')
  }

  const base = getRenderBaseUrl()
  const url = `${base}/alchmize-public`
  const body = JSON.stringify({
    birth_info: renderBirthInfo,
    imaginizer_info: {
      output: { skip: true }, // skips Imaginizer image generation to be instant and free
    },
    logging_info: {
      name: 'Planetary Agents Supplemental Node Data',
      project: 'AlchmPlanetaryAgents',
      log_stream: 'supplemental-dashboard-data',
      metadata: {
        source: 'planetary_agents_dashboard',
      },
      tags: ['planetary-agents', 'dashboard', 'supplemental'],
    },
  })

  // POST once with a short timeout. The Render backend hibernates on the free
  // tier; a cold start exceeds this, so on failure we wake it (GET / until 200)
  // and retry once against the now-warm server. This endpoint skips image
  // generation, so it never hits the backend's crash-prone image path.
  const post = async (): Promise<Response | null> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
    } catch {
      return null
    } finally {
      clearTimeout(timeoutId)
    }
  }

  try {
    let res = await post()
    if (!res || !res.ok) {
      const wake = await wakeRenderBackend({ baseUrl: base })
      if (wake.awake) res = await post()
    }

    if (!res || !res.ok) {
      if (res) {
        const text = await res.text().catch(() => '')
        console.error(`fetchRenderSupplementalData: Render API failed (${res.status}): ${text}`)
      }
      return { success: false, raw: null }
    }

    const data = await res.json()
    return {
      success: true,
      astrologyTotals: data?.astrology_info?.totals,
      alchemyTotals: data?.alchemy_info?.totals,
      imaginizerInfo: data?.imaginizer_info,
      raw: data,
    }
  } catch (error: any) {
    console.error('fetchRenderSupplementalData error:', error)
    return { success: false, raw: null }
  }
}
