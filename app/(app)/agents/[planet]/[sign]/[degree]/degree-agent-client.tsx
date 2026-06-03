'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  getPlanetaryDignity,
  getSignElement,
  getPlanetaryElement,
  calculateElementalAffinity,
} from '@/lib/astrological-data'
import {
  ArrowLeft,
  Calendar,
  History,
  MessageCircle,
  Star,
  Clock,
  Globe,
  TrendingUp,
  Activity,
  Zap,
  Heart,
  Eye,
  Brain,
  Compass,
  Flame,
} from 'lucide-react'
import Link from 'next/link'
import { getPlanetaryAgentStats } from '@/lib/agents/planetary-agent-stats'

interface Message {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface HistoricalData {
  lastOccurrence: { date: string; historicalContext?: string } | null
  nextOccurrence: { date: string; historicalContext?: string } | null
  patterns: any[]
  cycleLength: number
  daysPerDegree: number
  approxDaysInSign: number
}

type CurrentTransitData = {
  currentSign: string
  currentDegree: number
  isAtRequestedPosition: boolean
  degreeDifference: number
  daysUntilReturn: number
} | null

interface RecentTransit {
  dateStr: string
  year: number
  cycleNumber: number
  yearsAgo: number
  historicalContext: string
}

interface DegreeAgentClientProps {
  planet: string
  sign: string
  degree: number
  historicalData: HistoricalData
  planetaryThemes: any
  degreeHistoricalData: any
  currentTransitData: CurrentTransitData
  recentTransits: RecentTransit[]
}

const PLANET_EMOJIS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '⛢',
  Neptune: '♆',
  Pluto: '♇',
}

const PLANET_OVERVIEW_SLUGS = new Set(['sun', 'moon', 'jupiter'])

