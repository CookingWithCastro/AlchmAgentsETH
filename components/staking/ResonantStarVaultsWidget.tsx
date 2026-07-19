'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BRIGHT_STAR_AGENTS } from './StarAgentChatPanel'
import { ELEMENT_COLOR, ESMS_LABEL } from '@/lib/staking/ui'
import { Button } from '@/components/ui/button'
import { Stars, Sparkles, ArrowRight, Flame, ShieldCheck, Coins } from 'lucide-react'

export function ResonantStarVaultsWidget() {
  const [starPositions, setStarPositions] = useState<
    Record<string, { altitude: number; isRisen: boolean; effectiveApy: number; multiplier: number }>
  >({})

  useEffect(() => {
    fetch('/api/planetary-positions')
      .then(r => r.json())
      .then(data => {
        if (data?.starPositions && Array.isArray(data.starPositions)) {
          const map: Record<string, any> = {}
          for (const s of data.starPositions) {
            map[s.name.toLowerCase()] = s
          }
          setStarPositions(map)
        }
      })
      .catch(err => console.warn('Failed to fetch star positions:', err))
  }, [])
  return (
    <section className="relative py-20 bg-gradient-to-b from-black via-obsidian-deep/90 to-[#070818] border-t border-white/10 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-widest">
            <Stars className="w-3.5 h-3.5" /> Pentacle Star Vaults · Live Sky Integration
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight text-white">
            Most Resonant Stars of the Moment
          </h2>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
            Stake USDC on real stars on Circle Arc testnet. As planets transit your natal chart and
            stars cross your local horizon, earn multiplicative ESMS elemental yield (Spirit,
            Essence, Matter, Substance).
          </p>
        </div>

        {/* 4 Cards Grid of Most Resonant Stars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BRIGHT_STAR_AGENTS.map(star => (
            <div
              key={star.hipId}
              className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 bg-black/40 shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]"
                      style={{ background: ELEMENT_COLOR[star.element] }}
                    />
                    <span className="font-bold text-white text-lg tracking-wide">{star.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                    {star.apy}% APY
                  </span>
                </div>

                <p className="text-xs text-purple-200/90 font-mono italic">
                  &ldquo;{star.quote}&rdquo;
                </p>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {star.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Yield Token:</span>
                  <span className="text-amber-300 font-bold">
                    {ESMS_LABEL[star.esmsId]} ({star.element})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link href={`/pentacles/star-agents`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-500/40 hover:bg-purple-500/20 text-purple-200 text-xs font-mono"
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> Chat
                    </Button>
                  </Link>
                  <Link href="/pentacles">
                    <Button
                      size="sm"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono"
                    >
                      <Coins className="w-3 h-3 mr-1" /> Stake
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-obsidian-deep to-amber-950/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Flame className="w-5 h-5 text-amber-400" /> Enter the Pentacle Star Vaults
            </h3>
            <p className="text-xs md:text-sm text-zinc-300 max-w-xl">
              11 Pentacle Sky Zones host aspect-gated liquidity pools. Connect your wallet, switch
              to Circle Arc, and begin staking spirit-essence-matter-substance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/pentacles/star-agents">
              <Button
                variant="outline"
                className="border-purple-500/50 hover:bg-purple-500/20 text-purple-200 font-mono text-sm px-6 py-6 rounded-xl"
              >
                Consult Star Agents
              </Button>
            </Link>
            <Link href="/pentacles">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm px-6 py-6 rounded-xl shadow-lg flex items-center gap-2">
                Launch Pentacles <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ResonantStarVaultsWidget
