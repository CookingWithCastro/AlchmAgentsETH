'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Activity, ShieldAlert, Target, Flame, ShoppingBag } from 'lucide-react'

interface TokenBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
}

interface EconomyDashboardProps {
  userId?: string
  initialBalances?: TokenBalances
  initialHasClaimedYield: boolean
}

export default function EconomyDashboard({
  userId,
  initialBalances,
  initialHasClaimedYield,
}: EconomyDashboardProps) {
  const [balances, setBalances] = useState<TokenBalances>(
    initialBalances || { spirit: 0, essence: 0, matter: 0, substance: 0 }
  )
  const [hasClaimedYield, setHasClaimedYield] = useState(initialHasClaimedYield)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimStatus, setClaimStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleClaimYield = async () => {
    if (!userId) {
      setClaimStatus({ type: 'error', message: 'You must be logged in to claim yield.' })
      return
    }

    setIsClaiming(true)
    setClaimStatus(null)

    try {
      const response = await fetch('/api/economy/yield', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        if (data.balances) {
          setBalances(data.balances)
        }
        setHasClaimedYield(true)
        setClaimStatus({ type: 'success', message: 'Cosmic yield claimed successfully!' })
      } else if (response.status === 409 || data.error === 'Cooldown active') {
        setHasClaimedYield(true)
        setClaimStatus({ type: 'error', message: 'You have already claimed your yield today.' })
      } else {
        throw new Error(data.error || 'Failed to claim yield')
      }
    } catch (err: any) {
      console.error('Error claiming yield:', err)
      // Fallback for local development if alchm.kitchen proxy fails
      if (err.message.includes('fetch') || err.message.includes('Unexpected')) {
        setClaimStatus({
          type: 'error',
          message:
            'Local proxy unreachable. Ensure alchm.kitchen is running or proxy is configured.',
        })
      } else {
        setClaimStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' })
      }
    } finally {
      setIsClaiming(false)
    }
  }

  // Visual layout for tokens
  const tokenStats = [
    {
      label: 'Spirit',
      val: balances.spirit,
      bg: 'bg-alchemical-spirit',
      border: 'border-alchemical-spirit',
    },
    {
      label: 'Essence',
      val: balances.essence,
      bg: 'bg-alchemical-essence',
      border: 'border-alchemical-essence',
    },
    {
      label: 'Matter',
      val: balances.matter,
      bg: 'bg-alchemical-matter',
      border: 'border-alchemical-matter',
    },
    {
      label: 'Substance',
      val: balances.substance,
      bg: 'bg-alchemical-substance',
      border: 'border-alchemical-substance',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Treasury Balances */}
      <div className="bg-surface border border-border p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-zinc-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Current Balances
          </h2>
          {!userId && (
            <span className="text-xs px-2 py-1 bg-red-950/40 text-red-400 border border-red-900/50 rounded-full">
              Guest Mode (Read Only)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tokenStats.map(stat => (
            <div
              key={stat.label}
              className={`p-4 rounded-lg bg-background border ${stat.border}/30 relative overflow-hidden flex flex-col items-center justify-center space-y-2`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${stat.bg} opacity-50`} />
              <span className="text-sm font-medium text-zinc-400">{stat.label}</span>
              <span className="text-3xl font-bold text-white tracking-tight">
                {Math.floor(stat.val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spend CTA → ESMS Bazaar */}
      <Link
        href="/shop"
        className="group flex items-center justify-between gap-4 bg-surface border border-border hover:border-amber-500/40 p-5 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-amber-500/10 rounded-full">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-200">Spend in the ESMS Bazaar</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Burn your reserves on alchemical goods, premium recipes, and real food.
            </p>
          </div>
        </div>
        <span className="text-amber-400 text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cosmic Yield Panel */}
        <div className="bg-surface border border-border p-6 rounded-xl space-y-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -z-10 blur-2xl" />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-200">Daily Cosmic Yield</h3>
            <p className="text-sm text-zinc-400">
              Agentic users generate a passive yield of ESMS tokens based on planetary alignments.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-end space-y-4">
            {claimStatus && (
              <div
                className={`p-3 text-sm rounded-md flex items-start gap-2 ${
                  claimStatus.type === 'success'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {claimStatus.type === 'success' ? (
                  <Sparkles className="w-4 h-4 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 mt-0.5" />
                )}
                {claimStatus.message}
              </div>
            )}

            <button
              onClick={handleClaimYield}
              disabled={isClaiming || hasClaimedYield || !userId}
              className={`w-full py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                hasClaimedYield
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              } disabled:opacity-80`}
            >
              {isClaiming ? (
                <Activity className="w-5 h-5 animate-spin" />
              ) : hasClaimedYield ? (
                <>Yield Claimed (Available Tomorrow)</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Claim Cosmic Yield
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upcoming Mechanics Preview */}
        <div className="bg-surface border border-border p-6 rounded-xl space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-200">Earn Mechanics</h3>
            <p className="text-sm text-zinc-400">Future pathways to increase your ESMS reserves.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/50 flex items-start gap-4 opacity-70">
              <div className="p-2 bg-blue-900/30 rounded-full">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-300">Agent Quests</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Complete alchemical tasks generated by the Planetary Council for massive payouts.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/50 flex items-start gap-4 opacity-70">
              <div className="p-2 bg-orange-900/30 rounded-full">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-300">Streak Multipliers</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Claim your yield for 7 consecutive days to permanently upgrade your base earn
                  rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
