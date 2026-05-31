'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Crown,
  Star,
  Brain,
  Heart,
  Users,
  Lightbulb,
  Award,
  Eye,
  Sparkles,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  Compass,
  Infinity as InfinityIcon,
} from 'lucide-react'
import { InteractiveChartTeacher } from '@/components/charts/interactive-chart-teacher'
import { RelationalAstrologyTrainer } from '@/components/misc/relational-astrology-trainer'
import type {
  BirthChartFeature,
  AstrologicalLearningModule,
  RelationalAstrologyPattern,
  CosmicCurriculumProgress,
} from '@/lib/astrological-education-engine'
import {
  COSMIC_UNDERSTANDING_MILESTONES,
  CosmicCurriculumManager,
} from '@/lib/astrological-education-engine'

interface UniverseConnectionDashboardProps {
  userProfile: {
    name: string
    chartFeatures: BirthChartFeature[]
    elementalProfile: string[]
    planetaryEmphasis: string[]
  }
  progress: CosmicCurriculumProgress
  availableModules: AstrologicalLearningModule[]
  relationalPatterns: RelationalAstrologyPattern[]
  onModuleComplete?: (moduleId: string) => void
  onScenarioComplete?: (scenarioId: string, results: any) => void
  onPatternMastery?: (patternId: string) => void
  onInsightUnlocked?: (insight: string) => void
}

