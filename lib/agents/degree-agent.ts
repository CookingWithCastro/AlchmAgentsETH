// Transit degree-agent helpers (client + server safe — no DB / server-only imports).
//
// alchm.kitchen resolves a clicked transit to canonical planetary-degree agent IDs
// of the form `planetary-{planet}-{sign}-{degree}` (lowercase, degree = within-sign
// integer 0–29) — identical to backend/seed_3600_planetary_agents.py and this repo's
// unified-agent-factory. These helpers parse/normalize those IDs and rebuild full
// UnifiedAgents from them so the transit group page can drive /api/unified-multi-agent-chat.

import type { UnifiedAgent, PlanetaryConfig } from '@/lib/unified-agent-types'
import { convertLegacyAgentConfig } from '@/lib/planetary-config-helper'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'

export interface TransitAgentDetail {
  id: string
  planet: string
  sign: string
  degree: number
  name?: string
}

const ZODIAC_SIGNS = new Set([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
])

/** Title-case a single astrological token (`mars` → `Mars`, `aries` → `Aries`). */
export function titleCaseAstro(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

/**
 * Parse a canonical `planetary-{planet}-{sign}-{degree}` ID. Returns canonical
 * title-cased planet/sign + a lowercased canonical id, or null when the id is not
 * a valid degree-agent id (wrong prefix, unknown sign, or degree outside 0–29).
 */
export function parseDegreeAgentId(id: string): TransitAgentDetail | null {
  if (!id || typeof id !== 'string') return null
  const parts = id.toLowerCase().trim().split('-')
  // planetary-{planet}-{sign}-{degree}
  if (parts.length !== 4 || parts[0] !== 'planetary') return null
  const [, planet, sign, degreeRaw] = parts
  if (!planet || !ZODIAC_SIGNS.has(sign)) return null
  const degree = Number.parseInt(degreeRaw, 10)
  if (!Number.isInteger(degree) || degree < 0 || degree > 29) return null
  return {
    id: `planetary-${planet}-${sign}-${degree}`,
    planet: titleCaseAstro(planet),
    sign: titleCaseAstro(sign),
    degree,
  }
}

/**
 * Normalize the request/persisted shape into a clean, deduped, ordered list of
 * degree-agent details. Prefers values parsed from the canonical id; falls back
 * to the parallel `detail` array (alchm.kitchen's `agents[]`) for ids that don't
 * parse. Unresolvable ids are dropped.
 */
export function normalizeTransitAgents(
  agentIds: Array<string | null | undefined>,
  detail: Array<Partial<TransitAgentDetail> & { id?: string }> = []
): TransitAgentDetail[] {
  const byId = new Map<string, Partial<TransitAgentDetail>>()
  for (const d of detail) {
    if (d?.id) byId.set(String(d.id).toLowerCase(), d)
  }

  const out: TransitAgentDetail[] = []
  const seen = new Set<string>()

  for (const rawId of agentIds) {
    if (!rawId) continue
    const id = String(rawId).toLowerCase().trim()
    if (!id || seen.has(id)) continue

    const provided = byId.get(id)
    const parsed = parseDegreeAgentId(id)

    if (parsed) {
      seen.add(parsed.id)
      out.push({
        ...parsed,
        name: provided?.name || `${parsed.planet} in ${parsed.sign} ${parsed.degree}°`,
      })
    } else if (provided?.planet && provided?.sign && provided?.degree != null) {
      // Non-canonical id but the caller supplied enough detail to use it.
      const degree = Number.parseInt(String(provided.degree), 10)
      if (!Number.isInteger(degree)) continue
      seen.add(id)
      out.push({
        id,
        planet: titleCaseAstro(String(provided.planet)),
        sign: titleCaseAstro(String(provided.sign)),
        degree,
        name: provided.name,
      })
    }
  }

  return out
}

/**
 * Build full UnifiedAgents (type `planetary`, with `planetaryData`) for a set of
 * degree-agent details, so /api/unified-multi-agent-chat renders the rich planetary
 * prompt rather than the generic fallback. convertLegacyAgentConfig fills
 * dignity/element/color/symbol from the shared planet maps + dignity tables.
 */
export function buildTransitUnifiedAgents(agents: TransitAgentDetail[]): UnifiedAgent[] {
  return agents.map(a => {
    const config: PlanetaryConfig = convertLegacyAgentConfig({
      planet: a.planet,
      sign: a.sign,
      degree: String(a.degree),
    })
    const unified = unifiedAgentFactory.createFromPlanetary(config)
    // Preserve a friendlier display name when the caller provided one.
    return a.name ? { ...unified, name: a.name } : unified
  })
}
