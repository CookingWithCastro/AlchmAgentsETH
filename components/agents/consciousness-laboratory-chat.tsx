'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Zap,
  Activity,
  FlaskConical,
  Microscope,
  TrendingUp,
  Users,
  Crown,
  Target,
} from 'lucide-react'

import UnifiedMultiAgentChat from '@/components/misc/unified-multi-agent-chat'
import type { CraftedAgent } from '@/lib/agent-types'
import type { ChatSession, UnifiedAgent } from '@/lib/unified-agent-types'
import { MIXED_COUNCIL_PRESETS, type MixedCouncilPreset } from '@/lib/council-presets'
import { createDefaultPlanetaryConfigs } from '@/lib/planetary-config-helper'

interface ConsciousnessLabChatProps {
  // Core functionality
  isOpen: boolean
  onClose: () => void

  // Agent sources
  historicalAgents: CraftedAgent[]

  // Initial setup
  defaultAgents?: string[] // Mix of historical and planetary IDs
  initialExperiment?: string // Preset ID

  allowAgentMixing?: boolean

  // Configuration
  title?: string
  maxAgents?: number
  allowMonica?: boolean

  // Callbacks
  onSessionUpdate?: (session: ChatSession) => void
  onAgentEvolution?: (agentId: string, evolution: any) => void
  onExperimentComplete?: (results: any) => void
}

