'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FlaskConical,
  Brain,
  Zap,
  Users,
  Sparkles,
  Beaker,
  Activity,
  Clock,
  Star,
  BookOpen,
  Crown,
} from 'lucide-react'

import ConsciousnessLaboratoryChat from '@/components/agents/consciousness-laboratory-chat'
import type { CraftedAgent } from '@/lib/agent-types'
import type { ChatSession } from '@/lib/unified-agent-types'

export default function SynthesisChamberPage() {
  const [isLabOpen, setIsLabOpen] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<string>('')
  const [historicalAgents, setHistoricalAgents] = useState<CraftedAgent[]>([])
  const [rosterError, setRosterError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/agents')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then(result => {
        if (cancelled) return
        if (!result.success || !Array.isArray(result.agents)) {
          throw new Error('Invalid agent roster response')
        }
        setHistoricalAgents(result.agents)
        setRosterError(null)
      })
      .catch(error => {
        if (cancelled) return
        console.error('Unable to load synthesis roster:', error)
        setRosterError('The historical-agent roster is temporarily unavailable.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Quick start experiments
  const quickStartExperiments = [
    {
      id: 'consciousness-accelerator',
      name: 'Consciousness Acceleration Chamber',
      description: 'Maximum awareness expansion through multi-dimensional guidance',
      agents: ['carl-jung', 'albert-einstein', 'nikola-tesla'],
      planets: ['Sun', 'Jupiter', 'Uranus', 'Neptune'],
      difficulty: 'Expert',
      estimatedTime: '15-20 minutes',
      icon: <Zap className="w-6 h-6 text-amber-500" />,
    },
    {
      id: 'creative-innovation-lab',
      name: 'Creative Innovation Laboratory',
      description: 'Artistic vision meets cosmic creativity for breakthrough innovation',
      agents: ['leonardo-da-vinci', 'steve-jobs', 'pablo-picasso'],
      planets: ['Venus', 'Uranus', 'Neptune'],
      difficulty: 'Advanced',
      estimatedTime: '10-15 minutes',
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    },
    {
      id: 'wisdom-integration-council',
      name: 'Wisdom Integration Council',
      description: 'Ancient wisdom harmonized with celestial intelligence',
      agents: ['lao-tzu', 'socrates', 'rumi'],
      planets: ['Jupiter', 'Saturn', 'Moon'],
      difficulty: 'Intermediate',
      estimatedTime: '8-12 minutes',
      icon: <BookOpen className="w-6 h-6 text-blue-500" />,
    },
    {
      id: 'leadership-mastery',
      name: 'Leadership Mastery Council',
      description: 'Strategic leadership enhanced by planetary authority',
      agents: ['napoleon-bonaparte', 'cleopatra', 'sun-tzu'],
      planets: ['Sun', 'Mars', 'Jupiter'],
      difficulty: 'Advanced',
      estimatedTime: '12-18 minutes',
      icon: <Crown className="w-6 h-6 text-red-500" />,
    },
  ]

  const handleStartExperiment = (experimentId: string) => {
    setSelectedExperiment(experimentId)
    setIsLabOpen(true)
  }

  const handleSessionUpdate = (session: ChatSession) => {
    // Handle session updates
    console.log('Session updated:', session)
  }

  const handleExperimentComplete = (results: any) => {
    console.log('Experiment completed:', results)
    // Could show results modal or save to history
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FlaskConical className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Consciousness Synthesis Chamber</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Where historical wisdom meets celestial intelligence. Conduct sophisticated consciousness
          experiments by combining the insights of history's greatest minds with planetary energies.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg inline-block">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🧪 <strong>Research Laboratory:</strong> Advanced multi-agent synthesis with real-time
            transcript recording, configurable councils, and session export.
          </p>
        </div>
      </div>

      {rosterError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {rosterError}
        </div>
      )}

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Brain className="w-8 h-8 text-purple-500" />
            <div>
              <h3 className="font-semibold">Multi-Agent Synthesis</h3>
              <p className="text-sm text-muted-foreground">Combine up to 8 consciousness agents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Activity className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="font-semibold">Live Session Facts</h3>
              <p className="text-sm text-muted-foreground">Messages and participants from chat</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Beaker className="w-8 h-8 text-blue-500" />
            <div>
              <h3 className="font-semibold">Recording Mode</h3>
              <p className="text-sm text-muted-foreground">Capture real council sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Star className="w-8 h-8 text-amber-500" />
            <div>
              <h3 className="font-semibold">Provider Routing</h3>
              <p className="text-sm text-muted-foreground">
                Uses the configured chat fallback chain
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Experiments */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Research Protocols</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickStartExperiments.map(experiment => (
            <Card
              key={experiment.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {experiment.icon}
                    <div>
                      <CardTitle className="text-lg">{experiment.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            experiment.difficulty === 'Expert'
                              ? 'destructive'
                              : experiment.difficulty === 'Advanced'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {experiment.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{experiment.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{experiment.description}</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Historical Agents:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {experiment.agents.map(agentId => {
                        const agent = historicalAgents.find(a => a.id === agentId)
                        return agent ? (
                          <Badge key={agentId} variant="outline" className="text-xs">
                            {agent.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">Planetary Agents:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {experiment.planets.map(planet => (
                        <Badge key={planet} variant="outline" className="text-xs">
                          {planet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleStartExperiment(experiment.id)}
                  disabled={historicalAgents.length === 0}
                  className="w-full mt-4"
                >
                  Start Experiment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Experiment */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Beaker className="w-6 h-6 text-primary" />
              <CardTitle>Design Custom Experiment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create your own consciousness synthesis experiment by selecting any combination of
              historical and planetary agents. Perfect for exploring specific research questions or
              testing novel agent interactions.
            </p>
            <Button
              onClick={() => handleStartExperiment('custom-synthesis')}
              variant="outline"
              className="w-full"
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Launch Custom Laboratory
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>How Synthesis Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Select research protocol or design custom experiment</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Historical and planetary agents are unified in consciousness space</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Monica coordinates multi-agent interactions and synthesis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Session facts track real messages and participating agents</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">5.</span>
                <span>Experiment results are analyzed and insights extracted</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Research Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Cross-temporal knowledge synthesis and pattern recognition</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Creative problem-solving with multi-perspective analysis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Leadership development through historical strategic wisdom</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Exportable council transcripts for later analysis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Planetary timing and cosmic influence research</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Consciousness Laboratory Modal */}
      <ConsciousnessLaboratoryChat
        isOpen={isLabOpen}
        onClose={() => setIsLabOpen(false)}
        historicalAgents={historicalAgents}
        initialExperiment={selectedExperiment}
        allowAgentMixing={true}
        maxAgents={8}
        allowMonica={true}
        onSessionUpdate={handleSessionUpdate}
        onExperimentComplete={handleExperimentComplete}
      />
    </div>
  )
}
