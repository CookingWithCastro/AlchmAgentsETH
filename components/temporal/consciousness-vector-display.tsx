'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { classifyPhiAxisIndex } from '@/lib/monica/monica-constant-validator'
import {
  Crown,
  Zap,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Activity,
  BarChart3,
  RefreshCw,
  Eye,
} from 'lucide-react'

type Props = {
  alchmQuantities: {
    spirit: number
    essence: number
    matter: number
    substance: number
    Heat?: number
    Entropy?: number
    Reactivity?: number
    Energy?: number
  }
  monicaConstant: number | null
  // Optional live consciousness data for real-time display
  liveData?: {
    birthMC: number
    liveMC: number
    mcChange: number
    mcPercentChange: number
    liveKalchm: {
      spirit: number
      essence: number
      matter: number
      substance: number
      aNumber: number
    }
    dominantTransitEffect?: string
    interpretations?: {
      mcChange: string
      transitInfluence: string
      cosmicWeather: string
    }
  }
  showLiveComparison?: boolean
}

const ELEMENT_COLORS = {
  Spirit: '#ff4444', // Fire-like red
  Essence: '#4444ff', // Water-like blue
  Matter: '#44ff44', // Earth-like green
  Substance: '#ffff44', // Air-like yellow
  Heat: '#ff6b35',
  Entropy: '#7209b7',
  Reactivity: '#f72585',
  Energy: '#4cc9f0',
}

const ELEMENT_ICONS = {
  Spirit: Flame,
  Essence: Droplets,
  Matter: Mountain,
  Substance: Wind,
}

// Enhanced validation function for consciousness data with comprehensive NaN protection
function safeConsciousnessValue(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number') {
    if (Number.isFinite(value) && !Number.isNaN(value)) return value
  }
  const parsed = parseFloat(String(value))
  if (Number.isFinite(parsed) && !Number.isNaN(parsed)) return parsed
  console.warn(`Consciousness data validation: Invalid value ${value}, using fallback ${fallback}`)
  return fallback
}

function finiteConsciousnessValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