export function ConsciousnessLaboratoryChat({
  isOpen,
  onClose,
  historicalAgents,
  defaultAgents = [],
  initialExperiment,
  allowAgentMixing: _allowAgentMixing = true,
  title = 'Consciousness Research Laboratory',
  maxAgents = 8,
  allowMonica = true,
  onSessionUpdate,
  onAgentEvolution,
  onExperimentComplete,
}: ConsciousnessLabChatProps) {
  // State management
  const [selectedExperiment, setSelectedExperiment] = useState<MixedCouncilPreset | null>(
    initialExperiment ? MIXED_COUNCIL_PRESETS.find(p => p.id === initialExperiment) || null : null
  )
  const [experimentMode, setExperimentMode] = useState(false)
  const [customAgentSelection, setCustomAgentSelection] = useState<{
    historical: string[]
    planetary: string[]
  }>({
    historical: [],
    planetary: [],
  })

  const [latestSession, setLatestSession] = useState<ChatSession | null>(null)
  const [showPresetSelection, setShowPresetSelection] = useState(
    !selectedExperiment && defaultAgents.length === 0
  )

  // Available planetary configurations
  const planetaryConfigs = useMemo(() => createDefaultPlanetaryConfigs(), [])

  // Experiments library
  const _availableExperiments = useMemo(
    () => [
      ...MIXED_COUNCIL_PRESETS,
      {
        id: 'custom-synthesis',
        name: 'Custom Synthesis Experiment',
        description: 'Design your own consciousness interaction experiment',
        agentIds: [],
        historicalAgentIds: [],
        planetaryAgentIds: [],
        synthesis_type: 'consciousness_acceleration' as const,
        includeMonica: true,
        monicaRole: 'coordinator' as const,
        tags: ['custom', 'experimental', 'synthesis'],
        difficulty: 'expert' as const,
      },
    ],
    []
  )

  // Final agent configuration
  const finalAgentConfiguration = useMemo(() => {
    if (selectedExperiment && selectedExperiment.id !== 'custom-synthesis') {
      return {
        historical: selectedExperiment.historicalAgentIds,
        planetary: selectedExperiment.planetaryAgentIds,
        includeMonica: selectedExperiment.includeMonica,
        monicaRole: selectedExperiment.monicaRole,
      }
    }

    return {
      historical: customAgentSelection.historical,
      planetary: customAgentSelection.planetary,
      includeMonica: allowMonica,
      monicaRole: 'coordinator' as const,
    }
  }, [selectedExperiment, customAgentSelection, allowMonica])

  // Active planetary configurations for selected planets
  const activePlanetaryConfigs = useMemo(() => {
    return planetaryConfigs.filter(config =>
      finalAgentConfiguration.planetary.includes(config.planet)
    )
  }, [planetaryConfigs, finalAgentConfiguration.planetary])

  // Active historical agents
  const activeHistoricalAgents = useMemo(() => {
    return historicalAgents.filter(agent => finalAgentConfiguration.historical.includes(agent.id))
  }, [historicalAgents, finalAgentConfiguration.historical])

  // Handle experiment selection
  const handleExperimentSelect = (experiment: MixedCouncilPreset) => {
    setSelectedExperiment(experiment)
    if (experiment.id === 'custom-synthesis') {
      setCustomAgentSelection({ historical: [], planetary: [] })
    }
    setShowPresetSelection(false)
  }

  // Handle custom agent selection
  const handleCustomAgentToggle = (type: 'historical' | 'planetary', agentId: string) => {
    setCustomAgentSelection(prev => ({
      ...prev,
      [type]: prev[type].includes(agentId)
        ? prev[type].filter(id => id !== agentId)
        : [...prev[type], agentId].slice(0, maxAgents),
    }))
  }

  // Start experiment
  const handleStartExperiment = () => {
    setExperimentMode(true)
  }

  // Stop experiment
  const handleStopExperiment = () => {
    setExperimentMode(false)
    if (onExperimentComplete && latestSession) {
      onExperimentComplete({
        experiment: selectedExperiment,
        session: latestSession,
        recordedAt: new Date().toISOString(),
      })
    }
  }

  const handleSessionUpdate = (session: ChatSession) => {
    setLatestSession(session)
    onSessionUpdate?.(session)
  }

  // Render experiment selection
  const renderExperimentSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Consciousness Research Laboratory</h2>
        </div>
        <p className="text-muted-foreground">
          Design and conduct consciousness interaction experiments
        </p>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Research Protocols</TabsTrigger>
          <TabsTrigger value="custom">Custom Experiment</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4" forceMount>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MIXED_COUNCIL_PRESETS.map(preset => (
              <Card
                key={preset.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => handleExperimentSelect(preset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{preset.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {preset.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {preset.historicalAgentIds.length + preset.planetaryAgentIds.length}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Synthesis Type:</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {preset.synthesis_type
                        .replace('_', ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Crown
                      className={`w-4 h-4 ${preset.includeMonica ? 'text-purple-500' : 'text-gray-300'}`}
                    />
                    <span className="text-sm">
                      {preset.includeMonica
                        ? `Monica as ${preset.monicaRole}`
                        : 'Independent synthesis'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {preset.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4" forceMount>
          <Card>
            <CardHeader>
              <CardTitle>Design Custom Experiment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Historical Agents Selection */}
              <div>
                <h4 className="font-medium mb-2">Historical Consciousness Agents</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {historicalAgents.slice(0, 20).map(agent => (
                    <label key={agent.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={agent.id}
                        checked={customAgentSelection.historical.includes(agent.id)}
                        onChange={() => handleCustomAgentToggle('historical', agent.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Planetary Agents Selection */}
              <div>
                <h4 className="font-medium mb-2">Planetary Agents</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {planetaryConfigs.map(config => (
                    <label key={config.planet} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={config.planet}
                        checked={customAgentSelection.planetary.includes(config.planet)}
                        onChange={() => handleCustomAgentToggle('planetary', config.planet)}
                        className="rounded"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <span style={{ color: config.color }}>{config.symbol}</span>
                        {config.planet}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() =>
                    handleExperimentSelect({
                      id: 'custom-synthesis',
                      name: 'Custom Synthesis Experiment',
                      description: 'Custom consciousness interaction experiment',
                      agentIds: [],
                      historicalAgentIds: customAgentSelection.historical,
                      planetaryAgentIds: customAgentSelection.planetary,
                      synthesis_type: 'consciousness_acceleration',
                      includeMonica: true,
                      monicaRole: 'coordinator',
                      tags: ['custom'],
                      difficulty: 'expert',
                      recommendedFor: ['Custom consciousness synthesis'],
                    })
                  }
                  disabled={
                    customAgentSelection.historical.length +
                      customAgentSelection.planetary.length ===
                    0
                  }
                  className="w-full"
                >
                  Start Custom Experiment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  // Render laboratory controls
  const renderLabControls = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Research Protocol</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPresetSelection(true)}>
              Change Experiment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Experiment Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Current Protocol</span>
            </div>
            <div className="text-sm">
              <div className="font-medium">{selectedExperiment?.name || 'Custom Protocol'}</div>
              <div className="text-muted-foreground">
                {finalAgentConfiguration.historical.length +
                  finalAgentConfiguration.planetary.length}{' '}
                agents
              </div>
            </div>
          </div>

          {/* Experiment Controls */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="font-medium">Status</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={experimentMode}
                onCheckedChange={experimentMode ? handleStopExperiment : handleStartExperiment}
              />
              <span className="text-sm">{experimentMode ? 'Recording' : 'Standby'}</span>
            </div>
          </div>

          {/* Session facts from the live chat callback. */}
          {latestSession && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Messages</span>
                </div>
                <div className="text-lg font-bold">{latestSession.messages.length}</div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Participants</span>
                </div>
                <div className="text-lg font-bold">{latestSession.agents.length}</div>
              </div>
            </>
          )}
        </div>

        {/* Active Agents Display */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">Active Research Subjects</h4>
          <div className="space-y-2">
            {activeHistoricalAgents.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Historical: </span>
                <span className="text-sm">
                  {activeHistoricalAgents.map(agent => agent.name).join(', ')}
                </span>
              </div>
            )}
            {activePlanetaryConfigs.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Planetary: </span>
                <span className="text-sm">
                  {activePlanetaryConfigs.map(config => config.planet).join(', ')}
                </span>
              </div>
            )}
            {finalAgentConfiguration.includeMonica && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Coordinator: </span>
                <span className="text-sm">Monica ({finalAgentConfiguration.monicaRole})</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      {/* Experiment Selection Modal */}
      {showPresetSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Research Laboratory</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowPresetSelection(false)}
                  aria-label="Close"
                >
                  ×
                </Button>
              </div>
              <ScrollArea className="max-h-[75vh]">{renderExperimentSelection()}</ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <UnifiedMultiAgentChat
        // Core configuration
        isOpen={isOpen && !showPresetSelection}
        onClose={onClose}
        title={title}
        variant="laboratory"
        // Agent configuration
        historicalAgents={activeHistoricalAgents}
        planetaryConfigs={activePlanetaryConfigs}
        initialAgents={[
          ...finalAgentConfiguration.historical,
          ...finalAgentConfiguration.planetary,
        ]}
        maxAgents={maxAgents}
        allowMonica={finalAgentConfiguration.includeMonica}
        // Laboratory-specific features
        enableGroupDynamics={true}
        enableExport={true}
        enablePresets={false} // Using custom preset system
        enableMemoryPersistence={true}
        // Callbacks
        onSessionUpdate={handleSessionUpdate}
        onAgentEvolution={onAgentEvolution}
        // Custom header content
        customHeader={renderLabControls()}
      />
    </>
  )
}

export default ConsciousnessLaboratoryChat
