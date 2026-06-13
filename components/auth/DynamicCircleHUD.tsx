'use client'

import { useState, useEffect } from 'react'
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useCircleAppKit } from '@/hooks/useCircleAppKit'
import { Card } from '@/components/ui/card'
import { Coins, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorldIdButton } from '@/components/world/WorldIdButton'

export function DynamicCircleHUD() {
  const { primaryWallet } = useDynamicContext()
  const { balances, isInitializing, refreshBalances } = useCircleAppKit()
  const [isVerified, setIsVerified] = useState(false)
  const [nullifier, setNullifier] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('world_id_verified')
      const storedNullifier = localStorage.getItem('world_id_nullifier')
      if (stored === 'true') {
        setIsVerified(true)
        setNullifier(storedNullifier)
      }
    }
  }, [])

  const handleVerified = (nullifierHash: string) => {
    setIsVerified(true)
    setNullifier(nullifierHash)
    localStorage.setItem('world_id_verified', 'true')
    localStorage.setItem('world_id_nullifier', nullifierHash)
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 p-3 shadow-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-white rounded-xl min-w-[240px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
          <h4 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            Operator Auth
          </h4>
          {primaryWallet && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-500 hover:text-white"
              onClick={() => refreshBalances()}
              disabled={isInitializing}
            >
              <RefreshCw className={`h-3 w-3 ${isInitializing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DynamicWidget />

          {primaryWallet && (
            <div className="mt-2 pt-2 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Coins size={14} className="text-emerald-400" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">
                  Unified USDC Liquidity
                </span>
              </div>

              {isInitializing ? (
                <div className="flex items-center gap-2 text-zinc-500 py-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-xs italic">Syncing Circle...</span>
                </div>
              ) : balances && balances.length > 0 ? (
                <div className="space-y-1">
                  {balances.map((balance: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">{balance.chainName}</span>
                      <span className="font-mono text-emerald-400">
                        {parseFloat(balance.amount).toFixed(2)} {balance.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-600">No USDC detected in Arc Kit</span>
              )}
            </div>
          )}

          {primaryWallet && (
            <div className="mt-2 pt-2 border-t border-zinc-800/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  {isVerified ? (
                    <ShieldCheck size={14} className="text-emerald-400" />
                  ) : (
                    <ShieldAlert size={14} className="text-amber-500" />
                  )}
                  <span className="text-[10px] font-medium uppercase tracking-tight">
                    World ID Proof
                  </span>
                </div>
                {isVerified ? (
                  <button
                    onClick={() => {
                      setIsVerified(false)
                      setNullifier(null)
                      localStorage.removeItem('world_id_verified')
                      localStorage.removeItem('world_id_nullifier')
                    }}
                    className="text-[9px] text-zinc-500 hover:text-zinc-300 underline"
                  >
                    Reset
                  </button>
                ) : (
                  <span className="text-[9px] text-zinc-500 italic">Required for VIP</span>
                )}
              </div>

              {!isVerified ? (
                <WorldIdButton
                  signal={primaryWallet.address}
                  onVerified={handleVerified}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all active:scale-[0.98]"
                />
              ) : (
                <div className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/20 border border-emerald-900/30 rounded p-1.5 text-center break-all">
                  nullifier: {nullifier?.slice(0, 10)}...{nullifier?.slice(-8)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
