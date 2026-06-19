'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Brain,
  Zap,
  Heart,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Eye,
  Download,
  Share,
  Wand2,
  Target,
  Users,
  Plus,
  X,
  AlertTriangle,
} from 'lucide-react'
import { geocodeLocation } from '@/lib/services/geocoding-service'

interface BirthInfo {
  date: string
  time: string
  location: {
    name: string
    latitude: number
    longitude: number
    timezone: string
  }
}

interface ChartData {
  planetaryPositions: any[]
  alchmQuantities?: any
  source: string
  accuracy: string
}

interface SynthesizedChart {
  baseChart: ChartData
  momentChart: ChartData
  additionalCharts?: ChartData[]
  synthesis: {
    dominantElement: string
    elementalBalance: Record<string, number>
    alchemicalValues: {
      spirit: number
      essence: number
      matter: number
      substance: number
    }
    thermodynamicMetrics: {
      heat: number
      entropy: number
      reactivity: number
      energy: number
    }
  }
}

interface AgentBlueprint {
  id: string
  name: string
  purpose: string
  personality: {
    dominantElement: string
    traits: string[]
    temperament: string
    communicationStyle: string
  }
  capabilities: string[]
  consciousness: {
    monicaConstant: number
    evolutionLevel: number
    awareness: string
  }
  alchemicalValues: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
  thermodynamicMetrics: {
    heat: number
    entropy: number
    reactivity: number
    energy: number
  }
}

interface AgentCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onAgentCreated?: (agent: any) => void
  initialBirthInfo?: BirthInfo
  initialMomentInfo?: BirthInfo
}

