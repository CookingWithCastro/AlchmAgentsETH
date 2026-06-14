/**
 * Live derivation of the evolved model: planets placed in pentacle zones, aspect-driven
 * ESMS element-pair pools assigned to the zones their planets occupy, and ascendant star
 * activations that burst-boost the zone a rising star sits in.
 */

import { DEGREE_PLANETARY_AGENT_MAPPING } from '@/lib/degree-planetary-agent-mapping'
import { eclipticToHorizontal } from './astro'
import { aspectPools, planetLongitudes, type ElementPool } from './aspects'
import { ascendantLongitude, isStarOnAscendant } from './ascendant'
import { raDecToEclipticLongitude } from './elements'
import { zoneForAltAz } from './pentacle-geometry'
import { starAltitude } from './visibility'
import type { Element, LivePlanet, ObserverLocation, PlanetName, StakeableStar } from './types'

export interface PlanetSky {
  planet: PlanetName
  element: Element
  longitude: number
  altDeg: number
  azDeg: number
  zoneId: number // -1 if below the horizon
}

export interface ZonePoolInfo {
  zoneId: number
  pools: ElementPool[] // element-pair pools whose planets occupy this zone
  planets: PlanetName[] // planets currently in this zone
  boost: number // composite yield multiplier (pools + activations)
}

export interface StarActivation {
  hipId: number
  zoneId: number
  dignity: number // 0..1 powerLevel at the star's degree
}

export interface SkyDerivation {
  planetsSky: PlanetSky[]
  pools: ElementPool[]
  zones: Map<number, ZonePoolInfo>
  ascDeg: number
  activations: StarActivation[]
  zoneBoost: Map<number, number>
}

function degreeDignity(longitudeDeg: number): number {
  const cfg = DEGREE_PLANETARY_AGENT_MAPPING[Math.floor(((longitudeDeg % 360) + 360) % 360)]
  return cfg?.powerLevel ?? 0.5
}

export function placePlanets(
  planets: LivePlanet[],
  observer: ObserverLocation | null,
  at: Date
): PlanetSky[] {
  return planetLongitudes(planets).map(l => {
    const h = observer
      ? eclipticToHorizontal(l.longitude, observer, at)
      : { altDeg: 90, azDeg: 0, visible: true }
    return {
      planet: l.planet,
      element: l.element,
      longitude: l.longitude,
      altDeg: h.altDeg,
      azDeg: h.azDeg,
      zoneId: zoneForAltAz(h.altDeg, h.azDeg),
    }
  })
}

export function deriveSky(
  stars: StakeableStar[],
  planets: LivePlanet[],
  observer: ObserverLocation | null,
  at: Date
): SkyDerivation {
  const planetsSky = placePlanets(planets, observer, at)
  const pools = aspectPools(planets)

  // Planets → their zones.
  const zones = new Map<number, ZonePoolInfo>()
  const ensure = (z: number) => {
    let info = zones.get(z)
    if (!info) {
      info = { zoneId: z, pools: [], planets: [], boost: 1 }
      zones.set(z, info)
    }
    return info
  }
  const planetZone = new Map<PlanetName, number>()
  for (const ps of planetsSky) {
    if (ps.zoneId < 0) continue
    ensure(ps.zoneId).planets.push(ps.planet)
    planetZone.set(ps.planet, ps.zoneId)
  }

  // A pool is hosted in the zone(s) of either of its aspecting planets.
  for (const pool of pools) {
    const zoneIds = new Set<number>()
    const z1 = planetZone.get(pool.planets[0])
    const z2 = planetZone.get(pool.planets[1])
    if (z1 != null) zoneIds.add(z1)
    if (z2 != null) zoneIds.add(z2)
    for (const z of zoneIds) ensure(z).pools.push(pool)
  }

  // Ascendant star activations.
  const ascDeg = observer ? ascendantLongitude(observer, at) : NaN
  const activations: StarActivation[] = []
  if (observer && Number.isFinite(ascDeg)) {
    for (const s of stars) {
      if (!isStarOnAscendant(s, ascDeg)) continue
      const alt = starAltitude(s.ra, s.dec, observer.lat, observer.lon, at)
      const zoneId = zoneForAltAz(alt.altitudeDeg, alt.azimuthDeg)
      activations.push({
        hipId: s.hipId,
        zoneId,
        dignity: degreeDignity(raDecToEclipticLongitude(s.ra, s.dec)),
      })
    }
  }

  // Composite per-zone boost: pools + activations.
  for (const info of zones.values()) {
    const poolBoost = info.pools.reduce((sum, p) => sum + p.strength, 0) * 0.25
    info.boost = Math.min(2.5, 1 + poolBoost)
  }
  for (const act of activations) {
    if (act.zoneId < 0) continue
    const info = ensure(act.zoneId)
    info.boost = Math.min(3, info.boost + 0.5 + act.dignity * 0.5)
  }

  const zoneBoost = new Map<number, number>()
  for (const [z, info] of zones) zoneBoost.set(z, info.boost)

  return { planetsSky, pools, zones, ascDeg, activations, zoneBoost }
}
