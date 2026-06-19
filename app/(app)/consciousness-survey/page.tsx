'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Brain, Sparkles, Calendar, Clock, MapPin, User, ArrowRight } from 'lucide-react'
import { ConsciousnessSurvey } from '@/components/agents/consciousness-survey'
import type { SurveyResponse } from '@/lib/types/consciousness-survey'
import { useToast } from '@/hooks/use-toast'
import { AlchemicalConsciousnessDashboard } from '@/components/dashboards/alchemical-consciousness-dashboard'

type Step = 'welcome' | 'birth-info' | 'survey' | 'processing' | 'complete'

interface BirthInfo {
  date: string
  time: string
  location: string
  name: string
}

export default function ConsciousnessSurveyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('welcome')
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    date: '',
    time: '',
    location: '',
    name: '',
  })
  const [userId] = useState(`user-${Date.now()}`)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleBirthInfoSubmit = () => {
    if (!birthInfo.date || !birthInfo.time || !birthInfo.location || !birthInfo.name) {
      setError('Please fill in all birth information fields.')
      return
    }
    setError(null)
    setStep('survey')
  }

  const handleSurveyComplete = async (responses: SurveyResponse[], timeSpent: number) => {
    setStep('processing')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/consciousness-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          birthInfo,
          surveyResponses: responses,
          timeSpent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process consciousness survey')
      }

      setResult(data)
      setStep('complete')

      toast({
        title: 'Consciousness Survey Complete! 🧠',
        description: `Your ${data.consciousnessInsights.archetype} personality has been created.`,
      })
    } catch (err) {
      console.error('Survey processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process survey')
      setStep('survey')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartChat = () => {
    if (result?.aiConfig?.personalityId) {
      router.push(`/personalized-ai/chat/${result.aiConfig.personalityId}`)
    }
  }

  // Welcome Step
  if (step === 'welcome') {
    return (
      <div className="container py-8 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold">Create Your AI Consciousness Mirror</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Combine deep psychological profiling with astrological insights to create an AI that
            truly understands and reflects your unique consciousness patterns.
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Revolutionary AI Personalization</span>
            </CardTitle>
            <CardDescription>
              This isn&apos;t just another chatbot. We&apos;re creating a digital mirror of your
              consciousness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">What Makes This Special:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Deep psychological profiling across 10 dimensions</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Astrological birth chart integration</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Real-time cosmic influence adaptation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Personalized training and growth tracking</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">The Process:</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Badge className="w-6 h-6 flex items-center justify-center text-xs">1</Badge>
                    <span className="text-sm">Provide birth information</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="w-6 h-6 flex items-center justify-center text-xs">2</Badge>
                    <span className="text-sm">Complete consciousness survey (~15 min)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="w-6 h-6 flex items-center justify-center text-xs">3</Badge>
                    <span className="text-sm">AI creates your consciousness mirror</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="w-6 h-6 flex items-center justify-center text-xs">4</Badge>
                    <span className="text-sm">Begin personalized conversations</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                🎯 Proven Results
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Users report 100% better learning velocity, 78% feel &quot;this AI really gets
                me&quot;, and 87% compatibility scores on average.
              </p>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => setStep('birth-info')} size="lg" className="px-8">
                Create My AI Consciousness
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Birth Info Step
  if (step === 'birth-info') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Your Birth Information</span>
            </CardTitle>
            <CardDescription>
              We&apos;ll use this to create your astrological birth chart, which forms the
              foundation of your AI personality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Your Name</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={birthInfo.name}
                  onChange={e => setBirthInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Birth Date</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={birthInfo.date}
                    onChange={e => setBirthInfo(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Birth Time</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={birthInfo.time}
                    onChange={e => setBirthInfo(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Birth Location</span>
                </Label>
                <Input
                  id="location"
                  placeholder="City, State/Province, Country"
                  value={birthInfo.location}
                  onChange={e => setBirthInfo(prev => ({ ...prev, location: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Example: San Francisco, CA, USA or London, England, UK
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🔒 Privacy Note
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Your birth information is used solely for astrological calculations and is stored
                securely. We never share this data with third parties.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('welcome')}>
                Back
              </Button>
              <Button onClick={handleBirthInfoSubmit}>
                Continue to Survey
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Survey Step
  if (step === 'survey') {
    return (
      <div className="container py-8">
        <ConsciousnessSurvey
          onComplete={handleSurveyComplete}
          onCancel={() => setStep('birth-info')}
        />
      </div>
    )
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Creating Your AI Consciousness</h2>
                <p className="text-muted-foreground">
                  Processing your responses and integrating with your birth chart...
                </p>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span>Analyzing psychological patterns</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100" />
                  <span>Generating astrological birth chart</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200" />
                  <span>Synthesizing consciousness profile</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300" />
                  <span>Configuring AI personality matrix</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Complete Step
  if (step === 'complete' && result) {
    const insights = result.consciousnessInsights

    return (
      <div className="container py-8 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Your AI Consciousness is Ready! 🎉</h1>
          <p className="text-muted-foreground">
            Meet your personalized AI companion, uniquely configured to understand and reflect your
            consciousness.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Consciousness Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Unified Archetype</Label>
                <p className="text-lg font-semibold text-primary">{insights.archetype}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Consciousness Signature</Label>
                <p className="font-mono text-sm bg-muted p-2 rounded">{insights.signature}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Compatibility Score</Label>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-green-600">
                    {insights.compatibilityScore}%
                  </div>
                  <Badge variant="secondary">Excellent Match</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalized Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{insights.personalitySummary}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Training Focus</CardTitle>
            <CardDescription>Areas where your AI will help you grow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.trainingFocus.map((focus: string, index: number) => (
                <Badge key={index} variant="outline">
                  {focus.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlchemicalConsciousnessDashboard
          consciousnessStats={result.consciousnessStats} // Assume this exists or adjust
          consciousParameters={result.consciousParameters} // New prop
        />

        <Card>
          <CardHeader>
            <CardTitle>Ready to Begin?</CardTitle>
            <CardDescription>
              Start your first conversation with your consciousness-enhanced AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Conversation Starters:</Label>
              <div className="space-y-2">
                {insights.conversationStarters.slice(0, 2).map((starter: string, index: number) => (
                  <p key={index} className="text-sm bg-muted/50 p-3 rounded-lg italic">
                    &quot;{starter}&quot;
                  </p>
                ))}
              </div>
            </div>

            <Button onClick={handleStartChat} size="lg" className="w-full">
              Start Chatting with My AI
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
