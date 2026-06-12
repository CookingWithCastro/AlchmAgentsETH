import { backend } from '@/lib/backend'
import PlanetaryAgentsClient from './planetary-agents-client'

// The sky moves: without ISR this page was prerendered once at build time, so
// positions were frozen (or permanently empty if the build-time fetch failed).
export const revalidate = 900

export default async function PlanetaryAgentsPage() {
  let initialPositions: Record<string, { sign: string; degree: number }> = {}
  try {
    const data = await backend.planetary.positions()
    const rawPositions = (data as any)?.planetary_positions || {}
    Object.entries(rawPositions).forEach(([planet, body]: [string, any]) => {
      initialPositions[planet] = {
        sign: body?.sign ?? '',
        degree: typeof body?.degree === 'number' ? body.degree : 0,
      }
    })
  } catch {
    // Client renders with empty positions and "Loading position…" placeholders
  }

  return <PlanetaryAgentsClient initialPositions={initialPositions} />
}
