'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import {
  Sparkles,
  Crown,
  Zap,
  Gem,
  ArrowRight,
  Check,
  AlertCircle,
  Coins,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'

// Privy's SDK is a ~1.4MB client chunk — load it only when this panel
// actually renders, never in the route's first-load bundle.
const PrivyConnect = dynamic(
  () => import('@/components/account/PrivyConnect').then(m => m.PrivyConnect),
  {
    ssr: false,
    loading: () => (
      <div className="text-sm text-muted-foreground animate-pulse">Loading identity panel…</div>
    ),
  }
)

type Props = {
  tier: 'free' | 'alchemist' | 'master'
  hasActiveSub: boolean
  premiumViaKitchen: boolean
  email: string | null
  name: string | null
}

const PREMIUM_FEATURES = [
  {
    title: 'Double Daily ESMS Yield',
    desc: 'Receive double daily ESMS tokens (20/day total instead of 10) to fuel alchemical actions.',
    icon: Zap,
  },
  {
    title: 'Premium AI Brains',
    desc: 'Access advanced model classes including Claude 3.5 Sonnet, Claude 3 Opus, and GPT-5.x.',
    icon: Sparkles,
  },
  {
    title: 'Priority Evolution',
    desc: 'Elevated priority and higher quality response windows for deep, complex agentic reasoning.',
    icon: TrendingUp,
  },
  {
    title: 'Unlimited Custom Agents',
    desc: 'Birth and train custom agents at the rune forge with specialized traits and infinite evolution.',
    icon: Crown,
  },
]

