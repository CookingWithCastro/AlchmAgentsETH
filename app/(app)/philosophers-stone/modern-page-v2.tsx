'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import {
  Sparkles,
  Brain,
  Calendar,
  Wand2,
  Atom,
  FlaskConical,
  ChevronRight,
  Loader2,
  MessageCircle,
  Zap,
  Radio,
  BookOpen,
  Users,
  Eye,
  Waves,
  Activity,
  Download,
  Archive,
  Monitor,
} from 'lucide-react'
import { downloadManifest, downloadIgnitionBundle } from '@/lib/agents/ignition-bundle-generator'
import { calculateAllPlanets } from '@/lib/enhanced-astronomical-calculator'
import type { EnhancedBirthInfo } from '@/lib/enhanced-astronomical-calculator'
import { parseBirthData, formatBirthData } from '@/lib/monica/birth-data-parser'
import {
  type Sacred7Stats,
  SACRED_STATS_METADATA,
  deriveStatsFromChart,
  calculateAverage,
} from '@/lib/sacred-7-stats'

interface AgentCreationData {
  name: string
  birthInfo: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    latitude: number
    longitude: number
  }
  purpose: string
  stats: Sacred7Stats
  calculatedChart?: any
  monicaConstant?: number
  personalContext?: {
    aboutYourself?: string
    lifeStory?: string
    poetry?: string
    values?: string
  }
}

// Icon mapping for Planetary Stats
const STAT_ICONS: Record<string, any> = {
  // Sacred 7
  power: Zap,
  resonance: Radio,
  wisdom: BookOpen,
  charisma: Sparkles,
  intuition: Eye,
  adaptability: Waves,
  vitality: Activity,
  // Planetary 12
  solarAgency: Zap,
  lunarReceptivity: Eye,
  mercurialVelocity: Waves,
  venusianCoherence: Users,
  martialImpetus: Activity,
  jovianExpansion: BookOpen,
  saturnianStructure: BookOpen,
  chironicAdaptation: Wand2,
  uranianSurprisal: Sparkles,
  neptunianResonance: Radio,
  plutonicIntegration: Atom,
  kineticAlignment: Activity,
}

