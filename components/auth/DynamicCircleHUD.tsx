'use client'

import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useCircleAppKit } from '@/hooks/useCircleAppKit'
import { Card } from '@/components/ui/card'
import { Coins, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DynamicCircleHUD() {
  const { primaryWallet } = useDynamicContext()
  const { balances, isInitializing, refreshBalances } = useCircleAppKit()

  return (
    <Card className="fixed bottom-4 left-4 z-50 p-3 shadow-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-white rounded-xl min-w-[240px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
          <h4 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">Operator Auth</h4>
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
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">Unified USDC Liquidity</span>
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
        </div>
      </div>
    </Card>
  )
}