const TOKEN_PACKAGES = [
  {
    tier: '5' as const,
    name: 'Initiate Box',
    tokens: 100,
    price: '$5',
    bonus: null,
    icon: Sparkles,
    glow: 'border-yellow-500/20 shadow-[0_0_20px_rgba(250,204,21,0.05)] hover:border-yellow-400/40',
    badge: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  },
  {
    tier: '10' as const,
    name: 'Adept Sphere',
    tokens: 240,
    price: '$10',
    bonus: '20% Bonus',
    icon: Zap,
    glow: 'border-blue-500/25 shadow-[0_0_20px_rgba(96,165,250,0.05)] hover:border-blue-400/40',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  {
    tier: '25' as const,
    name: 'Alchemist Chest',
    tokens: 700,
    price: '$25',
    bonus: '40% Bonus',
    icon: Crown,
    glow: 'border-purple-500/30 shadow-[0_0_25px_rgba(139,92,246,0.1)] hover:border-purple-400/50',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  {
    tier: '50' as const,
    name: 'Philosopher Vault',
    tokens: 1600,
    price: '$50',
    bonus: '60% Bonus',
    icon: Gem,
    glow: 'border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.15)] hover:border-fuchsia-400/60',
    badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/25',
  },
]

function UpgradeClientContent({ tier, hasActiveSub, premiumViaKitchen, email, name }: Props) {
  const searchParams = useSearchParams()
  const purchaseStatus = searchParams.get('purchase')
  const tokensPurchased = searchParams.get('tokens')
  const checkoutStatus = searchParams.get('checkout')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPremium = tier !== 'free'

  async function subscribe(interval: 'monthly' | 'yearly') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      if (res.status === 401) {
        window.location.href = '/auth/signin?callbackUrl=/upgrade'
        return
      }
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to start subscription checkout')
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned from server')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during subscription setup')
      setBusy(false)
    }
  }

  async function buyTokens(tier: '5' | '10' | '25' | '50') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (res.status === 401) {
        window.location.href = '/auth/signin?callbackUrl=/upgrade'
        return
      }
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to start token purchase checkout')
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned from server')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during token checkout setup')
      setBusy(false)
    }
  }

  async function openPortal() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to open billing portal')
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred while opening the billing portal')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen text-white relative py-12 px-4 md:px-8">
      {/* Background radial overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-nebula opacity-70" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
            Upgrade & Token Store
          </h1>
          <p className="text-indigo-200/60 max-w-2xl mx-auto text-sm md:text-base">
            Power your alchemical journey. Elevate your consciousness tier for premium AI access and
            double daily yields, or acquire extra cosmic tokens.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-xs text-purple-300">
            <ShieldCheck size={14} />
            <span>Currently logged in as {name || email}</span>
          </div>
        </div>

        {/* Status Messages */}
        {purchaseStatus === 'success' && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 flex items-start gap-3 max-w-3xl mx-auto">
            <Check className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm md:text-base">Purchase Successful!</h4>
              <p className="text-xs md:text-sm text-emerald-300/80 mt-0.5">
                Successfully acquired {tokensPurchased || 'your'} Cosmic ESMS tokens. Your off-chain
                balance has been updated and synchronized with your kitchen wallet.
              </p>
            </div>
          </div>
        )}

        {purchaseStatus === 'cancelled' && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70 flex items-start gap-3 max-w-3xl mx-auto">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm md:text-base">Purchase Cancelled</h4>
              <p className="text-xs md:text-sm text-white/50 mt-0.5">
                Your token purchase checkout session was cancelled. No charges were made.
              </p>
            </div>
          </div>
        )}

        {checkoutStatus === 'success' && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-purple-200 flex items-start gap-3 max-w-3xl mx-auto">
            <Check className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm md:text-base">Evolution Commenced!</h4>
              <p className="text-xs md:text-sm text-purple-200/80 mt-0.5">
                Your Alchemist subscription is now active! Enjoy premium intelligence models (Claude
                Opus/Sonnet) and double daily yield multipliers.
              </p>
            </div>
          </div>
        )}

        {checkoutStatus === 'cancelled' && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70 flex items-start gap-3 max-w-3xl mx-auto">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm md:text-base">Checkout Cancelled</h4>
              <p className="text-xs md:text-sm text-white/50 mt-0.5">
                Your Alchemist subscription checkout session was cancelled. Feel free to upgrade
                when you are ready.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 flex items-start gap-3 max-w-3xl mx-auto">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm md:text-base">System Alert</h4>
              <p className="text-xs md:text-sm text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Upgrade Dashboard Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscription Card */}
          <div className="relative rounded-2xl border border-purple-400/30 bg-gradient-to-b from-purple-950/20 via-background to-background p-6 md:p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(139,92,246,0.1)] lg:col-span-1">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-purple-600/90 text-white text-[10px] uppercase font-bold tracking-wider animate-pulse">
              Premium Tier
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold font-serif tracking-wide text-purple-200">
                  Alchemist
                </h3>
                <p className="text-xs text-purple-300/50 mt-1">Full access subscription</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$12</span>
                <span className="text-sm text-indigo-300/50">/month</span>
              </div>

              <hr className="border-purple-500/25" />

              <ul className="space-y-4">
                {PREMIUM_FEATURES.map(feat => {
                  const Icon = feat.icon
                  return (
                    <li key={feat.title} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={12} className="text-purple-300" />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-indigo-100">{feat.title}</h5>
                        <p className="text-[11px] text-indigo-200/60 mt-0.5 leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-purple-500/15 space-y-4">
              {!isPremium ? (
                <div className="flex flex-col gap-2.5">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md glow-purple text-xs h-10 font-bold"
                    disabled={busy}
                    onClick={() => subscribe('monthly')}
                  >
                    Subscribe Monthly
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-purple-500/20 text-purple-200 hover:bg-white/10 text-xs h-10"
                    disabled={busy}
                    onClick={() => subscribe('yearly')}
                  >
                    Subscribe Yearly (Save more)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-center">
                    <p className="text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Alchemist Plan Active</span>
                    </p>
                  </div>
                  {hasActiveSub ? (
                    <Button
                      variant="outline"
                      className="w-full bg-white/5 border-purple-500/20 text-purple-200 hover:bg-white/10 text-xs h-10"
                      disabled={busy}
                      onClick={openPortal}
                    >
                      Manage billing
                    </Button>
                  ) : premiumViaKitchen ? (
                    <p className="text-[11px] text-indigo-300/60 text-center leading-relaxed">
                      Premium is managed via your alchm.kitchen subscription.{' '}
                      <a
                        href="https://alchm.kitchen/account"
                        className="text-purple-300 underline font-medium block mt-1 hover:text-purple-200"
                      >
                        Manage on alchm.kitchen →
                      </a>
                    </p>
                  ) : (
                    <p className="text-[11px] text-indigo-300/60 text-center leading-relaxed">
                      Full access granted by your admin role.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Token Purchase Column */}
          <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-300">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif text-indigo-200">
                    Cosmic Tokens Packages
                  </h3>
                  <p className="text-xs text-indigo-200/50">
                    One-time purchase · Spends equally across Spirit, Essence, Matter, Substance
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TOKEN_PACKAGES.map(pkg => {
                  const Icon = pkg.icon
                  return (
                    <div
                      key={pkg.name}
                      className={`relative rounded-xl border p-5 flex flex-col justify-between bg-black/20 hover:bg-white/[0.02] transition-all shadow-md group ${pkg.glow}`}
                    >
                      {pkg.bonus && (
                        <span
                          className={`absolute top-3 right-3 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${pkg.badge}`}
                        >
                          {pkg.bonus}
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon size={14} className="text-indigo-300" />
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white font-serif">{pkg.name}</h4>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-indigo-200">
                              {pkg.tokens}
                            </span>
                            <span className="text-xs text-indigo-300/40 font-mono uppercase">
                              ESMS Tokens
                            </span>
                          </div>
                          <p className="text-[10px] text-indigo-200/50 mt-1 leading-relaxed">
                            Grants {pkg.tokens / 4} each of Spirit, Essence, Matter, and Substance.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-white/90">{pkg.price}</span>
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-semibold h-8 shadow-sm"
                          disabled={busy}
                          onClick={() => buyTokens(pkg.tier)}
                        >
                          Buy tokens
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Privy Cross-Site Identity / EVM Wallet Area */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-300">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif text-emerald-200">
                    Cross-Site Identity & Wallet
                  </h3>
                  <p className="text-xs text-emerald-200/50">
                    Link your Privy EVM wallet (Base) for unified cross-site tokens and fiat on-ramp
                    funding
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/25 p-5">
                <p className="text-xs text-indigo-200/70 mb-4 leading-relaxed">
                  Link a portable Alchm identity (via Privy) to unify your credentials and token
                  wallets across both planetary_agents and alchm.kitchen. This allows you to fund
                  your Base wallet using Privy's fiat on-ramp.
                </p>
                <PrivyConnect />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UpgradeClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#11091e] text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <UpgradeClientContent {...props} />
    </Suspense>
  )
}
