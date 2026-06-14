'use client'

import { useEffect, useMemo, useState } from 'react'
import useLiveEphemeris from '@/lib/spacetime/hooks/useLiveEphemeris'
import useLiveStars from '@/lib/spacetime/hooks/useLiveStars'
import { deriveSky } from '@/lib/staking/zone-pools'
import { useAscendantActivations } from '@/lib/staking/useAscendantActivations'
import { ELEMENT_TO_ESMS } from '@/lib/staking/elements'
import { ELEMENT_COLOR, ESMS_LABEL, GOLD, GOLD_GLOW } from '@/lib/staking/ui'
import type { LivePlanet, ObserverLocation, PlanetName } from '@/lib/staking/types'

const DEFAULT_OBSERVER: ObserverLocation = { lat: 40.7128, lon: -74.006 }

/**
 * Global "shooting star" toast stack — self-contained: subscribes to the live sky, finds
 * stars crossing the user's ascendant, and pops a celebratory toast for each (auto-expiring
 * after the ~16s window). Mount once near the app root. Wired to useAscendantActivations.
 */
export default function ShootingStarToasts() {
  const { stars } = useLiveStars()
  const { planetaryPositions } = useLiveEphemeris()
  const [observer, setObserver] = useState<ObserverLocation>(DEFAULT_OBSERVER)
  const [now, setNow] = useState<Date>(() => new Date(0))

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setObserver({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
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

  const sky = useMemo(
    () => deriveSky(stars, planets, observer, now),
    [stars, planets, observer, now]
  )
  const { toasts, dismiss } = useAscendantActivations(sky.activations, stars)

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 380,
      }}
    >
      {toasts.map(t => {
        const color = ELEMENT_COLOR[t.element]
        const burst = (0.4 + t.dignity * 0.8).toFixed(1)
        return (
          <div
            key={t.id}
            style={{
              position: 'relative',
              background: 'rgba(22,19,12,0.82)',
              border: `1px solid ${GOLD}33`,
              borderTop: `1px solid ${GOLD}55`,
              borderRadius: 14,
              padding: '14px 16px',
              color: '#e7e9ff',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 18px 40px -12px rgba(0,0,0,0.6), 0 0 18px ${GOLD}14`,
              animation: 'starToastIn 0.5s cubic-bezier(0.2,0.8,0.2,1)',
            }}
          >
            <style>{`@keyframes starToastIn{0%{transform:translateX(120%);opacity:0}70%{transform:translateX(-4%);opacity:1}100%{transform:translateX(0)}}@keyframes starSparkle{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.25);opacity:1}}`}</style>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                background: 'transparent',
                border: 'none',
                color: '#9aa0d8',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: 20,
                  color: GOLD,
                  filter: `drop-shadow(0 0 6px ${GOLD_GLOW})`,
                  animation: 'starSparkle 2s infinite ease-in-out',
                  marginTop: 2,
                }}
              >
                ✦
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: GOLD,
                    fontFamily: 'Playfair Display, serif',
                  }}
                >
                  Shooting star!
                </div>
                <div style={{ fontSize: 13, color: '#bcc1f0', lineHeight: 1.45, marginTop: 2 }}>
                  <strong style={{ color: '#fff' }}>{t.starName}</strong> crossed your ascendant —{' '}
                  <span style={{ color }}>
                    +{burst} {ESMS_LABEL[ELEMENT_TO_ESMS[t.element]]}
                  </span>{' '}
                  minted, zone {t.zoneId} boosted.
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
