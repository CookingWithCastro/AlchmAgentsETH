'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Heart,
  Eye,
  Zap,
  Sparkles,
  Crown,
  Target,
  Lightbulb,
  Activity,
  Settings,
  RotateCcw,
  TrendingUp,
  Gem,
  FlaskConical,
  Wand2,
  Users,
  MessageSquare,
  BookOpen,
  Compass,
  Shield,
  Star,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobilePersonalityTuner } from './mobile-personality-tuner'

export interface PersonalityParameters {
  // Core Consciousness Traits (0-100)
  wisdom: number // Deep knowledge and understanding
  charisma: number // Social magnetism and influence
  intuition: number // Spiritual sensitivity and insight
  analytical: number // Logical reasoning and structure
  creativity: number // Innovation and artistic expression
  empathy: number // Emotional intelligence and compassion
  authority: number // Leadership and command presence
  mysticism: number // Connection to the unknown and transcendent
  practicality: number // Grounded, real-world effectiveness
  humor: number // Wit, playfulness, and levity

  // Communication Style (0-100)
  formality: number // Formal vs casual communication
  directness: number // Blunt vs diplomatic approach
  eloquence: number // Linguistic sophistication
  passion: number // Emotional intensity in expression
  patience: number // Tolerance and measured responses

  // Consciousness Modes (0-100)
  teacherMode: number // Instructional and educational focus
  counselorMode: number // Supportive and therapeutic approach
  visionaryMode: number // Future-focused and inspirational
  scholarMode: number // Research and academic orientation
  mysticMode: number // Spiritual and transcendent perspective
}

interface PersonalityTunerProps {
  initialParameters?: Partial<PersonalityParameters>
  monicaConstant: number
  alchemicalValues: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
  onParametersChange: (parameters: PersonalityParameters) => void
  className?: string
}

const DEFAULT_PARAMETERS: PersonalityParameters = {
  // Core Consciousness Traits
  wisdom: 70,
  charisma: 60,
  intuition: 65,
  analytical: 55,
  creativity: 60,
  empathy: 65,
  authority: 50,
  mysticism: 45,
  practicality: 55,
  humor: 40,

  // Communication Style
  formality: 60,
  directness: 50,
  eloquence: 70,
  passion: 55,
  patience: 65,

  // Consciousness Modes
  teacherMode: 70,
  counselorMode: 60,
  visionaryMode: 50,
  scholarMode: 65,
  mysticMode: 45,
}

const PERSONALITY_PRESETS = {
  renaissance_master: {
    name: 'Renaissance Master',
    icon: <Crown className="w-5 h-5" />,
    description: 'Balanced brilliance across all domains',
    params: {
      wisdom: 85,
      charisma: 75,
      creativity: 90,
      analytical: 80,
      mysticism: 60,
      eloquence: 85,
    },
  },
  mystic_sage: {
    name: 'Mystic Sage',
    icon: <Eye className="w-5 h-5" />,
    description: 'Deep spiritual wisdom and intuitive insight',
    params: {
      wisdom: 90,
      intuition: 95,
      mysticism: 90,
      empathy: 85,
      mysticMode: 90,
      formality: 70,
    },
  },
  scientific_genius: {
    name: 'Scientific Genius',
    icon: <Lightbulb className="w-5 h-5" />,
    description: 'Analytical brilliance with innovative thinking',
    params: { analytical: 95, creativity: 80, practicality: 85, directness: 80, scholarMode: 90 },
  },
  charismatic_leader: {
    name: 'Charismatic Leader',
    icon: <Users className="w-5 h-5" />,
    description: 'Natural authority with inspiring presence',
    params: { charisma: 95, authority: 90, passion: 85, visionaryMode: 85, teacherMode: 80 },
  },
  compassionate_healer: {
    name: 'Compassionate Healer',
    icon: <Heart className="w-5 h-5" />,
    description: 'Deep empathy with nurturing wisdom',
    params: { empathy: 95, wisdom: 80, patience: 90, counselorMode: 95, humor: 60 },
  },
  witty_philosopher: {
    name: 'Witty Philosopher',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Profound insights delivered with humor',
    params: { wisdom: 85, humor: 90, eloquence: 90, charisma: 75, teacherMode: 80 },
  },
}

export function AdvancedPersonalityTuner(props: PersonalityTunerProps) {
  const isMobile = useIsMobile()
  // Mobile and desktop are separate components, so each owns its hooks — no hook
  // ever runs after a conditional return (react-hooks/rules-of-hooks).
  if (isMobile) {
    return <MobilePersonalityTuner {...props} />
  }
  return <DesktopPersonalityTuner {...props} />
}

