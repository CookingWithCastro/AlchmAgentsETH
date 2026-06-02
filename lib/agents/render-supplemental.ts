import { normalizeRenderBirthInfo } from './render-post-image'
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

  const url = `${getRenderBaseUrl()}/alchmize-public`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000) // 15s timeout for fast response

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Render API failed (${res.status}): ${text}`)
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
    clearTimeout(timeoutId)
    console.error('fetchRenderSupplementalData error:', error)
    return {
      success: false,
      raw: null,
    }
  }
}
