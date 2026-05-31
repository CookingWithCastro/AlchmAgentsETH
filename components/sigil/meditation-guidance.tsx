'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Eye,
  Heart,
  Brain,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Compass,
  Target,
  Star,
  Gem,
  Crown,
  Flame,
  Mountain,
  Sun,
  Moon,
  Atom,
  Infinity as InfinityIcon,
  CheckCircle,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileMeditationGuidance } from './mobile-meditation-guidance'
import type { NatalSigilRune, SigilStyle } from '@/lib/runes/natal-sigil-runes'

interface MeditationGuidanceProps {
  sigil: NatalSigilRune
  isVisible: boolean
  onComplete?: () => void
  className?: string
}

interface MeditationPhase {
  id: string
  name: string
  duration: number // seconds
  instruction: string
  visualization: string
  breathingPattern?: string
  focusPoint: string
  icon: React.ReactNode
}

interface StyleMeditation {
  name: string
  element: string
  preparationTime: number
  phases: MeditationPhase[]
  completionRitual: string
  benefits: string[]
}

const MEDITATION_STYLES: Record<SigilStyle, StyleMeditation> = {
  nordic: {
    name: 'Nordic Runic Activation',
    element: 'Ice & Fire',
    preparationTime: 180, // 3 minutes
    phases: [
      {
        id: 'grounding',
        name: 'Earth Connection',
        duration: 120,
        instruction: 'Sit in stillness and feel your connection to the ancient earth beneath you',
        visualization: 'Imagine roots growing from your spine deep into the frozen Nordic soil',
        breathingPattern: '4-4-4 (inhale-hold-exhale)',
        focusPoint: 'Base of spine, connection to earth',
        icon: <Mountain className="w-5 h-5" />,
      },
      {
        id: 'invocation',
        name: 'Runic Invocation',
        duration: 180,
        instruction:
          "Trace each rune of your sigil with your mind's eye, feeling its ancient power",
        visualization: 'See each rune glowing with blue-white fire against the northern lights',
        breathingPattern: 'Deep, rhythmic breathing like winter wind',
        focusPoint: 'Third eye, connecting to runic wisdom',
        icon: <Gem className="w-5 h-5" />,
      },
      {
        id: 'activation',
        name: 'Power Awakening',
        duration: 240,
        instruction: 'Feel the runic energy flowing through your body like liquid starlight',
        visualization: 'Your sigil burning bright against the aurora borealis',
        breathingPattern: 'Natural, deep breathing',
        focusPoint: "Heart center, embodying the rune's power",
        icon: <Sparkles className="w-5 h-5" />,
      },
    ],
    completionRitual:
      "End by placing your hands on your heart and speaking: 'By the ancient ways, this power is awakened within me.'",
    benefits: [
      'Enhanced intuition',
      'Connection to ancestral wisdom',
      'Strength and endurance',
      'Clarity in decision-making',
    ],
  },
  celtic: {
    name: 'Celtic Spiral Meditation',
    element: 'Earth & Water',
    preparationTime: 240, // 4 minutes
    phases: [
      {
        id: 'sacred_circle',
        name: 'Sacred Circle',
        duration: 150,
        instruction: 'Create a sacred space by visualizing a circle of standing stones around you',
        visualization:
          'Ancient oak trees and crystal clear streams surrounding your meditation space',
        breathingPattern: 'Circular breathing - imagine your breath as a spiral',
        focusPoint: 'Solar plexus, center of personal power',
        icon: <Target className="w-5 h-5" />,
      },
      {
        id: 'spiral_journey',
        name: 'Spiral Journey',
        duration: 300,
        instruction: 'Follow the spiral patterns of your sigil, moving from outer edge to center',
        visualization: 'Walking a sacred spiral path through ancient Celtic landscapes',
        breathingPattern: '7-1-7-1 pattern (in-pause-out-pause)',
        focusPoint: 'Heart chakra, connecting to the land',
        icon: <Compass className="w-5 h-5" />,
      },
      {
        id: 'wisdom_download',
        name: 'Wisdom Integration',
        duration: 180,
        instruction: 'Allow the ancient Celtic wisdom to flow into your consciousness',
        visualization: 'Golden light from the center of your sigil filling your entire being',
        breathingPattern: 'Natural, flowing like a gentle stream',
        focusPoint: 'Crown chakra, receiving divine wisdom',
        icon: <Crown className="w-5 h-5" />,
      },
    ],
    completionRitual:
      "Place your hands on the earth (or visualize doing so) and say: 'I am connected to the eternal spiral of wisdom.'",
    benefits: [
      'Deep earth connection',
      'Enhanced creativity',
      'Emotional healing',
      'Intuitive problem-solving',
    ],
  },
  alchemical: {
    name: 'Alchemical Transformation',
    element: 'Fire & Mercury',
    preparationTime: 300, // 5 minutes
    phases: [
      {
        id: 'nigredo',
        name: 'Dissolution (Nigredo)',
        duration: 240,
        instruction: 'Release all preconceptions and dissolve into the primordial darkness',
        visualization:
          'Your consciousness becoming like a black, fertile void pregnant with potential',
        breathingPattern: 'Slow, deep breathing to release tension',
        focusPoint: 'Lower abdomen, releasing what no longer serves',
        icon: <Moon className="w-5 h-5" />,
      },
      {
        id: 'albedo',
        name: 'Purification (Albedo)',
        duration: 300,
        instruction: 'Feel the alchemical fire burning away impurities, leaving pure essence',
        visualization:
          'White light purifying your energy body, your sigil glowing like molten silver',
        breathingPattern: 'Sharp inhale, long exhale - breathing out impurities',
        focusPoint: 'Heart center, purification and clarity',
        icon: <Flame className="w-5 h-5" />,
      },
      {
        id: 'rubedo',
        name: 'Integration (Rubedo)',
        duration: 360,
        instruction: 'Embody the perfected consciousness, integrating all elements of your sigil',
        visualization: "Golden-red light of the philosopher's stone radiating from your sigil",
        breathingPattern: 'Balanced, harmonious breathing',
        focusPoint: 'Crown and heart together, unified consciousness',
        icon: <Sun className="w-5 h-5" />,
      },
    ],
    completionRitual:
      "Touch your forehead, heart, and solar plexus while saying: 'As above, so below. The great work is within me.'",
    benefits: [
      'Personal transformation',
      'Emotional balance',
      'Enhanced willpower',
      'Spiritual integration',
    ],
  },
  cosmic: {
    name: 'Cosmic Consciousness Activation',
    element: 'Ether & Light',
    preparationTime: 180, // 3 minutes
    phases: [
      {
        id: 'stellar_alignment',
        name: 'Stellar Alignment',
        duration: 200,
        instruction: 'Align your consciousness with the cosmic forces that shaped your sigil',
        visualization: 'Stars and planets arranging themselves according to your birth pattern',
        breathingPattern: 'Cosmic rhythm - 8 counts in, 8 counts out',
        focusPoint: 'Top of head, connecting to cosmic consciousness',
        icon: <Star className="w-5 h-5" />,
      },
      {
        id: 'frequency_attunement',
        name: 'Frequency Attunement',
        duration: 300,
        instruction: 'Attune to the vibrational frequency of your personal cosmic signature',
        visualization: 'Your sigil vibrating with the frequency of distant galaxies',
        breathingPattern: 'Vibrational breathing - feel each breath as cosmic energy',
        focusPoint: 'Whole body resonance, cellular activation',
        icon: <Atom className="w-5 h-5" />,
      },
      {
        id: 'expansion',
        name: 'Consciousness Expansion',
        duration: 420,
        instruction: 'Expand your awareness to encompass the infinite cosmos within',
        visualization:
          'Your consciousness expanding to fill the universe, your sigil at the center',
        breathingPattern: 'Expansive breathing - each breath expanding your awareness',
        focusPoint: 'Infinite space, boundless awareness',
        icon: <InfinityIcon className="w-5 h-5" />,
      },
    ],
    completionRitual:
      "Raise your hands to the sky and declare: 'I am one with the cosmic consciousness. My sigil is a gateway to infinite possibility.'",
    benefits: [
      'Expanded awareness',
      'Cosmic consciousness',
      'Enhanced psychic abilities',
      'Universal connection',
    ],
  },
}

