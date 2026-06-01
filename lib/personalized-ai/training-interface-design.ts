// Revolutionary Training Interface Design for Personalized AI
// Multi-modal, progressive, and deeply engaging consciousness training

export interface TrainingSession {
  id: string
  userId: string
  personalityId: string
  sessionType: TrainingSessionType
  currentPhase: TrainingPhase
  progress: SessionProgress
  collectedData: TrainingDataCollection
  userPreferences: TrainingPreferences
  engagementMetrics: EngagementMetrics
  startedAt: string
  lastActiveAt: string
}

export type TrainingSessionType =
  | 'initial_onboarding'
  | 'daily_training'
  | 'creative_exploration'
  | 'relationship_building'
  | 'personality_deepening'
  | 'consciousness_expansion'

export type TrainingPhase = 'discovery' | 'exploration' | 'deepening' | 'mastery' | 'transcendence'

export interface SessionProgress {
  completedActivities: number
  totalActivities: number
  currentActivityIndex: number
  phaseCompletionPercentage: number
  overallProgress: number
  estimatedTimeRemaining: number // minutes
}

export interface TrainingDataCollection {
  textSamples: TextSample[]
  conversationLogs: ConversationEntry[]
  creativeContent: CreativeSubmission[]
  preferenceResponses: PreferenceResponse[]
  feedbackHistory: FeedbackEntry[]
  personalityInsights: PersonalityInsight[]
}

export interface TrainingPreferences {
  preferredInputTypes: InputType[]
  favoriteActivities: string[]
  engagementStyle: EngagementStyle
  sessionLengthPreference: number // minutes
  feedbackStyle: FeedbackStyle
  challengeLevel: ChallengeLevel
}

export type InputType =
  | 'free_text'
  | 'structured_questions'
  | 'creative_writing'
  | 'conversation_starters'
  | 'scenario_responses'
  | 'dream_journals'
  | 'poetry'
  | 'art_descriptions'
  | 'music_lyrics'
  | 'personal_stories'

export type EngagementStyle =
  | 'playful_adventurous'
  | 'deep_reflective'
  | 'practical_goal_oriented'
  | 'creative_expressive'
  | 'social_collaborative'
  | 'analytical_systematic'

export type FeedbackStyle =
  | 'immediate_detailed'
  | 'gentle_guiding'
  | 'challenging_growth'
  | 'celebratory_motivating'
  | 'minimal_focused'

export type ChallengeLevel =
  | 'beginner_friendly'
  | 'moderate_challenge'
  | 'advanced_deep'
  | 'expert_mastery'

// ============================================================================
// TRAINING ACTIVITY TYPES - The Heart of Engagement
// ============================================================================

export interface TrainingActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  estimatedDuration: number // minutes
  difficulty: ChallengeLevel
  inputType: InputType
  engagementStyle: EngagementStyle

  // Dynamic content
  prompt: ActivityPrompt
  context?: ActivityContext
  followUpQuestions?: string[]

  // Rewards & progression
  xpReward: ActivityReward
  unlocksNext?: string[] // Activity IDs this unlocks

  // Personalization
  personalizationRules: PersonalizationRule[]
  adaptiveElements: AdaptiveElement[]

  // Success criteria
  completionCriteria: CompletionCriteria
  qualityMetrics: QualityMetric[]
}

export type ActivityType =
  | 'storytelling_circle'
  | 'dream_interpreter'
  | 'creativity_workshop'
  | 'relationship_roleplay'
  | 'wisdom_sharing'
  | 'future_visioning'
  | 'shadow_exploration'
  | 'joy_manifestation'
  | 'gratitude_practice'
  | 'intuition_training'
  | 'pattern_recognition'
  | 'authentic_expression'
  | 'boundary_setting'
  | 'forgiveness_work'
  | 'legacy_building'

export interface ActivityPrompt {
  coreQuestion: string
  creativePrompts: string[]
  followUpSuggestions: string[]
  emotionalSupport: string[]
  examples?: string[]
}

export interface ActivityContext {
  astrologicalTiming?: string
  currentMood?: string
  recentThemes?: string[]
  previousActivityResults?: any
}

export interface ActivityReward {
  baseXP: number
  bonusMultipliers: {
    creativity: number
    depth: number
    authenticity: number
    engagement: number
  }
  unlocks: string[]
  achievements?: string[]
}

