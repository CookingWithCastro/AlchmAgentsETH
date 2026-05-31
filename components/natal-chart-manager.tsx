'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { NatalChartInput } from '@/components/natal-chart-input'
import {
  Plus,
  Edit,
  Trash2,
  Star,
  StarOff,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { PlanetaryAgentDisplay } from '@/components/planetary-agent-display'

interface NatalChart {
  id: string
  userId: string
  chartName: string
  description?: string
  birthDate: Date
  birthTime: string
  birthLocation: any
  dominantElement: string
  dominantModality: string
  monicaConstant: number
  spiritScore: number
  essenceScore: number
  matterScore: number
  substanceScore: number
  isPrimary: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface NatalChartManagerProps {
  userId: string
}

export function NatalChartManager({ userId }: NatalChartManagerProps) {
  const [charts, setCharts] = useState<NatalChart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingChart, setEditingChart] = useState<NatalChart | null>(null)
  const [chartTransits, setChartTransits] = useState<Record<string, any[]>>({})
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())
  const [loadingTransits, setLoadingTransits] = useState<Set<string>>(new Set())

  // Load charts
  const loadCharts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user-natal-charts?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to load charts')
      const data = await response.json()
      setCharts(data.charts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charts')
    } finally {
      setLoading(false)
    }
  }

  // Load transits for a chart
  const loadChartTransits = async (chartId: string) => {
    try {
      setLoadingTransits(prev => new Set(prev).add(chartId))

      const response = await fetch('/api/personalized-planetary-transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chartId,
          significanceThreshold: 0.5,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setChartTransits(prev => ({ ...prev, [chartId]: data.transits || [] }))
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(
          'Failed to load transits for chart:',
          chartId,
          errorData.error || response.statusText
        )
        setChartTransits(prev => ({ ...prev, [chartId]: [] })) // Set empty array on error
      }
    } catch (err) {
      console.error('Network error loading transits for chart:', chartId, err)
      setChartTransits(prev => ({ ...prev, [chartId]: [] })) // Set empty array on network error
    } finally {
      setLoadingTransits(prev => {
        const newSet = new Set(prev)
        newSet.delete(chartId)
        return newSet
      })
    }
  }

  // Toggle expanded state
  const toggleChartExpansion = async (chartId: string) => {
    const newExpanded = new Set(expandedCharts)
    if (newExpanded.has(chartId)) {
      newExpanded.delete(chartId)
    } else {
      newExpanded.add(chartId)
      // Load transits if not already loaded
      if (!chartTransits[chartId]) {
        await loadChartTransits(chartId)
      }
    }
    setExpandedCharts(newExpanded)
  }

  useEffect(() => {
    loadCharts()
  }, [userId])

  // Create chart
  const handleCreateChart = async (chartData: any) => {
    const response = await fetch('/api/user-natal-charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...chartData,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create chart')
    }

    await loadCharts()
    setShowCreateDialog(false)
  }

  // Update chart
  const handleUpdateChart = async (chartId: string, updates: any) => {
    const response = await fetch(`/api/user-natal-charts/${chartId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update chart')
    }

    await loadCharts()
    setEditingChart(null)
  }

  // Delete chart
  const handleDeleteChart = async (chartId: string) => {
    try {
      const response = await fetch(`/api/user-natal-charts/${chartId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete chart')
      }

      await loadCharts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chart')
    }
  }

  // Set as primary
  const handleSetPrimary = async (chartId: string) => {
    try {
      const response = await fetch(`/api/user-natal-charts/${chartId}/set-primary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set primary chart')
      }

      await loadCharts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary chart')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Natal Charts</h2>
          <p className="text-muted-foreground">Manage your astrological birth charts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Natal Chart</DialogTitle>
              <DialogDescription>
                Enter your birth information to create a personalized natal chart.
              </DialogDescription>
            </DialogHeader>
            <NatalChartInput
              onSubmit={handleCreateChart}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {charts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Natal Charts</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first natal chart to start exploring your astrological profile.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Chart
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {charts.map(chart => (
            <Card
              key={chart.id}
              className={`relative ${chart.isPrimary ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {chart.chartName}
                      {chart.isPrimary && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </CardTitle>
                    {chart.description && (
                      <CardDescription className="mt-1">{chart.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!chart.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(chart.id)}
                        title="Set as primary"
                      >
                        <StarOff className="w-4 h-4" />
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingChart(chart)}
                          title="Edit chart"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Natal Chart</DialogTitle>
                          <DialogDescription>
                            Update your natal chart information.
                          </DialogDescription>
                        </DialogHeader>
                        <NatalChartInput
                          initialData={{
                            chartName: chart.chartName,
                            description: chart.description,
                            birthDate: format(chart.birthDate, 'yyyy-MM-dd'),
                            birthTime: chart.birthTime,
                            birthLocation: chart.birthLocation,
                          }}
                          onSubmit={data => handleUpdateChart(chart.id, data)}
                          onCancel={() => setEditingChart(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Delete chart">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Natal Chart</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{chart.chartName}"? This action cannot
                            be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteChart(chart.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(chart.birthDate, 'PPP')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {chart.birthTime === 'unknown' ? 'Time unknown' : chart.birthTime}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {chart.birthLocation.name}
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{chart.dominantElement}</Badge>
                  <Badge variant="outline">{chart.dominantModality}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Monica Constant: {chart.monicaConstant.toFixed(2)}
                </div>

                {/* Expand/Collapse Transits */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChartExpansion(chart.id)}
                    className="text-xs"
                  >
                    {expandedCharts.has(chart.id) ? (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Hide Transits
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3 h-3 mr-1" />
                        View Transits
                      </>
                    )}
                  </Button>
                  {loadingTransits.has(chart.id) ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading...</span>
                    </div>
                  ) : chartTransits[chart.id] ? (
                    <Badge variant="outline" className="text-xs">
                      {chartTransits[chart.id].length} transits
                    </Badge>
                  ) : null}
                </div>

                {/* Expanded Transit Content */}
                {expandedCharts.has(chart.id) && (
                  <div className="pt-4 space-y-3">
                    {chartTransits[chart.id]?.length > 0 ? (
                      <div className="space-y-3">
                        {chartTransits[chart.id].slice(0, 3).map((transit: any, index: number) => (
                          <PlanetaryAgentDisplay
                            key={index}
                            transit={transit}
                            showDetails={false}
                          />
                        ))}
                        {chartTransits[chart.id].length > 3 && (
                          <div className="text-center">
                            <Button variant="outline" size="sm" className="text-xs">
                              View All {chartTransits[chart.id].length} Transits
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No significant transits found</p>
                        <p className="text-xs">Try adjusting the significance threshold</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