export function MeditationGuidance(props: MeditationGuidanceProps) {
  const isMobile = useIsMobile()
  // Mobile and desktop are separate components, so each owns its hooks — no hook
  // ever runs after a conditional return (react-hooks/rules-of-hooks).
  if (isMobile) {
    return <MobileMeditationGuidance {...props} />
  }
  return <DesktopMeditationGuidance {...props} />
}

function DesktopMeditationGuidance({
  sigil,
  isVisible,
  onComplete,
  className = '',
}: MeditationGuidanceProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [preparationComplete, setPreparationComplete] = useState(false)

  const meditation = MEDITATION_STYLES[(sigil as any).style as SigilStyle]
  const currentMeditationPhase = meditation.phases[currentPhase]
  const totalDuration = meditation.phases.reduce(
    (sum: number, phase: any) => sum + phase.duration,
    0
  )

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && !isPaused && preparationComplete) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1

          // Check if current phase is complete
          const phaseEndTime = meditation.phases
            .slice(0, currentPhase + 1)
            .reduce((sum: number, phase: any) => sum + phase.duration, 0)

          if (newTime >= phaseEndTime && currentPhase < meditation.phases.length - 1) {
            setCurrentPhase(prev => prev + 1)
          } else if (newTime >= totalDuration) {
            setIsActive(false)
            setIsCompleted(true)
            onComplete?.()
          }

          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [
    isActive,
    isPaused,
    preparationComplete,
    currentPhase,
    meditation.phases,
    totalDuration,
    onComplete,
  ])

  const startMeditation = () => {
    if (!preparationComplete) {
      setPreparationComplete(true)
    }
    setIsActive(true)
    setIsPaused(false)
  }

  const pauseMeditation = () => {
    setIsPaused(!isPaused)
  }

  const resetMeditation = () => {
    setIsActive(false)
    setIsPaused(false)
    setTimeElapsed(0)
    setCurrentPhase(0)
    setIsCompleted(false)
    setPreparationComplete(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentPhaseProgress = () => {
    const phaseStartTime = meditation.phases
      .slice(0, currentPhase)
      .reduce((sum: number, phase: any) => sum + phase.duration, 0)
    const phaseElapsed = timeElapsed - phaseStartTime
    const phaseProgress = Math.min(100, (phaseElapsed / currentMeditationPhase.duration) * 100)
    return Math.max(0, phaseProgress)
  }

  const getOverallProgress = () => {
    return Math.min(100, (timeElapsed / totalDuration) * 100)
  }

  if (!isVisible) return null

  return (
    <Card
      className={`bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/50 ${className}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-300">{meditation.name}</CardTitle>
              <CardDescription>
                Activate your {(sigil as any).style} sigil through guided meditation
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-purple-600">{meditation.element}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isCompleted ? (
          // Completion Screen
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-300">Activation Complete!</h3>
            <p className="text-emerald-200">
              Your {(sigil as any).style} sigil has been successfully activated and integrated into
              your consciousness.
            </p>

            <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
              <h4 className="font-semibold text-emerald-300 mb-2">Completion Ritual</h4>
              <p className="text-emerald-100 text-sm leading-relaxed italic">
                "{meditation.completionRitual}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-900/20 rounded-lg">
                <h5 className="font-medium text-purple-300 mb-2">Benefits Activated:</h5>
                <ul className="text-sm text-purple-100 space-y-1">
                  {meditation.benefits.map((benefit: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-indigo-900/20 rounded-lg">
                <h5 className="font-medium text-indigo-300 mb-2">Session Summary:</h5>
                <div className="text-sm text-indigo-100 space-y-1">
                  <div>Total time: {formatTime(totalDuration)}</div>
                  <div>Phases completed: {meditation.phases.length}</div>
                  <div>Style: {(sigil as any).style}</div>
                </div>
              </div>
            </div>

            <Button
              onClick={resetMeditation}
              variant="outline"
              className="border-purple-500 text-purple-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Meditate Again
            </Button>
          </div>
        ) : !preparationComplete ? (
          // Preparation Screen
          <div className="space-y-4">
            <div className="text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-purple-500" />
              <h3 className="text-xl font-semibold mb-2">Meditation Preparation</h3>
              <p className="text-slate-300">
                Prepare your space and consciousness for the {meditation.name} practice
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <h4 className="font-semibold text-purple-300 mb-3">Preparation Steps</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-purple-400 mt-0.5" />
                    Find a quiet, comfortable space where you won't be disturbed
                  </li>
                  <li className="flex items-start gap-2">
                    <Compass className="w-4 h-4 text-purple-400 mt-0.5" />
                    Sit in a comfortable position with your spine straight
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-purple-400 mt-0.5" />
                    Have your sigil image visible or clearly in your mind
                  </li>
                  <li className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
                    Set the intention to receive the sigil's guidance
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg">
                <h4 className="font-semibold text-purple-300 mb-3">Session Overview</h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Total Duration:</span>
                    <span className="font-mono">{formatTime(totalDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phases:</span>
                    <span>{meditation.phases.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Element:</span>
                    <span>{meditation.element}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Style:</span>
                    <span className="capitalize">{(sigil as any).style}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
              <h4 className="font-semibold text-purple-300 mb-2">Before You Begin</h4>
              <p className="text-purple-100 text-sm leading-relaxed">
                This meditation will guide you through the sacred activation of your{' '}
                {(sigil as any).style} sigil. Each phase is designed to attune your consciousness to
                the specific energetic signature of your personalized rune. Trust the process and
                allow yourself to be fully present with each instruction.
              </p>
            </div>

            <div className="text-center">
              <Button
                onClick={startMeditation}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Begin Activation Meditation
              </Button>
            </div>
          </div>
        ) : (
          // Active Meditation Screen
          <div className="space-y-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-purple-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-300">{formatTime(timeElapsed)}</div>
                <div className="text-sm text-slate-400">Elapsed</div>
              </div>
              <div className="p-3 bg-indigo-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-indigo-300">
                  {currentPhase + 1}/{meditation.phases.length}
                </div>
                <div className="text-sm text-slate-400">Phase</div>
              </div>
              <div className="p-3 bg-pink-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-pink-300">
                  {Math.round(getOverallProgress())}%
                </div>
                <div className="text-sm text-slate-400">Complete</div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{formatTime(totalDuration - timeElapsed)} remaining</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
            </div>

            {/* Current Phase */}
            <Card className="bg-slate-800/50 border-purple-500/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                    {currentMeditationPhase.icon}
                  </div>
                  <div>
                    <CardTitle className="text-purple-300">{currentMeditationPhase.name}</CardTitle>
                    <CardDescription>
                      {formatTime(currentMeditationPhase.duration)} duration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={getCurrentPhaseProgress()} className="h-2" />

                <div className="p-4 bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-300 mb-2">Current Instruction</h4>
                  <p className="text-purple-100 leading-relaxed">
                    {currentMeditationPhase.instruction}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-indigo-900/20 rounded-lg">
                    <h5 className="font-medium text-indigo-300 mb-2">Visualization</h5>
                    <p className="text-indigo-100 text-sm">
                      {currentMeditationPhase.visualization}
                    </p>
                  </div>
                  <div className="p-3 bg-pink-900/20 rounded-lg">
                    <h5 className="font-medium text-pink-300 mb-2">Focus Point</h5>
                    <p className="text-pink-100 text-sm">{currentMeditationPhase.focusPoint}</p>
                  </div>
                </div>

                {currentMeditationPhase.breathingPattern && (
                  <div className="p-3 bg-emerald-900/20 rounded-lg">
                    <h5 className="font-medium text-emerald-300 mb-2">Breathing Pattern</h5>
                    <p className="text-emerald-100 text-sm">
                      {currentMeditationPhase.breathingPattern}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={pauseMeditation}
                variant="outline"
                className="border-purple-500 text-purple-300"
              >
                {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                onClick={resetMeditation}
                variant="outline"
                className="border-slate-500 text-slate-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MeditationGuidance