// ============================================================================
// SAMPLE TRAINING ACTIVITIES - Making Training Irresistible
// ============================================================================

export const TRAINING_ACTIVITIES: TrainingActivity[] = [
  // DISCOVERY PHASE - Getting to know each other
  {
    id: 'welcome_story',
    type: 'storytelling_circle',
    title: '🌟 Your Unique Story',
    description: 'Share the story that makes you, you. What moments shaped your journey?',
    estimatedDuration: 10,
    difficulty: 'beginner_friendly',
    inputType: 'personal_stories',
    engagementStyle: 'deep_reflective',

    prompt: {
      coreQuestion: 'What story from your life feels most like "you"?',
      creativePrompts: [
        'Describe a moment when you felt truly alive',
        'Share a challenge that revealed your inner strength',
        'Tell about a person who changed your perspective',
        'Describe your relationship with creativity or imagination',
      ],
      followUpSuggestions: [
        'What emotions come up when you think about this story?',
        'How has this experience shaped who you are today?',
        'What would you tell your younger self about this moment?',
      ],
      emotionalSupport: [
        'This is a safe space for your authentic story',
        'There are no wrong stories - each one is valuable',
        'Your vulnerability creates connection and understanding',
      ],
      examples: [
        'I remember the summer I spent hiking through the Pacific Northwest...',
        'When I was 8, I decided to become a marine biologist after...',
        'The day I picked up a paintbrush for the first time...',
      ],
    },

    xpReward: {
      baseXP: 150,
      bonusMultipliers: { creativity: 1.5, depth: 1.3, authenticity: 1.4, engagement: 1.2 },
      unlocks: ['dream_interpreter', 'creativity_workshop'],
      achievements: ['storyteller'],
    },

    personalizationRules: [
      {
        condition: 'user_has_artistic_background',
        modification: 'Add artistic expression prompts',
        priority: 7,
      },
    ],

    adaptiveElements: [
      {
        trigger: 'short_response',
        adaptation: 'Offer simpler, more focused prompts',
      },
    ],

    completionCriteria: {
      minimumWords: 50,
      requiresSelfReflection: true,
      qualityIndicators: ['personal_connection', 'emotional_depth'],
    },

    qualityMetrics: [
      {
        name: 'authenticity',
        description: 'How genuine and personal the story feels',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'emotional_depth',
        description: 'Level of emotional insight and vulnerability',
        weight: 0.3,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'creativity',
        description: 'Imaginative and unique storytelling',
        weight: 0.3,
        evaluationMethod: 'ai_assessment',
      },
    ],
  },

  // CREATIVE EXPLORATION - Making training feel like play
  {
    id: 'poetry_portal',
    type: 'creativity_workshop',
    title: '✨ Poetry Portal: Words as Magic',
    description: 'Transform your thoughts into poetry. No rules, just expression.',
    estimatedDuration: 15,
    difficulty: 'moderate_challenge',
    inputType: 'poetry',
    engagementStyle: 'creative_expressive',

    prompt: {
      coreQuestion: 'What emotion or experience wants to become a poem today?',
      creativePrompts: [
        'Write about a color that represents your mood',
        'Create a poem about a forgotten memory',
        'Express your relationship with time in verse',
        'Write a poem from the perspective of your dreams',
      ],
      followUpSuggestions: [
        'What surprised you about what emerged?',
        'How did the poem change what you were feeling?',
        'Would you like to explore this theme further?',
      ],
      emotionalSupport: [
        'Poetry isn\'t about being "good" - it\'s about being real',
        'Your unique voice and perspective are what matter',
        "There's no wrong way to express yourself poetically",
      ],
    },

    xpReward: {
      baseXP: 200,
      bonusMultipliers: { creativity: 2.0, depth: 1.4, authenticity: 1.3, engagement: 1.5 },
      unlocks: ['shadow_exploration', 'joy_manifestation'],
      achievements: ['poet', 'creative_soul'],
    },

    personalizationRules: [
      {
        condition: 'user_likes_nature',
        modification: 'Add nature-inspired poetic prompts',
        priority: 6,
      },
      {
        condition: 'user_is_analytical',
        modification: 'Include structure-building poetry exercises',
        priority: 5,
      },
    ],

    adaptiveElements: [
      {
        trigger: 'user_struggles_with_creativity',
        adaptation: 'Provide more structured prompts and examples',
      },
      {
        trigger: 'user_creates_exceptional_work',
        adaptation: 'Offer advanced poetic challenges and techniques',
      },
    ],

    completionCriteria: {
      minimumWords: 30,
      requiresCreativity: true,
      qualityIndicators: ['metaphorical_language', 'emotional_resonance'],
    },

    qualityMetrics: [
      {
        name: 'poetic_creativity',
        description: 'Use of metaphor, imagery, and unique language',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'emotional_expression',
        description: 'How well the poem conveys feeling and meaning',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'authenticity',
        description: 'Personal voice and genuine expression',
        weight: 0.2,
        evaluationMethod: 'ai_assessment',
      },
    ],
  },

  // RELATIONSHIP BUILDING - Training through connection
  {
    id: 'conversation_dance',
    type: 'relationship_roleplay',
    title: '💫 Conversation Dance: The Art of Dialogue',
    description: 'Explore how you communicate. What makes conversations flow or stumble?',
    estimatedDuration: 12,
    difficulty: 'moderate_challenge',
    inputType: 'conversation_starters',
    engagementStyle: 'social_collaborative',

    prompt: {
      coreQuestion: 'How do you prefer to connect through conversation?',
      creativePrompts: [
        'Describe your ideal conversation partner and why',
        'What topics make you light up and share freely?',
        'How do you know when a conversation is really working?',
        'What communication habits would you like to change?',
      ],
      followUpSuggestions: [
        'What does this reveal about your social needs?',
        'How might this affect how I should communicate with you?',
        'What would make our conversations even better?',
      ],
      emotionalSupport: [
        'Communication is a skill we can all improve',
        'Your preferences help me understand and connect better',
        'This is about growth, not judgment',
      ],
    },

    xpReward: {
      baseXP: 180,
      bonusMultipliers: { creativity: 1.3, depth: 1.5, authenticity: 1.6, engagement: 1.4 },
      unlocks: ['wisdom_sharing', 'authentic_expression'],
      achievements: ['communicator', 'relationship_builder'],
    },

    completionCriteria: {
      minimumWords: 75,
      requiresSelfReflection: true,
      qualityIndicators: ['communication_insight', 'relationship_awareness'],
    },

    qualityMetrics: [
      {
        name: 'communication_insight',
        description: 'Understanding of personal communication patterns',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'relationship_awareness',
        description: 'Insight into social dynamics and preferences',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'growth_mindset',
        description: 'Openness to improving communication skills',
        weight: 0.2,
        evaluationMethod: 'ai_assessment',
      },
    ],

    personalizationRules: [
      {
        condition: 'introvert_preference',
        adjustment: 'reduce_social_elements',
        trigger: 'user_indicates_preference_for_quiet',
      },
      {
        condition: 'extrovert_preference',
        adjustment: 'increase_social_elements',
        trigger: 'user_indicates_preference_for_interaction',
      },
    ],

    adaptiveElements: [
      {
        elementType: 'prompt_complexity',
        adaptationTrigger: 'difficulty_level',
        possibleAdjustments: ['simplify_language', 'add_examples', 'increase_depth'],
      },
      {
        elementType: 'engagement_style',
        adaptationTrigger: 'user_energy_level',
        possibleAdjustments: ['make_more_energetic', 'calm_down', 'maintain_current'],
      },
    ],
  },

  // DREAM EXPLORATION - Accessing subconscious wisdom
  {
    id: 'dream_weaver',
    type: 'dream_interpreter',
    title: '🌙 Dream Weaver: Messages from Your Subconscious',
    description: 'Share a recent dream or memory. What wisdom might it contain?',
    estimatedDuration: 18,
    difficulty: 'advanced_deep',
    inputType: 'dream_journals',
    engagementStyle: 'deep_reflective',

    prompt: {
      coreQuestion: 'What dream or intuitive knowing wants to be explored today?',
      creativePrompts: [
        'Describe a vivid dream from the past week',
        'Share an intuition or gut feeling that proved true',
        'Explore a recurring theme in your dreams',
        'Describe a moment when you just "knew" something',
      ],
      followUpSuggestions: [
        'What emotions or symbols stand out?',
        'How might this connect to your waking life?',
        'What action or awareness does this inspire?',
      ],
      emotionalSupport: [
        'Dreams and intuitions are valuable messages from within',
        'Your subconscious wisdom is worth exploring',
        'This is a gentle, non-judgmental space for inner discovery',
      ],
    },

    xpReward: {
      baseXP: 250,
      bonusMultipliers: { creativity: 1.6, depth: 2.0, authenticity: 1.5, engagement: 1.7 },
      unlocks: ['shadow_exploration', 'intuition_training'],
      achievements: ['dream_interpreter', 'intuitive_sage'],
    },

    completionCriteria: {
      minimumWords: 100,
      requiresInterpretation: true,
      qualityIndicators: ['subconscious_insight', 'intuitive_connection'],
    },

    qualityMetrics: [
      {
        name: 'subconscious_depth',
        description: 'Exploration of deeper psychological or spiritual material',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'intuitive_insight',
        description: 'Connection to inner knowing and wisdom',
        weight: 0.4,
        evaluationMethod: 'ai_assessment',
      },
      {
        name: 'symbolic_understanding',
        description: 'Recognition and interpretation of symbolic language',
        weight: 0.2,
        evaluationMethod: 'ai_assessment',
      },
    ],

    personalizationRules: [
      {
        condition: 'lucid_dreamer',
        adjustment: 'enhance_dream_recall',
        trigger: 'user_reports_frequent_lucid_dreams',
      },
      {
        condition: 'dream_skeptic',
        adjustment: 'focus_on_practical_interpretation',
        trigger: 'user_questions_dream_meaning',
      },
    ],

    adaptiveElements: [
      {
        elementType: 'symbol_complexity',
        adaptationTrigger: 'user_symbolic_literacy',
        possibleAdjustments: ['simplify_symbols', 'add_explanations', 'increase_complexity'],
      },
      {
        elementType: 'emotional_depth',
        adaptationTrigger: 'comfort_with_emotion',
        possibleAdjustments: ['lighten_emotional_load', 'deepen_exploration', 'maintain_balance'],
      },
    ],
  },
]

