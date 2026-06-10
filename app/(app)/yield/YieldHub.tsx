'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Droplets,
  Box,
  Zap,
  Link2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react'
import { buildLocalSignInHref } from '@/lib/kitchen-signin'

interface YieldUser {
  id?: string
  name: string | null
  email: string | null
}

interface Balances {
  spirit: number
  essence: number
  matter: number
  substance: number
}

type SiteKey = 'agents' | 'kitchen'

interface SiteAccount {
  site: SiteKey
  label: string
  homeUrl: string
  balances: Balances
  canClaimDaily: boolean
  streak: number
  lastDailyClaimAt: string | null
  status: 'linked' | 'local-dev'
}

interface DesktopSessionResponse {
  mode: 'authenticated' | 'local-dev'
  userId: string
  apiKey: string | null
  balances: Balances
  accounts: SiteAccount[]
}

interface ClaimStatus {
  site: SiteKey
  kind: 'success' | 'error' | 'cooldown'
  message: string
}

const SIGN_IN_CALLBACK = '/yield?link=true'

function formatRelative(value: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function siteCopy(site: SiteKey) {
  if (site === 'agents') {
    return {
      title: 'Alchm Agents',
      tagline: 'agents.alchm.kitchen',
      accent: 'from-indigo-500 to-violet-500',
      ring: 'ring-indigo-500/30',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.18)]',
    }
  }
  return {
    title: 'Alchm Kitchen',
    tagline: 'alchm.kitchen',
    accent: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-500/30',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.18)]',
  }
}

