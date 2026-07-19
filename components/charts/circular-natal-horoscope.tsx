'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Star,
  Calendar,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import NatalWheelSvg from './natal-wheel-svg'

// Local type matching the proxy `/api/astrologize` response. The Railway
// backend no longer renders an SVG/image wheel — when `svg`/`imageUrl` are
// absent, the wheel is drawn CLIENT-SIDE from `planetary_positions` by
// NatalWheelSvg (backend fields kept optional for forward compatibility).
interface AstrologizeWheelResponse {
  svg?: string
  imageUrl?: string
  planetary_positions?: Record<string, any>
  meta?: {
    degraded?: boolean
    local?: boolean
    fallback?: boolean
    localGenerationFailed?: boolean
    error?: string
  }
}

async function fetchAstrologizeWheel(input: {
  year: number
  month: number // zero-based
  day: number
  hour: number
  minute: number
  latitude: number
  longitude: number
  name?: string
}): Promise<AstrologizeWheelResponse> {
  const date = new Date(Date.UTC(input.year, input.month, input.day, input.hour, input.minute))
  const res = await fetch('/api/astrologize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date.toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  })
  if (!res.ok) {
    return {
      meta: { degraded: true, fallback: true, error: `astrologize proxy failed: ${res.status}` },
    }
  }
  return res.json()
}
import { useTheme } from 'next-themes'

interface CircularNatalHoroscopeProps {
  className?: string
  showKinetics?: boolean
  birthInfo?: {
    year: number
    month: number // zero-based
    day: number
    hour: number
    minute: number
    latitude: number
    longitude: number
    name?: string
  }
}

export default function CircularNatalHoroscope({
  className,
  showKinetics = false,
  birthInfo,
}: CircularNatalHoroscopeProps) {
  const [horoscope, setHoroscope] = useState<AstrologizeWheelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  // Interactive features state
  const [zoom, setZoom] = useState(1)
  const [showPlanets, setShowPlanets] = useState(true)
  const [showHouses, setShowHouses] = useState(true)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [highlightedElements, setHighlightedElements] = useState<string[]>([])

  useEffect(() => {
    const fetchCurrentMomentChart = async () => {
      try {
        let input = birthInfo
        if (!input) {
          const now = new Date()
          // Use UTC clock for consistency with enhanced planetary calculators and API
          input = {
            name: 'Current Moment (UTC)',
            year: now.getUTCFullYear(),
            month: now.getUTCMonth(), // zero-based
            day: now.getUTCDate(),
            hour: now.getUTCHours(),
            minute: now.getUTCMinutes(),
            // Location does not affect planetary longitudes; houses differ by location.
            // Keep a neutral default location.
            latitude: 0,
            longitude: 0,
          }
        }

        const result = await fetchAstrologizeWheel(input as any)
        setHoroscope(result)
        setError(null)
      } catch {
        // Backend unavailable — show degraded state instead of error UI
        setHoroscope({ meta: { degraded: true, fallback: true } })
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentMomentChart()

    // Refresh every 5 minutes
    const interval = setInterval(fetchCurrentMomentChart, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [birthInfo])

  if (loading) {
    return (
      <div
        className={`${showKinetics ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''} ${className}`}
      >
        <Card className={`cosmic-glass ${showKinetics ? 'lg:col-span-2' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 cosmic-text-gradient">
              <Sparkles className="w-5 h-5" />
              {birthInfo?.name ? `${birthInfo.name}'s Chart` : 'Current Moment Chart'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 animate-spin text-cosmic-gold" />
              <span className="text-cosmic-starlight-lavender">Generating cosmic chart...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Current Moment Natal Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>Unable to load the current moment chart: {error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`${showKinetics ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''} ${className}`}>
      <Card className={`cosmic-glass-ethereal ${showKinetics ? 'lg:col-span-2' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 cosmic-text-gradient">
                <Sparkles className="w-5 h-5" />
                {birthInfo?.name ? `${birthInfo.name}'s Cosmic Chart` : 'Current Moment Chart'}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-cosmic-starlight-lavender">
                <Calendar className="w-4 h-4" />
                <span>
                  {birthInfo
                    ? `${new Date(birthInfo.year, birthInfo.month, birthInfo.day).toLocaleDateString()}`
                    : 'Live cosmic positions updated regularly'}
                </span>
              </div>
            </div>

            {/* Interactive Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-cosmic-starlight-lavender min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                disabled={zoom >= 2}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant={showPlanets ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPlanets(!showPlanets)}
              >
                {showPlanets ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {horoscope?.svg ? (
              <div className="flex justify-center">
                <div
                  className="w-full max-w-md aspect-square cosmic-chart-container relative overflow-hidden"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: horoscope.svg }}
                    style={{
                      filter: isDarkMode ? 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.2))' : 'none',
                    }}
                  />
                </div>
              </div>
            ) : horoscope?.imageUrl ? (
              <div className="flex justify-center">
                <Image
                  src={horoscope.imageUrl}
                  alt="Cosmic natal chart"
                  width={400}
                  height={400}
                  className="w-full max-w-md aspect-square rounded-lg cosmic-glass"
                  style={{
                    filter: isDarkMode ? 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.3))' : 'none',
                  }}
                />
              </div>
            ) : horoscope?.planetary_positions &&
              Object.keys(horoscope.planetary_positions).length > 0 ? (
              <div className="flex justify-center">
                <div
                  className="w-full max-w-md aspect-square"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.3s ease',
                    filter: isDarkMode ? 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.15))' : 'none',
                  }}
                >
                  <NatalWheelSvg
                    positions={horoscope.planetary_positions}
                    showPlanets={showPlanets}
                    selectedPlanet={selectedPlanet}
                    onSelectPlanet={setSelectedPlanet}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                <div className="text-cosmic-starlight-lavender">
                  Chart positions are temporarily unavailable
                </div>
                <div className="text-sm text-cosmic-starlight-lavender opacity-70">
                  {horoscope?.meta?.error
                    ? `Error: ${horoscope.meta.error}`
                    : 'The planetary position service could not be reached'}
                </div>
              </div>
            )}

            {horoscope?.meta?.degraded && (
              <Alert className="cosmic-glass border-cosmic-gold/30">
                <AlertDescription className="text-sm text-cosmic-starlight-lavender">
                  {horoscope?.meta?.local
                    ? '✨ Chart generated with cosmic precision - External service temporarily unavailable'
                    : horoscope?.meta?.fallback
                      ? '🔮 Cosmic fallback active - Service temporarily unavailable'
                      : '⚡ Chart generated in enhanced mode with cosmic algorithms'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
