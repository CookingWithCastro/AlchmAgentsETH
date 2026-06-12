'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ByokPanel } from './ByokPanel'
import { EsmsOnchain } from './EsmsOnchain'
import dynamic from 'next/dynamic'

// Privy's SDK is a ~1.4MB client chunk — load it only when this panel
// actually renders, never in the route's first-load bundle.
const PrivyConnect = dynamic(() => import('./PrivyConnect').then(m => m.PrivyConnect), {
  ssr: false,
  loading: () => (
    <div className="text-sm text-muted-foreground animate-pulse">Loading identity panel…</div>
  ),
})

type Props = {
  tier: 'free' | 'alchemist' | 'master'
  hasActiveSub: boolean
  premiumViaKitchen: boolean
  email: string | null
  name: string | null
}

export function AccountClient({ tier, hasActiveSub, premiumViaKitchen, email, name }: Props) {
  const [busy, setBusy] = useState(false)
  const isPremium = tier !== 'free'

  async function startCheckout(interval: 'monthly' | 'yearly') {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  async function openPortal() {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#11091e] text-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-sm text-white/50">{name || email}</p>

        {/* Subscription */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/40">Plan</div>
              <div className="text-lg font-semibold capitalize">
                {tier === 'master' ? 'Master (full access)' : tier}
              </div>
            </div>
            <span
              className={
                isPremium
                  ? 'rounded-full bg-purple-600/30 px-3 py-1 text-xs text-purple-200'
                  : 'rounded-full bg-white/10 px-3 py-1 text-xs text-white/60'
              }
            >
              {isPremium ? 'Premium' : 'Free'}
            </span>
          </div>

          {!isPremium ? (
            <div className="mt-4">
              <p className="text-sm text-white/60">
                Upgrade to Alchemist to unlock premium models — Claude Sonnet/Opus and GPT-5.x —
                across agent chat.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button disabled={busy} onClick={() => startCheckout('monthly')}>
                  Upgrade — Monthly
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => startCheckout('yearly')}>
                  Yearly
                </Button>
                <Link href="/pricing" className="self-center text-xs text-white/50 underline">
                  Compare plans
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {hasActiveSub ? (
                <Button variant="outline" disabled={busy} onClick={openPortal}>
                  Manage billing
                </Button>
              ) : premiumViaKitchen ? (
                <p className="text-sm text-white/60">
                  Premium via your alchm.kitchen subscription.{' '}
                  <a href="https://alchm.kitchen/account" className="text-purple-300 underline">
                    Manage on alchm.kitchen →
                  </a>
                </p>
              ) : (
                <p className="text-sm text-white/60">Full access granted by your role.</p>
              )}
            </div>
          )}
        </section>

        {/* BYOK */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Connect your own AI keys</h2>
          <p className="mt-1 text-sm text-white/60">
            Bring your own OpenAI or Anthropic API key to run premium models on your own account.
            Optional — a subscription also unlocks premium models.
          </p>
          <div className="mt-4">
            <ByokPanel />
          </div>
        </section>

        {/* Cross-site identity (Privy) */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Cross-site identity</h2>
          <p className="mt-1 text-sm text-white/60">
            Link a portable Alchm identity (via Privy) — the same identity on alchm.kitchen, so your
            account is unified across both sites. Email, Google, or wallet.
          </p>
          <div className="mt-4">
            <PrivyConnect />
          </div>
        </section>

        {/* On-chain ESMS (claim/mirror) */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">ESMS on-chain</h2>
          <p className="mt-1 text-sm text-white/60">
            Claim your Spirit · Essence · Matter · Substance to your Base wallet as soulbound
            tokens. Your off-chain balance stays authoritative — claiming mirrors it on-chain.
          </p>
          <div className="mt-4">
            <EsmsOnchain />
          </div>
        </section>

        {/* Cross-link to the kitchen */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Across the Alchm ecosystem</h2>
          <p className="mt-1 text-sm text-white/60">
            Your token wallet and login are shared with alchm.kitchen — same account, culinary side.
          </p>
          <a
            href="https://alchm.kitchen/profile"
            className="mt-3 inline-block text-sm text-purple-300 underline"
          >
            Open your Kitchen profile →
          </a>
        </section>
      </div>
    </div>
  )
}
