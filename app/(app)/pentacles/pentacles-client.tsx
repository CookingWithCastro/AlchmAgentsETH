'use client'

import { useEffect, useMemo, useState } from 'react'
import useLiveEphemeris from '@/lib/spacetime/hooks/useLiveEphemeris'
import useLiveStars from '@/lib/spacetime/hooks/useLiveStars'
import useLiveZones from '@/lib/spacetime/hooks/useLiveZones'
import PentacleSkyMap from '@/components/staking/PentacleSkyMap'
import StarStakePanel from '@/components/staking/StarStakePanel'
import ZonePoolsPanel from '@/components/staking/ZonePoolsPanel'
import ZonePoolLP from '@/components/staking/ZonePoolLP'
import { computeYieldRate } from '@/lib/staking/yield-rate'
import { deriveSky } from '@/lib/staking/zone-pools'
import { zoneForAltAz } from '@/lib/staking/pentacle-geometry'
import { starAltitude } from '@/lib/staking/visibility'
import { ALL_ELEMENTS, ELEMENT_COLOR, ESMS_LABEL } from '@/lib/staking/ui'
import type {
  Element,
  LivePlanet,
  NatalAffinity,
  ObserverLocation,
  PlanetName,
  StakeableStar,
  YieldRateBreakdown,
} from '@/lib/staking/types'

const DEFAULT_OBSERVER: ObserverLocation = { lat: 40.7128, lon: -74.006 } // NYC (EthGlobal)

