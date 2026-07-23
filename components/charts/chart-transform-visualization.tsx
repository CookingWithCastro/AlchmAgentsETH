'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RefreshCw,
  Layers,
  ArrowUpDown,
  TrendingUp,
  RotateCw,
  Zap,
  Eye,
  EyeOff,
  PlayCircle,
  PauseCircle,
} from 'lucide-react'
import type { CraftedAgent } from '@/lib/agent-types'

// Default location outside component to prevent recreation
const DEFAULT_LOCATION = { lat: 37.7749, lon: -122.4194 }

interface ChartPoint {
  planet: string
  sign: string
  degree: number
  house: number
  x: number
  y: number
  symbol: string
}

interface AspectLine {
  from: ChartPoint
  to: ChartPoint
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx'
  orb: number
  applying: boolean
  exact: boolean
}

interface ChartTransformData {
  natal: {
    points: ChartPoint[]
    aspects: AspectLine[]
  }
  current: {
    points: ChartPoint[]
    aspects: AspectLine[]
    transitAspects: AspectLine[] // Transits to natal points
  }
  transformMetrics: {
    totalAspectChanges: number
    powerShift: number // -1 to 1
    elementalShift: {
      fire: number
      water: number
      air: number
      earth: number
    }
    intensityLevel: 'subtle' | 'moderate' | 'strong' | 'intense'
    dominantTransits: string[]
  }
}

interface ChartTransformVisualizationProps {
  agent?: CraftedAgent
  userLocation?: { lat: number; lon: number }
  className?: string
  variant?: 'full' | 'overlay' | 'comparison'
  showAnimation?: boolean
  autoUpdate?: boolean
  onTransformUpdate?: (data: ChartTransformData) => void
}