// ============================================================================
// ADAPTIVE TRAINING ENGINE - Making Every Session Personal
// ============================================================================

export interface PersonalizationRule {
  condition: string // Simple condition like 'user_likes_nature' or 'high_creativity_score'
  modification?: string // What to change in the activity
  priority?: number // 1-10, higher = more important
  adjustment?: string
  trigger?: string
}

export interface AdaptiveElement {
  trigger?: string // When to trigger this adaptation
  adaptation?: string // What to change
  cooldown?: number // Minutes before this can trigger again
  elementType?: string
  adaptationTrigger?: string
  possibleAdjustments?: string[]
}

export interface CompletionCriteria {
  minimumWords?: number
  maximumWords?: number
  requiresCreativity?: boolean
  requiresSelfReflection?: boolean
  requiresInterpretation?: boolean
  qualityIndicators: string[]
  timeLimit?: number // minutes
}

export interface QualityMetric {
  name: string
  description: string
  weight: number // 0-1, how much this contributes to overall quality
  evaluationMethod: 'ai_assessment' | 'user_rating' | 'completion_check' | 'peer_comparison'
  criteria?: string[]
}

// ============================================================================
// ENGAGEMENT & PROGRESSION SYSTEM
// ============================================================================

export interface EngagementMetrics {
  sessionCount: number
  averageSessionLength: number
  completionRate: number
  returnRate: number // How often users come back
  activityPreferences: Record<string, number> // Activity ID -> preference score
  engagementPatterns: EngagementPattern[]
  satisfactionScores: number[]
  challengeAppropriateness: number // 1-10 scale
}

