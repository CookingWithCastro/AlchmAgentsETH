'use client'

/**
 * On-chain ESMS — Phase 1 (claim/mirror).
 *
 * The WTEN off-chain ledger stays authoritative; here a user opts in to "claim"
 * ESMS to their Base embedded wallet (debit off-chain → mint a soulbound ERC-1155
 * on-chain). Shows on-chain balances + a claim form. Requires a linked Privy
 * wallet (the Cross-site identity section above provisions one).
 */

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Balances = { spirit: string; essence: string; matter: string; substance: string }
type BalanceState = { connected: boolean; walletAddress: string | null; balances: Balances | null }

const FIELDS = [
  { key: 'spirit', label: 'Spirit' },
  { key: 'essence', label: 'Essence' },
  { key: 'matter', label: 'Matter' },
  { key: 'substance', label: 'Substance' },
] as const

const CHAIN = process.env.NEXT_PUBLIC_ESMS_CHAIN || 'base-sepolia'
const EXPLORER = CHAIN === 'base' ? 'https://basescan.org/tx/' : 'https://sepolia.basescan.org/tx/'
const PENDING_CLAIM_KEY = 'alchm.esms.pendingClaimId'

function fmt(v: string | undefined): string {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '0'
  return n % 1 === 0 ? n.toString() : n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export function EsmsOnchain() {
  const [state, setState] = useState<BalanceState | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; tx?: string } | null>(null)
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/esms/balance', { cache: 'no-store' })
      if (res.ok) setState(await res.json())
      else setState({ connected: false, walletAddress: null, balances: null })
    } catch {
      setState({ connected: false, walletAddress: null, balances: null })
    }
  }, [])

  useEffect(() => {
    load()
    setPendingClaimId(window.localStorage.getItem(PENDING_CLAIM_KEY))
  }, [load])

  const claim = useCallback(async () => {
    setClaiming(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        spirit: Number(amounts.spirit || 0),
        essence: Number(amounts.essence || 0),
        matter: Number(amounts.matter || 0),
        substance: Number(amounts.substance || 0),
      }
      const res = await fetch('/api/esms/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingClaimId ? { claimId: pendingClaimId } : { amounts: payload }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotice({ text: 'Claimed to your wallet.', tx: data.txHash })
        setAmounts({})
        setPendingClaimId(null)
        window.localStorage.removeItem(PENDING_CLAIM_KEY)
        load()
      } else if (res.status === 402) {
        setError('Insufficient off-chain balance for that claim.')
      } else if (res.status === 502 && data.retryable) {
        setNotice({ text: 'Balance debited — on-chain mint is pending. Retry shortly.' })
        if (typeof data.claimId === 'string') {
          setPendingClaimId(data.claimId)
          window.localStorage.setItem(PENDING_CLAIM_KEY, data.claimId)
        }
        load()
      } else {
        setError(data.error || 'Claim failed.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setClaiming(false)
    }
  }, [amounts, load, pendingClaimId])

  // Not linked yet → guide to the wallet section above.
  if (state && !state.connected) {
    return (
      <p className="text-sm text-white/50">
        Link a wallet in <span className="text-white/70">Cross-site identity</span> above to claim
        ESMS on-chain.
      </p>
    )
  }

  const total = FIELDS.reduce((s, f) => s + (Number(amounts[f.key] || 0) || 0), 0)

  return (
    <div className="space-y-4">
      {/* On-chain balances */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIELDS.map(f => (
          <div key={f.key} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-xs uppercase tracking-wide text-white/40">{f.label}</div>
            <div className="mt-1 font-mono text-lg text-white/90">
              {state?.balances ? fmt(state.balances[f.key]) : '—'}
            </div>
          </div>
        ))}
      </div>
      {state?.connected && !state.balances && (
        <p className="text-xs text-white/40">
          On-chain balances unavailable — the contract may not be deployed yet.
        </p>
      )}

      {/* Claim form */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40">Claim to wallet</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FIELDS.map(f => (
            <label key={f.key} className="block">
              <span className="text-xs text-white/50">{f.label}</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amounts[f.key] ?? ''}
                onChange={e => setAmounts(a => ({ ...a, [f.key]: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-sm text-white/90 outline-none focus:border-purple-400/60"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button disabled={claiming || (!pendingClaimId && total <= 0)} onClick={claim}>
            {claiming ? 'Claiming…' : pendingClaimId ? 'Retry pending claim' : 'Claim to wallet'}
          </Button>
          <span className="text-xs text-white/40">Debits your off-chain balance.</span>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {notice && (
          <p className="mt-2 text-xs text-emerald-400">
            {notice.text}
            {notice.tx && (
              <>
                {' '}
                <a
                  href={`${EXPLORER}${notice.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  View tx →
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
