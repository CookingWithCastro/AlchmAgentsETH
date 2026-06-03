'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

const FREE_FEATURES = [
  'Chat with 50+ historical & planetary agents',
  'Free model tier (fast, capable)',
  'Daily token yield + shared alchm.kitchen wallet',
  'Natal chart, tarot, runes & synthesis',
]

const ALCHEMIST_FEATURES = [
  'Everything in Free',
  'Premium models: Claude Sonnet & Opus, GPT-5.x',
  'Priority, higher-quality agent conversations',
  'Bring your own OpenAI / Anthropic key (optional)',
]

export default function PricingPage() {
  const [busy, setBusy] = useState(false)

  async function subscribe(interval: 'monthly' | 'yearly') {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      if (res.status === 401) {
        window.location.href = '/auth/signin?callbackUrl=/pricing'
        return
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#11091e] text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose your path</h1>
          <p className="mt-2 text-white/60">
            Planetary Agents is free to explore. Upgrade to Alchemist for premium AI models.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm uppercase tracking-wide text-white/40">Free</div>
            <div className="mt-1 text-3xl font-bold">
              $0<span className="text-base font-normal text-white/50">/mo</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/profile"
              className="mt-6 inline-block rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Continue free
            </a>
          </div>

          {/* Alchemist */}
          <div className="relative rounded-2xl border border-purple-400/40 bg-gradient-to-b from-purple-600/15 to-fuchsia-600/10 p-6">
            <div className="absolute -top-3 right-6 rounded-full bg-purple-600 px-3 py-1 text-xs font-medium">
              Premium
            </div>
            <div className="text-sm uppercase tracking-wide text-purple-200/70">Alchemist</div>
            <div className="mt-1 text-3xl font-bold">
              $12<span className="text-base font-normal text-white/50">/mo</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              {ALCHEMIST_FEATURES.map(f => (
                <li key={f} className="flex gap-2">
                  <span className="text-purple-300">✦</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => subscribe('monthly')}>
                Subscribe Monthly
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => subscribe('yearly')}>
                Yearly (save more)
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Prefer your own key? Connect OpenAI/Anthropic on your{' '}
              <a href="/account" className="underline">
                account page
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