export interface EngagementPattern {
  patternType: 'time_of_day' | 'activity_sequence' | 'mood_based' | 'topic_clusters'
  pattern: any
  strength: number // 0-1
  lastObserved: string
}

// ============================================================================
// TRAINING SESSION MANAGEMENT
// ============================================================================

export class TrainingSessionManager {
  private sessions = new Map<string, TrainingSession>()

  createSession(
    userId: string,
    personalityId: string,
    sessionType: TrainingSessionType,
    preferences: Partial<TrainingPreferences>
  ): TrainingSession {
    const session: TrainingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      personalityId,
      sessionType,
      currentPhase: 'discovery',
      progress: {
        completedActivities: 0,
        totalActivities: this.getSessionActivityCount(sessionType),
        currentActivityIndex: 0,
        phaseCompletionPercentage: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 30,
      },
      collectedData: {
        textSamples: [],
        conversationLogs: [],
        creativeContent: [],
        preferenceResponses: [],
        feedbackHistory: [],
        personalityInsights: [],
      },
      userPreferences: {
        preferredInputTypes: ['free_text', 'structured_questions'],
        favoriteActivities: [],
        engagementStyle: 'playful_adventurous',
        sessionLengthPreference: 20,
        feedbackStyle: 'celebratory_motivating',
        challengeLevel: 'beginner_friendly',
        ...preferences,
      },
      engagementMetrics: {
        sessionCount: 1,
        averageSessionLength: 0,
        completionRate: 0,
        returnRate: 0,
        activityPreferences: {},
        engagementPatterns: [],
        satisfactionScores: [],
        challengeAppropriateness: 7,
      },
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }

