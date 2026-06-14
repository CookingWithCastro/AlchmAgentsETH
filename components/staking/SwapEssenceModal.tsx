'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useZonePool } from '@/lib/staking/useZonePool'
import { ELEMENT_COLOR, ELEMENT_GLYPH, ESMS_LABEL, PLANET_GLYPH } from '@/lib/staking/ui'
import { constIdForPair, PAIRS } from '@/lib/staking/amm'
import type { EsmsId, LivePlanet, ObserverLocation } from '@/lib/staking/types'
import type { ElementPool } from '@/lib/staking/aspects'
import { ARC_TESTNET } from '@/lib/erc8004/registry'

interface SwapEssenceModalProps {
  isOpen: boolean
  onClose: () => void
  skyPools: ElementPool[]
  observer: ObserverLocation | null
  planets: LivePlanet[]
  balances: {
    spirit: number
    essence: number
    matter: number
    substance: number
    usdc: number
    total: number
  } | null
  refreshBalances: () => Promise<void>
}

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  trine: '△',
  square: '□',
  opposition: '☍',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(5, 6, 15, 0.82)',
  backdropFilter: 'blur(8px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const modalStyle: React.CSSProperties = {
  background: 'rgba(14, 16, 38, 0.78)',
  border: '1px solid rgba(122, 128, 200, 0.3)',
  borderRadius: 18,
  padding: 24,
  width: '100%',
  maxWidth: 420,
  color: '#dfe2ff',
  boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(122, 128, 200, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  position: 'relative',
}

const inputContainerStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(122, 128, 200, 0.2)',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

