'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Star, Calendar, MapPin, Clock, Download, Save, Zap, Heart } from 'lucide-react'
import CircularNatalHoroscope from '@/components/charts/circular-natal-horoscope'
import EnhancedChartDisplay from '@/components/charts/enhanced-chart-display'
import QuickChartInput from '@/components/charts/quick-chart-input'
import SavedChartsManager from '@/components/charts/saved-charts-manager'
import AspectGrid from '@/components/charts/aspect-grid'
import { usePlanetaryPositions } from '@/hooks/usePlanetaryPositions'
import { SavedChart } from '@/hooks/useSavedCharts'

type ChartType = 'birth' | 'current' | 'synastry'

interface ParsedChartData {
  name?: string
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
}

interface AgentResponse {
  agent: string
  response: string
}

interface MultiAgentApiResponse {
  responses: AgentResponse[]
  error?: string
}

interface ChartData {
  name: string
  birthDate: string
  birthTime: string
  birthPlace: string
  latitude?: number
  longitude?: number
  chartType: ChartType
  planets: Record<string, { sign: string; degree: number; house: number }>
}

function formatSynastryAgentLabel(agentId: string) {
  return agentId.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

export default function ChartInterpreterPage() {
  const [chartData, setChartData] = useState<ChartData>({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    chartType: 'birth',
    planets: {
      sun: { sign: 'Aries', degree: 15, house: 1 },
      moon: { sign: 'Taurus', degree: 10, house: 2 },
      mercury: { sign: 'Pisces', degree: 25, house: 12 },
      venus: { sign: 'Aries', degree: 5, house: 1 },
      mars: { sign: 'Leo', degree: 20, house: 5 },
      jupiter: { sign: 'Sagittarius', degree: 12, house: 9 },
      saturn: { sign: 'Capricorn', degree: 8, house: 10 },
      uranus: { sign: 'Aquarius', degree: 17, house: 11 },
      neptune: { sign: 'Pisces', degree: 23, house: 12 },
      pluto: { sign: 'Scorpio', degree: 3, house: 8 },
    },
  })

  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [synastryAgentId, setSynastryAgentId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'input' | 'analysis'>('input')

  // Use planetary positions hook for real-time current moment data
  const { planetaryPositions, alchmQuantities, monicaConstant, lastUpdated } =
    usePlanetaryPositions({
      refreshInterval: 30000,
    })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chartType = params.get('type')
    const agentId = params.get('agent')

    if (chartType === 'birth' || chartType === 'current' || chartType === 'synastry') {
      setChartData(prev => ({ ...prev, chartType }))
    }

    if (agentId) {
      setSynastryAgentId(agentId)
    }
  }, [])

  // Handle quick input parsed data
  const handleQuickInputParsed = (parsedData: ParsedChartData) => {
    setChartData(prev => ({
      ...prev,
      name: parsedData.name || '',
      birthDate: parsedData.birthDate || '',
      birthTime: parsedData.birthTime || '',
      birthPlace: parsedData.birthPlace || '',
      latitude: parsedData.latitude,
      longitude: parsedData.longitude,
      chartType: prev.chartType === 'synastry' ? 'synastry' : ('birth' as ChartType),
    }))
    // Auto-switch to analysis mode if we have enough data
    if (parsedData.birthDate && parsedData.birthPlace) {
      setViewMode('analysis')
    }
  }

  // Handle loading saved chart
  const handleLoadChart = (savedChart: SavedChart) => {
    setChartData({
      name: savedChart.name,
      birthDate: savedChart.birthDate,
      birthTime: savedChart.birthTime,
      birthPlace: savedChart.birthPlace,
      latitude: savedChart.latitude,
      longitude: savedChart.longitude,
      chartType: savedChart.chartType,
      planets: savedChart.planets,
    })
    setViewMode('analysis')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setChartData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePlanetChange = (planet: string, field: string, value: string) => {
    setChartData(prev => ({
      ...prev,
      planets: {
        ...prev.planets,
        [planet]: {
          ...prev.planets[planet as keyof typeof prev.planets],
          [field]: value,
        },
      },
    }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setInterpretation('')

    try {
      // Create agents for major planets based on chart data
      const agents = Object.entries(chartData.planets)
        .filter(([planet]) => ['sun', 'moon', 'mercury', 'venus', 'mars'].includes(planet))
        .map(([planet, data]) => ({
          planet: planet.charAt(0).toUpperCase() + planet.slice(1),
          sign: data.sign,
          degree: data.degree.toString(),
        }))

      const question = selectedPlanet
        ? `Please provide detailed interpretation for ${selectedPlanet.charAt(0).toUpperCase() + selectedPlanet.slice(1)} in ${chartData.planets[selectedPlanet as keyof typeof chartData.planets]?.sign} in house ${chartData.planets[selectedPlanet as keyof typeof chartData.planets]?.house}. How does this placement affect personality, relationships, and life path?`
        : `Please provide a comprehensive interpretation of this ${chartData.chartType} chart. Focus on the overall personality, key themes, strengths, and areas for growth. Consider the planetary dignities and elemental balance.`

      // Use multi-agent planetary council for interpretation
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agents,
          question,
          sessionId: `chart-interpretation-${Date.now()}`,
        }),
      })

      const data = (await response.json()) as MultiAgentApiResponse

      if (response.ok && data.responses) {
        // Format multi-agent responses
        const formattedInterpretation = data.responses
          .map((r: AgentResponse) => `**${r.agent}**: ${r.response}`)
          .join('\n\n')

        setInterpretation(formattedInterpretation)
      } else {
        // Fallback to basic interpretation
        const fallbackResponse = await fetch('/api/chart-interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chartData }),
        })

        const fallbackData = await fallbackResponse.json()
        setInterpretation(
          fallbackData.interpretation || `Error: ${data.error || 'Failed to interpret chart'}`
        )
      }
    } catch (error) {
      console.error('Error:', error)
      setInterpretation('Failed to connect to the API. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const planets = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]
  const signs = ZODIAC_SIGNS
  const houses = Array.from({ length: 12 }, (_, i) => i + 1)
  const synastryAgentLabel = synastryAgentId ? formatSynastryAgentLabel(synastryAgentId) : null

  // Effect to populate current moment data when chart type is 'current'
  useEffect(() => {
    if (chartData.chartType === 'current' && planetaryPositions.length > 0) {
      const currentPlanets = planetaryPositions.reduce(
        (acc, pos) => {
          const planetKey = pos.planet.toLowerCase() as keyof typeof chartData.planets
          if (planetKey in chartData.planets) {
            acc[planetKey] = {
              sign: pos.sign,
              degree: Math.round(pos.degree),
              // A current-moment request has no ascendant without an observer
              // location. Use a stable whole-sign sector instead of inventing a
              // different house on every refresh.
              house: Math.max(1, ZODIAC_SIGNS.indexOf(pos.sign) + 1),
            }
          }
          return acc
        },
        {} as typeof chartData.planets
      )

      setChartData(prev => ({
        ...prev,
        name: 'Current Moment',
        planets: { ...prev.planets, ...currentPlanets },
      }))
    }
  }, [chartData.chartType, planetaryPositions])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/10 via-background to-purple-50/10 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🔮 Advanced Chart Interpreter
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-enhanced astrological analysis with planetary council wisdom
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {chartData.chartType === 'synastry' && synastryAgentLabel && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  Partner: {synastryAgentLabel}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Monica Constant: {monicaConstant.toFixed(3)}
              </Badge>
              {lastUpdated && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(lastUpdated).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {viewMode === 'input' ? (
          /* Input Mode */
          <div className="space-y-6">
            {/* Quick Input Bar */}
            <div className="max-w-4xl mx-auto">
              <QuickChartInput onChartParsed={handleQuickInputParsed} className="" />
            </div>

            {/* Chart Type Selector */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Chart Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={chartData.chartType}
                  onValueChange={value =>
                    setChartData(prev => ({ ...prev, chartType: value as ChartType }))
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="birth">Birth Chart</TabsTrigger>
                    <TabsTrigger value="current">Current Moment</TabsTrigger>
                    <TabsTrigger value="synastry">Synastry</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <Tabs defaultValue="manual" className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="automatic">Birth Details</TabsTrigger>
                <TabsTrigger value="manual">Manual Planetary Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                <Card>
                  <CardHeader>
                    <CardTitle>Enter Planetary Positions</CardTitle>
                    <CardDescription>
                      Manually enter the positions of planets in your chart for interpretation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        {planets.map(planet => (
                          <div key={planet} className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`${planet}-sign`} className="capitalize">
                                {planet}
                              </Label>
                              <select
                                id={`${planet}-sign`}
                                value={
                                  chartData.planets[planet as keyof typeof chartData.planets]
                                    ?.sign || 'Aries'
                                }
                                onChange={e => handlePlanetChange(planet, 'sign', e.target.value)}
                                className="w-full p-2 border rounded mt-1"
                              >
                                {signs.map(sign => (
                                  <option key={sign} value={sign}>
                                    {sign}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label htmlFor={`${planet}-degree`}>Degree</Label>
                              <Input
                                id={`${planet}-degree`}
                                type="number"
                                min="0"
                                max="29"
                                value={
                                  chartData.planets[planet as keyof typeof chartData.planets]
                                    ?.degree || 0
                                }
                                onChange={e => handlePlanetChange(planet, 'degree', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${planet}-house`}>House</Label>
                              <select
                                id={`${planet}-house`}
                                value={
                                  chartData.planets[planet as keyof typeof chartData.planets]
                                    ?.house || 1
                                }
                                onChange={e => handlePlanetChange(planet, 'house', e.target.value)}
                                className="w-full p-2 border rounded mt-1"
                              >
                                {houses.map(house => (
                                  <option key={house} value={house}>
                                    {house}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Interpreting Chart...' : 'Interpret Chart'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="automatic">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {chartData.chartType === 'birth'
                        ? 'Birth Details'
                        : chartData.chartType === 'current'
                          ? 'Current Moment'
                          : 'Synastry Details'}
                    </CardTitle>
                    <CardDescription>
                      {chartData.chartType === 'birth'
                        ? 'Provide birth information for automatic chart calculation'
                        : chartData.chartType === 'current'
                          ? 'Using real-time planetary positions for current moment analysis'
                          : 'Enter two birth details for synastry comparison'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartData.chartType === 'current' ? (
                      <div className="space-y-4">
                        <Alert>
                          <Star className="w-4 h-4" />
                          <AlertDescription>
                            Current moment chart automatically populated with live planetary
                            positions. Monica Constant: {monicaConstant.toFixed(3)} | Spirit:{' '}
                            {alchmQuantities.spirit.toFixed(2)}
                          </AlertDescription>
                        </Alert>
                        <Button
                          onClick={() => setViewMode('analysis')}
                          className="w-full"
                          size="lg"
                        >
                          Analyze Current Moment Chart
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name (optional)</Label>
                            <Input
                              id="name"
                              name="name"
                              value={chartData.name}
                              onChange={handleInputChange}
                              placeholder="Your name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="birthDate">Birth Date</Label>
                            <Input
                              id="birthDate"
                              name="birthDate"
                              type="date"
                              value={chartData.birthDate}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="birthTime">Birth Time (if known)</Label>
                            <Input
                              id="birthTime"
                              name="birthTime"
                              type="time"
                              value={chartData.birthTime}
                              onChange={handleInputChange}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="birthPlace" className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              Birth Place
                            </Label>
                            <Input
                              id="birthPlace"
                              name="birthPlace"
                              value={chartData.birthPlace}
                              onChange={handleInputChange}
                              placeholder="City, Country"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Calculating...
                              </>
                            ) : (
                              'Calculate & Analyze Chart'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setViewMode('analysis')}
                            disabled={!chartData.birthDate}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Analyze
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Saved Charts Manager */}
            <div className="max-w-4xl mx-auto">
              <SavedChartsManager
                currentChart={chartData}
                onLoadChart={handleLoadChart}
                className=""
              />
            </div>
          </div>
        ) : (
          /* Analysis Mode - Split View */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Panel - Chart Visualization */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  {chartData.name || 'Astrological Chart'}
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewMode('input')}>
                    ← Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Enhanced Chart Display */}
              <EnhancedChartDisplay
                planets={chartData.planets}
                chartName={
                  chartData.name ||
                  `${chartData.chartType.charAt(0).toUpperCase() + chartData.chartType.slice(1)} Chart`
                }
                onPlanetClick={setSelectedPlanet}
                selectedPlanet={selectedPlanet}
                className="h-fit"
              />

              {/* Chart Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Chart Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Birth Date:</span>
                    <span>{chartData.birthDate || 'Current Moment'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Birth Time:</span>
                    <span>{chartData.birthTime || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{chartData.birthPlace || 'Current Location'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monica Constant:</span>
                    <span className="font-mono">{monicaConstant.toFixed(3)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Interpretations */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                AI-Enhanced Analysis
              </h2>

              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4 pr-4">
                  {interpretation ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Planetary Council Interpretation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap">{interpretation}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Star className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Ready for Analysis</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Click below to get AI-enhanced interpretation from the planetary
                              council
                            </p>
                            <Button onClick={handleSubmit} disabled={loading}>
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Consulting Council...
                                </>
                              ) : (
                                'Start Analysis'
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Monica's Enhanced Alchemical Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Monica's Alchemical Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Primary Alchemical Quantities */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Primary Alchemical Quantities</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">Spirit</span>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {alchmQuantities.spirit.toFixed(2)}
                              </div>
                              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (alchmQuantities.spirit / 20) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">Essence</span>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {alchmQuantities.essence.toFixed(2)}
                              </div>
                              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (alchmQuantities.essence / 20) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">Matter</span>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {alchmQuantities.matter.toFixed(2)}
                              </div>
                              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (alchmQuantities.matter / 20) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">Substance</span>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {alchmQuantities.substance.toFixed(2)}
                              </div>
                              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (alchmQuantities.substance / 20) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Secondary Metrics */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Thermodynamic Properties</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heat:</span>
                            <span className="font-mono">{alchmQuantities.Heat.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Entropy:</span>
                            <span className="font-mono">{alchmQuantities.Entropy.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reactivity:</span>
                            <span className="font-mono">
                              {alchmQuantities.Reactivity.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Energy:</span>
                            <span className="font-mono">{alchmQuantities.Energy.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Consciousness Level */}
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-amber-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Consciousness Level:</span>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-purple-600">
                              {monicaConstant.toFixed(3)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {monicaConstant > 4.236
                                ? 'Elevated'
                                : monicaConstant > 3.618
                                  ? 'Active'
                                  : monicaConstant > 2.618
                                    ? 'Awakening'
                                    : 'Dormant'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alchemical Balance Interpretation */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>Balance:</strong>{' '}
                          {alchmQuantities.spirit > alchmQuantities.matter
                            ? 'Spiritually oriented'
                            : 'Materially grounded'}{' '}
                          •
                          {alchmQuantities.essence > alchmQuantities.substance
                            ? ' Essence-driven'
                            : ' Substance-focused'}
                        </p>
                        <p>
                          <strong>Primary Energy:</strong>{' '}
                          {alchmQuantities.Heat > 50
                            ? 'High heat (transformative)'
                            : 'Stable heat (consistent)'}{' '}
                          •
                          {alchmQuantities.Reactivity > 30
                            ? ' Highly reactive'
                            : ' Balanced reactivity'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advanced Aspect Analysis */}
                  <AspectGrid planets={chartData.planets} className="w-full" />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