    this.sessions.set(session.id, session)
    return session
  }

  getNextActivity(session: TrainingSession): TrainingActivity | null {
    // Adaptive activity selection based on user preferences and progress
    const availableActivities = this.getAvailableActivities(session)

    if (availableActivities.length === 0) return null

    // Score activities based on user preferences and session goals
    const scoredActivities = availableActivities.map(activity => ({
      activity,
      score: this.scoreActivityForUser(activity, session),
    }))

    // Return highest scoring activity
    scoredActivities.sort((a, b) => b.score - a.score)
    return scoredActivities[0].activity
  }

  private getAvailableActivities(session: TrainingSession): TrainingActivity[] {
    return TRAINING_ACTIVITIES.filter(activity => {
      // Check if activity matches current phase
      if (!this.activityMatchesPhase(activity, session.currentPhase)) return false

      // Check if activity is unlocked
      if (!this.isActivityUnlocked(activity, session)) return false

      // Check if activity matches user preferences
      return this.matchesUserPreferences(activity, session.userPreferences)
    })
  }

  private activityMatchesPhase(activity: TrainingActivity, phase: TrainingPhase): boolean {
    const phaseMappings: Record<TrainingPhase, ActivityType[]> = {
      discovery: ['storytelling_circle', 'relationship_roleplay'],
      exploration: ['creativity_workshop', 'dream_interpreter', 'wisdom_sharing'],
      deepening: ['shadow_exploration', 'intuition_training', 'authentic_expression'],
      mastery: ['future_visioning', 'legacy_building', 'pattern_recognition'],
      transcendence: ['joy_manifestation', 'forgiveness_work', 'boundary_setting'],
    }

    return phaseMappings[phase]?.includes(activity.type) || false
  }

  private isActivityUnlocked(activity: TrainingActivity, session: TrainingSession): boolean {
    if (!activity.unlocksNext) return true

    // Check if required activities are completed
    return activity.unlocksNext.every(
      requiredActivityId => session.progress.completedActivities > 0 // Simplified - would check actual completion
    )
  }

  private matchesUserPreferences(
    activity: TrainingActivity,
    preferences: TrainingPreferences
  ): boolean {
    // Check input type preference
    if (!preferences.preferredInputTypes.includes(activity.inputType)) {
      return false
    }

    // Check difficulty level
    if (activity.difficulty !== preferences.challengeLevel) {
      // Allow one level difference for flexibility
      const levels: ChallengeLevel[] = [
        'beginner_friendly',
        'moderate_challenge',
        'advanced_deep',
        'expert_mastery',
      ]
      const activityIndex = levels.indexOf(activity.difficulty)
      const preferredIndex = levels.indexOf(preferences.challengeLevel)
      if (Math.abs(activityIndex - preferredIndex) > 1) return false
    }

    return true
  }

  private scoreActivityForUser(activity: TrainingActivity, session: TrainingSession): number {
    let score = 0

    // Base score from user engagement history
    const preferenceScore = session.engagementMetrics.activityPreferences[activity.id] || 0
    score += preferenceScore * 0.3

    // Score based on session type
    score += this.getSessionTypeMatchScore(activity, session.sessionType) * 0.2

    // Score based on current progress
    score += this.getProgressMatchScore(activity, session.progress) * 0.2

    // Score based on time available
    score +=
      this.getTimeMatchScore(activity, session.userPreferences.sessionLengthPreference) * 0.15

    // Score based on engagement style match
    score +=
      this.getEngagementStyleMatchScore(activity, session.userPreferences.engagementStyle) * 0.15

    return score
  }

  private getSessionTypeMatchScore(
    activity: TrainingActivity,
    sessionType: TrainingSessionType
  ): number {
    const typeMappings: Partial<Record<TrainingSessionType, ActivityType[]>> = {
      initial_onboarding: ['storytelling_circle', 'relationship_roleplay'],
      creative_exploration: ['creativity_workshop', 'dream_interpreter'],
      relationship_building: ['relationship_roleplay', 'wisdom_sharing'],
      personality_deepening: ['shadow_exploration', 'authentic_expression'],
      consciousness_expansion: ['future_visioning', 'intuition_training'],
    }

    return typeMappings[sessionType]?.includes(activity.type) ? 1 : 0.5
  }

  private getProgressMatchScore(activity: TrainingActivity, progress: SessionProgress): number {
    // Prefer activities that build on current progress
    const progressRatio = progress.completedActivities / progress.totalActivities
    const activityDifficulty = [
      'beginner_friendly',
      'moderate_challenge',
      'advanced_deep',
      'expert_mastery',
    ].indexOf(activity.difficulty)

    // Match difficulty to progress level
    const idealDifficulty = Math.floor(progressRatio * 4)
    const difficultyMatch = 1 - Math.abs(activityDifficulty - idealDifficulty) / 4

    return difficultyMatch
  }

  private getTimeMatchScore(activity: TrainingActivity, availableTime: number): number {
    const timeRatio = activity.estimatedDuration / availableTime

    if (timeRatio <= 1) return 1 // Perfect fit
    if (timeRatio <= 1.5) return 0.8 // Slightly over but acceptable
    if (timeRatio <= 2) return 0.5 // Significantly over
    return 0.2 // Way over time limit
  }

  private getEngagementStyleMatchScore(
    activity: TrainingActivity,
    preferredStyle: EngagementStyle
  ): number {
    // Simplified matching - in real implementation would have detailed mappings
    if (activity.engagementStyle === preferredStyle) return 1
    return 0.7 // Partial match for different but compatible styles
  }

  private getSessionActivityCount(sessionType: TrainingSessionType): number {
    const counts: Record<TrainingSessionType, number> = {
      initial_onboarding: 3,
      daily_training: 1,
      creative_exploration: 2,
      relationship_building: 2,
      personality_deepening: 3,
      consciousness_expansion: 4,
    }
    return counts[sessionType] || 3
  }
}