export default function PentaclesClient() {
  const { stars, isLive: starsLive } = useLiveStars()
  const { zones } = useLiveZones()
  const { planetaryPositions } = useLiveEphemeris()

  const [observer, setObserver] = useState<ObserverLocation | null>(DEFAULT_OBSERVER)
  const [geoState, setGeoState] = useState<'idle' | 'ok' | 'denied'>('idle')
  const [natalElement, setNatalElement] = useState<Element | ''>('')
  const [selectedHipId, setSelectedHipId] = useState<number | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null)
  const [now, setNow] = useState<Date>(() => new Date())

  // Tick the sky every 15s so visibility, ascendant + activations stay live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  // Render immediately with the NYC fallback; upgrade to real geolocation if granted.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setObserver({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoState('ok')
      },
      () => setGeoState('denied'),
      { timeout: 6000 }
    )
  }, [])

  const planets = useMemo<LivePlanet[]>(
    () =>
      planetaryPositions.map(p => ({
        planet: p.planet as PlanetName,
        sign: p.sign,
        degree: p.degree,
        retrograde: p.retrograde,
      })),
    [planetaryPositions]
  )

  const natal = useMemo<NatalAffinity | null>(
    () => (natalElement ? { dominantElement: natalElement } : null),
    [natalElement]
  )

  const sky = useMemo(
    () => deriveSky(stars, planets, observer, now),
    [stars, planets, observer, now]
  )

  const yields = useMemo(() => {
    const map = new Map<number, YieldRateBreakdown>()
    for (const star of stars) {
      const base = computeYieldRate({ star, planets, natal, observer, at: now })
      let boost = 1
      if (observer) {
        const a = starAltitude(star.ra, star.dec, observer.lat, observer.lon, now)
        boost = sky.zoneBoost.get(zoneForAltAz(a.altitudeDeg, a.azimuthDeg)) ?? 1
      }
      map.set(star.hipId, {
        ...base,
        zoneBoost: boost,
        dailyRatePerUsdc: base.dailyRatePerUsdc * boost,
        apyPct: base.apyPct * boost,
      })
    }
    return map
  }, [stars, planets, natal, observer, now, sky])

  const selected = useMemo<StakeableStar | null>(
    () => stars.find(s => s.hipId === selectedHipId) ?? null,
    [stars, selectedHipId]
  )

  const leaderboard = useMemo(
    () =>
      [...stars]
        .map(s => ({ star: s, y: yields.get(s.hipId) }))
        .filter(e => e.y?.visible)
        .sort((a, b) => (b.y?.apyPct ?? 0) - (a.y?.apyPct ?? 0))
        .slice(0, 6),
    [stars, yields]
  )

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 18px', color: '#e7e9ff' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pentacle Star Vaults</h1>
        <p style={{ color: '#9aa0d8', margin: '6px 0 0', maxWidth: 760 }}>
          Stake USDC on a star and earn <strong>elemental essence</strong> while it is risen. The 11
          zones host <strong>element-pair pools</strong> set by the planets&apos; live aspects, and
          stars crossing your <strong>ascendant</strong> burst-boost the zone they sit in. Settles
          on Circle Arc.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <PentacleSkyMap
            stars={stars}
            zones={zones}
            yields={yields}
            observer={observer}
            now={now}
            planetsSky={sky.planetsSky}
            zoneBoost={sky.zoneBoost}
            ascDeg={sky.ascDeg}
            activations={sky.activations}
            selectedHipId={selectedHipId}
            selectedZoneId={selectedZoneId}
            onSelectStar={setSelectedHipId}
            onSelectZone={setSelectedZoneId}
          />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
            {ALL_ELEMENTS.map(el => (
              <span
                key={el}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aeb4e8' }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ELEMENT_COLOR[el],
                  }}
                />
                {el} → {ESMS_LABEL[['Fire', 'Water', 'Earth', 'Air'].indexOf(el) as 0 | 1 | 2 | 3]}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: '#6b72a8' }}>
            {starsLive ? 'Live star_node feed' : 'Bright-star catalog'} ·{' '}
            {geoState === 'ok' ? 'using your location' : `using New York (${geoState})`} ·{' '}
            {planets.length > 0
              ? `${planets.length} planets transiting`
              : 'awaiting live ephemeris'}{' '}
            · {sky.activations.length} on ascendant
          </div>
        </div>

        <div
          style={{
            flex: '1 1 320px',
            minWidth: 300,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#9aa0d8' }}>Your dominant element:</label>
            <select
              value={natalElement}
              onChange={e => setNatalElement(e.target.value as Element | '')}
              style={{
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                border: '1px solid rgba(122,128,200,0.3)',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 13,
              }}
            >
              <option value="">— none —</option>
              {ALL_ELEMENTS.map(el => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </div>

          <StarStakePanel
            star={selected}
            breakdown={selected ? (yields.get(selected.hipId) ?? null) : null}
            ctx={{ observer, planets, natal }}
          />

          <ZonePoolsPanel
            pools={sky.pools}
            zones={sky.zones}
            activations={sky.activations}
            selectedZoneId={selectedZoneId}
            stars={stars}
          />

          <ZonePoolLP
            zone={selectedZoneId != null ? (sky.zones.get(selectedZoneId) ?? null) : null}
            ctx={{ observer, planets }}
          />

          <div
            style={{
              background: 'rgba(14,16,38,0.6)',
              border: '1px solid rgba(122,128,200,0.22)',
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#9aa0d8',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Brightest yields (risen now)
            </div>
            {leaderboard.length === 0 && (
              <div style={{ fontSize: 13, color: '#6b72a8' }}>No stars risen.</div>
            )}
            {leaderboard.map(({ star, y }) => (
              <button
                key={star.hipId}
                onClick={() => setSelectedHipId(star.hipId)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background:
                    star.hipId === selectedHipId ? 'rgba(122,128,200,0.16)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 8px',
                  color: '#dfe2ff',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: ELEMENT_COLOR[star.element],
                    }}
                  />
                  {star.name}
                  <span style={{ fontSize: 11, color: '#9aa0d8' }}>{ESMS_LABEL[star.esmsId]}</span>
                  {(y?.zoneBoost ?? 1) > 1.05 && (
                    <span style={{ fontSize: 10, color: '#ffe9a8' }}>★boost</span>
                  )}
                </span>
                <span style={{ fontWeight: 700 }}>{(y?.apyPct ?? 0).toFixed(0)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
