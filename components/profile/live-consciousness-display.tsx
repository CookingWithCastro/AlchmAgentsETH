'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, TrendingUp, TrendingDown, Minus, Sparkles, Crown } from 'lucide-react'
import { useLiveConsciousness, type BirthChartData } from '@/hooks/useLiveConsciousness'
import { ConsciousnessVectorDisplay } from '@/components/temporal/consciousness-vector-display'

interface LiveConsciousnessDisplayProps {
  birthInfo: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    latitude?: number
    longitude?: number
  }
  userName?: string
  birthAlchm?: {
    spirit: number
    essence: number
    matter: number
    substance: number
    Heat?: number
    Energy?: number
    Entropy?: number
    Reactivity?: number
  }
  birthMC?: number | null
}

export function LiveConsciousnessDisplay({
  birthInfo,
  userName = 'You',
  birthAlchm,
  birthMC = null,
}: LiveConsciousnessDisplayProps) {
  const [sparklineData, setSparklineData] = useState<number[]>([])
  const [sparklineLabels, setSparklineLabels] = useState<string[]>([])

  // Prepare birth chart data for live consciousness calculation
  const birthChartData: BirthChartData = {
    name: userName,
    // Convert to expected format
    birthDate: `${birthInfo.year}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')}`,
    birthTime: `${String(birthInfo.hour).padStart(2, '0')}:${String(birthInfo.minute).padStart(2, '0')}`,
    latitude: birthInfo.latitude || 0,
    longitude: birthInfo.longitude || 0,
  }

  // Use live consciousness hook
  const {
    data: liveConsciousness,
    loading,
    error,
  } = useLiveConsciousness(birthChartData, {
    refreshInterval: 60000, // 1 minute for user profile
    autoRefresh: true,
  })

  // Update sparkline data when live consciousness changes
  useEffect(() => {
    if (liveConsciousness && !loading) {
      setSparklineData(prev => [...prev.slice(-19), liveConsciousness.liveMC])
      setSparklineLabels(prev => [
        ...prev.slice(-19),
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ])
    }
  }, [liveConsciousness, loading])

  // Format change display
  const formatChange = (change: number, percent: number) => {
    if (Math.abs(change) < 0.01)
      return { icon: <Minus className="w-4 h-4" />, text: 'Stable', color: 'text-slate-500' }
    if (change > 0)
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        text: `+${change.toFixed(3)} (${percent.toFixed(1)}%)`,
        color: 'text-green-500',
      }
    return {
      icon: <TrendingDown className="w-4 h-4" />,
      text: `${change.toFixed(3)} (${percent.toFixed(1)}%)`,
      color: 'text-red-500',
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Consciousness Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Live consciousness data temporarily unavailable. Showing birth consciousness only.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Live Consciousness Overview */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-600" />
            Your Live Consciousness
            {loading && <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {liveConsciousness ? (
            <>
              {/* Monica Constant Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {liveConsciousness.liveMC.toFixed(3)}
                  </div>
                  <div className="text-sm text-muted-foreground">Live Monica Constant</div>
                  <Badge className="mt-2" variant="secondary">
                    {liveConsciousness.liveConsciousnessLevel}
                  </Badge>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {liveConsciousness.birthMC.toFixed(3)}
                  </div>
                  <div className="text-sm text-muted-foreground">Birth Monica Constant</div>
                  <Badge className="mt-2" variant="outline">
                    {liveConsciousness.consciousnessLevel}
                  </Badge>
                </div>

                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${formatChange(liveConsciousness.mcChange, liveConsciousness.mcPercentChange).color}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {
                        formatChange(liveConsciousness.mcChange, liveConsciousness.mcPercentChange)
                          .icon
                      }
                      {
                        formatChange(liveConsciousness.mcChange, liveConsciousness.mcPercentChange)
                          .text
                      }
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">Current Change</div>
                </div>
              </div>

              {/* Live Alchemical Values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-red-600 text-sm font-medium">Spirit</div>
                  <div className="text-xl font-bold">
                    {liveConsciousness.liveKalchm.spirit.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    from {liveConsciousness.birthKalchm.spirit.toFixed(2)}
                  </div>
                </div>

                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-blue-600 text-sm font-medium">Essence</div>
                  <div className="text-xl font-bold">
                    {liveConsciousness.liveKalchm.essence.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    from {liveConsciousness.birthKalchm.essence.toFixed(2)}
                  </div>
                </div>

                <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-green-600 text-sm font-medium">Matter</div>
                  <div className="text-xl font-bold">
                    {liveConsciousness.liveKalchm.matter.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    from {liveConsciousness.birthKalchm.matter.toFixed(2)}
                  </div>
                </div>

                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <div className="text-yellow-600 text-sm font-medium">Substance</div>
                  <div className="text-xl font-bold">
                    {liveConsciousness.liveKalchm.substance.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    from {liveConsciousness.birthKalchm.substance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Transit Interpretations */}
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Transit Influence</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {liveConsciousness.interpretations.transitInfluence}
                  </p>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-sm">Consciousness State</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {liveConsciousness.interpretations.mcChange}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">Cosmic Weather</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {liveConsciousness.interpretations.cosmicWeather}
                  </p>
                </div>
              </div>

              {/* MC Evolution Sparkline */}
              {sparklineData.length > 1 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Monica Constant Evolution</div>
                  <div className="h-20">
                    <svg width="100%" height="100%" viewBox="0 0 300 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="mcGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgba(147, 51, 234, 0.3)" />
                          <stop offset="100%" stopColor="rgba(147, 51, 234, 0)" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const width = 300
                        const height = 80
                        const padding = 4
                        const min = Math.min(...sparklineData)
                        const max = Math.max(...sparklineData)
                        const range = max - min || 1

                        const points = sparklineData
                          .map((v, i) => {
                            const x =
                              padding + (i / (sparklineData.length - 1)) * (width - 2 * padding)
                            const y =
                              height - (padding + ((v - min) / range) * (height - 2 * padding))
                            return `${x},${y}`
                          })
                          .join(' ')

                        return (
                          <>
                            <polygon
                              fill="url(#mcGradient)"
                              points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`}
                            />
                            <polyline
                              fill="none"
                              stroke="rgba(147, 51, 234, 0.8)"
                              strokeWidth="2"
                              points={points}
                            />
                            {/* Reference line for birth MC */}
                            <line
                              x1={padding}
                              x2={width - padding}
                              y1={
                                height -
                                (padding +
                                  ((liveConsciousness.birthMC - min) / range) *
                                    (height - 2 * padding))
                              }
                              y2={
                                height -
                                (padding +
                                  ((liveConsciousness.birthMC - min) / range) *
                                    (height - 2 * padding))
                              }
                              stroke="rgba(99, 102, 241, 0.5)"
                              strokeWidth="1"
                              strokeDasharray="5,5"
                            />
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{sparklineLabels[0]}</span>
                    <span>Birth MC: {liveConsciousness.birthMC.toFixed(3)}</span>
                    <span>{sparklineLabels[sparklineLabels.length - 1]}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Calculating live consciousness...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Consciousness Vector Display */}
      {birthAlchm && liveConsciousness && (
        <ConsciousnessVectorDisplay
          alchmQuantities={birthAlchm}
          monicaConstant={birthMC}
          liveData={liveConsciousness}
          showLiveComparison={true}
        />
      )}
    </div>
  )
}
