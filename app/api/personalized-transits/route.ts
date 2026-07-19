/**
 * Personalized Transits API
 *
 * Calculate personalized transit significances for user natal charts
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  calculateTransitSignificance,
  type NatalPlacement,
  type UserConsciousnessProfile,
  type DetailedTransitSignificance,
} from '@/lib/services/transit-significance-scorer'
import { getNatalChart, incrementAnalysisCount } from '@/lib/services/natal-chart-storage'

const prisma = new PrismaClient()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/personalized-transits
 * Calculate transit significances for a date range
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.userId || !body.chartId) {
      return NextResponse.json({ error: 'userId and chartId are required' }, { status: 400 })
    }

    // Get natal chart
    const chart = await getNatalChart(body.chartId, body.userId)

    if (!chart) {
      return NextResponse.json({ error: 'Natal chart not found' }, { status: 404 })
    }

    // Parse date range (default to next 30 days)
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Minimum significance threshold (default 0.5)
    const significanceThreshold =
      body.significanceThreshold || chart.preferences.notificationThreshold || 0.5

    // Build user consciousness profile
    const userProfile: UserConsciousnessProfile = {
      dominantElement: chart.dominantElement,
      monicaConstant: chart.monicaConstant,
      spiritScore: chart.spiritScore,
      essenceScore: chart.essenceScore,
      matterScore: chart.matterScore,
      substanceScore: chart.substanceScore,
    }

    // Optionally fetch user's agent interaction history
    if (body.includeInteractionHistory) {
      const interactions = await prisma.consciousness_interactions.groupBy({
        by: ['agentId'],
        where: {
          userId: body.userId,
        },
        _count: {
          id: true,
        },
        _max: {
          timestamp: true,
        },
      })

      userProfile.interactionHistory = interactions.map((i: any) => ({
        agentId: i.agentId,
        interactionCount: i._count.id,
        lastInteraction: i._max.timestamp || new Date(),
      }))
    }

    // Convert natal chart planets to NatalPlacement format
    // (stored charts use `label` + within-sign `degree`; older shapes may use
    // `name`/`planet` and absolute `longitude` — the scorer normalizes both)
    const natalPlacements: NatalPlacement[] = (chart.planets as any[]).map(p => ({
      planet: p.name || p.label || p.planet,
      degree: Number(p.degree ?? p.longitude) || 0,
      sign: p.sign,
      house: p.house,
      element: getElementForSign(p.sign),
    }))

    // Calculate transits for each day in the range
    const allSignificances: DetailedTransitSignificance[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Calculate transits for each natal placement
      for (const placement of natalPlacements) {
        const significance = calculateTransitSignificance(placement, currentDate, userProfile)

        if (significance && significance.overallScore >= significanceThreshold) {
          allSignificances.push(significance)
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Sort by significance score (highest first)
    allSignificances.sort((a, b) => b.overallScore - a.overallScore)

    // Increment chart analysis count
    await incrementAnalysisCount(body.chartId)

    // Group significances by priority
    const criticalTransits = allSignificances.filter(s => s.overallScore >= 0.8)
    const highTransits = allSignificances.filter(s => s.overallScore >= 0.6 && s.overallScore < 0.8)
    const mediumTransits = allSignificances.filter(
      s => s.overallScore >= 0.5 && s.overallScore < 0.6
    )

    return NextResponse.json({
      success: true,
      chart: {
        id: chart.id,
        name: chart.chartName,
        dominantElement: chart.dominantElement,
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        daysAnalyzed: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        totalSignificantTransits: allSignificances.length,
        criticalTransits: criticalTransits.length,
        highTransits: highTransits.length,
        mediumTransits: mediumTransits.length,
        threshold: significanceThreshold,
      },
      transits: {
        critical: criticalTransits,
        high: highTransits.slice(0, 20), // Limit to top 20
        medium: mediumTransits.slice(0, 10), // Limit to top 10
        all: body.includeAllTransits ? allSignificances : undefined,
      },
      insights: {
        mostActivePlacements: getMostActivePlacements(allSignificances),
        dominantAgents: getDominantAgents(allSignificances),
        peakTransitDates: getPeakTransitDates(allSignificances),
        elementalBreakdown: getElementalBreakdown(allSignificances),
      },
    })
  } catch (error) {
    console.error('Error calculating personalized transits:', error)
    return NextResponse.json(
      {
        error: 'Failed to calculate personalized transits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/personalized-transits
 * Get upcoming significant transits for a user's primary chart
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 })
    }

    // Get user's primary chart
    const chart = await prisma.user_natal_charts.findFirst({
      where: {
        userId,
        isPrimary: true,
        isActive: true,
      },
    })

    if (!chart) {
      return NextResponse.json(
        { error: 'No primary natal chart found for this user' },
        { status: 404 }
      )
    }

    // Use POST logic with default parameters
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          chartId: chart.id,
          includeInteractionHistory: true,
        }),
      })
    )
  } catch (error) {
    console.error('Error fetching personalized transits:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch personalized transits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Helper functions

function getElementForSign(sign: string): string {
  const elementMap: Record<string, string> = {
    Aries: 'Fire',
    Taurus: 'Earth',
    Gemini: 'Air',
    Cancer: 'Water',
    Leo: 'Fire',
    Virgo: 'Earth',
    Libra: 'Air',
    Scorpio: 'Water',
    Sagittarius: 'Fire',
    Capricorn: 'Earth',
    Aquarius: 'Air',
    Pisces: 'Water',
  }
  return elementMap[sign] || 'Fire'
}

function getMostActivePlacements(significances: DetailedTransitSignificance[]): any[] {
  const placementCounts: Record<string, number> = {}

  significances.forEach(s => {
    const key = `${s.natalPlanet} ${s.natalSign}`
    placementCounts[key] = (placementCounts[key] || 0) + 1
  })

  return Object.entries(placementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([placement, count]) => ({ placement, count }))
}

function getDominantAgents(significances: DetailedTransitSignificance[]): any[] {
  const agentCounts: Record<string, number> = {}

  significances.forEach(s => {
    agentCounts[s.primaryAgentId] = (agentCounts[s.primaryAgentId] || 0) + 1
  })

  return Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([agentId, count]) => ({ agentId, count }))
}

function getPeakTransitDates(significances: DetailedTransitSignificance[]): any[] {
  const dateCounts: Record<string, number> = {}

  significances.forEach(s => {
    const dateKey = s.transitDate.toISOString().split('T')[0]
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
  })

  return Object.entries(dateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([date, count]) => ({ date, transitCount: count }))
}

function getElementalBreakdown(significances: DetailedTransitSignificance[]): any {
  const elementCounts = { Fire: 0, Water: 0, Air: 0, Earth: 0 }

  significances.forEach(s => {
    const element = s.elementalAffinity as 'Fire' | 'Water' | 'Air' | 'Earth'
    elementCounts[element]++
  })

  const total = significances.length
  return {
    counts: elementCounts,
    percentages: {
      Fire: total > 0 ? (elementCounts.Fire / total) * 100 : 0,
      Water: total > 0 ? (elementCounts.Water / total) * 100 : 0,
      Air: total > 0 ? (elementCounts.Air / total) * 100 : 0,
      Earth: total > 0 ? (elementCounts.Earth / total) * 100 : 0,
    },
  }
}