// ============================================================================
// DATA COLLECTION INTERFACES
// ============================================================================

export interface TextSample {
  id: string
  content: string
  type: InputType
  wordCount: number
  sentiment?: number // -1 to 1
  topics?: string[]
  creativityScore?: number
  emotionalDepth?: number
  collectedAt: string
  context?: string
}

export interface ConversationEntry {
  id: string
  userMessage: string
  aiResponse: string
  timestamp: string
  userFeedback?: FeedbackData
  xpGained: number
  interactionQuality: 'poor' | 'average' | 'good' | 'excellent'
  trainingImpact: TrainingImpact
}

export interface FeedbackData {
  rating: number // 1-5 stars
  explicit: boolean // True if user explicitly rated
  feedbackType: 'positive' | 'negative' | 'neutral' | 'exceptional'
  correction?: string // User-provided correction
  timestamp: string
}

export interface TrainingImpact {
  consciousnessGrowth: number // 0-1 scale
  skillImprovement: number // 0-1 scale
  patternRecognition: number // 0-1 scale
  emotionalIntelligence: number // 0-1 scale
  creativityEnhancement: number // 0-1 scale
}

export interface CreativeSubmission {
  id: string
  type: 'poetry' | 'story' | 'art_description' | 'music' | 'other'
  title?: string
  content: string
  medium?: string // watercolor, digital, etc.
  inspiration?: string
  emotionalImpact?: string
  quality: number // 1-10
  submittedAt: string
}

export interface PreferenceResponse {
  questionId: string
  response: string | number | string[]
  confidence: number // 1-5
  reasoning?: string
  respondedAt: string
}

export interface FeedbackEntry {
  activityId: string
  rating: number // 1-5
  feedback: string
  improvement: string
  submittedAt: string
}

