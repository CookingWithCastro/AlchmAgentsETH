'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sparkles,
  Star,
  Users,
  BarChart3,
  MessageSquare,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  Zap,
} from 'lucide-react'
import { logger } from '@/lib/structured-logger'

interface OnboardingStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  required?: boolean
}

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingWizard({ open, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [userPreferences, setUserPreferences] = useState({
    interestedInAstrology: false,
    interestedInAI: false,
    interestedInCharts: false,
    wantsNotifications: false,
  })

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Planetary Agents',
      description: 'Your journey into personalized astrology and AI begins here',
      icon: Sparkles,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Discover Your Cosmic Blueprint</h3>
            <p className="text-muted-foreground">
              Planetary Agents combines ancient astrological wisdom with cutting-edge AI to provide
              personalized insights about your life, personality, and potential.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'What You Can Do',
      description: 'Explore the powerful features available to you',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Personalized Astrology</h4>
                    <p className="text-sm text-muted-foreground">
                      Get detailed birth chart analysis with unique elemental alchemy calculations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">AI Agent Conversations</h4>
                    <p className="text-sm text-muted-foreground">
                      Chat with historical figures and AI personalities based on your astrological
                      profile
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Real-time Transits</h4>
                    <p className="text-sm text-muted-foreground">
                      Track current planetary positions and their influence on your life
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Feedback & Community</h4>
                    <p className="text-sm text-muted-foreground">
                      Help improve the platform and connect with like-minded individuals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'preferences',
      title: 'Your Interests',
      description: 'Help us personalize your experience',
      icon: Target,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Select what interests you most to get personalized recommendations:
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="astrology"
                checked={userPreferences.interestedInAstrology}
                onCheckedChange={checked =>
                  setUserPreferences(prev => ({ ...prev, interestedInAstrology: !!checked }))
                }
              />
              <label
                htmlFor="astrology"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Astrology & Birth Charts
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ai"
                checked={userPreferences.interestedInAI}
                onCheckedChange={checked =>
                  setUserPreferences(prev => ({ ...prev, interestedInAI: !!checked }))
                }
              />
              <label
                htmlFor="ai"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                AI Conversations & Agents
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="charts"
                checked={userPreferences.interestedInCharts}
                onCheckedChange={checked =>
                  setUserPreferences(prev => ({ ...prev, interestedInCharts: !!checked }))
                }
              />
              <label
                htmlFor="charts"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Charts & Data Visualization
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifications"
                checked={userPreferences.wantsNotifications}
                onCheckedChange={checked =>
                  setUserPreferences(prev => ({ ...prev, wantsNotifications: !!checked }))
                }
              />
              <label
                htmlFor="notifications"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Power Hour Notifications
              </label>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Your first steps into the cosmic realm',
      icon: Check,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">You're All Set!</h3>
            <p className="text-muted-foreground">
              Based on your preferences, here's how to get started:
            </p>
          </div>

          <div className="space-y-3">
            {userPreferences.interestedInAstrology && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Create Your Birth Chart</h4>
                      <p className="text-sm text-muted-foreground">
                        Start by entering your birth information to generate your personal
                        astrological profile
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {userPreferences.interestedInAI && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Chat with AI Agents</h4>
                      <p className="text-sm text-muted-foreground">
                        Explore conversations with AI personalities crafted from historical figures
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {userPreferences.interestedInCharts && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Explore Current Transits</h4>
                      <p className="text-sm text-muted-foreground">
                        Check out real-time planetary positions and their current influences
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Share Your Feedback</h4>
                    <p className="text-sm text-muted-foreground">
                      Help us improve by sharing your thoughts and suggestions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]))
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Save user preferences and onboarding completion
    const onboardingData = {
      completed: true,
      completedAt: new Date().toISOString(),
      preferences: userPreferences,
      completedSteps: Array.from(completedSteps),
    }

    // In a real app, save to localStorage or API
    localStorage.setItem('planetary-agents-onboarding', JSON.stringify(onboardingData))

    logger.info('User completed onboarding', {
      system: 'onboarding',
      operation: 'complete',
      metadata: {
        preferences: userPreferences,
        stepsCompleted: completedSteps.size,
      },
    })

    onComplete()
  }

  const handleSkip = () => {
    logger.info('User skipped onboarding', {
      system: 'onboarding',
      operation: 'skip',
      metadata: { stepReached: currentStepData.id },
    })

    onSkip()
  }

  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setCompletedSteps(new Set())
    }
  }, [open])

  if (!open) return null

  const IconComponent = currentStepData.icon

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <VisuallyHidden>
          <DialogTitle>Onboarding Tutorial</DialogTitle>
        </VisuallyHidden>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconComponent className="h-6 w-6 text-primary" aria-hidden="true" />
              <div>
                <DialogTitle id="onboarding-title">{currentStepData.title}</DialogTitle>
                <DialogDescription
                  id="onboarding-description"
                  className="text-sm text-muted-foreground mt-1"
                >
                  {currentStepData.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              aria-label="Skip onboarding tutorial"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            aria-label={`Onboarding progress: ${Math.round(progress)}% complete`}
          />
        </div>

        {/* Content */}
        <div className="py-4">{currentStepData.content}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            aria-label={currentStep === 0 ? 'Previous step (disabled)' : 'Go to previous step'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              aria-label="Skip the onboarding tutorial and go directly to the application"
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              aria-label={
                currentStep === steps.length - 1
                  ? 'Complete onboarding and start using the application'
                  : 'Go to next step'
              }
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
