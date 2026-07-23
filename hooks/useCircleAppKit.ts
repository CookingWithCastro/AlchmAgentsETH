'use client'

import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { AppKit } from '@circle-fin/app-kit'
import { useState, useEffect, useCallback } from 'react'

export function useCircleAppKit() {
  const { primaryWallet } = useDynamicContext()
  const [appKit, setAppKit] = useState<AppKit | null>(null)
  const [adapter, setAdapter] = useState<any>(null)
  const [balances, setBalances] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const initArcAppKit = useCallback(async () => {
    if (!primaryWallet || appKit) return

    setIsInitializing(true)
    try {
      // 2. Extract standard EIP-1193 provider from Dynamic
      const provider = await (primaryWallet.connector as any).getProvider()

      // 3. Create the Viem Adapter
      const newAdapter = await createViemAdapterFromProvider({
        provider: provider as any, // Cast to any as viem versions might have slight typing diffs
      })

      // 4. Initialize the App Kit
      const newAppKit = new AppKit()

      setAppKit(newAppKit)
      setAdapter(newAdapter)

      // 5. Query unified balances across chains
      const balanceResult = await newAppKit.unifiedBalance.getBalances({
        token: 'USDC',
        sources: { adapter: newAdapter },
      })

      const formattedBalances = balanceResult.breakdown.flatMap(accountBreakdown =>
        accountBreakdown.breakdown.map(chainBreakdown => ({
          chainName: chainBreakdown.chain,
          amount: chainBreakdown.confirmedBalance,
          symbol: 'USDC',
        }))
      )

      setBalances(formattedBalances)
      console.log('Unified USDC balances:', formattedBalances)
    } catch (error) {
      console.error('Failed to initialize Circle App Kit:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [primaryWallet, appKit])

  useEffect(() => {
    if (!primaryWallet) {
      setAppKit(null)
      setAdapter(null)
      setBalances(null)
      return
    }

    if (!appKit && !isInitializing) {
      initArcAppKit()
    }
  }, [primaryWallet, appKit, isInitializing, initArcAppKit])

  return {
    appKit,
    balances,
    isInitializing,
    refreshBalances: async () => {
      if (appKit && adapter) {
        try {
          const balanceResult = await appKit.unifiedBalance.getBalances({
            token: 'USDC',
            sources: { adapter },
          })

          const formattedBalances = balanceResult.breakdown.flatMap(accountBreakdown =>
            accountBreakdown.breakdown.map(chainBreakdown => ({
              chainName: chainBreakdown.chain,
              amount: chainBreakdown.confirmedBalance,
              symbol: 'USDC',
            }))
          )

          setBalances(formattedBalances)
          return formattedBalances
        } catch (error) {
          console.error('Failed to refresh balances:', error)
          return null
        }
      }
      return null
    },
  }
}