export function UniverseConnectionDashboard({
  userProfile,
  progress,
  availableModules,
  relationalPatterns,
  onModuleComplete,
  onScenarioComplete,
  onPatternMastery,
  onInsightUnlocked,
}: UniverseConnectionDashboardProps) {
  const [currentModule, setCurrentModule] = useState<AstrologicalLearningModule | null>(null)
  const [dashboardView, setDashboardView] = useState<'overview' | 'learning' | 'practice'>(
    'overview'
  )

  // Calculate universe connection level
  const curriculumManager = new CosmicCurriculumManager(progress)
  const universeConnectionLevel = curriculumManager.calculateUniverseConnectionLevel()
  const cosmicInsight = curriculumManager.getCosmicInsightForLevel(universeConnectionLevel)

  // Get next recommended module
  const nextModule = curriculumManager.getNextRecommendedModule(availableModules)

  // Calculate milestones
  const achievedMilestones = COSMIC_UNDERSTANDING_MILESTONES.filter(
    milestone => universeConnectionLevel >= milestone.level
  )
  const nextMilestone = COSMIC_UNDERSTANDING_MILESTONES.find(
    milestone => universeConnectionLevel < milestone.level
  )

  // Learning statistics
  const completedModulesCount = progress.completed_modules.length
  const totalModulesCount = availableModules.length
  const avgMasteryLevel =
    Object.values(progress.mastery_levels).length > 0
      ? Object.values(progress.mastery_levels).reduce((sum, level) => sum + level, 0) /
        Object.values(progress.mastery_levels).length
      : 0
  const avgRelationalUnderstanding =
    Object.values(progress.relational_understanding).length > 0
      ? Object.values(progress.relational_understanding).reduce((sum, level) => sum + level, 0) /
        Object.values(progress.relational_understanding).length
      : 0

  const getLevelEmoji = (level: number) => {
    if (level < 20) return '🌱'
    if (level < 40) return '⭐'
    if (level < 60) return '🌙'
    if (level < 80) return '🌟'
    return '🌌'
  }

  const getLevelColor = (level: number) => {
    if (level < 20) return 'from-green-50 to-green-100 border-green-200'
    if (level < 40) return 'from-blue-50 to-blue-100 border-blue-200'
    if (level < 60) return 'from-purple-50 to-purple-100 border-purple-200'
    if (level < 80) return 'from-indigo-50 to-indigo-100 border-indigo-200'
    return 'from-violet-50 to-violet-100 border-violet-200'
  }

  const handleModuleSelect = (moduleId: string) => {
    const selectedModule = availableModules.find(m => m.id === moduleId)
    if (selectedModule) {
      setCurrentModule(selectedModule)
      setDashboardView('learning')
    }
  }

  const handleExerciseComplete = (exerciseId: string, results: any) => {
    // Handle exercise completion logic
    console.log('Exercise completed:', exerciseId, results)
  }

  return (
    <div className="space-y-6">
      {/* Universe Connection Header */}
      <Card className={`bg-gradient-to-r ${getLevelColor(universeConnectionLevel)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-violet-600" />
            <div>
              <h1 className="text-2xl font-bold">Learning Yourself to Understand the Universe</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back, {userProfile.name} {getLevelEmoji(universeConnectionLevel)}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Universe Connection</span>
                <span className="text-lg font-bold">{universeConnectionLevel}%</span>
              </div>
              <Progress value={universeConnectionLevel} className="h-3" />
              <p className="text-xs text-muted-foreground">{cosmicInsight}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Modules Completed</span>
                <span className="text-lg font-bold">
                  {completedModulesCount}/{totalModulesCount}
                </span>
              </div>
              <Progress value={(completedModulesCount / totalModulesCount) * 100} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cosmic Insights</span>
                <span className="text-lg font-bold">
                  {progress.cosmic_insights_unlocked.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {progress.cosmic_insights_unlocked.slice(0, 3).map((insight, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {insight.split(' ').slice(0, 2).join(' ')}...
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs
        value={dashboardView}
        onValueChange={(value: string) =>
          setDashboardView(value as 'overview' | 'learning' | 'practice')
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learning">Chart Learning</TabsTrigger>
          <TabsTrigger value="practice">Relational Practice</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Cosmic Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Personal Chart Mastery</span>
                    <span className="font-medium">{avgMasteryLevel.toFixed(1)}%</span>
                  </div>
                  <Progress value={avgMasteryLevel} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Relational Understanding</span>
                    <span className="font-medium">{avgRelationalUnderstanding.toFixed(1)}%</span>
                  </div>
                  <Progress value={avgRelationalUnderstanding} className="h-2" />
                </div>

                {nextModule && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Recommended Next</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{nextModule.title}</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handleModuleSelect(nextModule.id)}
                    >
                      Start Learning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cosmic Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Cosmic Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {COSMIC_UNDERSTANDING_MILESTONES.map(milestone => {
                    const achieved = universeConnectionLevel >= milestone.level
                    return (
                      <div
                        key={milestone.level}
                        className={`p-3 rounded-lg border ${
                          achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {achieved ? (
                            <Award className="h-4 w-4 text-green-600" />
                          ) : (
                            <Target className="h-4 w-4 text-gray-400" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              achieved ? 'text-green-800' : 'text-gray-600'
                            }`}
                          >
                            {milestone.title}
                          </span>
                          <Badge variant={achieved ? 'default' : 'outline'}>
                            {milestone.level}%
                          </Badge>
                        </div>
                        <p className={`text-xs ${achieved ? 'text-green-700' : 'text-gray-500'}`}>
                          {milestone.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{userProfile.chartFeatures.length}</div>
                <div className="text-xs text-muted-foreground">Chart Features</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">
                  {Object.keys(progress.relational_understanding).length}
                </div>
                <div className="text-xs text-muted-foreground">Relational Patterns</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{progress.cosmic_insights_unlocked.length}</div>
                <div className="text-xs text-muted-foreground">Cosmic Insights</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <InfinityIcon className="h-8 w-8 mx-auto mb-2 text-violet-500" />
                <div className="text-2xl font-bold">{universeConnectionLevel}</div>
                <div className="text-xs text-muted-foreground">Universe Connection</div>
              </CardContent>
            </Card>
          </div>

          {/* Latest Insights */}
          {progress.cosmic_insights_unlocked.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Recent Cosmic Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {progress.cosmic_insights_unlocked.slice(-3).map((insight, idx) => (
                    <div key={idx} className="p-3 bg-violet-50 rounded-lg">
                      <p className="text-sm font-medium text-violet-800">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chart Learning Tab */}
        <TabsContent value="learning">
          <InteractiveChartTeacher
            userChartFeatures={userProfile.chartFeatures}
            currentModule={currentModule || undefined}
            progress={progress}
            onModuleSelect={handleModuleSelect}
            onExerciseComplete={handleExerciseComplete}
            universeConnectionLevel={universeConnectionLevel}
            userElementalProfile={userProfile.elementalProfile}
            userPlanetaryEmphasis={userProfile.planetaryEmphasis}
            relationalPatterns={relationalPatterns}
            onScenarioComplete={onScenarioComplete}
            onPatternMastery={onPatternMastery}
          />
        </TabsContent>

        {/* Relational Practice Tab */}
        <TabsContent value="practice">
          <RelationalAstrologyTrainer
            userElementalProfile={userProfile.elementalProfile}
            userPlanetaryEmphasis={userProfile.planetaryEmphasis}
            availablePatterns={relationalPatterns}
            progress={progress}
            onScenarioComplete={onScenarioComplete}
            onPatternMastery={onPatternMastery}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