export default function YieldHub({ user }: { user: YieldUser | null }) {
  const searchParams = useSearchParams()
  const cameFromDesktop = searchParams.get('link') === 'true'

  const [session, setSession] = useState<DesktopSessionResponse | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<SiteKey | null>(null)
  const [claimStatuses, setClaimStatuses] = useState<ClaimStatus[]>([])
  const [linking, setLinking] = useState(false)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)

  const signedIn = Boolean(user?.id)

  const refreshSession = useCallback(async () => {
    setLoadingSession(true)
    setError(null)
    try {
      const res = await fetch('/api/desktop/session', { cache: 'no-store' })
      if (!res.ok) throw new Error(`session ${res.status}`)
      const data = (await res.json()) as DesktopSessionResponse
      setSession(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load alchemical balances. Try again in a moment.'
      )
    } finally {
      setLoadingSession(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const handleClaim = useCallback(
    async (site: SiteKey) => {
      if (!signedIn || !session) return
      if (session.mode !== 'authenticated') return

      setClaiming(site)
      setClaimStatuses(prev => prev.filter(status => status.site !== site))

      try {
        const res = await fetch('/api/profile/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site }),
        })
        const data = await res.json().catch(() => ({}))

        if (res.status === 409) {
          setClaimStatuses(prev => [
            ...prev,
            {
              site,
              kind: 'cooldown',
              message: data.message || 'Already claimed today — comes back tomorrow.',
            },
          ])
        } else if (!res.ok) {
          throw new Error(data.error || `Claim failed (${res.status})`)
        } else {
          setClaimStatuses(prev => [
            ...prev,
            {
              site,
              kind: 'success',
              message: `+${Number(data.distribution?.spirit || 0).toFixed(2)} of each token landed.`,
            },
          ])
        }
      } catch (err) {
        setClaimStatuses(prev => [
          ...prev,
          {
            site,
            kind: 'error',
            message: err instanceof Error ? err.message : 'Claim failed unexpectedly.',
          },
        ])
      } finally {
        setClaiming(null)
        void refreshSession()
      }
    },
    [signedIn, session, refreshSession]
  )

  const handleLinkDesktop = useCallback(async () => {
    if (!signedIn) return
    setLinking(true)
    setLinkMessage(null)
    try {
      const res = await fetch('/api/desktop/session/link', { method: 'POST' })
      if (res.status === 401) {
        setLinkMessage('Sign in first to link the desktop app.')
        return
      }
      if (!res.ok) {
        throw new Error(`link ${res.status}`)
      }
      const data = await res.json()
      if (data?.deepLink) {
        window.location.href = data.deepLink as string
        setLinkMessage('Returning to Alchm Desktop…')
      } else {
        setLinkMessage('Linking succeeded, but no deep link was returned.')
      }
    } catch (err) {
      setLinkMessage(
        err instanceof Error ? err.message : 'Could not link to Alchm Desktop. Try again.'
      )
    } finally {
      setLinking(false)
    }
  }, [signedIn])

  const accounts = useMemo<SiteAccount[]>(() => {
    if (session?.accounts?.length) return session.accounts
    // Fallback: render placeholder cards so users see the layout while signed out.
    const empty: Balances = { spirit: 0, essence: 0, matter: 0, substance: 0 }
    return [
      {
        site: 'agents',
        label: 'Alchm Agents',
        homeUrl: 'https://agents.alchm.kitchen',
        balances: empty,
        canClaimDaily: false,
        streak: 0,
        lastDailyClaimAt: null,
        status: 'local-dev',
      },
      {
        site: 'kitchen',
        label: 'Alchm Kitchen',
        homeUrl: 'https://alchm.kitchen',
        balances: empty,
        canClaimDaily: false,
        streak: 0,
        lastDailyClaimAt: null,
        status: 'local-dev',
      },
    ]
  }, [session])

  return (
    <div className="min-h-screen bg-[#07020d] text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="space-y-3 border-b border-white/5 pb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-purple-300">
            <Sparkles className="w-3.5 h-3.5" /> Alchm Yield Hub
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-purple-200 to-amber-200">
            Claim your cosmic yield
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            One sign-in covers Alchm Agents and Alchm Kitchen. Claim each site&apos;s daily yield
            here, then optionally hand the same session off to the Alchm Desktop companion.
          </p>
          {cameFromDesktop && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-200">
              <Link2 className="w-3.5 h-3.5" />
              Sent from Alchm Desktop · finish the handshake below
            </div>
          )}
        </header>

        {!signedIn ? (
          <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8 text-center space-y-4">
            <ShieldCheck className="w-8 h-8 mx-auto text-purple-300" />
            <h2 className="text-2xl font-bold">Sign in to claim yield</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              The Planetary Agents and Alchm Kitchen accounts share a single Google login. Once
              signed in, both sites&apos; yields appear here.
            </p>
            <a
              href={buildLocalSignInHref(SIGN_IN_CALLBACK)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:brightness-110"
            >
              <Sparkles className="w-4 h-4" />
              Continue with Google
            </a>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-zinc-950/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold">
                  {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{user?.name || 'Operator'}</div>
                  <div className="text-xs text-zinc-500">
                    {user?.email || 'No email on session'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => void refreshSession()}
                disabled={loadingSession}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-white/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSession ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map(account => {
                const copy = siteCopy(account.site)
                const status = claimStatuses.find(item => item.site === account.site)
                const isClaiming = claiming === account.site
                const isClaimable =
                  account.status === 'linked' && account.canClaimDaily && !isClaiming

                return (
                  <article
                    key={account.site}
                    className={`rounded-2xl border border-white/5 bg-gradient-to-br ${copy.accent} bg-opacity-10 ${copy.glow} ring-1 ${copy.ring} p-6 space-y-5 backdrop-blur-sm`}
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, rgba(15,8,28,0.85) 0%, rgba(15,8,28,0.95) 100%)',
                    }}
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-extrabold">{copy.title}</h3>
                        <a
                          href={account.homeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
                        >
                          {copy.tagline}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${
                          account.status === 'linked'
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {account.status === 'linked' ? 'Linked' : 'Local'}
                      </span>
                    </header>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        {
                          label: 'Spirit',
                          val: account.balances.spirit,
                          icon: Sparkles,
                          tone: 'text-yellow-300',
                        },
                        {
                          label: 'Essence',
                          val: account.balances.essence,
                          icon: Droplets,
                          tone: 'text-blue-300',
                        },
                        {
                          label: 'Matter',
                          val: account.balances.matter,
                          icon: Box,
                          tone: 'text-orange-300',
                        },
                        {
                          label: 'Substance',
                          val: account.balances.substance,
                          icon: Zap,
                          tone: 'text-emerald-300',
                        },
                      ].map(stat => {
                        const Icon = stat.icon
                        return (
                          <div
                            key={stat.label}
                            className="rounded-lg border border-white/5 bg-zinc-950/60 px-3 py-2 text-center"
                          >
                            <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.tone}`} />
                            <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                              {stat.label}
                            </div>
                            <div className={`text-sm font-mono font-bold ${stat.tone}`}>
                              {Number(stat.val || 0).toFixed(2)}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 border-t border-white/5 pt-3">
                      <span>Last claim: {formatRelative(account.lastDailyClaimAt)}</span>
                      <span className="font-mono text-purple-300">Streak {account.streak}</span>
                    </div>

                    <button
                      onClick={() => void handleClaim(account.site)}
                      disabled={!isClaimable}
                      className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                        isClaimable
                          ? `bg-gradient-to-r ${copy.accent} text-white hover:brightness-110 shadow-[0_0_18px_rgba(139,92,246,0.25)]`
                          : 'bg-white/[0.04] text-zinc-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {isClaiming
                        ? 'Claiming…'
                        : account.status !== 'linked'
                          ? 'Link account to claim'
                          : account.canClaimDaily
                            ? `Claim ${copy.title} yield`
                            : 'Yield already claimed today'}
                    </button>

                    {status && (
                      <p
                        className={`text-xs ${
                          status.kind === 'success'
                            ? 'text-emerald-300'
                            : status.kind === 'cooldown'
                              ? 'text-amber-300'
                              : 'text-red-300'
                        }`}
                      >
                        {status.message}
                      </p>
                    )}
                  </article>
                )
              })}
            </div>

            <section className="rounded-2xl border border-white/5 bg-zinc-950/70 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-300" />
                    {cameFromDesktop ? 'Finish linking Alchm Desktop' : 'Link Alchm Desktop'}
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-md">
                    Sends a signed, 5-minute deep link to the installed Tauri companion so it can
                    use this signed-in session for syncing balances and claiming yield offline.
                  </p>
                </div>
                <button
                  onClick={() => void handleLinkDesktop()}
                  disabled={linking || session?.mode !== 'authenticated'}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:brightness-110 disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  {linking ? 'Generating…' : 'Approve & Link Desktop'}
                </button>
              </div>
              {linkMessage && (
                <p className="text-xs text-zinc-300 bg-zinc-900 border border-white/5 rounded-lg px-3 py-2">
                  {linkMessage}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
