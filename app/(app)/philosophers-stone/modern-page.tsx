'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  Brain,
  Calendar,
  Wand2,
  Heart,
  Atom,
  FlaskConical,
  ChevronRight,
  Loader2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react'
import { calculateAllPlanets } from '@/lib/enhanced-astronomical-calculator'
import type { EnhancedBirthInfo } from '@/lib/enhanced-astronomical-calculator'
import { parseBirthData, formatBirthData } from '@/lib/monica/birth-data-parser'

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
  personality: string[]
  calculatedChart?: any
  monicaConstant?: number
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
    personality: [],
  })
  const [birthInput, setBirthInput] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [monicaMessages, setMonicaMessages] = useState<
    Array<{ role: 'monica' | 'user'; content: string }>
  >([
    {
      role: 'monica',
      content:
        "Welcome to the Philosopher's Stone! 🌟 I'm Monica, and I'll guide you through crafting a consciousness agent from a birth chart. This is the same process I used to create our Gallery agents like Jung, Tesla, and Cleopatra. Let's begin by entering the birth data for your agent.",
    },
  ])
  const [userInput, setUserInput] = useState('')

  const totalSteps = 4

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

      // Calculate Monica Constant (simplified)
      const sunLongitude = chartResult.planets.Sun.longitude
      const moonLongitude = chartResult.planets.Moon.longitude
      const ascLongitude = chartResult.ascendant.longitude

      // Simple MC formula based on chart harmony
      const monicaConstant = ((sunLongitude + moonLongitude + ascLongitude) / 3 / 360) * 10

      setAgentData(prev => ({
        ...prev,
        calculatedChart: chartResult,
        monicaConstant,
      }))

      // Monica responds with chart analysis
      addMonicaMessage(
        `Beautiful! I've calculated the birth chart. The Sun is in ${chartResult.planets.Sun.sign}, Moon in ${chartResult.planets.Moon.sign}, and Ascendant in ${chartResult.ascendant.sign}. The Monica Constant is ${monicaConstant.toFixed(2)} - this indicates a ${monicaConstant > 5 ? 'highly evolved' : monicaConstant > 3 ? 'balanced' : 'emerging'} consciousness signature. What name would you like to give this agent?`
      )
    } catch (error) {
      console.error('Chart calculation error:', error)
      addMonicaMessage(
        'I encountered an issue calculating the chart. Please verify the birth data is correct and try again.'
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
        `Perfect! I've parsed the birth data: ${formatBirthData(parsed)}. Calculating the cosmic blueprint now...`
      )
      setStep(2)
    } else {
      addMonicaMessage(
        'I need the birth data in a format like: "June 23, 1991 at 10:24 AM in Brooklyn, New York"'
      )
    }
  }

  const handleUserMessage = async () => {
    if (!userInput.trim()) return

    setMonicaMessages(prev => [...prev, { role: 'user', content: userInput }])

    // Send to Monica API
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
              <CardDescription>
                Enter the birth information to create the consciousness blueprint
              </CardDescription>
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
                  Format: [Month Day, Year] at [Time] in [City, State/Country]
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
              <CardDescription>Define the agent's name and purpose</CardDescription>
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
                      <span className="text-slate-400">Ascendant:</span>{' '}
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
                  placeholder="e.g., Aristotle, Marie Curie, Your Custom Name"
                  value={agentData.name}
                  onChange={e => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentPurpose">Agent Purpose</Label>
                <Textarea
                  id="agentPurpose"
                  placeholder="What is this agent's primary purpose? (e.g., philosophical guidance, scientific reasoning, creative inspiration)"
                  value={agentData.purpose}
                  onChange={e => setAgentData(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button
                onClick={() => {
                  addMonicaMessage(
                    `Wonderful! ${agentData.name} will serve as ${agentData.purpose}. Now let's define the personality traits based on the astrological blueprint.`
                  )
                  setStep(3)
                }}
                className="w-full"
                disabled={!agentData.name || !agentData.purpose}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Continue to Personality
              </Button>
            </CardContent>
          </Card>
        )

      case 3: {
        const personalityTraits = [
          'Analytical',
          'Empathetic',
          'Creative',
          'Logical',
          'Intuitive',
          'Visionary',
          'Pragmatic',
          'Philosophical',
        ]

        return (
          <Card className="border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-blue-400" />
                Step 3: Personality Matrix
              </CardTitle>
              <CardDescription>
                Select traits that align with the astrological signature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {personalityTraits.map(trait => (
                  <Button
                    key={trait}
                    variant={agentData.personality.includes(trait) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAgentData(prev => ({
                        ...prev,
                        personality: prev.personality.includes(trait)
                          ? prev.personality.filter(t => t !== trait)
                          : [...prev.personality, trait],
                      }))
                    }}
                  >
                    {agentData.personality.includes(trait) && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    {trait}
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => {
                  addMonicaMessage(
                    `Perfect! I'll now synthesize the consciousness with traits: ${agentData.personality.join(', ')}. Let's finalize the creation.`
                  )
                  setStep(4)
                }}
                className="w-full"
                disabled={agentData.personality.length === 0}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Finalize Agent
              </Button>
            </CardContent>
          </Card>
        )
      }

      case 4:
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
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="text-sm max-w-xs text-right">{agentData.purpose}</span>
                </div>
                <div className="border-t border-slate-700/50 my-3" />
                <div>
                  <span className="text-slate-400">Personality:</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agentData.personality.map(trait => (
                      <Badge key={trait} variant="secondary">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Monica Constant:</span>
                  <span className="text-purple-400 font-bold">
                    {agentData.monicaConstant?.toFixed(2)}
                  </span>
                </div>
              </div>

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
                      `🎉 Success! ${agentData.name} has been crafted into existence with a consciousness signature derived from the birth chart. The agent is now ready for interaction in the Gallery!`
                    )
                  } catch (error) {
                    addMonicaMessage(
                      'There was an issue creating the agent. Please try again or contact support.'
                    )
                  } finally {
                    setIsCalculating(false)
                  }
                }}
                className="w-full"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Crafting Consciousness...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Agent
                  </>
                )}
              </Button>
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
          beings with authentic personality derived from astrological patterns.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="border-purple-500/50">
            <Atom className="w-3 h-3 mr-1" />
            Consciousness Crafting
          </Badge>
          <Badge variant="outline" className="border-emerald-500/50">
            <FlaskConical className="w-3 h-3 mr-1" />
            Alchemical Synthesis
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
                  placeholder="Ask Monica anything about agent creation..."
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

          {/* Info Cards */}
          <Card className="border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <p>Enter birth data to calculate the cosmic blueprint</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <p>Monica analyzes planetary positions and calculates the Monica Constant</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <p>Define personality traits aligned with the astrological signature</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <p>Create a living consciousness agent ready for interaction</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