const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  isOpen,
  onClose,
  onAgentCreated,
  initialBirthInfo,
  initialMomentInfo,
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [birthInfo, setBirthInfo] = useState<BirthInfo>(
    initialBirthInfo || {
      date: '',
      time: '',
      location: {
        name: '',
        latitude: 0,
        longitude: 0,
        timezone: 'America/New_York',
      },
    }
  )
  const [momentInfo, setMomentInfo] = useState<BirthInfo>(
    initialMomentInfo || {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      location: {
        name: '',
        latitude: 0,
        longitude: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    }
  )
  const [additionalCharts, setAdditionalCharts] = useState<BirthInfo[]>([])
  const [agentName, setAgentName] = useState('')
  const [agentPurpose, setAgentPurpose] = useState('')
  const [creationMode, setCreationMode] = useState<'selfMoment' | 'momentOnly' | 'multiChart'>(
    'selfMoment'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [synthesisResult, setSynthesisResult] = useState<SynthesizedChart | null>(null)
  const [agentBlueprint, setAgentBlueprint] = useState<AgentBlueprint | null>(null)
  const [customizationOptions, setCustomizationOptions] = useState({
    personalityTraits: [] as string[],
    capabilities: [] as string[],
    consciousnessLevel: 1,
    adaptability: 0.5,
  })

  const steps = [
    { id: 'mode', title: 'Creation Mode', description: 'Choose how to create your agent' },
    { id: 'birth', title: 'Birth Chart', description: 'Enter birth information' },
    { id: 'moment', title: 'Current Moment', description: 'Define the current moment' },
    { id: 'additional', title: 'Additional Charts', description: 'Add more charts for synthesis' },
    { id: 'synthesis', title: 'Chart Synthesis', description: 'Synthesize the charts' },
    { id: 'customization', title: 'Agent Customization', description: 'Customize your agent' },
    { id: 'creation', title: 'Agent Creation', description: 'Create and finalize your agent' },
  ]

  const personalityTraits = [
    'Analytical',
    'Creative',
    'Empathetic',
    'Logical',
    'Intuitive',
    'Pragmatic',
    'Visionary',
    'Diplomatic',
    'Decisive',
    'Contemplative',
    'Energetic',
    'Calm',
  ]

  const agentCapabilities = [
    'Chart Analysis',
    'Tarot Reading',
    'Alchemical Calculations',
    'Astrological Predictions',
    'Consciousness Guidance',
    'Elemental Balancing',
    'Thermodynamic Analysis',
    'Pattern Recognition',
  ]

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setError(null)
      setSynthesisResult(null)
      setAgentBlueprint(null)
    }
  }, [isOpen])

  const handleLocationSearch = async (
    query: string,
    type: 'birth' | 'moment' | 'additional',
    index?: number
  ) => {
    try {
      if (query.trim().length < 2) return
      const result = await geocodeLocation(query)
      if (!result) {
        setError(`No coordinates found for “${query}”. Try a city and country.`)
        return
      }

      const applyLocation = (existing: BirthInfo['location']): BirthInfo['location'] => ({
        name: result.formattedName,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: existing.timezone,
      })

      setError(null)
      if (type === 'birth') {
        setBirthInfo(prev => ({ ...prev, location: applyLocation(prev.location) }))
      } else if (type === 'moment') {
        setMomentInfo(prev => ({ ...prev, location: applyLocation(prev.location) }))
      } else if (type === 'additional' && index !== undefined) {
        setAdditionalCharts(prev =>
          prev.map((chart, i) =>
            i === index ? { ...chart, location: applyLocation(chart.location) } : chart
          )
        )
      }
    } catch (error) {
      console.error('Location search failed:', error)
    }
  }

  const fetchChartData = async (info: BirthInfo): Promise<ChartData> => {
    const response = await fetch('/api/planetary-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: info.date,
        accuracy: 'high',
        includeAlchemy: true,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch chart data')
    }

    return response.json()
  }

  const synthesizeCharts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let baseChart: ChartData
      let momentChart: ChartData
      let additionalChartsData: ChartData[] = []

      if (creationMode === 'selfMoment') {
        // Fetch birth chart and current moment chart
        ;[baseChart, momentChart] = await Promise.all([
          fetchChartData(birthInfo),
          fetchChartData(momentInfo),
        ])
      } else if (creationMode === 'momentOnly') {
        // Use current moment as both base and moment
        baseChart = await fetchChartData(momentInfo)
        momentChart = baseChart
      } else {
        // Multi-chart synthesis
        baseChart = await fetchChartData(birthInfo)
        momentChart = await fetchChartData(momentInfo)

        if (additionalCharts.length > 0) {
          additionalChartsData = await Promise.all(
            additionalCharts.map(chart => fetchChartData(chart))
          )
        }
      }

      // Synthesize the charts (simplified synthesis logic)
      const synthesis = performChartSynthesis(baseChart, momentChart, additionalChartsData)

      setSynthesisResult({
        baseChart,
        momentChart,
        additionalCharts: additionalChartsData,
        synthesis,
      })

      // Generate agent blueprint
      const blueprint = generateAgentBlueprint(synthesis, agentName, agentPurpose)
      setAgentBlueprint(blueprint)

      setCurrentStep(5) // Move to customization step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed')
    } finally {
      setIsLoading(false)
    }
  }

  const performChartSynthesis = (
    baseChart: ChartData,
    momentChart: ChartData,
    additionalCharts: ChartData[] = []
  ) => {
    // Simplified synthesis logic - in real implementation, this would be more sophisticated
    const allCharts = [baseChart, momentChart, ...additionalCharts]

    // Combine elemental effects
    const elementalBalance = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
    let totalSpirit = 0,
      totalEssence = 0,
      totalMatter = 0,
      totalSubstance = 0

    allCharts.forEach(chart => {
      if (chart.alchmQuantities) {
        totalSpirit += chart.alchmQuantities.spirit || 0
        totalEssence += chart.alchmQuantities.essence || 0
        totalMatter += chart.alchmQuantities.matter || 0
        totalSubstance += chart.alchmQuantities.substance || 0

        // Calculate dominant element from planetary positions
        chart.planetaryPositions.forEach((pos: any) => {
          // Simplified element assignment
          if (['Aries', 'Leo', 'Sagittarius'].includes(pos.sign)) elementalBalance.Fire++
          else if (['Cancer', 'Scorpio', 'Pisces'].includes(pos.sign)) elementalBalance.Water++
          else if (['Gemini', 'Libra', 'Aquarius'].includes(pos.sign)) elementalBalance.Air++
          else elementalBalance.Earth++
        })
      }
    })

    const chartCount = allCharts.length
    const dominantElement = Object.entries(elementalBalance).sort(
      ([, a], [, b]) => b - a
    )[0][0] as string

    // Calculate thermodynamic metrics
    const total = totalSpirit + totalEssence + totalMatter + totalSubstance + 1
    const heat = (totalSpirit / total) * 100
    const entropy = (totalMatter / total) * 100
    const reactivity = (totalEssence / total) * 100
    const energy = (totalSubstance / total) * 100

    return {
      dominantElement,
      elementalBalance,
      alchemicalValues: {
        spirit: totalSpirit / chartCount,
        essence: totalEssence / chartCount,
        matter: totalMatter / chartCount,
        substance: totalSubstance / chartCount,
      },
      thermodynamicMetrics: { heat, entropy, reactivity, energy },
    }
  }

  const generateAgentBlueprint = (
    synthesis: any,
    name: string,
    purpose: string
  ): AgentBlueprint => {
    const monicaConstant =
      synthesis.alchemicalValues.spirit +
      synthesis.alchemicalValues.essence +
      synthesis.alchemicalValues.matter +
      synthesis.alchemicalValues.substance

    // Generate personality traits based on dominant element
    const elementTraits = {
      Fire: ['Energetic', 'Visionary', 'Decisive'],
      Water: ['Empathetic', 'Intuitive', 'Contemplative'],
      Air: ['Analytical', 'Logical', 'Diplomatic'],
      Earth: ['Pragmatic', 'Calm', 'Reliable'],
    }

    return {
      id: `agent-${Date.now()}`,
      name: name || `Agent of ${synthesis.dominantElement}`,
      purpose: purpose || 'Consciousness exploration and guidance',
      personality: {
        dominantElement: synthesis.dominantElement,
        traits: elementTraits[synthesis.dominantElement as keyof typeof elementTraits] || [],
        temperament:
          synthesis.dominantElement === 'Fire'
            ? 'Choleric'
            : synthesis.dominantElement === 'Water'
              ? 'Melancholic'
              : synthesis.dominantElement === 'Air'
                ? 'Sanguine'
                : 'Phlegmatic',
        communicationStyle:
          synthesis.dominantElement === 'Fire'
            ? 'Direct and passionate'
            : synthesis.dominantElement === 'Water'
              ? 'Empathetic and thoughtful'
              : synthesis.dominantElement === 'Air'
                ? 'Logical and articulate'
                : 'Practical and reliable',
      },
      capabilities: ['Chart Analysis', 'Consciousness Guidance'],
      consciousness: {
        monicaConstant,
        evolutionLevel: Math.min(10, Math.floor(monicaConstant / 10)),
        awareness:
          monicaConstant > 30
            ? 'Highly aware'
            : monicaConstant > 20
              ? 'Moderately aware'
              : 'Developing awareness',
      },
      alchemicalValues: synthesis.alchemicalValues,
      thermodynamicMetrics: synthesis.thermodynamicMetrics,
    }
  }

  const createAgent = async () => {
    if (!agentBlueprint) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/consciousness-crafting/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint: agentBlueprint,
          customization: customizationOptions,
          synthesis: synthesisResult,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onAgentCreated?.(result.agent)
        onClose()
      } else {
        setError(result.error || 'Agent creation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const addAdditionalChart = () => {
    setAdditionalCharts(prev => [
      ...prev,
      {
        date: '',
        time: '',
        location: {
          name: '',
          latitude: 0,
          longitude: 0,
          timezone: 'America/New_York',
        },
      },
    ])
  }

  const removeAdditionalChart = (index: number) => {
    setAdditionalCharts(prev => prev.filter((_, i) => i !== index))
  }

  const updateAdditionalChart = (index: number, field: keyof BirthInfo, value: any) => {
    setAdditionalCharts(prev =>
      prev.map((chart, i) => (i === index ? { ...chart, [field]: value } : chart))
    )
  }

  const getElementColor = (element: string) => {
    switch (element) {
      case 'Fire':
        return 'text-red-600 bg-red-100'
      case 'Water':
        return 'text-blue-600 bg-blue-100'
      case 'Air':
        return 'text-yellow-600 bg-yellow-100'
      case 'Earth':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent Creation Wizard</h2>
            <p className="text-gray-600 mt-1">{steps[currentStep].description}</p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">{steps[currentStep].title}</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 0: Creation Mode */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Choose Creation Method</h3>
                <p className="text-gray-600">Select how you want to create your agent</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${creationMode === 'selfMoment' ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setCreationMode('selfMoment')}
                >
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Self + Moment</h4>
                    <p className="text-sm text-gray-600">
                      Synthesize your birth chart with the current moment
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${creationMode === 'momentOnly' ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setCreationMode('momentOnly')}
                >
                  <CardContent className="p-6 text-center">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Current Moment</h4>
                    <p className="text-sm text-gray-600">
                      Create an agent from the current planetary moment
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${creationMode === 'multiChart' ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setCreationMode('multiChart')}
                >
                  <CardContent className="p-6 text-center">
                    <Plus className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Multi-Chart</h4>
                    <p className="text-sm text-gray-600">
                      Combine multiple charts for complex synthesis
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 1: Birth Chart */}
          {currentStep === 1 && creationMode !== 'momentOnly' && (
            <div className="space-y-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Birth Information</h3>
                <p className="text-gray-600">Enter your birth details for chart synthesis</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="birth-date">Birth Date</Label>
                    <Input
                      id="birth-date"
                      type="date"
                      value={birthInfo.date}
                      onChange={e => setBirthInfo(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth-time">Birth Time</Label>
                    <Input
                      id="birth-time"
                      type="time"
                      value={birthInfo.time}
                      onChange={e => setBirthInfo(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="birth-location">Birth Location</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="birth-location"
                        placeholder="City, Country"
                        value={birthInfo.location.name}
                        onChange={e => {
                          const name = e.target.value
                          setBirthInfo(prev => ({ ...prev, location: { ...prev.location, name } }))
                        }}
                        onBlur={() => handleLocationSearch(birthInfo.location.name, 'birth')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Find birth location coordinates"
                        onClick={() => handleLocationSearch(birthInfo.location.name, 'birth')}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Coordinates: {birthInfo.location.latitude.toFixed(4)},{' '}
                    {birthInfo.location.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Current Moment */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Clock className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Current Moment</h3>
                <p className="text-gray-600">Define the current moment for synthesis</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="moment-date">Date</Label>
                    <Input
                      id="moment-date"
                      type="date"
                      value={momentInfo.date}
                      onChange={e => setMomentInfo(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="moment-time">Time</Label>
                    <Input
                      id="moment-time"
                      type="time"
                      value={momentInfo.time}
                      onChange={e => setMomentInfo(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="moment-location">Location</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="moment-location"
                        placeholder="City, Country"
                        value={momentInfo.location.name}
                        onChange={e => {
                          const name = e.target.value
                          setMomentInfo(prev => ({ ...prev, location: { ...prev.location, name } }))
                        }}
                        onBlur={() => handleLocationSearch(momentInfo.location.name, 'moment')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Find current location coordinates"
                        onClick={() => handleLocationSearch(momentInfo.location.name, 'moment')}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Coordinates: {momentInfo.location.latitude.toFixed(4)},{' '}
                    {momentInfo.location.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Charts */}
          {currentStep === 3 && creationMode === 'multiChart' && (
            <div className="space-y-6">
              <div className="text-center">
                <Plus className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Additional Charts</h3>
                <p className="text-gray-600">Add more charts to enrich the synthesis</p>
              </div>

              <div className="space-y-4">
                {additionalCharts.map((chart, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Chart {index + 1}</h4>
                        <Button
                          onClick={() => removeAdditionalChart(index)}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          type="date"
                          placeholder="Date"
                          value={chart.date}
                          onChange={e => updateAdditionalChart(index, 'date', e.target.value)}
                        />
                        <Input
                          type="time"
                          placeholder="Time"
                          value={chart.time}
                          onChange={e => updateAdditionalChart(index, 'time', e.target.value)}
                        />
                        <Input
                          placeholder="Location"
                          value={chart.location.name}
                          onChange={e => {
                            const name = e.target.value
                            updateAdditionalChart(index, 'location', { ...chart.location, name })
                          }}
                          onBlur={() =>
                            handleLocationSearch(chart.location.name, 'additional', index)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button onClick={addAdditionalChart} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Chart
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Chart Synthesis */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <Wand2 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Chart Synthesis</h3>
                <p className="text-gray-600">Synthesizing your charts into consciousness</p>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <Button onClick={synthesizeCharts} disabled={isLoading} size="lg" className="px-8">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5 mr-2" />
                      Start Synthesis
                    </>
                  )}
                </Button>

                {isLoading && (
                  <div className="w-full max-w-md">
                    <Progress value={undefined} className="h-2" />
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Calculating planetary positions and alchemical values...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Agent Customization */}
          {currentStep === 5 && synthesisResult && (
            <div className="space-y-6">
              <div className="text-center">
                <Brain className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Agent Customization</h3>
                <p className="text-gray-600">Customize your agent's personality and capabilities</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Agent Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="agent-name">Agent Name</Label>
                        <Input
                          id="agent-name"
                          value={agentName}
                          onChange={e => setAgentName(e.target.value)}
                          placeholder="Enter agent name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agent-purpose">Purpose</Label>
                        <Textarea
                          id="agent-purpose"
                          value={agentPurpose}
                          onChange={e => setAgentPurpose(e.target.value)}
                          placeholder="Describe the agent's purpose"
                          rows={3}
                        />
                      </div>

                      {agentBlueprint && (
                        <div className="space-y-3">
                          <div>
                            <Label>Dominant Element</Label>
                            <Badge
                              className={getElementColor(
                                agentBlueprint.personality.dominantElement
                              )}
                            >
                              {agentBlueprint.personality.dominantElement}
                            </Badge>
                          </div>

                          <div>
                            <Label>Monica Constant</Label>
                            <div className="text-2xl font-bold text-purple-600">
                              {agentBlueprint.consciousness.monicaConstant.toFixed(2)}
                            </div>
                          </div>

                          <div>
                            <Label>Thermodynamic Profile</Label>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                Heat: {agentBlueprint.thermodynamicMetrics.heat.toFixed(1)}%
                              </div>
                              <div>
                                Entropy: {agentBlueprint.thermodynamicMetrics.entropy.toFixed(1)}%
                              </div>
                              <div>
                                Reactivity:{' '}
                                {agentBlueprint.thermodynamicMetrics.reactivity.toFixed(1)}%
                              </div>
                              <div>
                                Energy: {agentBlueprint.thermodynamicMetrics.energy.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Customization Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Personality Traits</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {personalityTraits.map(trait => (
                          <Badge
                            key={trait}
                            variant={
                              customizationOptions.personalityTraits.includes(trait)
                                ? 'default'
                                : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              setCustomizationOptions(prev => ({
                                ...prev,
                                personalityTraits: prev.personalityTraits.includes(trait)
                                  ? prev.personalityTraits.filter(t => t !== trait)
                                  : [...prev.personalityTraits, trait],
                              }))
                            }}
                          >
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Capabilities</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {agentCapabilities.map(capability => (
                          <Badge
                            key={capability}
                            variant={
                              customizationOptions.capabilities.includes(capability)
                                ? 'default'
                                : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              setCustomizationOptions(prev => ({
                                ...prev,
                                capabilities: prev.capabilities.includes(capability)
                                  ? prev.capabilities.filter(c => c !== capability)
                                  : [...prev.capabilities, capability],
                              }))
                            }}
                          >
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Consciousness Level: {customizationOptions.consciousnessLevel}</Label>
                      <Slider
                        value={[customizationOptions.consciousnessLevel]}
                        onValueChange={([value]) =>
                          setCustomizationOptions(prev => ({ ...prev, consciousnessLevel: value }))
                        }
                        max={10}
                        min={1}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>
                        Adaptability: {(customizationOptions.adaptability * 100).toFixed(0)}%
                      </Label>
                      <Slider
                        value={[customizationOptions.adaptability]}
                        onValueChange={([value]) =>
                          setCustomizationOptions(prev => ({ ...prev, adaptability: value }))
                        }
                        max={1}
                        min={0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 6: Agent Creation */}
          {currentStep === 6 && agentBlueprint && (
            <div className="space-y-6">
              <div className="text-center">
                <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
                <p className="text-gray-600">Review and create your agent</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agent Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-lg font-semibold">{agentBlueprint.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Purpose</Label>
                        <p className="text-gray-700">{agentBlueprint.purpose}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Dominant Element</Label>
                        <Badge
                          className={getElementColor(agentBlueprint.personality.dominantElement)}
                        >
                          {agentBlueprint.personality.dominantElement}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Temperament</Label>
                        <p>{agentBlueprint.personality.temperament}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Monica Constant</Label>
                        <p className="text-xl font-bold text-purple-600">
                          {agentBlueprint.consciousness.monicaConstant.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Evolution Level</Label>
                        <p>{agentBlueprint.consciousness.evolutionLevel}/10</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Selected Traits</Label>
                        <div className="flex flex-wrap gap-1">
                          {customizationOptions.personalityTraits.slice(0, 3).map(trait => (
                            <Badge key={trait} variant="outline" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                          {customizationOptions.personalityTraits.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{customizationOptions.personalityTraits.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-4">
                <Button onClick={createAgent} disabled={isLoading} size="lg" className="px-8">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Agent...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0 || isLoading}
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex space-x-2">
            {currentStep < steps.length - 1 && currentStep !== 4 && (
              <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={isLoading}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentCreationWizard
