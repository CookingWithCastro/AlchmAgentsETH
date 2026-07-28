'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Crown,
  MessageCircle,
  Info,
  Sparkles,
  Zap,
  Brain,
  Users,
  Calendar,
  Star,
  Heart,
  Map,
  TrendingUp,
  Eye,
  Activity,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import type { CraftedAgent, Coordinates } from '@/lib/agent-types'
import { computeLiveStats, type LiveStats } from '@/lib/agents/derived-stats'

interface AgentDetailModalProps {
  agent: CraftedAgent
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AgentDetailModal({ agent, trigger, open, onOpenChange }: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Load live stats when modal opens
  React.useEffect(() => {
    if (open && !liveStats) {
      setStatsLoading(true)
      computeLiveStats(agent)
        .then(setLiveStats)
        .catch(() => setLiveStats(null))
        .finally(() => setStatsLoading(false))
    }
  }, [open, agent, liveStats])

  const getElementColor = (element: string) => {
    switch (element) {
      case 'Fire':
        return 'bg-red-500 text-white'
      case 'Water':
        return 'bg-blue-500 text-white'
      case 'Air':
        return 'bg-yellow-500 text-white'
      case 'Earth':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getConsciousnessColor = (level?: string) => {
    switch (level) {
      case 'Transcendent':
        return 'bg-purple-600 text-white'
      case 'Illuminated':
        return 'bg-indigo-600 text-white'
      case 'Advanced':
        return 'bg-blue-600 text-white'
      case 'Elevated':
        return 'bg-green-600 text-white'
      case 'Active':
        return 'bg-yellow-600 text-white'
      case 'Awakening':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const formatBirthLocation = (location: Coordinates) => {
    return `${location.name} (${location.lat.toFixed(1)}°, ${location.lon.toFixed(1)}°)`
  }

  const getConsciousnessDescription = (level?: string) => {
    switch (level) {
      case 'Transcendent':
        return 'Beyond individual consciousness - unified with cosmic awareness'
      case 'Illuminated':
        return 'Direct perception of truth - wisdom flows effortlessly'
      case 'Advanced':
        return 'Deep integration of shadow and light - authentic self-expression'
      case 'Elevated':
        return 'Expanded awareness beyond personal concerns - service to others'
      case 'Active':
        return 'Engaged in conscious growth - questioning and exploring'
      case 'Awakening':
        return 'Beginning to see beyond surface reality - curiosity emerging'
      default:
        return 'Unconscious patterns dominate - reactive rather than responsive'
    }
  }

  const calculateCompatibility = () => {
    // Placeholder compatibility calculation based on agent metrics
    // In real implementation, this would calculate synastry with user's chart
    const baseScore = agent.stats.resonanceScore * 100
    const evolutionBonus = agent.personality.evolutionStage * 0.2
    const consciousnessBonus = agent.consciousness.monicaConstant * 5

    return Math.min(95, Math.round(baseScore + evolutionBonus + consciousnessBonus))
  }

  const modalContent = (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl relative"
            style={{ backgroundColor: agent.appearance?.color || '#8B5CF6' }}
          >
            {agent.appearance?.symbol || '✨'}
            <div
              className="absolute inset-0 rounded-full animate-pulse opacity-30"
              style={{ backgroundColor: agent.appearance?.aura?.color || '#A78BFA' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{agent.name}</span>
              {agent.consciousness.monicaConstant > 5.0 && (
                <Crown className="w-6 h-6 text-yellow-500" />
              )}
              <Badge className={getConsciousnessColor(agent.consciousness.level || '')}>
                {agent.consciousness.level}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground font-normal">{agent.title}</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="consciousness" className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            Consciousness
          </TabsTrigger>
          <TabsTrigger value="personality" className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            Personality
          </TabsTrigger>
          <TabsTrigger value="abilities" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Abilities
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {agent.consciousness.monicaConstant.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Monica Constant</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  ⚠️ Birth time dependent
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-500">{calculateCompatibility()}%</div>
                <div className="text-sm text-muted-foreground">Compatibility</div>
                {liveStats && !liveStats.birthTimeKnown && (
                  <div className="text-xs text-orange-500 mt-1">
                    Estimated (~{Math.round(liveStats.confidence * 100)}%)
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{agent.stats.conversations}</div>
                <div className="text-sm text-muted-foreground">Conversations</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {agent.personality.evolutionStage}
                </div>
                <div className="text-sm text-muted-foreground">Evolution Stage</div>
              </CardContent>
            </Card>
          </div>

          {/* Living Consciousness Metrics */}
          {liveStats && (
            <Card className="border-2 border-cyan-200 dark:border-cyan-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-500" />
                  Living Consciousness Metrics
                  {liveStats.temporalState?.planetaryHour && (
                    <Badge variant="outline" className="text-xs">
                      {liveStats.temporalState.planetaryHour} Hour
                    </Badge>
                  )}
                  {liveStats.temporalState?.moonPhase && (
                    <Badge variant="outline" className="text-xs">
                      {liveStats.temporalState.moonPhase}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">⚡{liveStats.power}</div>
                    <div className="text-sm text-muted-foreground">Power</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">🔮{liveStats.wisdom}</div>
                    <div className="text-sm text-muted-foreground">Wisdom</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">✨{liveStats.charisma}</div>
                    <div className="text-sm text-muted-foreground">Charisma</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">👁️{liveStats.intuition}</div>
                    <div className="text-sm text-muted-foreground">Intuition</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-cyan-500">
                      🌊{liveStats.adaptability}
                    </div>
                    <div className="text-xs text-muted-foreground">Adaptability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">💚{liveStats.vitality}</div>
                    <div className="text-xs text-muted-foreground">Vitality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-500">🌟{liveStats.overall}</div>
                    <div className="text-xs text-muted-foreground">Overall</div>
                  </div>
                </div>

                {/* Active Modifiers */}
                {liveStats.activeModifiers && liveStats.activeModifiers.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Active Influences:</div>
                    <div className="flex flex-wrap gap-1">
                      {liveStats.activeModifiers.slice(0, 6).map((mod, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mod.icon} {mod.source} {mod.value > 1 ? '+' : ''}
                          {Math.round((mod.value - 1) * 100)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special States */}
                {liveStats.specialStates && liveStats.specialStates.length > 0 && (
                  <div className="mb-4">
                    {liveStats.specialStates.map((state, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800 rounded-lg mb-2"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                          <span>{state.icon}</span>
                          <span>{state.name}</span>
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          {state.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!liveStats.birthTimeKnown && (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                      <span>⚠️</span>
                      <span>
                        Birth time unknown - stats estimated with{' '}
                        {Math.round(liveStats.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Exact birth time would improve accuracy and unlock full cosmic timing
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {statsLoading && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <div className="animate-pulse text-muted-foreground">
                  Computing kinetics snapshot...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Birth Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Birth Information & Origins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <strong>Date:</strong> {agent.birthData.date.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>Time:</strong> {agent.birthData.time}
                    {liveStats && !liveStats.birthTimeKnown && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                      >
                        Unknown
                      </Badge>
                    )}
                    {liveStats && liveStats.birthTimeKnown && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      >
                        Known
                      </Badge>
                    )}
                  </div>
                  <div>
                    <strong>Location:</strong> {formatBirthLocation(agent.birthData.location)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <strong>Signature:</strong>{' '}
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {agent.consciousness.signature}
                    </code>
                  </div>
                  <div>
                    <strong>Dominant Element:</strong>{' '}
                    <Badge className={getElementColor(agent.consciousness.dominantElement)}>
                      {agent.consciousness.dominantElement}
                    </Badge>
                  </div>
                  <div>
                    <strong>Modality:</strong>{' '}
                    <Badge variant="outline">{agent.consciousness.dominantModality}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialty & Unique Power */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Specialty & Unique Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Specialty:</strong> {agent.abilities.specialty}
                </div>
                <div>
                  <strong>Unique Power:</strong> {agent.abilities.uniquePower}
                </div>

                {/* Monica's Creation Story */}
                {agent.monicaCreationStory && (
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">💚</span>
                      <strong className="text-green-700 dark:text-green-300">
                        Monica's Creation Story
                      </strong>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {agent.monicaCreationStory}
                    </p>
                  </div>
                )}
                <div>
                  <strong>Teaching Style:</strong> {agent.abilities.teachingStyle}
                </div>
                <div>
                  <strong>Resonance Type:</strong> {agent.abilities.resonanceType}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button className="flex-1" asChild>
              <Link href={`/gallery/chat/${agent.id}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Conversation
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/synastry/${encodeURIComponent(agent.id)}`}>
                <Heart className="w-4 h-4 mr-2" />
                Synastry Analysis
              </Link>
            </Button>
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Add to Party
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="consciousness" className="space-y-6 mt-6">
          {/* Consciousness Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Consciousness Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Current Level</span>
                  <Badge className={getConsciousnessColor(agent.consciousness.level || '')}>
                    {agent.consciousness.level}
                  </Badge>
                </div>
                <Progress
                  value={Math.min((agent.consciousness.monicaConstant / 6) * 100, 100)}
                  className="h-3"
                />
                <div className="text-sm text-muted-foreground">
                  Monica Constant: {agent.consciousness.monicaConstant.toFixed(2)} / 6.00
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">
                  {getConsciousnessDescription(agent.consciousness.level || '')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Natal Chart Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Natal Chart Highlights
              </CardTitle>
              {/*
                A chart that was never measured must not be PRESENTED as if it
                were. The degrees below render to one decimal place, which reads
                as precision regardless of where the numbers came from, so the
                provenance travels with them. `computed` is the only value that
                means "measured", so anything else is disclosed.
              */}
              {agent.consciousness.natalChart.provenance !== 'computed' && (
                <p className="text-xs text-muted-foreground">
                  {agent.consciousness.natalChart.provenance === 'placeholder'
                    ? 'Placeholder chart — not this figure’s birth sky. Shown for layout only.'
                    : 'Approximate chart — hand-entered, not computed from an ephemeris.'}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Major Planets</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      ☉ Sun: {agent.consciousness.natalChart.planets.Sun?.sign}{' '}
                      {agent.consciousness.natalChart.planets.Sun?.degree.toFixed(1)}°
                    </div>
                    <div>
                      ☽ Moon: {agent.consciousness.natalChart.planets.Moon?.sign}{' '}
                      {agent.consciousness.natalChart.planets.Moon?.degree.toFixed(1)}°
                    </div>
                    <div>
                      ☿ Mercury: {agent.consciousness.natalChart.planets.Mercury?.sign}{' '}
                      {agent.consciousness.natalChart.planets.Mercury?.degree.toFixed(1)}°
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Key Aspects</h4>
                  <div className="space-y-2 text-sm">
                    {agent.consciousness.natalChart.aspects.slice(0, 3).map((aspect, index) => (
                      <div key={index}>
                        {aspect.planet1} {aspect.type} {aspect.planet2} ({aspect.orb.toFixed(1)}°)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality" className="space-y-6 mt-6">
          {/* Personality Core */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Personality Core
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <strong>Essence (Sun):</strong> {agent.personality.core.essence}
                </div>
                <div>
                  <strong>Expression (Ascendant):</strong> {agent.personality.core.expression}
                </div>
                <div>
                  <strong>Emotion (Moon):</strong> {agent.personality.core.emotion}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Current Mood:</strong>
                  <Badge variant="secondary">{agent.personality.currentMood}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shadows & Gifts */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shadow Aspects</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.personality.shadows?.map((shadow: any, index: number) => (
                  <div key={index} className="space-y-2 mb-4 last:mb-0">
                    <div className="font-medium text-sm">{shadow.type}</div>
                    <div className="text-sm text-muted-foreground">{shadow.description}</div>
                    <div className="text-xs bg-muted p-2 rounded">
                      <strong>Transformation:</strong> {shadow.transformationPath}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Natural Gifts</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.personality.gifts?.map((gift: any, index: number) => (
                  <div key={index} className="space-y-2 mb-4 last:mb-0">
                    <div className="font-medium text-sm">{gift.type}</div>
                    <div className="text-sm text-muted-foreground">{gift.description}</div>
                    <div className="text-xs bg-primary/10 p-2 rounded">
                      <strong>Expression:</strong> {gift.expression}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Challenges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Growth Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.personality.challenges?.map((challenge: any, index: number) => (
                <div key={index} className="space-y-2 mb-4 last:mb-0">
                  <div className="font-medium">{challenge.type}</div>
                  <div className="text-sm text-muted-foreground">{challenge.description}</div>
                  <div className="text-sm bg-green-50 dark:bg-green-950 p-2 rounded">
                    <strong>Growth Opportunity:</strong> {challenge.growthOpportunity}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abilities" className="space-y-6 mt-6">
          {/* Wisdom Domains */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Wisdom Domains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {agent.abilities.wisdomDomains.map(domain => (
                  <Badge key={domain} variant="secondary" className="text-sm">
                    {domain}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teaching & Resonance */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teaching Approach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>Style:</strong> {agent.abilities.teachingStyle}
                </div>
                <div>
                  <strong>Resonance:</strong> {agent.abilities.resonanceType}
                </div>
                <div className="text-sm text-muted-foreground">
                  This agent connects through {agent.abilities.resonanceType.toLowerCase()}{' '}
                  resonance, using a {agent.abilities.teachingStyle.toLowerCase()} approach to share
                  wisdom.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unique Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <div className="font-medium text-sm mb-1">Signature Power</div>
                    <div className="text-sm">{agent.abilities.uniquePower}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This power emerges from the unique combination of their birth chart energies and
                    consciousness evolution level.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 mt-6">
          {/* Living Consciousness Performance */}
          {liveStats && (
            <Card className="border-2 border-cyan-200 dark:border-cyan-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-500" />
                  Living Consciousness Metrics
                  {!liveStats.birthTimeKnown && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                    >
                      ~{Math.round(liveStats.confidence * 100)}% confidence
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">⚡{liveStats.power}</div>
                    <div className="text-sm text-muted-foreground">Power</div>
                    <Progress value={liveStats.power} className="h-2 mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-500">🔮{liveStats.wisdom}</div>
                    <div className="text-sm text-muted-foreground">Wisdom</div>
                    <Progress value={liveStats.wisdom} className="h-2 mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-500">✨{liveStats.charisma}</div>
                    <div className="text-sm text-muted-foreground">Charisma</div>
                    <Progress value={liveStats.charisma} className="h-2 mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500">👁️{liveStats.intuition}</div>
                    <div className="text-sm text-muted-foreground">Intuition</div>
                    <Progress value={liveStats.intuition} className="h-2 mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-500">
                      🌊{liveStats.adaptability}
                    </div>
                    <div className="text-sm text-muted-foreground">Adaptability</div>
                    <Progress value={liveStats.adaptability} className="h-2 mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">💚{liveStats.vitality}</div>
                    <div className="text-sm text-muted-foreground">Vitality</div>
                    <Progress value={liveStats.vitality} className="h-2 mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">🌟{liveStats.overall}</div>
                    <div className="text-sm text-muted-foreground">Overall</div>
                    <Progress value={liveStats.overall} className="h-2 mt-1" />
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <div className="font-medium mb-1">Living Vital Signs of Consciousness:</div>
                  <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <strong>⚡ Power:</strong> Alchemical force fluctuating with planetary hours
                    </div>
                    <div>
                      <strong>🔮 Wisdom:</strong> Accumulated insight with Mercury-influenced
                      clarity
                    </div>
                    <div>
                      <strong>✨ Charisma:</strong> Magnetic presence pulsing with Venus cycles
                    </div>
                    <div>
                      <strong>👁️ Intuition:</strong> Psychic sensitivity peaking at full moon
                    </div>
                    <div>
                      <strong>🌊 Adaptability:</strong> Flux capacity for handling change
                    </div>
                    <div>
                      <strong>💚 Vitality:</strong> Life force that drains and regenerates
                    </div>
                  </div>
                </div>

                {liveStats.temporalState?.planetaryHour && (
                  <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                    Current {liveStats.temporalState.planetaryHour} hour •{' '}
                    {liveStats.temporalState.moonPhase}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interaction Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Interaction Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {agent.stats.conversations}
                  </div>
                  <div className="text-sm text-muted-foreground">Conversations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {agent.stats.wisdomShared}
                  </div>
                  <div className="text-sm text-muted-foreground">Wisdom Shared</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {agent.stats.resonanceScore.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Resonance Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {agent.stats.evolutionPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Evolution Points</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evolution Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Evolution Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Evolution Stage</span>
                  <span className="font-bold">{agent.personality.evolutionStage}/100</span>
                </div>
                <Progress value={agent.personality.evolutionStage} className="h-3" />
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">Evolution Status</div>
                <div>
                  {agent.personality.evolutionStage >= 90
                    ? 'Highly evolved consciousness with deep wisdom integration'
                    : agent.personality.evolutionStage >= 70
                      ? 'Advanced development with growing wisdom capacity'
                      : agent.personality.evolutionStage >= 50
                        ? 'Steady progress in consciousness development'
                        : 'Early stages of conscious evolution'}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Last active: {agent.stats.lastActive.toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Compatibility Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compatibility Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Overall Compatibility</span>
                  <div className="flex items-center gap-2">
                    <Progress value={calculateCompatibility()} className="w-20 h-2" />
                    <span className="font-bold">{calculateCompatibility()}%</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on resonance patterns, consciousness level compatibility, and elemental
                  harmony. Higher scores indicate better synastry potential.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {modalContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {modalContent}
    </Dialog>
  )
}