export function ChartTransformVisualization({
  agent,
  userLocation = DEFAULT_LOCATION,
  className = '',
  variant = 'full',
  showAnimation = true,
  autoUpdate = true,
  onTransformUpdate,
}: ChartTransformVisualizationProps) {
  const [transformData, setTransformData] = useState<ChartTransformData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNatal, setShowNatal] = useState(true)
  const [showCurrent, setShowCurrent] = useState(true)
  const [showTransits, setShowTransits] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)

  // Generate chart positions (simplified circle layout)
  const generateChartPoints = (planets: any[]): ChartPoint[] => {
    const radius = 120
    const centerX = 150
    const centerY = 150

    return planets.map((planet, index) => {
      // Convert degree position to radians for circle positioning
      const totalDegrees = planet.degree + getSignOrder(planet.sign) * 30
      const radians = (totalDegrees * Math.PI) / 180 - Math.PI / 2 // Start from top

      const x = centerX + radius * Math.cos(radians)
      const y = centerY + radius * Math.sin(radians)

      return {
        planet: planet.planet,
        sign: planet.sign,
        degree: planet.degree,
        house: planet.house || 1,
        x,
        y,
        symbol: getPlanetSymbol(planet.planet),
      }
    })
  }

  const getSignOrder = (sign: string): number => {
    const signs = [
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
    return signs.indexOf(sign)
  }

  const getPlanetSymbol = (planet: string): string => {
    const symbols = {
      Sun: '☉',
      Moon: '☽',
      Mercury: '☿',
      Venus: '♀',
      Mars: '♂',
      Jupiter: '♃',
      Saturn: '♄',
      Uranus: '♅',
      Neptune: '♆',
      Pluto: '♇',
      'North Node': '☊',
      'South Node': '☋',
    }
    return symbols[planet as keyof typeof symbols] || '○'
  }

  // Calculate aspects between points
  const calculateAspects = (points: ChartPoint[]): AspectLine[] => {
    const aspects: AspectLine[] = []
    const aspectOrbs = {
      conjunction: 8,
      opposition: 8,
      trine: 6,
      square: 6,
      sextile: 4,
      quincunx: 3,
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const point1 = points[i]
        const point2 = points[j]

        // Calculate angular difference
        const deg1 = getSignOrder(point1.sign) * 30 + point1.degree
        const deg2 = getSignOrder(point2.sign) * 30 + point2.degree
        let diff = Math.abs(deg1 - deg2)
        if (diff > 180) diff = 360 - diff

        // Check for major aspects
        const aspectTypes = [
          { type: 'conjunction' as const, angle: 0 },
          { type: 'opposition' as const, angle: 180 },
          { type: 'trine' as const, angle: 120 },
          { type: 'square' as const, angle: 90 },
          { type: 'sextile' as const, angle: 60 },
          { type: 'quincunx' as const, angle: 150 },
        ]

        for (const aspectType of aspectTypes) {
          const orb = Math.abs(diff - aspectType.angle)
          const maxOrb = aspectOrbs[aspectType.type]

          if (orb <= maxOrb) {
            aspects.push({
              from: point1,
              to: point2,
              type: aspectType.type,
              orb,
              applying: Math.random() > 0.5, // Simplified
              exact: orb < 1,
            })
            break
          }
        }
      }
    }

    return aspects
  }

  // Generate mock chart data
  const generateMockChartData = (): ChartTransformData => {
    const natalPlanets = [
      { planet: 'Sun', sign: 'Taurus', degree: 15, house: 1 },
      { planet: 'Moon', sign: 'Cancer', degree: 22, house: 3 },
      { planet: 'Mercury', sign: 'Taurus', degree: 8, house: 1 },
      { planet: 'Venus', sign: 'Aries', degree: 2, house: 12 },
      { planet: 'Mars', sign: 'Sagittarius', degree: 16, house: 8 },
      { planet: 'Jupiter', sign: 'Virgo', degree: 27, house: 5 },
      { planet: 'Saturn', sign: 'Cancer', degree: 11, house: 3 },
    ]

    const currentPlanets = [
      { planet: 'Sun', sign: 'Virgo', degree: 13, house: 1 },
      { planet: 'Moon', sign: 'Scorpio', degree: 8, house: 3 },
      { planet: 'Mercury', sign: 'Virgo', degree: 6, house: 1 },
      { planet: 'Venus', sign: 'Leo', degree: 13, house: 12 },
      { planet: 'Mars', sign: 'Pisces', degree: 20, house: 8 },
      { planet: 'Jupiter', sign: 'Leo', degree: 5, house: 5 },
      { planet: 'Saturn', sign: 'Aries', degree: 3, house: 3 },
    ]

    const natalPoints = generateChartPoints(natalPlanets)
    const currentPoints = generateChartPoints(currentPlanets)

    const natalAspects = calculateAspects(natalPoints)
    const currentAspects = calculateAspects(currentPoints)

    // Calculate transit aspects (current planets to natal points)
    const transitAspects: AspectLine[] = []
    currentPoints.forEach(currentPoint => {
      natalPoints.forEach(natalPoint => {
        if (currentPoint.planet !== natalPoint.planet) {
          const deg1 = getSignOrder(currentPoint.sign) * 30 + currentPoint.degree
          const deg2 = getSignOrder(natalPoint.sign) * 30 + natalPoint.degree
          let diff = Math.abs(deg1 - deg2)
          if (diff > 180) diff = 360 - diff

          if (
            diff <= 8 ||
            Math.abs(diff - 180) <= 8 ||
            Math.abs(diff - 120) <= 6 ||
            Math.abs(diff - 90) <= 6 ||
            Math.abs(diff - 60) <= 4
          ) {
            transitAspects.push({
              from: currentPoint,
              to: natalPoint,
              type:
                diff <= 8
                  ? 'conjunction'
                  : Math.abs(diff - 180) <= 8
                    ? 'opposition'
                    : Math.abs(diff - 120) <= 6
                      ? 'trine'
                      : Math.abs(diff - 90) <= 6
                        ? 'square'
                        : 'sextile',
              orb: Math.min(
                diff,
                Math.abs(diff - 180),
                Math.abs(diff - 120),
                Math.abs(diff - 90),
                Math.abs(diff - 60)
              ),
              applying: Math.random() > 0.5,
              exact: false,
            })
          }
        }
      })
    })

    return {
      natal: {
        points: natalPoints,
        aspects: natalAspects,
      },
      current: {
        points: currentPoints,
        aspects: currentAspects,
        transitAspects: transitAspects.slice(0, 6), // Limit for clarity
      },
      transformMetrics: {
        totalAspectChanges:
          Math.abs(currentAspects.length - natalAspects.length) + transitAspects.length,
        powerShift: (Math.random() - 0.5) * 2,
        elementalShift: {
          fire: (Math.random() - 0.5) * 2,
          water: (Math.random() - 0.5) * 2,
          air: (Math.random() - 0.5) * 2,
          earth: (Math.random() - 0.5) * 2,
        },
        intensityLevel:
          transitAspects.length > 4 ? 'intense' : transitAspects.length > 2 ? 'strong' : 'moderate',
        dominantTransits: transitAspects
          .slice(0, 3)
          .map(t => `${t.from.planet} ${t.type} ${t.to.planet}`),
      },
    }
  }

  // Memoize the callback to prevent recreation on every render
  const stableOnTransformUpdate = useCallback(
    (data: ChartTransformData) => {
      if (onTransformUpdate) {
        onTransformUpdate(data)
      }
    },
    [onTransformUpdate]
  )

  const fetchTransformData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Simulate a small delay for realism (optional)
      await new Promise(resolve => setTimeout(resolve, 100))

      // In production, this would fetch real chart data
      const data = generateMockChartData()
      setTransformData(data)
      stableOnTransformUpdate(data)
    } catch (error) {
      console.error('Failed to fetch chart transform data:', error)
      setError('Failed to load chart transformation data')
    } finally {
      setLoading(false)
    }
  }, [stableOnTransformUpdate])

  useEffect(() => {
    fetchTransformData()

    if (autoUpdate) {
      const interval = setInterval(fetchTransformData, 300000) // 5 minutes
      return () => clearInterval(interval)
    }
    return undefined
  }, [agent, userLocation, autoUpdate, fetchTransformData])

  const getAspectColor = (type: string): string => {
    const colors = {
      conjunction: '#ff6b6b',
      opposition: '#4ecdc4',
      trine: '#45b7d1',
      square: '#f7b731',
      sextile: '#5f27cd',
      quincunx: '#00d2d3',
    }
    return colors[type as keyof typeof colors] || '#666'
  }

  const AspectLine = ({ aspect, className = '' }: { aspect: AspectLine; className?: string }) => (
    <line
      x1={aspect.from.x}
      y1={aspect.from.y}
      x2={aspect.to.x}
      y2={aspect.to.y}
      stroke={getAspectColor(aspect.type)}
      strokeWidth={aspect.exact ? 2 : 1}
      strokeDasharray={aspect.applying ? '5,5' : 'none'}
      opacity={0.6}
      className={className}
    />
  )

  const ChartPoint = ({
    point,
    color = '#333',
    size = 'normal',
  }: {
    point: ChartPoint
    color?: string
    size?: 'small' | 'normal' | 'large'
  }) => {
    const radius = size === 'small' ? 12 : size === 'large' ? 20 : 16
    return (
      <g>
        <circle cx={point.x} cy={point.y} r={radius} fill={color} stroke="white" strokeWidth={2} />
        <text
          x={point.x}
          y={point.y + 4}
          textAnchor="middle"
          fontSize={size === 'small' ? '10' : '12'}
          fill="white"
          fontWeight="bold"
        >
          {point.symbol}
        </text>
      </g>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading chart transformation...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !transformData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-red-600">{error || 'No data available'}</span>
            <Button variant="outline" size="sm" onClick={fetchTransformData}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`${className} border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50`}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Chart Transform Analysis
          <Badge variant="outline" className="ml-auto">
            {transformData.transformMetrics.intensityLevel}
          </Badge>
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {agent ? `${agent.name}'s consciousness shifts` : 'Current planetary influences'}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsAnimating(!isAnimating)}>
              {isAnimating ? (
                <PauseCircle className="w-3 h-3" />
              ) : (
                <PlayCircle className="w-3 h-3" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchTransformData}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
            <ArrowUpDown className="w-4 h-4 mx-auto mb-1 text-purple-600" />
            <div className="text-sm font-medium">Aspect Changes</div>
            <div className="text-lg font-bold">
              {transformData.transformMetrics.totalAspectChanges}
            </div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <div className="text-sm font-medium">Power Shift</div>
            <div
              className={`text-lg font-bold ${transformData.transformMetrics.powerShift > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {transformData.transformMetrics.powerShift > 0 ? '+' : ''}
              {(transformData.transformMetrics.powerShift * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
            <RotateCw className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
            <div className="text-sm font-medium">Transits</div>
            <div className="text-lg font-bold">{transformData.current.transitAspects.length}</div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
            <Zap className="w-4 h-4 mx-auto mb-1 text-orange-600" />
            <div className="text-sm font-medium">Intensity</div>
            <div className="text-sm font-bold capitalize">
              {transformData.transformMetrics.intensityLevel}
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        <Tabs defaultValue="overlay" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overlay">Overlay</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="transits">Transits</TabsTrigger>
          </TabsList>

          <TabsContent value="overlay" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={showNatal ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowNatal(!showNatal)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Natal
                </Button>
                <Button
                  variant={showCurrent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Current
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <svg
                width="300"
                height="300"
                className="border rounded-full bg-white dark:bg-black/20"
              >
                {/* Natal aspects */}
                {showNatal &&
                  transformData.natal.aspects.map((aspect, i) => (
                    <AspectLine key={`natal-${i}`} aspect={aspect} className="opacity-40" />
                  ))}

                {/* Current aspects */}
                {showCurrent &&
                  transformData.current.aspects.map((aspect, i) => (
                    <AspectLine key={`current-${i}`} aspect={aspect} />
                  ))}

                {/* Natal points */}
                {showNatal &&
                  transformData.natal.points.map((point, i) => (
                    <ChartPoint key={`natal-${i}`} point={point} color="#666" size="small" />
                  ))}

                {/* Current points */}
                {showCurrent &&
                  transformData.current.points.map((point, i) => (
                    <ChartPoint key={`current-${i}`} point={point} color="#333" />
                  ))}

                {/* Center circle */}
                <circle cx="150" cy="150" r="60" fill="none" stroke="#ddd" strokeWidth="1" />
                <circle cx="150" cy="150" r="120" fill="none" stroke="#ddd" strokeWidth="1" />
              </svg>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <h4 className="font-medium mb-2">Natal Chart</h4>
                <svg
                  width="200"
                  height="200"
                  className="border rounded-full bg-white dark:bg-black/20 mx-auto"
                >
                  {transformData.natal.aspects.map((aspect, i) => (
                    <AspectLine key={i} aspect={aspect} />
                  ))}
                  {transformData.natal.points.map((point, i) => (
                    <ChartPoint
                      key={i}
                      point={{ ...point, x: point.x * 0.67, y: point.y * 0.67 }}
                      color="#666"
                      size="small"
                    />
                  ))}
                  <circle cx="100" cy="100" r="40" fill="none" stroke="#ddd" strokeWidth="1" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#ddd" strokeWidth="1" />
                </svg>
              </div>

              <div className="text-center">
                <h4 className="font-medium mb-2">Current Moment</h4>
                <svg
                  width="200"
                  height="200"
                  className="border rounded-full bg-white dark:bg-black/20 mx-auto"
                >
                  {transformData.current.aspects.map((aspect, i) => (
                    <AspectLine key={i} aspect={aspect} />
                  ))}
                  {transformData.current.points.map((point, i) => (
                    <ChartPoint
                      key={i}
                      point={{ ...point, x: point.x * 0.67, y: point.y * 0.67 }}
                      color="#333"
                      size="small"
                    />
                  ))}
                  <circle cx="100" cy="100" r="40" fill="none" stroke="#ddd" strokeWidth="1" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#ddd" strokeWidth="1" />
                </svg>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transits" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Active Transits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {transformData.transformMetrics.dominantTransits.map((transit, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-black/20 rounded border text-sm">
                    {transit}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <svg
                width="300"
                height="300"
                className="border rounded-full bg-white dark:bg-black/20"
              >
                {/* Transit aspects only */}
                {transformData.current.transitAspects.map((aspect, i) => (
                  <AspectLine key={`transit-${i}`} aspect={aspect} />
                ))}

                {/* Natal points (targets) */}
                {transformData.natal.points.map((point, i) => (
                  <ChartPoint key={`natal-${i}`} point={point} color="#999" size="small" />
                ))}

                {/* Transiting points */}
                {transformData.current.points.map((point, i) => (
                  <ChartPoint key={`transit-${i}`} point={point} color="#e74c3c" />
                ))}

                <circle cx="150" cy="150" r="60" fill="none" stroke="#ddd" strokeWidth="1" />
                <circle cx="150" cy="150" r="120" fill="none" stroke="#ddd" strokeWidth="1" />
              </svg>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
