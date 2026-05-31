'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Calendar, Clock, Zap, Circle, Square, PlayCircle, PauseCircle } from 'lucide-react'

import {
  ComposedChart,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  Line,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import type { AgentTransitEvent, TemporalPattern } from '@/lib/temporal-analysis-engine'
import { getElementalColorScheme } from '@/lib/elemental-reinforcement'

interface TemporalTimelineProps {
  data: AgentTransitEvent[]
  agents: string[]
  patterns?: TemporalPattern[]
  onDegreeSelect: (degree: number) => void
  onTimeSelect?: (timestamp: Date) => void
  reinforcementMode: boolean
  isLoading?: boolean
  timeRange?: { start: Date; end: Date }
}

interface TimelineEvent extends AgentTransitEvent {
  visualWeight: number
  color: string
  size: number
  elementalDominance: string
  formattedTime: string
  dayOfYear: number
}

interface ViewMode {
  type: 'scatter' | 'timeline' | 'heatmap' | 'flow'
  label: string
  icon: React.ReactNode
}

export default function TemporalTimeline({
  data,
  agents,
  patterns = [],
  onDegreeSelect,
  onTimeSelect,
  reinforcementMode,
  isLoading = false,
  timeRange,
}: TemporalTimelineProps) {
  const [selectedDegreeRange, setSelectedDegreeRange] = useState<[number, number]>([0, 360])
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents)
  const [viewMode, setViewMode] = useState<ViewMode['type']>('scatter')
  const [showPatterns, setShowPatterns] = useState(true)
  const [_zoomLevel, _setZoomLevel] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [_playbackSpeed, _setPlaybackSpeed] = useState(1)
  const [_selectedTimeWindow, _setSelectedTimeWindow] = useState<{ start: Date; end: Date } | null>(
    null
  )

  const viewModes: ViewMode[] = [
    { type: 'scatter', label: 'Degree Scatter', icon: <Circle className="w-4 h-4" /> },
    { type: 'timeline', label: 'Temporal Flow', icon: <Clock className="w-4 h-4" /> },
    { type: 'heatmap', label: 'Intensity Map', icon: <Square className="w-4 h-4" /> },
    { type: 'flow', label: 'Pattern Flow', icon: <Zap className="w-4 h-4" /> },
  ]

  // Process and enhance timeline data
  const processedData = useMemo(() => {
    const processed = data
      .filter(
        event =>
          selectedAgents.includes(event.agentId) &&
          event.planetaryDegree >= selectedDegreeRange[0] &&
          event.planetaryDegree <= selectedDegreeRange[1]
      )
      .map(event => {
        const elementalValues = [
          event.elementalAlignment.Fire,
          event.elementalAlignment.Water,
          event.elementalAlignment.Air,
          event.elementalAlignment.Earth,
        ]
        const dominantElementIndex = elementalValues.indexOf(Math.max(...elementalValues))
        const dominantElement = ['Fire', 'Water', 'Air', 'Earth'][dominantElementIndex]

        const visualWeight = reinforcementMode
          ? 1 + ((event as any).reinforcementScore || 0) * 0.5
          : 1

        const colorScheme = getElementalColorScheme(dominantElement, event.significanceScore)

        const enhanced: TimelineEvent = {
          ...event,
          visualWeight,
          color: colorScheme.primary,
          size: Math.max(4, Math.min(20, event.significanceScore * 15 * visualWeight)),
          elementalDominance: dominantElement,
          formattedTime: event.timestamp.toLocaleString(),
          dayOfYear: getDayOfYear(event.timestamp),
        }

        return enhanced
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return processed
  }, [data, selectedAgents, selectedDegreeRange, reinforcementMode])

  // Generate degree clusters for visualization
  const degreeClusters = useMemo(() => {
    const clusters: Record<number, TimelineEvent[]> = {}

    processedData.forEach(event => {
      const roundedDegree = Math.round(event.planetaryDegree / 5) * 5 // 5-degree bins
      if (!clusters[roundedDegree]) clusters[roundedDegree] = []
      clusters[roundedDegree].push(event)
    })

    return Object.entries(clusters)
      .map(([degree, events]) => {
        const uniqueAgents = [...new Set(events.map(e => e.agentId))]
        const avgSignificance =
          events.reduce((sum, e) => sum + e.significanceScore, 0) / events.length
        const dominantElement = getDominantElementInCluster(events)

        const timeSpan = {
          start: new Date(Math.min(...events.map(e => e.timestamp.getTime()))),
          end: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
        }

        return {
          degree: parseInt(degree),
          events,
          agentCount: uniqueAgents.length,
          significance: avgSignificance,
          dominantElement,
          timeSpan,
        }
      })
      .filter(cluster => cluster.events.length >= 2)
      .sort((a, b) => b.significance - a.significance)
  }, [processedData])

  // Chart data formatting based on view mode
  const chartData = useMemo(() => {
    switch (viewMode) {
      case 'scatter':
        return processedData.map(event => ({
          ...event,
          x: event.planetaryDegree,
          y: event.dayOfYear,
          timestamp: event.timestamp.getTime(),
          size: event.size,
          color: event.color,
          agentId: event.agentId,
          significance: event.significanceScore,
          element: event.elementalDominance,
        }))

      case 'timeline':
        return processedData.map((event, index) => ({
          ...event,
          index,
          degree: event.planetaryDegree,
          timestamp: event.timestamp.getTime(),
          significance: event.significanceScore,
          cumulative: processedData.slice(0, index + 1).length,
          agentId: event.agentId,
        }))

      case 'heatmap': {
        // Create heatmap data with degree vs time bins
        const heatmapData: any[] = []
        const degreeStep = 30 // 30-degree bins
        const timeStep = 30 * 24 * 60 * 60 * 1000 // 30-day bins

        for (let degree = 0; degree < 360; degree += degreeStep) {
          const timeMin = Math.min(...processedData.map(e => e.timestamp.getTime()))
          const timeMax = Math.max(...processedData.map(e => e.timestamp.getTime()))

          for (let time = timeMin; time < timeMax; time += timeStep) {
            const eventsInBin = processedData.filter(
              e =>
                e.planetaryDegree >= degree &&
                e.planetaryDegree < degree + degreeStep &&
                e.timestamp.getTime() >= time &&
                e.timestamp.getTime() < time + timeStep
            )

            if (eventsInBin.length > 0) {
              heatmapData.push({
                degree: degree + degreeStep / 2,
                time,
                intensity: eventsInBin.reduce((sum, e) => sum + e.significanceScore, 0),
                eventCount: eventsInBin.length,
                agentCount: [...new Set(eventsInBin.map(e => e.agentId))].length,
              })
            }
          }
        }
        return heatmapData
      }

      default:
        return processedData
    }
  }, [processedData, viewMode])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, _label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const isExact = data.isExact !== false // assume true if undefined for legacy compatibility, or just check explicitly. Actually let's just check data.isExact.

    return (
      <div className="bg-black/90 backdrop-blur border border-purple-500/30 rounded-lg p-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-medium text-purple-100">{getAgentDisplayName(data.agentId)}</span>
            {data.isExact && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 py-0 ml-1 border-gold/50 text-gold bg-gold/10"
              >
                Precision
              </Badge>
            )}
            {!data.isExact && data.isExact !== undefined && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 py-0 ml-1 border-purple-500/50 text-purple-400 bg-purple-500/10"
              >
                Approx
              </Badge>
            )}
          </div>

          <div className="text-purple-300 space-y-1">
            <div className="flex items-center gap-1">
              <span>Degree:</span>
              <span className={data.isExact ? 'text-gold font-mono' : ''}>
                {data.planetaryDegree?.toFixed(data.isExact ? 2 : 1)}°
              </span>
            </div>
            <div>Time: {new Date(data.timestamp).toLocaleDateString()}</div>
            <div>Significance: {(data.significance * 100).toFixed(0)}%</div>
            <div>Element: {data.elementalDominance}</div>
            <div>Planetary Hour: {data.planetaryHour}</div>
          </div>

          {reinforcementMode && data.reinforcementScore && (
            <div className="text-gold">
              Reinforcement: +{((data.reinforcementScore - 1) * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleDegreeRangeChange = useCallback((newRange: [number, number]) => {
    setSelectedDegreeRange(newRange)
  }, [])

  const handleAgentToggle = useCallback((agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    )
  }, [])

  const handleChartClick = useCallback(
    (data: any) => {
      if (data && data.activePayload && data.activePayload[0]) {
        const payload = data.activePayload[0].payload
        onDegreeSelect(payload.planetaryDegree || payload.degree)
        if (onTimeSelect && payload.timestamp) {
          onTimeSelect(new Date(payload.timestamp))
        }
      }
    },
    [onDegreeSelect, onTimeSelect]
  )

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-purple-300 animate-pulse">Loading temporal data...</div>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-purple-300 text-center">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No temporal events found in current range</p>
            <p className="text-sm text-purple-400 mt-1">
              Try adjusting your filters or degree range
            </p>
          </div>
        </div>
      )
    }

    switch (viewMode) {
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#7c3aed30" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[selectedDegreeRange[0], selectedDegreeRange[1]]}
                tickFormatter={value => `${value}°`}
                stroke="#a855f7"
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 365]}
                tickFormatter={value => `Day ${value}`}
                stroke="#a855f7"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Render scatter points for each agent */}
              {selectedAgents.map(agentId => (
                <Scatter
                  key={agentId}
                  data={chartData.filter(d => d.agentId === agentId)}
                  fill={getAgentColor(agentId)}
                  opacity={0.8}
                />
              ))}

              {/* Pattern overlays */}
              {showPatterns &&
                patterns.map(pattern => (
                  <ReferenceLine
                    key={pattern.degree}
                    x={pattern.degree}
                    stroke="#fbbf24"
                    strokeDasharray="5 5"
                    opacity={0.6}
                  />
                ))}
            </ScatterChart>
          </ResponsiveContainer>
        )

      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#7c3aed30" />
              <XAxis
                type="number"
                dataKey="timestamp"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={value => new Date(value).toLocaleDateString()}
                stroke="#a855f7"
              />
              <YAxis
                dataKey="degree"
                domain={[selectedDegreeRange[0], selectedDegreeRange[1]]}
                stroke="#a855f7"
              />
              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                yAxisId="right"
              />

              {selectedAgents.map(agentId => (
                <Scatter
                  key={agentId}
                  data={chartData.filter(d => d.agentId === agentId)}
                  fill={getAgentColor(agentId)}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )

      case 'heatmap':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#7c3aed30" />
              <XAxis dataKey="degree" stroke="#a855f7" />
              <YAxis stroke="#a855f7" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="intensity"
                stroke="#8b5cf6"
                fill="url(#colorGradient)"
                fillOpacity={0.6}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Advanced view mode</p>
              <p className="text-sm">Coming soon in future updates</p>
            </div>
          </div>
        )
    }
  }

  return (
    <Card className="bg-black/30 backdrop-blur border-purple-500/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Temporal Timeline Analysis
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View mode selector */}
            <div className="flex items-center bg-purple-900/30 rounded-lg p-1">
              {viewModes.map(mode => (
                <Button
                  key={mode.type}
                  size="sm"
                  variant={viewMode === mode.type ? 'default' : 'ghost'}
                  onClick={() => setViewMode(mode.type)}
                  className={`px-3 py-1 ${
                    viewMode === mode.type
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-300 hover:text-purple-100'
                  }`}
                >
                  {mode.icon}
                  <span className="ml-1 hidden sm:inline">{mode.label}</span>
                </Button>
              ))}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
                className="border-purple-500/30"
              >
                {isPlaying ? (
                  <PauseCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and controls */}
        <div className="space-y-4">
          {/* Degree range slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">Degree Range</span>
              <span className="text-purple-100">
                {selectedDegreeRange[0]}° - {selectedDegreeRange[1]}°
              </span>
            </div>
            <Slider
              value={selectedDegreeRange}
              onValueChange={value => handleDegreeRangeChange(value as [number, number])}
              max={360}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          {/* Agent selector */}
          <div className="space-y-2">
            <span className="text-sm text-purple-300">Active Agents</span>
            <div className="flex flex-wrap gap-2">
              {agents.map(agentId => (
                <button
                  key={agentId}
                  onClick={() => handleAgentToggle(agentId)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedAgents.includes(agentId)
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-purple-900/30 border-purple-500/30 text-purple-300 hover:bg-purple-800/40'
                  }`}
                >
                  {getAgentDisplayName(agentId)}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-purple-300">
              <input
                type="checkbox"
                checked={showPatterns}
                onChange={e => setShowPatterns(e.target.checked)}
                className="rounded border-purple-500"
              />
              Show Patterns
            </label>

            <label className="flex items-center gap-2 text-purple-300">
              <input
                type="checkbox"
                checked={reinforcementMode}
                onChange={() => {}}
                disabled
                className="rounded border-purple-500"
              />
              Reinforcement Mode
            </label>

            <div className="flex items-center gap-2 text-purple-300">
              <span>Events:</span>
              <Badge className="bg-purple-600/30 text-purple-200">{processedData.length}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {renderChart()}

        {/* Degree clusters summary */}
        {degreeClusters.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-purple-300">Significant Degree Clusters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {degreeClusters.slice(0, 6).map(cluster => {
                const colorScheme = getElementalColorScheme(
                  cluster.dominantElement,
                  cluster.significance
                )
                return (
                  <div
                    key={cluster.degree}
                    onClick={() => onDegreeSelect(cluster.degree)}
                    className="border border-purple-500/20 rounded-lg p-3 hover:bg-purple-500/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-purple-100">{cluster.degree}°</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colorScheme.primary }}
                      />
                    </div>
                    <div className="text-xs text-purple-400 space-y-1">
                      <div>
                        {cluster.agentCount} agents • {cluster.events.length} events
                      </div>
                      <div>Significance: {(cluster.significance * 100).toFixed(0)}%</div>
                      <div>Element: {cluster.dominantElement}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper functions

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getDominantElementInCluster(events: TimelineEvent[]): string {
  const elementCounts = { Fire: 0, Water: 0, Air: 0, Earth: 0 }

  events.forEach(event => {
    elementCounts[event.elementalDominance as keyof typeof elementCounts]++
  })

  return Object.entries(elementCounts).reduce(
    (max, [element, count]) => (count > max.count ? { element, count } : max),
    { element: 'Fire', count: -1 }
  ).element
}

function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    'leonardo-da-vinci': 'Leonardo',
    'william-shakespeare': 'Shakespeare',
    'albert-einstein': 'Einstein',
    'nikola-tesla': 'Tesla',
    'carl-jung': 'Jung',
    'marie-curie': 'Curie',
    'cleopatra-vii': 'Cleopatra',
    'benjamin-franklin': 'Franklin',
    'galileo-galilei': 'Galileo',
    'isaac-newton': 'Newton',
  }
  return names[agentId] || agentId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getAgentColor(agentId: string): string {
  const colors: Record<string, string> = {
    'leonardo-da-vinci': '#FF6B35',
    'william-shakespeare': '#0077BE',
    'albert-einstein': '#FFD700',
    'nikola-tesla': '#8B4513',
    'carl-jung': '#800080',
    'marie-curie': '#FF1493',
    'cleopatra-vii': '#DAA520',
    'benjamin-franklin': '#4169E1',
    'galileo-galilei': '#FF4500',
    'isaac-newton': '#008000',
  }
  return colors[agentId] || '#8b5cf6'
}
