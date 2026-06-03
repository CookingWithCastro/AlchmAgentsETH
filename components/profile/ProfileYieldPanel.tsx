'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'
import type { ProfileYieldState, YieldSite } from '@/lib/profile-yield'

type ClaimMessage = {
  site: YieldSite
  kind: 'success' | 'error' | 'cooldown'
  text: string
}

type Props = {
  initialWallet: ProfileYieldState | null
}

const tokenMeta = [
  { key: 'spirit', label: 'Spirit', icon: Flame, className: 'profile-token-spirit' },
  { key: 'essence', label: 'Essence', icon: Droplets, className: 'profile-token-essence' },
  { key: 'matter', label: 'Matter', icon: Box, className: 'profile-token-matter' },
  { key: 'substance', label: 'Substance', icon: Zap, className: 'profile-token-substance' },
] as const

function formatDate(value: string | null): string {
  if (!value) return 'Not claimed yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function siteTone(site: YieldSite) {
  return site === 'agents' ? 'profile-site-agents' : 'profile-site-kitchen'
}

export function ProfileYieldPanel({ initialWallet }: Props) {
  const [wallet, setWallet] = useState<ProfileYieldState | null>(initialWallet)
  const [loading, setLoading] = useState(!initialWallet)
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState<YieldSite | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ClaimMessage[]>([])

  const totalBalance = useMemo(() => {
    if (!wallet) return 0
    return (
      wallet.balances.spirit +
      wallet.balances.essence +
      wallet.balances.matter +
      wallet.balances.substance
    )
  }, [wallet])

  const refreshWallet = useCallback(async (mode: 'initial' | 'manual' = 'manual') => {
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/profile/wallet', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || `Wallet failed (${response.status})`)
      }

      setWallet(data as ProfileYieldState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh profile wallet.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!initialWallet) {
      void refreshWallet('initial')
    }
  }, [initialWallet, refreshWallet])

  const claimYield = useCallback(
    async (site: YieldSite) => {
      setClaiming(site)
      setMessages(prev => prev.filter(message => message.site !== site))
      setError(null)

      try {
        const response = await fetch('/api/profile/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site }),
        })
        const data = await response.json().catch(() => ({}))

        if (response.status === 409) {
          setMessages(prev => [
            ...prev,
            {
              site,
              kind: 'cooldown',
              text: data?.message || 'Daily yield has already been claimed.',
            },
          ])
          await refreshWallet()
          return
        }

        if (!response.ok) {
          throw new Error(data?.error || `Claim failed (${response.status})`)
        }

        if (data?.wallet) {
          setWallet(data.wallet as ProfileYieldState)
        } else {
          await refreshWallet()
        }

        const distribution = data?.distribution || {}
        const spirit = Number(distribution.spirit || 0)
        setMessages(prev => [
          ...prev,
          {
            site,
            kind: 'success',
            text: `Yield claimed: +${spirit.toFixed(2)} each token.`,
          },
        ])
      } catch (err) {
        setMessages(prev => [
          ...prev,
          {
            site,
            kind: 'error',
            text: err instanceof Error ? err.message : 'Claim failed unexpectedly.',
          },
        ])
      } finally {
        setClaiming(null)
      }
    },
    [refreshWallet]
  )

  return (
    <section className="profile-yield-panel" aria-labelledby="profile-yield-title">
      <div className="profile-yield-header">
        <div>
          <div className="profile-yield-kicker">
            <Wallet size={15} />
            Agents profile
          </div>
          <h2 id="profile-yield-title">Shared ESMS Wallet</h2>
          <p>
            One Spirit, Essence, Matter, and Substance balance across agents.alchm.kitchen and
            alchm.kitchen.
          </p>
        </div>
        <button
          type="button"
          className="profile-yield-refresh"
          onClick={() => void refreshWallet()}
          disabled={refreshing || loading}
          aria-label="Refresh profile wallet"
        >
          <RefreshCw size={16} className={refreshing || loading ? 'spinning' : ''} />
        </button>
      </div>

      {error && <div className="profile-yield-error">{error}</div>}

      <div className="profile-yield-balance">
        <div className="profile-yield-total">
          <div className="profile-yield-total-value">
            {loading ? <Loader2 className="spinning" size={24} /> : totalBalance.toFixed(2)}
          </div>
          <div className="profile-yield-total-label">Total ESMS</div>
        </div>

        <div className="profile-yield-token-grid">
          {tokenMeta.map(token => {
            const Icon = token.icon
            const value = wallet?.balances[token.key] ?? 0

            return (
              <div key={token.key} className={`profile-yield-token ${token.className}`}>
                <Icon size={17} />
                <span>{token.label}</span>
                <strong>{loading ? '...' : value.toFixed(2)}</strong>
              </div>
            )
          })}
        </div>
      </div>

      <div className="profile-site-grid">
        {(wallet?.accounts || []).map(account => {
          const message = messages.find(item => item.site === account.site)
          const isClaiming = claiming === account.site
          const canClaim = account.status === 'linked' && account.canClaimDaily && !isClaiming

          return (
            <article key={account.site} className={`profile-site-card ${siteTone(account.site)}`}>
              <header>
                <div>
                  <h3>{account.label}</h3>
                  <a href={account.profileUrl} target="_blank" rel="noreferrer">
                    {account.site === 'agents'
                      ? 'agents.alchm.kitchen/profile'
                      : 'alchm.kitchen/profile'}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <span className="profile-site-status">
                  <CheckCircle2 size={13} />
                  Linked
                </span>
              </header>

              <div className="profile-site-meta">
                <span>Last claim</span>
                <strong>{formatDate(account.lastDailyClaimAt)}</strong>
              </div>

              <button
                type="button"
                className="profile-site-claim"
                onClick={() => void claimYield(account.site)}
                disabled={!canClaim}
              >
                {isClaiming ? (
                  <>
                    <Loader2 size={15} className="spinning" />
                    Claiming
                  </>
                ) : account.canClaimDaily ? (
                  <>
                    <Sparkles size={15} />
                    Claim daily yield
                  </>
                ) : (
                  'Claimed today'
                )}
              </button>

              {message && (
                <p className={`profile-site-message profile-site-message-${message.kind}`}>
                  {message.text}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
