'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import useLiveEphemeris from '@/lib/spacetime/hooks/useLiveEphemeris'
import useLiveStars from '@/lib/spacetime/hooks/useLiveStars'
import { computeYieldRate } from '@/lib/staking/yield-rate'
import { deriveSky } from '@/lib/staking/zone-pools'
import { zoneForAltAz } from '@/lib/staking/pentacle-geometry'
import { starAltitude } from '@/lib/staking/visibility'
import { usePortfolio } from '@/lib/staking/usePortfolio'
import { useStarStaking } from '@/lib/staking/useStarStaking'
import { ALL_ELEMENTS, ELEMENT_COLOR, ESMS_LABEL, GOLD } from '@/lib/staking/ui'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import type {
  LivePlanet,
  ObserverLocation,
  PlanetName,
  StakeableStar,
  YieldRateBreakdown,
} from '@/lib/staking/types'

const DEFAULT_OBSERVER: ObserverLocation = { lat: 40.7128, lon: -74.006 }

const glass: React.CSSProperties = {
  background: 'rgba(22,19,12,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderTop: `1px solid ${GOLD}1a`,
  borderRadius: 16,
  backdropFilter: 'blur(16px)',
}

export default function PortfolioClient() {
  const { stars } = useLiveStars()
  const { planetaryPositions } = useLiveEphemeris()
  const [observer] = useState<ObserverLocation>(DEFAULT_OBSERVER)
  const [now, setNow] = useState<Date>(() => new Date(0))

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
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

  const yields = useMemo(() => {
    const map = new Map<number, YieldRateBreakdown>()
    for (const star of stars) {
      const base = computeYieldRate({ star, planets, natal: null, observer, at: now })
      const a = starAltitude(star.ra, star.dec, observer.lat, observer.lon, now)
      const boost = sky.zoneBoost.get(zoneForAltAz(a.altitudeDeg, a.azimuthDeg)) ?? 1
      map.set(star.hipId, { ...base, apyPct: base.apyPct * boost })
    }
    return map
  }, [stars, planets, observer, now, sky])

  const { portfolio, connected, configured } = usePortfolio(stars, yields)

  // Claim wiring: one staking hook bound to the row the user clicked.
  const [claimStar, setClaimStar] = useState<StakeableStar | null>(null)
  const staking = useStarStaking(claimStar, { observer, planets })
  const firedRef = useRef<number | null>(null)
  useEffect(() => {
    if (claimStar && firedRef.current !== claimStar.hipId && !staking.busy) {
      firedRef.current = claimStar.hipId
      void staking.claim()
    }
  }, [claimStar, staking])
  const onClaim = (star: StakeableStar) => {
    firedRef.current = null
    setClaimStar(star)
  }

  const positions = portfolio?.positions ?? []
  const explorer = staking.lastTx ? `${ARC_TESTNET.explorer}/tx/${staking.lastTx}` : null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 18px 120px', color: '#e7e9ff' }}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 34,
            fontWeight: 700,
            color: GOLD,
            margin: 0,
          }}
        >
          Your constellations
        </h1>
        <p style={{ color: '#9aa0d8', margin: '6px 0 0', maxWidth: 640 }}>
          The stars holding your staked USDC. Align with the ascendant to maximize essence accrual.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 12,
            borderBottom: '1px solid rgba(122, 128, 200, 0.2)',
            paddingBottom: 10,
          }}
        >
          <Link
            href="/pentacles"
            style={{
              color: '#9aa0d8',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
          >
            Sky Vaults
          </Link>
          <span style={{ color: '#ffd76a', fontWeight: 600, fontSize: 14 }}>Your Portfolio</span>
          <Link
            href="/pentacles/connect"
            style={{
              color: '#9aa0d8',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
          >
            Arc Onboarding
          </Link>
        </div>
      </header>

      {/* Stat cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div style={{ ...glass, padding: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9aa0d8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Total staked
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, marginTop: 6 }}>
            {(portfolio?.totalStakedUsdc ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{' '}
            <span style={{ fontSize: 15, color: GOLD }}>USDC</span>
          </div>
        </div>
        <div style={{ ...glass, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 11,
                color: '#9aa0d8',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Essence / day
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {ALL_ELEMENTS.map(el => (
                <span
                  key={el}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ELEMENT_COLOR[el],
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, marginTop: 6 }}>
            {(portfolio?.totalEssencePerDay ?? 0).toFixed(2)}
            <span style={{ fontSize: 15, color: '#68d6e9', fontFamily: 'Inter', marginLeft: 6 }}>
              pts
            </span>
          </div>
        </div>
        <div style={{ ...glass, padding: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9aa0d8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Stars held
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 30,
              marginTop: 6,
              color: GOLD,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {positions.length} <span style={{ fontSize: 22 }}>✦</span>
          </div>
        </div>
      </section>

      {/* Star stakes */}
      <h2
        style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 20,
          margin: '0 0 14px',
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        Star stakes
      </h2>

      {!connected || !configured || positions.length === 0 ? (
        <div style={{ ...glass, padding: 40, textAlign: 'center', color: '#9aa0d8' }}>
          {!connected
            ? 'Connect a wallet to see your staked stars.'
            : !configured
              ? 'Vault not deployed yet — set NEXT_PUBLIC_STAR_VAULT_ADDRESS.'
              : 'No positions yet. Stake a star on the sky map to begin earning essence.'}
        </div>
      ) : (
        <div style={{ ...glass, overflow: 'hidden' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  color: '#9aa0d8',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Star</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Pays</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Principal</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>APY</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => {
                const color = ELEMENT_COLOR[pos.star.element]
                return (
                  <tr
                    key={pos.star.hipId}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <td
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 8px ${color}`,
                        }}
                      />
                      {pos.star.name}
                    </td>
                    <td style={{ padding: '12px 16px', color }}>{ESMS_LABEL[pos.star.esmsId]}</td>
                    <td style={{ padding: '12px 16px' }}>{pos.principalUsdc.toFixed(2)} USDC</td>
                    <td style={{ padding: '12px 16px', color: '#d7baff' }}>
                      {pos.apyPct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: pos.visible ? GOLD : '#9aa0d8',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: pos.visible ? GOLD : '#9aa0d8',
                          }}
                        />
                        {pos.visible ? 'Risen' : 'Set'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        disabled={staking.busy}
                        onClick={() => onClaim(pos.star)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${GOLD}55`,
                          color: GOLD,
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: 13,
                          cursor: staking.busy ? 'wait' : 'pointer',
                          opacity: staking.busy ? 0.6 : 1,
                        }}
                      >
                        Claim
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {staking.message && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#bcc1f0' }}>
          {staking.message}
          {explorer && (
            <>
              {' '}
              <a href={explorer} target="_blank" rel="noreferrer" style={{ color: '#7fb0ff' }}>
                view tx ↗
              </a>
            </>
          )}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12.5, color: '#6b72a8' }}>
        Zone liquidity (ConstellationAMM LP / Deed NFTs) appears here once you provide essence to a
        zone pool on the sky map.
      </p>
    </div>
  )
}