export default function DegreeAgentClient({
  planet,
  sign,
  degree,
  historicalData,
  planetaryThemes,
  degreeHistoricalData,
  currentTransitData,
  recentTransits,
}: DegreeAgentClientProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18
  const planetSlug = planet.toLowerCase()
  const planetOverviewHref = PLANET_OVERVIEW_SLUGS.has(planetSlug)
    ? `/planets/${planetSlug}`
    : `/planetary-agents?planet=${encodeURIComponent(planet)}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/planetary-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet,
          sign,
          degree: degree.toString(),
          question: input,
          time: '12:00',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'agent', content: data.response, timestamp: new Date() },
        ])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'agent',
          content:
            'I apologize, but I encountered an error while channeling the cosmic wisdom. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  const stats = getPlanetaryAgentStats(planet, sign, degree)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0319] via-[#1a0838] to-[#0c0319] text-white selection:bg-purple-500/30">
      <div className="container py-8 max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/planetary-agents">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Agents
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative">
                {PLANET_EMOJIS[planet] || '●'}
                <div
                  className="absolute inset-0 border border-white/20 rounded-full animate-spin-slow"
                  style={{ padding: '4px', margin: '-4px' }}
                ></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  {planet} at {degree}° {sign}
                </h1>
                <p className="text-white/60 font-light">Degree-Specific Planetary Consciousness</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 backdrop-blur-md border-white/10">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <MessageCircle className="h-5 w-5 text-purple-400" />
                  Consultation with {planet} at {degree}° {sign}
                </CardTitle>
                <CardDescription className="text-white/60">
                  Channel the wisdom of this specific planetary degree
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[500px] overflow-y-auto border border-white/10 rounded-xl p-4 mb-4 bg-black/20 shadow-inner custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="text-center text-white/50 h-full flex flex-col items-center justify-center">
                      <div className="text-6xl mb-4 drop-shadow-md animate-pulse">
                        {PLANET_EMOJIS[planet] || '●'}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white/80">
                        {planet} at {degree}° {sign}
                      </h3>
                      <p className="text-sm font-light">
                        Ask this specific degree of planetary consciousness for guidance
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl ${
                            message.role === 'user'
                              ? 'bg-purple-500/10 border border-purple-500/20 ml-8'
                              : 'bg-white/5 border border-white/10 mr-8'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-sm text-purple-300 min-w-0 font-medium">
                              {message.role === 'user' ? 'You' : `${planet}`}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed text-white/90">
                                {message.content}
                              </p>
                              <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={`Ask ${planet} at ${degree}° ${sign} for guidance...`}
                    disabled={loading}
                    className="flex-1 bg-black/40 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-white/40"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-none"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Channeling...
                      </div>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sacred Stats */}
            <Card className="bg-black/40 backdrop-blur-md border-white/10 overflow-hidden relative group">
              <div className="absolute -top-12 -right-12 w-32 h-32 border border-white/5 rounded-full"></div>
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-amber-400" />
                  Sacred Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-400" /> Power
                      </span>
                      <span>{stats.power}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400/80 rounded-full"
                        style={{ width: `${stats.power}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3 h-3 text-purple-400" /> Wisdom
                      </span>
                      <span>{stats.wisdom}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400/80 rounded-full"
                        style={{ width: `${stats.wisdom}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3 h-3 text-pink-400" /> Charisma
                      </span>
                      <span>{stats.charisma}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-400/80 rounded-full"
                        style={{ width: `${stats.charisma}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-blue-400" /> Intuition
                      </span>
                      <span>{stats.intuition}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400/80 rounded-full"
                        style={{ width: `${stats.intuition}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-emerald-400" /> Adaptability
                      </span>
                      <span>{stats.adaptability}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400/80 rounded-full"
                        style={{ width: `${stats.adaptability}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Dominant Alchemical</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase tracking-wider bg-black/50 border-white/10 flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      {stats.dominantAlchemical}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Current Transit Status */}
            {currentTransitData && (
              <Card
                className={`bg-black/40 backdrop-blur-md border-white/10 ${
                  currentTransitData.isAtRequestedPosition
                    ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : ''
                }`}
              >
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Globe className="h-5 w-5 text-blue-400" />
                    Current Transit Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentTransitData.isAtRequestedPosition ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        🎯 Currently Active!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        {planet} is currently at {currentTransitData.currentDegree.toFixed(2)}°{' '}
                        {sign}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Position:</span>
                        <Badge variant="secondary">
                          {currentTransitData.currentDegree.toFixed(2)}°{' '}
                          {currentTransitData.currentSign}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Days Until Return:</span>
                        <Badge variant="outline">{currentTransitData.daysUntilReturn} days</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Approximately{' '}
                        {Math.round((currentTransitData.daysUntilReturn / 365.25) * 10) / 10} years
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Position Details */}
            <Card className="bg-black/40 backdrop-blur-md border-white/10">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Position Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Planet:</span>
                  <Badge variant="default">{planet}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sign:</span>
                  <Badge variant="secondary">{sign}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Degree:</span>
                  <Badge variant="outline">{degree}°</Badge>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dignity:</span>
                    <Badge variant="outline">{getPlanetaryDignity(planet, sign)}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Sign Element:</span>
                    <Badge variant="outline">{getSignElement(sign)}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Time of Day:</span>
                    <Badge variant="outline">{isDay ? 'Day' : 'Night'}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Planet Element:</span>
                    <Badge variant="outline">{getPlanetaryElement(planet, isDay)}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Affinity:</span>
                    <Badge variant="outline">
                      {Math.round(calculateElementalAffinity(planet, sign, isDay) * 100)}%
                    </Badge>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Orbital Period:</span>
                  <span className="text-xs">{Math.round(historicalData.cycleLength)} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days per Degree:</span>
                  <span className="text-xs">{historicalData.daysPerDegree} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days in {sign}:</span>
                  <span className="text-xs">~{historicalData.approxDaysInSign} days</span>
                </div>
                {planetaryThemes && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Key Themes:</p>
                    <div className="flex flex-wrap gap-1">
                      {planetaryThemes.themes?.slice(0, 3).map((theme: string) => (
                        <Badge key={theme} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transit History */}
            {recentTransits.length > 0 && (
              <Card className="bg-black/40 backdrop-blur-md border-white/10">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Recent Transit History
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Previous times {planet} was at {degree}° {sign}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {recentTransits.slice(0, 3).map((transit, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{transit.year}</span>
                          <Badge variant="outline" className="text-xs">
                            {transit.yearsAgo} years ago
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{transit.historicalContext}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cycle #{transit.cycleNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Historical Occurrences */}
            {degreeHistoricalData && degreeHistoricalData.occurrences?.length > 0 && (
              <Card className="bg-black/40 backdrop-blur-md border-white/10">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <History className="h-5 w-5 text-amber-600" />
                    Historical Occurrences
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    When {planet} was at {degree}° {sign} in history
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {degreeHistoricalData.occurrences.map((occurrence: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold text-sm">{occurrence.year}</span>
                            <Badge variant="outline" className="text-xs">
                              Cycle {occurrence.cycleNumber}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Cultural Context:</p>
                          <p className="text-xs italic text-blue-600 dark:text-blue-400">
                            {occurrence.culturalContext}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Major Events:</p>
                          <ul className="text-xs space-y-1">
                            {occurrence.events?.slice(0, 3).map((event: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                <span className="leading-tight">{event}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Planetary Significance:
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 leading-tight">
                            {occurrence.significance}
                          </p>
                        </div>
                      </div>
                    ))}

                    {degreeHistoricalData.nextOccurrence && (
                      <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm text-blue-600">
                            Next Occurrence
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {planet} will return to {degree}° {sign} around{' '}
                          {new Date(degreeHistoricalData.nextOccurrence).getFullYear()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cycle Information */}
            <Card className="bg-black/40 backdrop-blur-md border-white/10">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-indigo-400" />
                  Cycle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {historicalData.lastOccurrence && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Last Occurrence</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(historicalData.lastOccurrence.date)}
                    </p>
                  </div>
                )}
                {historicalData.nextOccurrence && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Next Occurrence</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(historicalData.nextOccurrence.date)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Navigation */}
            <Card className="bg-black/40 backdrop-blur-md border-white/10">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Compass className="h-5 w-5 text-rose-400" />
                  Explore More
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Link href={planetOverviewHref} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  >
                    {planet} Overview
                  </Button>
                </Link>
                <Link href="/planetary-council" className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  >
                    Planetary Council
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