export default function SwapEssenceModal({
  isOpen,
  onClose,
  skyPools,
  observer,
  planets,
  balances,
  refreshBalances,
}: SwapEssenceModalProps) {
  const { swap, quote, reserves, busy, message, lastTx } = useZonePool({ observer, planets })

  const [fromId, setFromId] = useState<EsmsId>(0)
  const [toId, setToId] = useState<EsmsId>(1)
  const [fromAmt, setFromAmt] = useState('')
  const [toAmt, setToAmt] = useState<number>(0)
  const [poolReserves, setPoolReserves] = useState<{ reserveA: number; reserveB: number } | null>(
    null
  )

  // Custom dropdown open states
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false)
  const [toDropdownOpen, setToDropdownOpen] = useState(false)

  const fromRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLDivElement>(null)

  // Click outside to close custom dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
        setFromDropdownOpen(false)
      }
      if (toRef.current && !toRef.current.contains(event.target as Node)) {
        setToDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const constId = useMemo(() => constIdForPair(fromId, toId), [fromId, toId])

  const balanceMap = useMemo(() => {
    return {
      0: balances?.spirit ?? 0,
      1: balances?.essence ?? 0,
      2: balances?.matter ?? 0,
      3: balances?.substance ?? 0,
    }
  }, [balances])

  const elementMap: Record<EsmsId, 'Fire' | 'Water' | 'Earth' | 'Air'> = {
    0: 'Fire',
    1: 'Water',
    2: 'Earth',
    3: 'Air',
  }

  // Find if pool is open on-chain / in the sky
  const activePool = useMemo(() => {
    return skyPools.find(
      p => (p.ids[0] === fromId && p.ids[1] === toId) || (p.ids[1] === fromId && p.ids[0] === toId)
    )
  }, [skyPools, fromId, toId])

  const isPoolOpen = Boolean(activePool)

  // Fetch reserves when pair changes
  useEffect(() => {
    if (constId < 0) {
      setPoolReserves(null)
      return
    }
    let active = true
    const load = async () => {
      const res = await reserves(constId)
      if (active) setPoolReserves(res)
    }
    void load()
    return () => {
      active = false
    }
  }, [constId, reserves])

  // Fetch quote when amount or pair changes
  useEffect(() => {
    if (constId < 0 || !fromAmt || isNaN(Number(fromAmt)) || Number(fromAmt) <= 0) {
      setToAmt(0)
      return
    }
    let active = true
    const timer = setTimeout(() => {
      const load = async () => {
        const out = await quote(constId, fromId, fromAmt)
        if (active) setToAmt(out)
      }
      void load()
    }, 300) // Debounce quotes to avoid contract read spam
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [constId, fromId, fromAmt, quote])

  // Switch direction handler
  const handleSwitchDirection = () => {
    setFromId(toId)
    setToId(fromId)
    setFromAmt(toAmt > 0 ? toAmt.toFixed(4) : '')
  }

  const handleMax = () => {
    const bal = balanceMap[fromId]
    setFromAmt(bal > 0 ? bal.toString() : '')
  }

  const handleSwap = async () => {
    if (constId < 0 || !fromAmt || isPoolOpen === false) return
    await swap(constId, fromId, fromAmt)
    await refreshBalances()
  }

  const isInputValid = useMemo(() => {
    const num = Number(fromAmt)
    return !isNaN(num) && num > 0 && num <= balanceMap[fromId]
  }, [fromAmt, balanceMap, fromId])

  const explorer = lastTx ? `${ARC_TESTNET.explorer}/tx/${lastTx}` : null

  const esmsIds: EsmsId[] = [0, 1, 2, 3]

  if (!isOpen) return null

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: '#9aa0d8',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            margin: 0,
            fontFamily: 'var(--ff-display)',
            textAlign: 'center',
          }}
        >
          Swap Essence
        </h2>

        {/* FROM Field */}
        <div style={inputContainerStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#9aa0d8',
            }}
          >
            <span>From</span>
            <span>Balance: {balanceMap[fromId].toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Custom Dropdown for FROM */}
            <div ref={fromRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setFromDropdownOpen(!fromDropdownOpen)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(122,128,200,0.3)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR[elementMap[fromId]],
                    filter: `drop-shadow(0 0 4px ${ELEMENT_COLOR[elementMap[fromId]]})`,
                    fontWeight: 700,
                  }}
                >
                  {ELEMENT_GLYPH[elementMap[fromId]]}
                </span>
                <span>{ESMS_LABEL[fromId]}</span>
                <span style={{ fontSize: 10, color: '#9aa0d8' }}>▼</span>
              </button>

              {fromDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: '#0e1026',
                    border: '1px solid rgba(122,128,200,0.4)',
                    borderRadius: 8,
                    zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {esmsIds
                    .filter(id => id !== toId)
                    .map(id => (
                      <button
                        key={id}
                        onClick={() => {
                          setFromId(id)
                          setFromDropdownOpen(false)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dfe2ff',
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = 'rgba(122,128,200,0.15)')
                        }
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ color: ELEMENT_COLOR[elementMap[id]], fontWeight: 700 }}>
                          {ELEMENT_GLYPH[elementMap[id]]}
                        </span>
                        <span>{ESMS_LABEL[id]}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <input
              value={fromAmt}
              onChange={e => setFromAmt(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                textAlign: 'right',
                width: '100%',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <button
              onClick={handleMax}
              style={{
                background: 'rgba(122, 128, 200, 0.2)',
                color: '#ffd76a',
                border: 'none',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Direction Arrow */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0' }}>
          <button
            onClick={handleSwitchDirection}
            style={{
              background: 'rgba(122, 128, 200, 0.18)',
              border: '1px solid rgba(122,128,200,0.3)',
              color: '#ffd76a',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(255, 215, 106, 0.15)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(180deg)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
          >
            ⇅
          </button>
        </div>

        {/* TO Field */}
        <div style={inputContainerStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#9aa0d8',
            }}
          >
            <span>To</span>
            <span>Balance: {balanceMap[toId].toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Custom Dropdown for TO */}
            <div ref={toRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setToDropdownOpen(!toDropdownOpen)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(122,128,200,0.3)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR[elementMap[toId]],
                    filter: `drop-shadow(0 0 4px ${ELEMENT_COLOR[elementMap[toId]]})`,
                    fontWeight: 700,
                  }}
                >
                  {ELEMENT_GLYPH[elementMap[toId]]}
                </span>
                <span>{ESMS_LABEL[toId]}</span>
                <span style={{ fontSize: 10, color: '#9aa0d8' }}>▼</span>
              </button>

              {toDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: '#0e1026',
                    border: '1px solid rgba(122,128,200,0.4)',
                    borderRadius: 8,
                    zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {esmsIds
                    .filter(id => id !== fromId)
                    .map(id => (
                      <button
                        key={id}
                        onClick={() => {
                          setToId(id)
                          setToDropdownOpen(false)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dfe2ff',
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = 'rgba(122,128,200,0.15)')
                        }
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ color: ELEMENT_COLOR[elementMap[id]], fontWeight: 700 }}>
                          {ELEMENT_GLYPH[elementMap[id]]}
                        </span>
                        <span>{ESMS_LABEL[id]}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                color: toAmt > 0 ? '#fff' : '#6b72a8',
                fontSize: 18,
                textAlign: 'right',
                padding: '4px 0',
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
              }}
            >
              {toAmt > 0 ? `≈ ${toAmt.toFixed(4)}` : '0.0'}
            </div>
          </div>
        </div>

        {/* Pool Context Strip */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(122, 128, 200, 0.18)',
            borderRadius: 10,
            padding: 10,
            fontSize: 12.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>
              Pool:{' '}
              <span style={{ color: ELEMENT_COLOR[elementMap[fromId]] }}>{ESMS_LABEL[fromId]}</span>
              {' ↔ '}
              <span style={{ color: ELEMENT_COLOR[elementMap[toId]] }}>{ESMS_LABEL[toId]}</span>
            </span>
            {isPoolOpen ? (
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(95, 208, 138, 0.15)',
                  color: '#5fd08a',
                  border: '1px solid rgba(95, 208, 138, 0.3)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  boxShadow: '0 0 8px rgba(95, 208, 138, 0.2)',
                }}
              >
                ● Pool Open
              </span>
            ) : (
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(255, 122, 122, 0.15)',
                  color: '#ff7a7a',
                  border: '1px solid rgba(255, 122, 122, 0.3)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                ○ Pool Closed
              </span>
            )}
          </div>

          {isPoolOpen && activePool ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffd76a' }}>
                <span style={{ fontSize: 14 }}>
                  {PLANET_GLYPH[activePool.planets[0]]} {ASPECT_GLYPH[activePool.aspect]}{' '}
                  {PLANET_GLYPH[activePool.planets[1]]}
                </span>
                <span style={{ fontSize: 11, color: '#9aa0d8' }}>
                  ({activePool.planets[0]} {activePool.aspect} {activePool.planets[1]})
                </span>
              </div>
              {poolReserves && (
                <div style={{ color: '#9aa0d8', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  Reserves: {poolReserves.reserveA.toFixed(2)} / {poolReserves.reserveB.toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <div
              style={{ color: '#6b72a8', fontSize: 11.5, fontStyle: 'italic', lineHeight: '1.4' }}
            >
              This pool opens when a favorable cross-element aspect forms and the zone is risen.
            </div>
          )}
        </div>

        {/* Details and Rates */}
        {isPoolOpen && toAmt > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 11.5,
              color: '#9aa0d8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Exchange Rate</span>
              <span>
                1 {ESMS_LABEL[fromId]} ≈ {(toAmt / Number(fromAmt)).toFixed(4)} {ESMS_LABEL[toId]}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Liquidity Fee</span>
              <span>1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Minimum Received</span>
              <span>
                {(toAmt * 0.99).toFixed(4)} {ESMS_LABEL[toId]}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          disabled={busy || !isPoolOpen || !isInputValid}
          onClick={handleSwap}
          style={{
            background: !isPoolOpen
              ? 'rgba(122, 128, 200, 0.08)'
              : !isInputValid
                ? 'rgba(122, 128, 200, 0.15)'
                : 'linear-gradient(135deg, #ffd76a 0%, #ffe9a8 100%)',
            color: !isPoolOpen || !isInputValid ? '#6b72a8' : '#0b0d20',
            border: !isPoolOpen || !isInputValid ? '1px solid rgba(122, 128, 200, 0.15)' : 'none',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 14.5,
            fontWeight: 700,
            cursor: busy || !isPoolOpen || !isInputValid ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
            transition: 'all 0.2s',
            boxShadow:
              isPoolOpen && isInputValid && !busy ? '0 0 15px rgba(255, 215, 106, 0.3)' : 'none',
            textAlign: 'center',
          }}
        >
          {busy
            ? message || 'Transmuting...'
            : !isPoolOpen
              ? 'Celestial Pool Closed'
              : !fromAmt
                ? 'Enter an Amount'
                : !isInputValid
                  ? 'Insufficient Balance'
                  : 'Swap Essence'}
        </button>

        {/* Transaction Messages */}
        {message && (
          <div
            style={{
              fontSize: 12,
              color: '#bcc1f0',
              textAlign: 'center',
              marginTop: 4,
              wordBreak: 'break-all',
            }}
          >
            {message}
            {explorer && (
              <div style={{ marginTop: 4 }}>
                <a
                  href={explorer}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#7fb0ff', textDecoration: 'underline' }}
                >
                  view transaction on explorer ↗
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
