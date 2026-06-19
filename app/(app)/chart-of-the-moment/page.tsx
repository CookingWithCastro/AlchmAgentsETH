'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wand2, Sparkles } from 'lucide-react'
import { getPlanetaryDignity, getSignElement, getPlanetaryElement } from '@/lib/astrological-data'
import { usePlanetaryPositionsOnly } from '@/hooks/usePlanetaryPositions'
import ElementalChart from '@/components/charts/elemental-chart'
import TarotCosmicWidget from '@/components/misc/tarot-cosmic-widget'
import NatalSigilGenerator from '@/components/misc/natal-sigil-generator'
import { ChartGeometryExtractor } from '@/lib/chart-geometry-extractor'
import { detectPatternsStatic, PlanetPosition } from '@/lib/astrological-pattern-recognition'
import { RuneGeometry } from '@/lib/runes/natal-sigil-runes'

const SIGN_ORDER = [
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

export default function ChartOfTheMomentPage() {
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [isDiurnal, setIsDiurnal] = useState(true)
  const [showSigilGenerator, setShowSigilGenerator] = useState(false)
  const [chartGeometry, setChartGeometry] = useState<RuneGeometry | null>(null)

  // Use unified planetary positions hook for consistency
  const {
    positions: currentPlanetaryPositions,
    loading,
    error,
    refresh,
  } = usePlanetaryPositionsOnly({
    refreshInterval: 30000, // 30 seconds
    useApi: false, // Use direct calculation for backward compatibility
  })

  // Update time and date display
  const updateTimeAndDate = useCallback(() => {
    const now = new Date()

    // Format date as YYYY-MM-DD
    const date = now.toISOString().split('T')[0]

    // Format time as HH:MM
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`

    // Determine if it's day or night
    const diurnal = now.getHours() >= 6 && now.getHours() < 18

    setCurrentDate(date)
    setCurrentTime(time)
    setIsDiurnal(diurnal)
  }, [])

  // Update time and date on mount and every minute
  useEffect(() => {
    updateTimeAndDate()
    const interval = setInterval(updateTimeAndDate, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [updateTimeAndDate])

  // Prepare data for ElementalChart component
  const chartPlanets = Object.entries(currentPlanetaryPositions).reduce(
    (acc, [planet, data]) => ({
      ...acc,
      [`${planet.toLowerCase()}Sign`]: data.sign,
    }),
    {}
  )

  // Generate sigil geometry from current planetary positions
  const generateSigilGeometry = useCallback(() => {
    if (Object.keys(currentPlanetaryPositions).length === 0) return

    // Convert current positions to PlanetPosition format
    const planetPositions: PlanetPosition[] = Object.entries(currentPlanetaryPositions).map(
      ([planet, data]) => ({
        planet,
        sign: data.sign,
        degree: parseFloat(data.degree),
        // This location-free chart cannot calculate true houses. Use the
        // deterministic whole-sign ordinal so repeated sigils remain stable.
        house: Math.max(1, SIGN_ORDER.indexOf(data.sign) + 1),
        date: new Date(),
      })
    )

    // Detect patterns
    const { aspects, patterns } = detectPatternsStatic(planetPositions)

    // Extract geometry
    const geometry = ChartGeometryExtractor.extractFromChartData(planetPositions, aspects, 800, 800)

    // Add patterns
    geometry.sacredPatterns = patterns

    // Calculate elemental balance from current positions
    const signElements = Object.values(currentPlanetaryPositions).map(data =>
      getSignElement(data.sign)
    )
    const elementCounts = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
    signElements.forEach(element => {
      elementCounts[element as keyof typeof elementCounts]++
    })

    const total = signElements.length || 1
    geometry.elementalBalance = {
      fire: Math.round((elementCounts.Fire / total) * 100),
      water: Math.round((elementCounts.Water / total) * 100),
      air: Math.round((elementCounts.Air / total) * 100),
      earth: Math.round((elementCounts.Earth / total) * 100),
    }

    // Determine dominant element
    const maxElement = Object.entries(elementCounts).reduce((a, b) =>
      elementCounts[a[0] as keyof typeof elementCounts] >
      elementCounts[b[0] as keyof typeof elementCounts]
        ? a
        : b
    )
    geometry.dominantElement = maxElement[0]

    setChartGeometry(geometry)
    setShowSigilGenerator(true)
  }, [currentPlanetaryPositions])

  // Get color for element
  const getElementColor = (element: string) => {
    switch (element) {
      case 'Fire':
        return 'bg-red-500 hover:bg-red-600'
      case 'Water':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'Air':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'Earth':
        return 'bg-green-500 hover:bg-green-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  // Get background color based on dignity
  const getDignityColor = (dignity: string) => {
    switch (dignity) {
      case 'domicile':
        return 'bg-emerald-100 dark:bg-emerald-950'
      case 'exaltation':
        return 'bg-blue-100 dark:bg-blue-950'
      case 'detriment':
        return 'bg-red-100 dark:bg-red-950'
      case 'fall':
        return 'bg-orange-100 dark:bg-orange-950'
      default:
        return 'bg-gray-100 dark:bg-gray-950'
    }
  }

  // Get dignity badge style
  const getDignityBadge = (dignity: string) => {
    switch (dignity) {
      case 'domicile':
        return 'bg-emerald-500'
      case 'exaltation':
        return 'bg-blue-500'
      case 'detriment':
        return 'bg-red-500'
      case 'fall':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="container py-12 px-4 mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">Current Planetary Positions</h1>
        <div className="flex justify-center items-center h-60">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
            <p>Calculating planetary positions...</p>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 px-4 mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">Current Planetary Positions</h1>
      <p className="text-center mb-4 max-w-2xl mx-auto">
        Explore the current planetary alignments and their elemental influences
      </p>

      <div className="flex justify-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Positions'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSigilGeometry}
          disabled={loading || Object.keys(currentPlanetaryPositions).length === 0}
          className="gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Generate Moment Sigil
        </Button>
      </div>

      <div className="mb-2 text-center text-sm text-muted-foreground">
        {currentDate} at {currentTime} - {isDiurnal ? 'Day' : 'Night'} Chart
      </div>

      {/* Cosmic Tarot Moment */}
      <div className="mb-8 max-w-md mx-auto">
        <TarotCosmicWidget variant="card" showExpanded={false} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center">Chart of the Moment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(currentPlanetaryPositions).map(([planet, data]) => {
              const dignity = getPlanetaryDignity(planet, data.sign)
              const signElement = getSignElement(data.sign)
              const planetElement = getPlanetaryElement(planet, isDiurnal)

              return (
                <Link
                  href={`/agents/${encodeURIComponent(planet)}/${encodeURIComponent(data.sign)}/${Math.max(1, Math.min(29, Math.floor(parseFloat(data.degree))))}`}
                  key={planet}
                  className={`p-3 rounded-md border flex justify-between items-center ${getDignityColor(dignity)} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{planet}</span>
                    <span>
                      {data.sign} {data.degree}°
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getElementColor(signElement)}>{signElement}</Badge>
                    <Badge className={getElementColor(planetElement)}>{planetElement}</Badge>
                    <Badge className={getDignityBadge(dignity)}>{dignity}</Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sigil Generator */}
      {showSigilGenerator && chartGeometry && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Moment Sigil Generator
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Transform this moment's planetary geometry into a personalized sigil
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" onClick={() => setShowSigilGenerator(false)}>
                    Hide Generator
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Current moment: {currentDate} {currentTime}
                  </div>
                </div>

                <NatalSigilGenerator
                  geometry={chartGeometry}
                  chartData={{
                    currentPositions: currentPlanetaryPositions,
                    timestamp: new Date().toISOString(),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