export function ConsciousnessVectorDisplay({
  alchmQuantities,
  monicaConstant,
  liveData,
  showLiveComparison = true,
}: Props) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Use live data if available, otherwise fall back to provided quantities
  const displayQuantities = liveData?.liveKalchm
    ? {
        ...alchmQuantities, // Include thermodynamic properties
        spirit: liveData.liveKalchm.spirit,
        essence: liveData.liveKalchm.essence,
        matter: liveData.liveKalchm.matter,
        substance: liveData.liveKalchm.substance,
      }
    : alchmQuantities

  // Enhanced validation with comprehensive NaN protection
  const safeQuantities = {
    spirit: safeConsciousnessValue(displayQuantities?.spirit, 0),
    essence: safeConsciousnessValue(displayQuantities?.essence, 0),
    matter: safeConsciousnessValue(displayQuantities?.matter, 0),
    substance: safeConsciousnessValue(displayQuantities?.substance, 0),
    Heat: safeConsciousnessValue(displayQuantities?.Heat, 0),
    Entropy: safeConsciousnessValue(displayQuantities?.Entropy, 0),
    Reactivity: safeConsciousnessValue(displayQuantities?.Reactivity, 0),
    Energy: safeConsciousnessValue(displayQuantities?.Energy, 0),
  }

  // Birth quantities for comparison (if live data is provided)
  const birthQuantities = liveData
    ? {
        spirit: safeConsciousnessValue(alchmQuantities?.spirit, 0),
        essence: safeConsciousnessValue(alchmQuantities?.essence, 0),
        matter: safeConsciousnessValue(alchmQuantities?.matter, 0),
        substance: safeConsciousnessValue(alchmQuantities?.substance, 0),
      }
    : null

  const currentMonica = finiteConsciousnessValue(liveData?.liveMC ?? monicaConstant)
  const birthMonica = liveData ? finiteConsciousnessValue(liveData.birthMC) : null

  // Validate the Phi Axis Index classification to prevent errors
  let mcClass: ReturnType<typeof classifyPhiAxisIndex> | null = null
  if (currentMonica !== null) {
    try {
      mcClass = classifyPhiAxisIndex(currentMonica)
    } catch (error) {
      console.warn('Error classifying the Phi Axis Index:', error)
    }
  }

  // Normalize values to avoid negative or extreme scaling
  const maxAlchemical = Math.max(
    safeQuantities.spirit,
    safeQuantities.essence,
    safeQuantities.matter,
    safeQuantities.substance,
    0.1 // Prevent division by zero
  )

  // Create proper 6-dimensional radar chart for alchemical composition with enhanced validation
  const alchemicalData = [
    {
      axis: 'Spirit',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue((safeQuantities.spirit / maxAlchemical) * 100, 0))
      ),
      rawValue: safeQuantities.spirit,
      angle: 0,
    },
    {
      axis: 'Essence',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue((safeQuantities.essence / maxAlchemical) * 100, 0))
      ),
      rawValue: safeQuantities.essence,
      angle: 60,
    },
    {
      axis: 'Matter',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue((safeQuantities.matter / maxAlchemical) * 100, 0))
      ),
      rawValue: safeQuantities.matter,
      angle: 120,
    },
    {
      axis: 'Substance',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue((safeQuantities.substance / maxAlchemical) * 100, 0))
      ),
      rawValue: safeQuantities.substance,
      angle: 180,
    },
    {
      axis: 'Heat',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue(Math.abs(safeQuantities.Heat) * 100, 0))
      ),
      rawValue: safeQuantities.Heat,
      angle: 240,
    },
    {
      axis: 'Energy',
      value: Math.min(
        100,
        Math.max(0, safeConsciousnessValue(Math.abs(safeQuantities.Energy) * 100, 0))
      ),
      rawValue: safeQuantities.Energy,
      angle: 300,
    },
  ].filter(item => {
    // Filter out any items with invalid values
    return (
      safeConsciousnessValue(item.value, -1) >= 0 &&
      !Number.isNaN(safeConsciousnessValue(item.rawValue, NaN))
    )
  })

  // Create pie chart data for composition breakdown
  const pieData = [
    { name: 'Spirit', value: safeQuantities.spirit, color: ELEMENT_COLORS.Spirit },
    { name: 'Essence', value: safeQuantities.essence, color: ELEMENT_COLORS.Essence },
    { name: 'Matter', value: safeQuantities.matter, color: ELEMENT_COLORS.Matter },
    { name: 'Substance', value: safeQuantities.substance, color: ELEMENT_COLORS.Substance },
  ].filter(item => item.value > 0)

  // Thermodynamic wave data for area chart with enhanced validation
  const thermoWaveData = [
    { name: 'Base', Heat: 0, Entropy: 0, Reactivity: 0, Energy: 0 },
    {
      name: '25%',
      Heat: Math.max(0, safeConsciousnessValue(safeQuantities.Heat * 25, 0)),
      Entropy: Math.max(0, safeConsciousnessValue(safeQuantities.Entropy * 25, 0)),
      Reactivity: Math.max(0, safeConsciousnessValue(safeQuantities.Reactivity * 25, 0)),
      Energy: Math.max(0, safeConsciousnessValue(safeQuantities.Energy * 25, 0)),
    },
    {
      name: '50%',
      Heat: Math.max(0, safeConsciousnessValue(safeQuantities.Heat * 50, 0)),
      Entropy: Math.max(0, safeConsciousnessValue(safeQuantities.Entropy * 50, 0)),
      Reactivity: Math.max(0, safeConsciousnessValue(safeQuantities.Reactivity * 50, 0)),
      Energy: Math.max(0, safeConsciousnessValue(safeQuantities.Energy * 50, 0)),
    },
    {
      name: '75%',
      Heat: Math.max(0, safeConsciousnessValue(safeQuantities.Heat * 75, 0)),
      Entropy: Math.max(0, safeConsciousnessValue(safeQuantities.Entropy * 75, 0)),
      Reactivity: Math.max(0, safeConsciousnessValue(safeQuantities.Reactivity * 75, 0)),
      Energy: Math.max(0, safeConsciousnessValue(safeQuantities.Energy * 75, 0)),
    },
    {
      name: 'Peak',
      Heat: Math.max(0, safeConsciousnessValue(safeQuantities.Heat * 100, 0)),
      Entropy: Math.max(0, safeConsciousnessValue(safeQuantities.Entropy * 100, 0)),
      Reactivity: Math.max(0, safeConsciousnessValue(safeQuantities.Reactivity * 100, 0)),
      Energy: Math.max(0, safeConsciousnessValue(safeQuantities.Energy * 100, 0)),
    },
  ].map(point => ({
    ...point,
    // Ensure all values are valid for chart rendering
    Heat: safeConsciousnessValue(point.Heat, 0),
    Entropy: safeConsciousnessValue(point.Entropy, 0),
    Reactivity: safeConsciousnessValue(point.Reactivity, 0),
    Energy: safeConsciousnessValue(point.Energy, 0),
  }))

  return (
    <div className="space-y-6">
      {/* Enhanced Visualization Controls */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-purple-200">Consciousness Vector Display</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1 text-xs bg-purple-600/50 hover:bg-purple-600/70 rounded text-purple-100 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          {liveData && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs bg-green-600/50 rounded text-green-100">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Live Data
            </div>
          )}
        </div>
      </div>

      {/* Consciousness State Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Consciousness State Vector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Monica Constant</span>
              </div>

              {/* Live MC with birth comparison */}
              {currentMonica === null ? (
                <div className="text-3xl font-bold text-muted-foreground">not computed</div>
              ) : liveData ? (
                <>
                  <div className="text-3xl font-bold text-primary">
                    {currentMonica.toFixed(3)}
                    {liveData.mcChange !== 0 && (
                      <span
                        className={`text-sm ml-2 ${liveData.mcChange > 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {liveData.mcChange > 0 ? '↗' : '↘'}{' '}
                        {Math.abs(liveData.mcPercentChange).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Birth: {birthMonica === null ? 'not computed' : birthMonica.toFixed(3)} → Live:{' '}
                    {currentMonica.toFixed(3)}
                  </div>
                </>
              ) : (
                <div className="text-3xl font-bold text-primary">{currentMonica.toFixed(3)}</div>
              )}

              {mcClass && (
                <>
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Level {mcClass.level}: {mcClass.name}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{mcClass.description}</p>
                </>
              )}

              {/* Live consciousness interpretation */}
              {liveData?.interpretations?.transitInfluence && (
                <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded text-xs">
                  {liveData.interpretations.transitInfluence}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Elemental Ratios{' '}
                {liveData && <span className="text-xs text-muted-foreground">(Live)</span>}
              </h4>
              {Object.entries(ELEMENT_ICONS).map(([element, Icon]) => {
                const value = safeQuantities[
                  element.toLowerCase() as keyof typeof safeQuantities
                ] as number
                const birthValue = birthQuantities
                  ? birthQuantities[element.toLowerCase() as keyof typeof birthQuantities]
                  : null
                const percentage = (value / maxAlchemical) * 100
                const change = birthValue !== null ? value - birthValue : null

                return (
                  <div key={element} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon
                          className="w-3 h-3"
                          style={{ color: ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] }}
                        />
                        <span>{element}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{value.toFixed(2)}</span>
                        {change !== null && Math.abs(change) > 0.1 && (
                          <span
                            className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {change > 0 ? '↗' : '↘'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    {birthValue !== null && (
                      <div className="text-xs text-muted-foreground">
                        Birth: {birthValue.toFixed(2)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Field Composition
              </h4>
              {isMounted && pieData.length > 0 && (
                <div style={{ width: '100%', height: 120, minWidth: 100, minHeight: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Total:{' '}
                {(
                  safeQuantities.spirit +
                  safeQuantities.essence +
                  safeQuantities.matter +
                  safeQuantities.substance
                ).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consciousness State Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Consciousness State Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your current alchemical signature and thermodynamic profile
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full" style={{ minWidth: 100, minHeight: 300 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={alchemicalData.slice(0, 4)}
                  margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                >
                  <PolarGrid gridType="polygon" />
                  <PolarAngleAxis dataKey="axis" fontSize={12} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    fontSize={10}
                    tickFormatter={value => `${value}%`}
                  />
                  <Radar
                    name="Alchemical State"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(1)}%`,
                      name,
                    ]}
                    labelFormatter={(label: string, payload: any[]) => {
                      const data = payload[0]?.payload
                      return data ? `${label}: ${data.rawValue?.toFixed(3) || 'N/A'}` : label
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thermodynamic Wave Analysis */}
      {
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Thermodynamic Field Dynamics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Heat, Entropy, Reactivity & Energy wave propagation through the alchemical field
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full" style={{ minWidth: 100, minHeight: 250 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={thermoWaveData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value.toFixed(3), 'Intensity']} />
                    <Area
                      type="monotone"
                      dataKey="Heat"
                      stackId="1"
                      stroke={ELEMENT_COLORS.Heat}
                      fill={ELEMENT_COLORS.Heat}
                      fillOpacity={0.6}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="Entropy"
                      stackId="1"
                      stroke={ELEMENT_COLORS.Entropy}
                      fill={ELEMENT_COLORS.Entropy}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="Reactivity"
                      stackId="1"
                      stroke={ELEMENT_COLORS.Reactivity}
                      fill={ELEMENT_COLORS.Reactivity}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="Energy"
                      stackId="1"
                      stroke={ELEMENT_COLORS.Energy}
                      fill={ELEMENT_COLORS.Energy}
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      }

      {/* Practical Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Practical Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Optimal Times for Action</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Creative Work:</span>
                  <span className="text-muted-foreground">
                    {safeQuantities.spirit > 2
                      ? 'Excellent'
                      : safeQuantities.spirit > 1
                        ? 'Good'
                        : 'Moderate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Emotional Processing:</span>
                  <span className="text-muted-foreground">
                    {safeQuantities.essence > 2
                      ? 'Excellent'
                      : safeQuantities.essence > 1
                        ? 'Good'
                        : 'Moderate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Practical Tasks:</span>
                  <span className="text-muted-foreground">
                    {safeQuantities.matter > 2
                      ? 'Excellent'
                      : safeQuantities.matter > 1
                        ? 'Good'
                        : 'Moderate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Communication:</span>
                  <span className="text-muted-foreground">
                    {safeQuantities.substance > 2
                      ? 'Excellent'
                      : safeQuantities.substance > 1
                        ? 'Good'
                        : 'Moderate'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Development Recommendations</h4>
              <div className="text-sm space-y-2 text-muted-foreground">
                {safeQuantities.spirit < 1 && (
                  <div>• Focus on creative expression and leadership opportunities</div>
                )}
                {safeQuantities.essence < 1 && (
                  <div>• Develop emotional intelligence and intuitive practices</div>
                )}
                {safeQuantities.matter < 1 && (
                  <div>• Strengthen practical skills and physical grounding</div>
                )}
                {safeQuantities.substance < 1 && (
                  <div>• Improve communication and networking abilities</div>
                )}
                {Math.min(
                  safeQuantities.spirit,
                  safeQuantities.essence,
                  safeQuantities.matter,
                  safeQuantities.substance
                ) >= 1 && (
                  <div>• Your alchemical profile shows good balance across all dimensions</div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Monica Constant Formula:</strong> MC = (Spirit × 1.618 + Essence) / (Matter +
              Substance + 1)
              <br />
              <span className="text-muted-foreground">
                {currentMonica === null || mcClass === null
                  ? 'Monica has not been computed for this chart.'
                  : `Your current MC of ${currentMonica.toFixed(3)} indicates ${mcClass.name.toLowerCase()} consciousness level.`}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConsciousnessVectorDisplay
