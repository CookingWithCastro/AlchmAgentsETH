'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Sparkles, Zap, Box, Droplets } from 'lucide-react'
import { TokenBalances } from '@/lib/services/economyService'

export function TokenHUD() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const disabledForDesktopSurface =
    pathname?.startsWith('/desktop/ghost-feed') || pathname?.startsWith('/desktop/composer')
  const [balances, setBalances] = useState<
    (TokenBalances & { canClaimAgentsYield?: boolean }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const { toast } = useToast()

  const fetchBalances = async () => {
    if (status !== 'authenticated') {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/economy/balances')
      if (res.ok) {
        const data = await res.json()
        setBalances(data)
      } else if (res.status === 401) {
        // Silently handle 401 - might be session expiration
        setBalances(null)
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (disabledForDesktopSurface) {
      setLoading(false)
      return
    }

    fetchBalances()
    // Refresh periodically if authenticated
    let interval: NodeJS.Timeout | null = null
    if (status === 'authenticated') {
      interval = setInterval(fetchBalances, 60000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, disabledForDesktopSurface])

  if (disabledForDesktopSurface) return null

  const handleClaimYield = async () => {
    setClaiming(true)
    try {
      const res = await fetch('/api/economy/yield', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Yield Not Ready',
          description: data.error || 'You have already claimed your daily yield.',
          variant: 'destructive',
        })
        return
      }

      setBalances({ ...data.balances, canClaimAgentsYield: false })
      toast({
        title: 'Cosmic Yield Claimed!',
        description: `Received ${data.distribution?.Spirit || 2.5} Spirit, ${data.distribution?.Essence || 2.5} Essence, ${data.distribution?.Matter || 2.5} Matter, ${data.distribution?.Substance || 2.5} Substance. ${data.isPremium ? '(2.0x Premium Multiplier applied!)' : ''}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to claim cosmic yield.',
        variant: 'destructive',
      })
    } finally {
      setClaiming(false)
    }
  }

  if (loading) return null

  // Navigation already exposes sign-in. A second fixed panel covered content on
  // every public route without offering an action, especially on small screens.
  if (!balances || status !== 'authenticated') return null

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-3 shadow-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-white rounded-xl">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
          <h4 className="text-sm font-semibold tracking-wider text-zinc-300">ALCHEMICAL VAULT</h4>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30"
            onClick={handleClaimYield}
            disabled={claiming || balances.canClaimAgentsYield === false}
          >
            {claiming
              ? 'Claiming...'
              : balances.canClaimAgentsYield === false
                ? 'Yield Claimed'
                : 'Claim Yield'}
          </Button>
        </div>
        <div className="flex gap-4 px-2">
          <div className="flex flex-col items-center group">
            <div className="flex items-center gap-1.5 text-yellow-400 mb-1">
              <Sparkles size={14} className="group-hover:animate-pulse" />
              <span className="text-xs uppercase font-medium">Spirit</span>
            </div>
            <span className="font-mono text-sm">{balances.spirit}</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="flex items-center gap-1.5 text-blue-400 mb-1">
              <Droplets size={14} className="group-hover:animate-bounce" />
              <span className="text-xs uppercase font-medium">Essence</span>
            </div>
            <span className="font-mono text-sm">{balances.essence}</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="flex items-center gap-1.5 text-orange-400 mb-1">
              <Box size={14} className="group-hover:rotate-12 transition-transform" />
              <span className="text-xs uppercase font-medium">Matter</span>
            </div>
            <span className="font-mono text-sm">{balances.matter}</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="flex items-center gap-1.5 text-green-400 mb-1">
              <Zap size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase font-medium">Substance</span>
            </div>
            <span className="font-mono text-sm">{balances.substance}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