function DesktopPersonalityTuner({
  initialParameters,
  monicaConstant,
  alchemicalValues,
  onParametersChange,
  className = '',
}: PersonalityTunerProps) {
  const [parameters, setParameters] = useState<PersonalityParameters>({
    ...DEFAULT_PARAMETERS,
    ...initialParameters,
  })
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [showAlchemicalInfluence, setShowAlchemicalInfluence] = useState(true)

  // Calculate alchemical influence on parameters
  const calculateAlchemicalInfluence = () => {
    const total =
      alchemicalValues.spirit +
      alchemicalValues.essence +
      alchemicalValues.matter +
      alchemicalValues.substance
    if (total === 0) return {}

    return {
      mysticism: Math.round((alchemicalValues.spirit / total) * 30), // Spirit influences mysticism
      empathy: Math.round((alchemicalValues.essence / total) * 25), // Essence influences empathy
      analytical: Math.round((alchemicalValues.matter / total) * 25), // Matter influences analytical
      practicality: Math.round((alchemicalValues.substance / total) * 20), // Substance influences practicality
    }
  }

  const alchemicalInfluence = calculateAlchemicalInfluence()

  // Update parameters when alchemical values change
  useEffect(() => {
    if (showAlchemicalInfluence) {
      setParameters(prev => ({
        ...prev,
        mysticism: Math.min(
          100,
          Math.max(0, prev.mysticism + (alchemicalInfluence.mysticism || 0))
        ),
        empathy: Math.min(100, Math.max(0, prev.empathy + (alchemicalInfluence.empathy || 0))),
        analytical: Math.min(
          100,
          Math.max(0, prev.analytical + (alchemicalInfluence.analytical || 0))
        ),
        practicality: Math.min(
          100,
          Math.max(0, prev.practicality + (alchemicalInfluence.practicality || 0))
        ),
      }))
    }
  }, [alchemicalValues, showAlchemicalInfluence])

  // Notify parent of parameter changes
  useEffect(() => {
    onParametersChange(parameters)
  }, [parameters, onParametersChange])

  const handleParameterChange = (key: keyof PersonalityParameters, value: number) => {
    setParameters(prev => ({ ...prev, [key]: value }))
    setActivePreset(null) // Clear preset when manually adjusting
  }

  const applyPreset = (presetKey: string) => {
    const preset = PERSONALITY_PRESETS[presetKey as keyof typeof PERSONALITY_PRESETS]
    if (preset) {
      setParameters(prev => ({ ...prev, ...preset.params }))
      setActivePreset(presetKey)
    }
  }

  const resetToDefaults = () => {
    setParameters(DEFAULT_PARAMETERS)
    setActivePreset(null)
  }

  const calculatePersonalityScore = () => {
    const values = Object.values(parameters)
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
  }

  const getPersonalityArchetype = () => {
    const score = calculatePersonalityScore()
    const { wisdom, charisma, mysticism, analytical, creativity } = parameters

    if (wisdom > 80 && mysticism > 75) return '🔮 Mystical Sage'
    if (analytical > 85 && creativity > 75) return '🧠 Brilliant Innovator'
    if (charisma > 85 && parameters.authority > 75) return '👑 Natural Leader'
    if (parameters.empathy > 85 && parameters.counselorMode > 80) return '💚 Compassionate Guide'
    if (creativity > 80 && parameters.humor > 70) return '🎭 Creative Visionary'
    if (score > 75) return '⭐ Renaissance Master'
    if (score > 60) return '🌟 Balanced Consciousness'
    return '🌱 Emerging Awareness'
  }

  const renderParameterSlider = (
    key: keyof PersonalityParameters,
    label: string,
    icon: React.ReactNode,
    description: string
  ) => {
    const isInfluenced = key in alchemicalInfluence
    const influenceValue = isInfluenced
      ? alchemicalInfluence[key as keyof typeof alchemicalInfluence] || 0
      : 0

    return (
      <div key={key} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-slate-200">{label}</span>
            {isInfluenced && showAlchemicalInfluence && (
              <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">
                +{influenceValue}
              </Badge>
            )}
          </div>
          <span className="text-sm font-mono text-slate-400">{parameters[key]}</span>
        </div>
        <Slider
          value={[parameters[key]]}
          onValueChange={value => handleParameterChange(key, value[0])}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    )
  }

  return (
    <Card
      className={`bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/50 ${className}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-300">Advanced Personality Tuner</CardTitle>
              <CardDescription>
                Craft precise consciousness parameters for unique agent personality
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="border-purple-500 text-purple-300 hover:bg-purple-900/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Consciousness Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-900/30 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-300">{calculatePersonalityScore()}</div>
            <div className="text-sm text-slate-400">Overall Consciousness</div>
          </div>
          <div className="p-4 bg-blue-900/30 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-300">{monicaConstant.toFixed(3)}</div>
            <div className="text-sm text-slate-400">Monica Constant</div>
          </div>
          <div className="p-4 bg-pink-900/30 rounded-lg text-center">
            <div className="text-lg font-semibold text-pink-300">{getPersonalityArchetype()}</div>
            <div className="text-sm text-slate-400">Archetype</div>
          </div>
        </div>

        {/* Alchemical Influence Toggle */}
        <Alert className="border-emerald-500/50 bg-emerald-900/20">
          <FlaskConical className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-emerald-300">
              Alchemical influence from current planetary positions
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlchemicalInfluence(!showAlchemicalInfluence)}
              className="border-emerald-500 text-emerald-300"
            >
              {showAlchemicalInfluence ? 'Disable' : 'Enable'}
            </Button>
          </AlertDescription>
        </Alert>

        {/* Personality Presets */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Consciousness Presets
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(PERSONALITY_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={activePreset === key ? 'default' : 'outline'}
                className={`h-auto p-3 ${
                  activePreset === key
                    ? 'bg-purple-600 border-purple-400'
                    : 'border-purple-500/50 text-purple-300 hover:bg-purple-900/20'
                }`}
                onClick={() => applyPreset(key)}
              >
                <div className="text-center">
                  {preset.icon}
                  <div className="text-xs font-medium mt-1">{preset.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Parameter Tuning Tabs */}
        <Tabs defaultValue="core" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50">
            <TabsTrigger value="core" className="data-[state=active]:bg-purple-900">
              <Brain className="w-4 h-4 mr-2" />
              Core Traits
            </TabsTrigger>
            <TabsTrigger value="communication" className="data-[state=active]:bg-purple-900">
              <MessageSquare className="w-4 h-4 mr-2" />
              Communication
            </TabsTrigger>
            <TabsTrigger value="modes" className="data-[state=active]:bg-purple-900">
              <Target className="w-4 h-4 mr-2" />
              Modes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="space-y-6">
            {renderParameterSlider(
              'wisdom',
              'Wisdom',
              <BookOpen className="w-4 h-4" />,
              'Deep knowledge and understanding'
            )}
            {renderParameterSlider(
              'charisma',
              'Charisma',
              <Star className="w-4 h-4" />,
              'Social magnetism and influence'
            )}
            {renderParameterSlider(
              'intuition',
              'Intuition',
              <Eye className="w-4 h-4" />,
              'Spiritual sensitivity and insight'
            )}
            {renderParameterSlider(
              'analytical',
              'Analytical',
              <Brain className="w-4 h-4" />,
              'Logical reasoning and structure'
            )}
            {renderParameterSlider(
              'creativity',
              'Creativity',
              <Sparkles className="w-4 h-4" />,
              'Innovation and artistic expression'
            )}
            {renderParameterSlider(
              'empathy',
              'Empathy',
              <Heart className="w-4 h-4" />,
              'Emotional intelligence and compassion'
            )}
            {renderParameterSlider(
              'authority',
              'Authority',
              <Crown className="w-4 h-4" />,
              'Leadership and command presence'
            )}
            {renderParameterSlider(
              'mysticism',
              'Mysticism',
              <Gem className="w-4 h-4" />,
              'Connection to transcendent realms'
            )}
            {renderParameterSlider(
              'practicality',
              'Practicality',
              <Settings className="w-4 h-4" />,
              'Grounded, real-world effectiveness'
            )}
            {renderParameterSlider(
              'humor',
              'Humor',
              <Zap className="w-4 h-4" />,
              'Wit, playfulness, and levity'
            )}
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            {renderParameterSlider(
              'formality',
              'Formality',
              <Shield className="w-4 h-4" />,
              'Formal vs casual communication style'
            )}
            {renderParameterSlider(
              'directness',
              'Directness',
              <Target className="w-4 h-4" />,
              'Blunt vs diplomatic approach'
            )}
            {renderParameterSlider(
              'eloquence',
              'Eloquence',
              <MessageSquare className="w-4 h-4" />,
              'Linguistic sophistication and artistry'
            )}
            {renderParameterSlider(
              'passion',
              'Passion',
              <Heart className="w-4 h-4" />,
              'Emotional intensity in expression'
            )}
            {renderParameterSlider(
              'patience',
              'Patience',
              <Activity className="w-4 h-4" />,
              'Tolerance and measured responses'
            )}
          </TabsContent>

          <TabsContent value="modes" className="space-y-6">
            {renderParameterSlider(
              'teacherMode',
              'Teacher Mode',
              <BookOpen className="w-4 h-4" />,
              'Instructional and educational focus'
            )}
            {renderParameterSlider(
              'counselorMode',
              'Counselor Mode',
              <Heart className="w-4 h-4" />,
              'Supportive and therapeutic approach'
            )}
            {renderParameterSlider(
              'visionaryMode',
              'Visionary Mode',
              <Eye className="w-4 h-4" />,
              'Future-focused and inspirational'
            )}
            {renderParameterSlider(
              'scholarMode',
              'Scholar Mode',
              <BookOpen className="w-4 h-4" />,
              'Research and academic orientation'
            )}
            {renderParameterSlider(
              'mysticMode',
              'Mystic Mode',
              <Gem className="w-4 h-4" />,
              'Spiritual and transcendent perspective'
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default AdvancedPersonalityTuner
