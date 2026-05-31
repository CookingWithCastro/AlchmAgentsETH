'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
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
  Smartphone,
  Vibrate,
  Volume2,
  VolumeX,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { NatalSigilRune, SigilStyle } from '@/lib/runes/natal-sigil-runes'

interface MobileMeditationGuidanceProps {
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
    preparationTime: 180,
    phases: [
      {
        id: 'grounding',
        name: 'Earth Connection',
        duration: 120,
        instruction: 'Feel your connection to the ancient earth beneath you',
        visualization: 'Roots growing from your spine into frozen Nordic soil',
        breathingPattern: '4-4-4 (inhale-hold-exhale)',
        focusPoint: 'Base of spine, earth connection',
        icon: <Mountain className="w-4 h-4" />,
      },
      {
        id: 'invocation',
        name: 'Runic Invocation',
        duration: 180,
        instruction: "Trace each rune with your mind's eye, feeling ancient power",
        visualization: 'Runes glowing with blue-white fire against northern lights',
        breathingPattern: 'Deep, rhythmic breathing like winter wind',
        focusPoint: 'Third eye, runic wisdom',
        icon: <Gem className="w-4 h-4" />,
      },
      {
        id: 'activation',
        name: 'Power Awakening',
        duration: 240,
        instruction: 'Feel runic energy flowing through you like liquid starlight',
        visualization: 'Your sigil burning bright against aurora borealis',
        breathingPattern: 'Natural, deep breathing',
        focusPoint: 'Heart center, embodying power',
        icon: <Sparkles className="w-4 h-4" />,
      },
    ],
    completionRitual:
      "Place hands on heart: 'By the ancient ways, this power is awakened within me.'",
    benefits: ['Enhanced intuition', 'Ancestral wisdom', 'Strength', 'Clarity'],
  },
  celtic: {
    name: 'Celtic Spiral Meditation',
    element: 'Earth & Water',
    preparationTime: 240,
    phases: [
      {
        id: 'sacred_circle',
        name: 'Sacred Circle',
        duration: 150,
        instruction: 'Visualize standing stones creating sacred space around you',
        visualization: 'Ancient oaks and crystal streams surrounding you',
        breathingPattern: 'Circular breathing - breath as spiral',
        focusPoint: 'Solar plexus, personal power center',
        icon: <Target className="w-4 h-4" />,
      },
      {
        id: 'spiral_journey',
        name: 'Spiral Journey',
        duration: 300,
        instruction: 'Follow spiral patterns from outer edge to center',
        visualization: 'Walking sacred spiral path through Celtic landscapes',
        breathingPattern: '7-1-7-1 pattern (in-pause-out-pause)',
        focusPoint: 'Heart chakra, land connection',
        icon: <Compass className="w-4 h-4" />,
      },
      {
        id: 'wisdom_download',
        name: 'Wisdom Integration',
        duration: 180,
        instruction: 'Allow ancient Celtic wisdom to flow into consciousness',
        visualization: 'Golden light from sigil center filling your being',
        breathingPattern: 'Natural, flowing like gentle stream',
        focusPoint: 'Crown chakra, divine wisdom',
        icon: <Crown className="w-4 h-4" />,
      },
    ],
    completionRitual: "Touch earth: 'I am connected to the eternal spiral of wisdom.'",
    benefits: ['Earth connection', 'Creativity', 'Healing', 'Intuitive solutions'],
  },
  alchemical: {
    name: 'Alchemical Transformation',
    element: 'Fire & Mercury',
    preparationTime: 300,
    phases: [
      {
        id: 'nigredo',
        name: 'Dissolution',
        duration: 240,
        instruction: 'Release preconceptions, dissolve into primordial darkness',
        visualization: 'Consciousness as black, fertile void of potential',
        breathingPattern: 'Slow, deep breathing to release tension',
        focusPoint: 'Lower abdomen, releasing old patterns',
        icon: <Moon className="w-4 h-4" />,
      },
      {
        id: 'albedo',
        name: 'Purification',
        duration: 300,
        instruction: 'Feel alchemical fire burning away impurities',
        visualization: 'White light purifying energy, sigil glowing silver',
        breathingPattern: 'Sharp inhale, long exhale - breathing out impurities',
        focusPoint: 'Heart center, purification',
        icon: <Flame className="w-4 h-4" />,
      },
      {
        id: 'rubedo',
        name: 'Integration',
        duration: 360,
        instruction: 'Embody perfected consciousness, integrate all elements',
        visualization: "Golden-red philosopher's stone light from sigil",
        breathingPattern: 'Balanced, harmonious breathing',
        focusPoint: 'Crown and heart unified',
        icon: <Sun className="w-4 h-4" />,
      },
    ],
    completionRitual:
      "Touch forehead, heart, solar plexus: 'As above, so below. The great work is within me.'",
    benefits: ['Transformation', 'Balance', 'Willpower', 'Integration'],
  },
  cosmic: {
    name: 'Cosmic Consciousness',
    element: 'Ether & Light',
    preparationTime: 180,
    phases: [
      {
        id: 'stellar_alignment',
        name: 'Stellar Alignment',
        duration: 200,
        instruction: 'Align consciousness with cosmic forces of your sigil',
        visualization: 'Stars arranging according to your birth pattern',
        breathingPattern: 'Cosmic rhythm - 8 counts in, 8 out',
        focusPoint: 'Top of head, cosmic connection',
        icon: <Star className="w-4 h-4" />,
      },
      {
        id: 'frequency_attunement',
        name: 'Frequency Attunement',
        duration: 300,
        instruction: 'Attune to vibrational frequency of cosmic signature',
        visualization: 'Sigil vibrating with distant galaxy frequency',
        breathingPattern: 'Vibrational breathing - cosmic energy',
        focusPoint: 'Whole body resonance, cellular activation',
        icon: <Atom className="w-4 h-4" />,
      },
      {
        id: 'expansion',
        name: 'Consciousness Expansion',
        duration: 420,
        instruction: 'Expand awareness to encompass infinite cosmos',
        visualization: 'Consciousness filling universe, sigil at center',
        breathingPattern: 'Expansive breathing - expanding awareness',
        focusPoint: 'Infinite space, boundless awareness',
        icon: <InfinityIcon className="w-4 h-4" />,
      },
    ],
    completionRitual:
      "Raise hands skyward: 'I am one with cosmic consciousness. My sigil is a gateway to infinite possibility.'",
    benefits: [
      'Expanded awareness',
      'Cosmic consciousness',
      'Psychic abilities',
      'Universal connection',
    ],
  },
}