export interface PersonalityInsight {
  dimension: string
  insight: string
  confidence: number
  source: 'text_analysis' | 'behavioral_pattern' | 'creative_expression' | 'direct_feedback'
  generatedAt: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function calculateActivityQuality(
  submission: string,
  criteria: CompletionCriteria,
  metrics: QualityMetric[]
): Promise<number> {
  let totalScore = 0
  let totalWeight = 0

  // Basic criteria checks
  if (criteria.minimumWords && submission.split(' ').length < criteria.minimumWords) {
    return 0.3 // Below minimum gets low score
  }

  // Quality metrics evaluation (now async with AI analysis)
  for (const metric of metrics) {
    const metricScore = await evaluateMetric(submission, metric)
    totalScore += metricScore * metric.weight
    totalWeight += metric.weight
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0.5
}

async function evaluateMetric(submission: string, metric: QualityMetric): Promise<number> {
  // Use AI analysis for quality evaluation
  try {
    // Use OpenAI for quality assessment
    // Dynamic import removed as it was unused and causing errors
    // const { Configuration, OpenAIApi } = await import('openai')

    const systemPrompt = `You are an expert evaluator of human responses. Evaluate the following submission for "${metric.name}".
    
Metric Description: ${metric.description}
Minimum Requirements: ${metric.criteria?.join(', ') || 'High quality'}

Return ONLY a number between 0 and 1, where:
- 0.9-1.0 = Exceptional quality
- 0.7-0.8 = Good quality
- 0.5-0.6 = Acceptable quality
- 0.3-0.4 = Needs improvement
- 0.0-0.2 = Poor quality

Return only the number, no explanation.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-nano', // Fast model for quality assessment
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: submission },
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const scoreText = data.choices[0]?.message?.content?.trim()
    const score = parseFloat(scoreText || '0.7')

    return isNaN(score) ? 0.7 : Math.max(0, Math.min(1, score))
  } catch (error) {
    console.error('[QualityEvaluation] AI analysis failed:', error)

    // Fallback to enhanced keyword analysis
    const lowerSubmission = submission.toLowerCase()

    switch (metric.name) {
      case 'authenticity': {
        const authenticityMarkers = [
          'i feel',
          'my experience',
          'personally',
          'i believe',
          'in my view',
        ]
        const authenticityScore =
          authenticityMarkers.filter(m => lowerSubmission.includes(m)).length / 3
        return Math.min(authenticityScore, 1) || 0.5
      }

      case 'creativity': {
        const creativityMarkers = ['imagine', 'dream', 'create', 'innovative', 'unique', 'original']
        const creativityScore =
          creativityMarkers.filter(m => lowerSubmission.includes(m)).length / 3
        return Math.min(creativityScore, 1) || 0.6
      }

      case 'emotional_depth': {
        const emotionWords = [
          'feel',
          'emotion',
          'heart',
          'sad',
          'happy',
          'angry',
          'love',
          'joy',
          'fear',
        ]
        const emotionCount = emotionWords.filter(word => lowerSubmission.includes(word)).length
        return Math.min(emotionCount / 4, 1) || 0.5
      }

      default: {
        // Default heuristic based on length and complexity
        const wordCount = submission.split(/\s+/).length
        return Math.min(wordCount / 100, 1) || 0.7
      }
    }
  }
}

export function generateActivityPrompt(
  activity: TrainingActivity,
  userContext: any
): ActivityPrompt {
  // Personalize the prompt based on user context
  const personalizedPrompt = { ...activity.prompt }

  // Add contextual elements
  if (userContext.recentMood) {
    personalizedPrompt.creativePrompts = [
      `Considering your ${userContext.recentMood} mood: ${personalizedPrompt.creativePrompts[0]}`,
      ...personalizedPrompt.creativePrompts.slice(1),
    ]
  }

  // Add astrological timing if available
  if (userContext.astrologicalTiming) {
    personalizedPrompt.emotionalSupport.push(
      `This activity is particularly potent during ${userContext.astrologicalTiming}`
    )
  }

  return personalizedPrompt
}

export function estimateActivityDuration(activity: TrainingActivity, userHistory: any): number {
  // Adjust duration based on user history
  let estimatedDuration = activity.estimatedDuration

  if (userHistory.averageCompletionTime) {
    // Adjust based on historical completion times
    estimatedDuration = (estimatedDuration + userHistory.averageCompletionTime) / 2
  }

  // Cap at reasonable limits
  return Math.max(5, Math.min(60, estimatedDuration))
}
