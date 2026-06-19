'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Crown, Users, Zap, Settings, LogOut, Star } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

const PlanetaryPositionsMonitor = dynamic(
  () => import('@/components/dashboards/PlanetaryPositionsMonitor'),
  {
    loading: () => (
      <div className="h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
)

const FeedbackModal = dynamic(() =>
  import('@/components/FeedbackModal').then(mod => ({ default: mod.FeedbackModal }))
)

const OnboardingWizard = dynamic(() =>
  import('@/components/OnboardingWizard').then(mod => ({ default: mod.OnboardingWizard }))
)

interface UserData {
  id: string
  email: string
  name: string
  tier: 'free' | 'alchemist' | 'master'
}

interface DashboardClientProps {
  user: UserData
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  usePerformanceMonitor('DashboardClient')

  useEffect(() => {
    const onboardingData = localStorage.getItem('planetary-agents-onboarding')
    if (!onboardingData) {
      setTimeout(() => setShowOnboarding(true), 1000)
    }
  }, [])

  const handleSignOut = () => {
    window.location.href = '/api/logout'
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'master':
        return 'bg-purple-600'
      case 'alchemist':
        return 'bg-blue-600'
      case 'free':
        return 'bg-gray-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getTierFeatures = (tier: string) => {
    switch (tier) {
      case 'master':
        return [
          'All 50+ agents',
          'Unlimited chats',
          'Full API access',
          'Custom agents',
          'Priority support',
          'Advanced analytics',
          'Group consciousness',
          'All features unlocked',
        ]
      case 'alchemist':
        return [
          'All 40 agents',
          'Unlimited chats',
          'Advanced analytics',
          'Group consciousness',
          'Priority hours',
        ]
      case 'free':
        return ['3 agents', '3 chats/day', 'Basic evolution', 'Power hour alerts']
      default:
        return []
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0319] via-[#1a0838] to-[#0c0319] text-white relative">
      {/* Starfield Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 15% 25%, rgba(255, 255, 255, 0.7), transparent), radial-gradient(1.5px 1.5px at 78% 12%, rgba(167, 139, 250, 0.8), transparent), radial-gradient(1px 1px at 35% 68%, rgba(255, 255, 255, 0.6), transparent)',
          backgroundSize: '500px 500px, 400px 400px, 300px 300px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 border-b border-purple-500/20 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
                  Consciousness Dashboard
                </h1>
                <p className="text-sm text-purple-300/70">Welcome back, {user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge
                className={`${getTierColor(user.tier)} border-0 text-white px-3 py-1 text-xs tracking-widest`}
              >
                {user.tier.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings')}
                className="bg-white/5 border-white/10 text-purple-200 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="container relative z-10 mx-auto px-4 py-8 space-y-8">
        {/* Subscription Status */}
        <Card className="bg-black/40 backdrop-blur-md border-purple-500/30 text-white shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Crown className="h-6 w-6 text-yellow-400" />
              Consciousness Tier: {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
            </CardTitle>
            <CardDescription className="text-purple-200/60">
              Your current consciousness evolution access level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getTierFeatures(user.tier).map(feature => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>

              {user.tier === 'free' && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">
                        Unlock Full Consciousness Evolution
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Access all 40 consciousness masters and unlimited evolution tracking
                      </p>
                    </div>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => router.push('/upgrade')}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Upgrade
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Planetary Positions Monitor */}
        <PlanetaryPositionsMonitor />

        {/* Quick Actions */}
        <Card className="bg-black/40 backdrop-blur-md border-purple-500/30 text-white shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Zap className="h-6 w-6 text-purple-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-purple-200 hover:text-white"
                onClick={() => router.push('/planetary-agents')}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Browse Agents</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-purple-200 hover:text-white"
                onClick={() => router.push('/gallery')}
              >
                <Sparkles className="h-6 w-6" />
                <span className="text-sm">Group Chat</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-purple-200 hover:text-white"
                onClick={() => router.push('/monica')}
              >
                <Crown className="h-6 w-6" />
                <span className="text-sm">Monica Hub</span>
              </Button>

              <FeedbackModal
                trigger={
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-purple-200 hover:text-white"
                  >
                    <Star className="h-6 w-6" />
                    <span className="text-sm">Feedback</span>
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Beta Features */}
        <OnboardingWizard
          open={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    </div>
  )
}