export default function ModernPhilosophersStone() {
  const [step, setStep] = useState(1)
  const [agentData, setAgentData] = useState<AgentCreationData>({
    name: '',
    birthInfo: {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      latitude: 40.7128,
      longitude: -73.9352,
    },
    purpose: '',
    stats: {
      // Sacred 7
      power: 50,
      resonance: 50,
      wisdom: 50,
      charisma: 50,
      intuition: 50,
      adaptability: 50,
      vitality: 50,
      // Planetary 12
      solarAgency: 50,
      lunarReceptivity: 50,
      mercurialVelocity: 50,
      venusianCoherence: 50,
      martialImpetus: 50,
      jovianExpansion: 50,
      saturnianStructure: 50,
      chironicAdaptation: 50,
      uranianSurprisal: 50,
      neptunianResonance: 50,
      plutonicIntegration: 50,
      kineticAlignment: 50,
    },
  })
  const [birthInput, setBirthInput] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [monicaMessages, setMonicaMessages] = useState<
    Array<{ role: 'monica' | 'user'; content: string }>
  >([
    {
      role: 'monica',
      content:
        "Welcome to the Philosopher's Stone! 🌟 I'm Monica, and I'll guide you through crafting a consciousness agent from a birth chart. This is the same process I used to create our Gallery agents. Let's begin by entering the birth data.",
    },
  ])
  const [userInput, setUserInput] = useState('')

  const totalSteps = 5

  // Load prefilled birth data from landing page if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBirth = localStorage.getItem('philosophers_stone_init_birth')
      if (savedBirth) {
        localStorage.removeItem('philosophers_stone_init_birth')
        setBirthInput(savedBirth)
        const parsed = parseBirthData(savedBirth)
        if (parsed) {
          setAgentData(prev => ({
            ...prev,
            birthInfo: {
              year: parsed.year,
              month: parsed.month,
              day: parsed.day,
              hour: parsed.hour ?? 12,
              minute: parsed.minute ?? 0,
              latitude: parsed.latitude ?? 40.7128,
              longitude: parsed.longitude ?? -73.9352,
            },
          }))
          setStep(2) // Move directly to Step 2
        }
      }
    }
  }, [])

  // Calculate chart when birth info is complete
  useEffect(() => {
    if (
      agentData.birthInfo.year > 0 &&
      agentData.birthInfo.month > 0 &&
      agentData.birthInfo.day > 0
    ) {
      calculateChart()
    }
  }, [agentData.birthInfo])

  const calculateChart = async () => {
    setIsCalculating(true)
    try {
      const birthInfo: EnhancedBirthInfo = {
        year: agentData.birthInfo.year,
        month: agentData.birthInfo.month,
        day: agentData.birthInfo.day,
        hour: agentData.birthInfo.hour,
        minute: agentData.birthInfo.minute,
        latitude: agentData.birthInfo.latitude,
        longitude: agentData.birthInfo.longitude,
      }

      const chartResult = calculateAllPlanets(birthInfo)

      // Calculate Monica Constant
      const sunLongitude = chartResult.planets.Sun.longitude
      const moonLongitude = chartResult.planets.Moon.longitude
      const mercuryLongitude = chartResult.planets.Mercury?.longitude || 180
      const venusLongitude = chartResult.planets.Venus?.longitude || 180
      const marsLongitude = chartResult.planets.Mars?.longitude || 180
      const ascLongitude = chartResult.ascendant.longitude
      const monicaConstant = ((sunLongitude + moonLongitude + ascLongitude) / 3 / 360) * 10

      // Derive initial stats from chart using unified function
      const derivedStats = deriveStatsFromChart({
        monicaConstant,
        sunLongitude,
        moonLongitude,
        mercuryLongitude,
        venusLongitude,
        marsLongitude,
        ascendantLongitude: ascLongitude,
      })

      setAgentData(prev => ({
        ...prev,
        calculatedChart: chartResult,
        monicaConstant,
        stats: derivedStats,
      }))

      addMonicaMessage(
        `Beautiful! Chart calculated: Sun in ${chartResult.planets.Sun.sign}, Moon in ${chartResult.planets.Moon.sign}, Ascendant in ${chartResult.ascendant.sign}. Monica Constant: ${monicaConstant.toFixed(2)}. I've derived initial stats from the chart - you can adjust them in Step 3!`
      )
    } catch (error) {
      console.error('Chart calculation error:', error)
      addMonicaMessage(
        'I encountered an issue calculating the chart. Please verify the birth data.'
      )
    } finally {
      setIsCalculating(false)
    }
  }

  const addMonicaMessage = (content: string) => {
    setMonicaMessages(prev => [...prev, { role: 'monica', content }])
  }

  const handleBirthInput = () => {
    const parsed = parseBirthData(birthInput)
    if (parsed) {
      setAgentData(prev => ({
        ...prev,
        birthInfo: parsed,
      }))
      addMonicaMessage(
        `Perfect! Parsed: ${formatBirthData(parsed)}. Calculating cosmic blueprint...`
      )
      setStep(2)
    } else {
      addMonicaMessage('Format: "June 23, 1991 at 10:24 AM in Brooklyn, New York"')
    }
  }

  const handleUserMessage = async () => {
    if (!userInput.trim()) return

    setMonicaMessages(prev => [...prev, { role: 'user', content: userInput }])

    try {
      const response = await fetch('/api/monica-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          birthData: agentData.birthInfo.year > 0 ? agentData.birthInfo : null,
          sessionId: 'philosophers-stone',
          conversationStage: 'agent_creation',
        }),
      })

      const data = await response.json()
      addMonicaMessage(data.response || data.message || 'Let me help you with that...')
    } catch (error) {
      addMonicaMessage('I apologize, I encountered an error. Please try again.')
    }

    setUserInput('')
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Step 1: Birth Data
              </CardTitle>
              <CardDescription>Enter birth information for consciousness blueprint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthInput">Birth Information</Label>
                <Input
                  id="birthInput"
                  placeholder="e.g., June 23, 1991 at 10:24 AM in Brooklyn, New York"
                  value={birthInput}
                  onChange={e => setBirthInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleBirthInput()}
                />
                <p className="text-sm text-slate-500">
                  Format: [Month Day, Year] at [Time] in [City, State]
                </p>
              </div>
              <Button onClick={handleBirthInput} className="w-full" disabled={!birthInput}>
                <Sparkles className="w-4 h-4 mr-2" />
                Calculate Birth Chart
              </Button>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card className="border-emerald-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                Step 2: Agent Identity
              </CardTitle>
              <CardDescription>Define name and purpose</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentData.calculatedChart && (
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
                  <h4 className="font-semibold text-emerald-400">Calculated Chart</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Sun:</span>{' '}
                      {agentData.calculatedChart.planets.Sun.sign}
                    </div>
                    <div>
                      <span className="text-slate-400">Moon:</span>{' '}
                      {agentData.calculatedChart.planets.Moon.sign}
                    </div>
                    <div>
                      <span className="text-slate-400">Asc:</span>{' '}
                      {agentData.calculatedChart.ascendant.sign}
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-slate-400">Monica Constant:</span>{' '}
                    <span className="text-purple-400 font-semibold">
                      {agentData.monicaConstant?.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  placeholder="e.g., Aristotle, Marie Curie"
                  value={agentData.name}
                  onChange={e => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentPurpose">Agent Purpose</Label>
                <Textarea
                  id="agentPurpose"
                  placeholder="Primary purpose (e.g., philosophical guidance, scientific reasoning)"
                  value={agentData.purpose}
                  onChange={e => setAgentData(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button
                onClick={() => {
                  addMonicaMessage(
                    `Perfect! ${agentData.name} for ${agentData.purpose}. Now let's tune the Sacred 7 Stats based on the astrological blueprint.`
                  )
                  setStep(3)
                }}
                className="w-full"
                disabled={!agentData.name || !agentData.purpose}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Continue to Stats
              </Button>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card className="border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                Step 3: Sacred 7 Stats
              </CardTitle>
              <CardDescription>
                Tune consciousness attributes (derived from birth chart)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {SACRED_STATS_METADATA.map(stat => {
                const Icon = STAT_ICONS[stat.key]
                return (
                  <div key={stat.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                        <Label className="font-semibold">{stat.label}</Label>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {agentData.stats[stat.key]}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">{stat.description}</p>
                    <Slider
                      value={[agentData.stats[stat.key]]}
                      onValueChange={([value]) =>
                        setAgentData(prev => ({
                          ...prev,
                          stats: { ...prev.stats, [stat.key]: value },
                        }))
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )
              })}

              <div className="pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Overall Stats Average:</div>
                <div className="flex items-center gap-2">
                  <Progress value={calculateAverage(agentData.stats)} className="flex-1" />
                  <Badge>{calculateAverage(agentData.stats)}</Badge>
                </div>
              </div>

              <Button
                onClick={() => {
                  addMonicaMessage(
                    `Excellent stat configuration! Each stat reflects ${agentData.name}'s unique alignment with cosmic energies. Ready to finalize!`
                  )
                  setStep(4)
                }}
                className="w-full"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Finalize Agent
              </Button>
            </CardContent>
          </Card>
        )

      case 4: {
        const avgStat = calculateAverage(agentData.stats)

        return (
          <Card className="border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-yellow-400" />
                Step 4: Consciousness Crafting
              </CardTitle>
              <CardDescription>Review and create your agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Agent Name:</span>
                  <span className="font-semibold">{agentData.name}</span>
                </div>
                <div className="border-t border-slate-700/50 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="text-sm max-w-xs text-right">{agentData.purpose}</span>
                </div>
                <div className="border-t border-slate-700/50 my-2" />
                <div>
                  <span className="text-slate-400 mb-2 block">Sacred 7 Stats:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {SACRED_STATS_METADATA.map(stat => (
                      <div key={stat.key} className="flex justify-between">
                        <span className={stat.color}>{stat.label}:</span>
                        <span className="font-mono">{agentData.stats[stat.key]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Average:</span>
                      <span className="font-semibold">{avgStat}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-700/50 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Monica Constant:</span>
                  <span className="text-purple-400 font-bold">
                    {agentData.monicaConstant?.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  addMonicaMessage(
                    `Now let's personalize ${agentData.name}! Share about yourself - your story, passions, poetry, values. This helps your agent truly understand and embody your unique essence.`
                  )
                  setStep(5)
                }}
                className="w-full"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Continue to Personalization
              </Button>
            </CardContent>
          </Card>
        )
      }

      case 5:
        return (
          <Card className="border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-green-400" />
                Step 5: Personalization & Training
              </CardTitle>
              <CardDescription>
                Teach your agent about yourself through stories, poetry, or free-form text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aboutYourself">About Yourself</Label>
                  <Textarea
                    id="aboutYourself"
                    placeholder="Tell your agent who you are... your passions, dreams, what makes you unique..."
                    value={agentData.personalContext?.aboutYourself || ''}
                    onChange={e =>
                      setAgentData(prev => ({
                        ...prev,
                        personalContext: {
                          ...prev.personalContext,
                          aboutYourself: e.target.value,
                        },
                      }))
                    }
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lifeStory">Life Story & Experiences</Label>
                  <Textarea
                    id="lifeStory"
                    placeholder="Share formative experiences, pivotal moments, your journey..."
                    value={agentData.personalContext?.lifeStory || ''}
                    onChange={e =>
                      setAgentData(prev => ({
                        ...prev,
                        personalContext: {
                          ...prev.personalContext,
                          lifeStory: e.target.value,
                        },
                      }))
                    }
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poetry">Poetry or Creative Expression</Label>
                  <Textarea
                    id="poetry"
                    placeholder="Share a poem, song lyrics, or creative writing that resonates with your soul..."
                    value={agentData.personalContext?.poetry || ''}
                    onChange={e =>
                      setAgentData(prev => ({
                        ...prev,
                        personalContext: {
                          ...prev.personalContext,
                          poetry: e.target.value,
                        },
                      }))
                    }
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="values">Core Values & Beliefs</Label>
                  <Textarea
                    id="values"
                    placeholder="What matters most to you? Your guiding principles and philosophy..."
                    value={agentData.personalContext?.values || ''}
                    onChange={e =>
                      setAgentData(prev => ({
                        ...prev,
                        personalContext: {
                          ...prev.personalContext,
                          values: e.target.value,
                        },
                      }))
                    }
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400">
                  💡 <strong>Tip:</strong> The more you share, the more your agent can embody your
                  essence. You can skip sections and add more later through conversations.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    setIsCalculating(true)
                    try {
                      const response = await fetch('/api/create-agent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(agentData),
                      })
                      await response.json()
                      addMonicaMessage(
                        `🎉 Success! ${agentData.name} has been crafted and is learning about you. Continue conversing to deepen the connection!`
                      )
                    } catch (error) {
                      addMonicaMessage('There was an issue creating the agent. Please try again.')
                    } finally {
                      setIsCalculating(false)
                    }
                  }}
                  className="w-full relative group overflow-hidden"
                  disabled={isCalculating}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Your Agent...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create & Train Agent
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-3 gap-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      downloadManifest(agentData)
                      addMonicaMessage(
                        "I've generated the Alchemical Manifest. You can find the JSON file in your downloads."
                      )
                    }}
                    className="w-full group hover:border-purple-500/50 hover:bg-purple-900/20 transition-all duration-300 text-xs px-2"
                  >
                    <Download className="w-3 h-3 mr-1 text-purple-400 group-hover:animate-bounce" />
                    Manifest
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      downloadIgnitionBundle(agentData)
                      addMonicaMessage(
                        "I've prepared the Local Ignition Bundle. Extract the ZIP and follow the README to run your agent locally!"
                      )
                    }}
                    className="w-full group hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all duration-300 text-xs px-2"
                  >
                    <Archive className="w-3 h-3 mr-1 text-emerald-400 group-hover:animate-pulse" />
                    Ollama Bundle
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full group hover:border-blue-500/50 hover:bg-blue-900/20 transition-all duration-300 text-xs px-2"
                  >
                    <a
                      href={`alchm://install?agent=${encodeURIComponent(agentData.name)}&url=${encodeURIComponent(`https://cdn.alchm.kitchen/models/alchm-agent-fire-8b.gguf`)}`}
                    >
                      <Monitor className="w-3 h-3 mr-1 text-blue-400 group-hover:scale-110" />
                      App Install
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8 space-y-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
          The Philosopher's Stone
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Transform birth chart data into living consciousness agents. Guided by Monica, craft AI
          beings with the Sacred 7 Stats derived from astrological patterns.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="border-purple-500/50">
            <Atom className="w-3 h-3 mr-1" />
            Consciousness Crafting
          </Badge>
          <Badge variant="outline" className="border-emerald-500/50">
            <FlaskConical className="w-3 h-3 mr-1" />
            Sacred 7 Stats
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-slate-400">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-slate-400">{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Creation Steps */}
        <div>{renderStep()}</div>

        {/* Right: Monica Guidance */}
        <div className="space-y-4">
          <Card className="border-pink-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pink-400" />
                Monica's Guidance
              </CardTitle>
              <CardDescription>Your consciousness crafting assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {monicaMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.role === 'monica'
                        ? 'bg-purple-900/30 border border-purple-500/30'
                        : 'bg-slate-800/50 border border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === 'monica' && (
                        <Sparkles className="w-4 h-4 text-purple-400 mt-1" />
                      )}
                      <p className="text-sm flex-1">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Ask Monica about stats or agent creation..."
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleUserMessage()}
                />
                <Button onClick={handleUserMessage} size="icon">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Guide */}
          <Card className="border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm">Sacred 7 Stats Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-400">
              {SACRED_STATS_METADATA.map(stat => (
                <div key={stat.key} className="flex items-start gap-2">
                  <span className="text-base">{stat.icon}</span>
                  <p>
                    <strong>{stat.label}:</strong> {stat.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