export function MobileMeditationGuidance({
  sigil,
  isVisible,
  onComplete,
  className = '',
}: MobileMeditationGuidanceProps) {
  const isMobile = useIsMobile()
  const [currentPhase, setCurrentPhase] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [preparationComplete, setPreparationComplete] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [vibrateEnabled, setVibrateEnabled] = useState(true)
  const [showFullInstructions, setShowFullInstructions] = useState(false)

  const meditation = MEDITATION_STYLES[(sigil as any).style as SigilStyle]
  const currentMeditationPhase = meditation.phases[currentPhase]
  const totalDuration = meditation.phases.reduce(
    (sum: number, phase: any) => sum + phase.duration,
    0
  )

  // Timer effect with mobile vibration
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
            // Vibrate on phase transition
            if (vibrateEnabled && 'vibrate' in navigator) {
              navigator.vibrate([200, 100, 200])
            }
            setCurrentPhase(prev => prev + 1)
          } else if (newTime >= totalDuration) {
            // Vibrate on completion
            if (vibrateEnabled && 'vibrate' in navigator) {
              navigator.vibrate([500, 200, 500, 200, 500])
            }
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
    vibrateEnabled,
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
    if (vibrateEnabled && 'vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }

  const resetMeditation = () => {
    setIsActive(false)
    setIsPaused(false)
    setTimeElapsed(0)
    setCurrentPhase(0)
    setIsCompleted(false)
    setPreparationComplete(false)
  }

  const skipToNextPhase = () => {
    if (currentPhase < meditation.phases.length - 1) {
      const nextPhaseStartTime = meditation.phases
        .slice(0, currentPhase + 1)
        .reduce((sum: number, phase: any) => sum + phase.duration, 0)
      setTimeElapsed(nextPhaseStartTime)
      setCurrentPhase(prev => prev + 1)
      if (vibrateEnabled && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    }
  }

  const goToPreviousPhase = () => {
    if (currentPhase > 0) {
      const prevPhaseStartTime = meditation.phases
        .slice(0, currentPhase - 1)
        .reduce((sum: number, phase: any) => sum + phase.duration, 0)
      setTimeElapsed(prevPhaseStartTime)
      setCurrentPhase(prev => prev - 1)
      if (vibrateEnabled && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    }
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

  // Don't render mobile version if not on mobile
  if (!isMobile || !isVisible) {
    return null
  }

  return (
    <Card
      className={`bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/50 ${className}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-300 text-lg">{meditation.name}</CardTitle>
              <CardDescription className="text-sm">
                Mobile meditation for {(sigil as any).style} sigil
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-purple-600 text-xs">{meditation.element}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isCompleted ? (
          // Mobile Completion Screen
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-emerald-300">Activation Complete!</h3>
            <p className="text-emerald-200 text-sm">
              Your {(sigil as any).style} sigil has been successfully activated.
            </p>

            <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
              <h4 className="font-semibold text-emerald-300 mb-2 text-sm">Completion Ritual</h4>
              <p className="text-emerald-100 text-xs leading-relaxed italic">
                "{meditation.completionRitual}"
              </p>
            </div>

            <div className="p-3 bg-purple-900/20 rounded-lg">
              <h5 className="font-medium text-purple-300 mb-2 text-sm">Benefits Activated:</h5>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {meditation.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 text-purple-100">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={resetMeditation}
              variant="outline"
              className="border-purple-500 text-purple-300 w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Meditate Again
            </Button>
          </div>
        ) : !preparationComplete ? (
          // Mobile Preparation Screen
          <div className="space-y-4">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-purple-500" />
              <h3 className="text-lg font-semibold mb-2">Meditation Preparation</h3>
              <p className="text-slate-300 text-sm">Prepare for the {meditation.name} practice</p>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-lg">
              <h4 className="font-semibold text-purple-300 mb-2 text-sm">Preparation Steps</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <Target className="w-3 h-3 text-purple-400 mt-0.5" />
                  Find a quiet space where you won't be disturbed
                </div>
                <div className="flex items-start gap-2">
                  <Compass className="w-3 h-3 text-purple-400 mt-0.5" />
                  Sit comfortably with spine straight
                </div>
                <div className="flex items-start gap-2">
                  <Heart className="w-3 h-3 text-purple-400 mt-0.5" />
                  Have your sigil visible or in mind
                </div>
                <div className="flex items-start gap-2">
                  <Brain className="w-3 h-3 text-purple-400 mt-0.5" />
                  Set intention to receive sigil's guidance
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <div className="text-lg font-bold text-slate-200">{formatTime(totalDuration)}</div>
                <div className="text-xs text-slate-400">Duration</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <div className="text-lg font-bold text-slate-200">{meditation.phases.length}</div>
                <div className="text-xs text-slate-400">Phases</div>
              </div>
            </div>

            {/* Mobile Settings */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVibrateEnabled(!vibrateEnabled)}
                className={`${vibrateEnabled ? 'border-green-500 text-green-300' : 'border-slate-500 text-slate-300'}`}
              >
                <Vibrate className="w-4 h-4 mr-1" />
                Vibrate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`${soundEnabled ? 'border-green-500 text-green-300' : 'border-slate-500 text-slate-300'}`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 mr-1" />
                ) : (
                  <VolumeX className="w-4 h-4 mr-1" />
                )}
                Sound
              </Button>
            </div>

            <Button
              onClick={startMeditation}
              className="bg-purple-600 hover:bg-purple-700 w-full"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Begin Meditation
            </Button>
          </div>
        ) : (
          // Active Mobile Meditation Screen
          <div className="space-y-4">
            {/* Mobile Progress Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-300">{formatTime(timeElapsed)}</div>
                <div className="text-xs text-slate-400">Elapsed</div>
              </div>
              <div className="p-2 bg-indigo-900/30 rounded-lg text-center">
                <div className="text-lg font-bold text-indigo-300">
                  {currentPhase + 1}/{meditation.phases.length}
                </div>
                <div className="text-xs text-slate-400">Phase</div>
              </div>
              <div className="p-2 bg-pink-900/30 rounded-lg text-center">
                <div className="text-lg font-bold text-pink-300">
                  {Math.round(getOverallProgress())}%
                </div>
                <div className="text-xs text-slate-400">Complete</div>
              </div>
            </div>

            {/* Mobile Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Overall Progress</span>
                <span>{formatTime(totalDuration - timeElapsed)} remaining</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
            </div>

            {/* Current Phase - Mobile Optimized */}
            <Card className="bg-slate-800/50 border-purple-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                      {currentMeditationPhase.icon}
                    </div>
                    <div>
                      <CardTitle className="text-purple-300 text-sm">
                        {currentMeditationPhase.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatTime(currentMeditationPhase.duration)}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullInstructions(!showFullInstructions)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={getCurrentPhaseProgress()} className="h-2" />

                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-300 mb-2 text-sm">Current Focus</h4>
                  <p className="text-purple-100 text-sm leading-relaxed">
                    {currentMeditationPhase.instruction}
                  </p>
                </div>

                {showFullInstructions && (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-900/20 rounded-lg">
                      <h5 className="font-medium text-indigo-300 mb-1 text-sm">Visualization</h5>
                      <p className="text-indigo-100 text-xs">
                        {currentMeditationPhase.visualization}
                      </p>
                    </div>
                    <div className="p-3 bg-pink-900/20 rounded-lg">
                      <h5 className="font-medium text-pink-300 mb-1 text-sm">Focus Point</h5>
                      <p className="text-pink-100 text-xs">{currentMeditationPhase.focusPoint}</p>
                    </div>
                    {currentMeditationPhase.breathingPattern && (
                      <div className="p-3 bg-emerald-900/20 rounded-lg">
                        <h5 className="font-medium text-emerald-300 mb-1 text-sm">Breathing</h5>
                        <p className="text-emerald-100 text-xs">
                          {currentMeditationPhase.breathingPattern}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile Controls */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={goToPreviousPhase}
                variant="outline"
                size="sm"
                disabled={currentPhase === 0}
                className="border-slate-500 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={pauseMeditation}
                variant="outline"
                size="sm"
                className="border-purple-500 text-purple-300"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                onClick={skipToNextPhase}
                variant="outline"
                size="sm"
                disabled={currentPhase === meditation.phases.length - 1}
                className="border-slate-500 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={resetMeditation}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-300"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MobileMeditationGuidance
