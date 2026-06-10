import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface UserSettings {
  notifications: {
    powerHours: boolean
    evolutionMilestones: boolean
    weeklyProgress: boolean
    agentRecommendations: boolean
    emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never'
  }
  interface: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
    dateFormat: string
    elementalDisplay: 'traditional' | 'modern' | 'both'
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'anonymous'
    shareEvolutionData: boolean
    allowDataExport: boolean
    analyticsOptOut: boolean
  }
  agents: {
    preferredInteractionStyle: 'formal' | 'casual' | 'mixed'
    maxDailyInteractions: number
    autoRecommendations: boolean
    saveConversationHistory: boolean
    allowGroupChats: boolean
  }
  consciousness: {
    trackEvolution: boolean
    showPowerLevels: boolean
    displayDetailedMetrics: boolean
    evolutionGoals: string[]
    preferredGrowthAreas: string[]
  }
}

const defaultSettings: UserSettings = {
  notifications: {
    powerHours: true,
    evolutionMilestones: true,
    weeklyProgress: true,
    agentRecommendations: true,
    emailFrequency: 'weekly',
  },
  interface: {
    theme: 'auto',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    elementalDisplay: 'both',
  },
  privacy: {
    profileVisibility: 'private',
    shareEvolutionData: false,
    allowDataExport: true,
    analyticsOptOut: false,
  },
  agents: {
    preferredInteractionStyle: 'mixed',
    maxDailyInteractions: 50,
    autoRecommendations: true,
    saveConversationHistory: true,
    allowGroupChats: true,
  },
  consciousness: {
    trackEvolution: true,
    showPowerLevels: true,
    displayDetailedMetrics: true,
    evolutionGoals: [],
    preferredGrowthAreas: [],
  },
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Get Monica user settings (our current settings table)
    const monicaSettings = await prisma.monica_user_settings.findUnique({
      where: { userId },
    })

    if (!monicaSettings) {
      // Create default settings
      const newSettings = await prisma.monica_user_settings.create({
        data: {
          userId,
          personality: defaultSettings.agents.preferredInteractionStyle,
          assistanceLevel: 2,
          proactiveTips: defaultSettings.agents.autoRecommendations,
          explanationDepth: defaultSettings.consciousness.displayDetailedMetrics
            ? 'detailed'
            : 'concise',
          position: 'bottom-right',
          autoHide: 'never',
          preferredTime: 'evening',
          learningStyle: 'hands-on',
          contextualAwareness: true,
          adaptivePersonality: true,
          memoryRetention: defaultSettings.agents.saveConversationHistory,
          interests: JSON.stringify({
            notifications: defaultSettings.notifications,
            privacy: defaultSettings.privacy,
            interface: defaultSettings.interface,
            evolutionGoals: defaultSettings.consciousness.evolutionGoals,
            preferredGrowthAreas: defaultSettings.consciousness.preferredGrowthAreas,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        settings: {
          ...defaultSettings,
          id: newSettings.id,
          lastUpdated: newSettings.updatedAt,
        },
      })
    }

    // Parse stored settings and merge with defaults
    const storedExtras = monicaSettings.interests
      ? JSON.parse(monicaSettings.interests as string)
      : {}

    const userSettings: UserSettings = {
      notifications: storedExtras.notifications || defaultSettings.notifications,
      interface: {
        ...defaultSettings.interface,
        ...(storedExtras.interface || {}),
      },
      privacy: storedExtras.privacy || defaultSettings.privacy,
      agents: {
        preferredInteractionStyle:
          (monicaSettings.personality as any) || defaultSettings.agents.preferredInteractionStyle,
        maxDailyInteractions: defaultSettings.agents.maxDailyInteractions,
        autoRecommendations:
          monicaSettings.proactiveTips || defaultSettings.agents.autoRecommendations,
        saveConversationHistory:
          monicaSettings.memoryRetention || defaultSettings.agents.saveConversationHistory,
        allowGroupChats: defaultSettings.agents.allowGroupChats,
      },
      consciousness: {
        trackEvolution: true, // Always enabled for now
        showPowerLevels: true,
        displayDetailedMetrics: monicaSettings.explanationDepth === 'detailed',
        evolutionGoals: storedExtras.evolutionGoals || defaultSettings.consciousness.evolutionGoals,
        preferredGrowthAreas:
          storedExtras.preferredGrowthAreas || defaultSettings.consciousness.preferredGrowthAreas,
      },
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...userSettings,
        id: monicaSettings.id,
        lastUpdated: monicaSettings.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user settings',
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    const { settings } = await req.json()

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings data required',
        },
        { status: 400 }
      )
    }

    // Update Monica settings table with mappable fields
    const updateData: any = {}

    if (settings.agents?.preferredInteractionStyle) {
      updateData.personality = settings.agents.preferredInteractionStyle
    }

    if (settings.agents?.autoRecommendations !== undefined) {
      updateData.proactiveTips = settings.agents.autoRecommendations
    }

    if (settings.agents?.saveConversationHistory !== undefined) {
      updateData.memoryRetention = settings.agents.saveConversationHistory
    }

    if (settings.consciousness?.displayDetailedMetrics !== undefined) {
      updateData.explanationDepth = settings.consciousness.displayDetailedMetrics
        ? 'detailed'
        : 'concise'
    }

    // Store complex settings as JSON
    const extraSettings = {
      notifications: settings.notifications,
      privacy: settings.privacy,
      evolutionGoals: settings.consciousness?.evolutionGoals,
      preferredGrowthAreas: settings.consciousness?.preferredGrowthAreas,
      interface: settings.interface,
    }

    updateData.interests = JSON.stringify(extraSettings)

    // Update the settings
    const updatedSettings = await prisma.monica_user_settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
        // Default values for required fields
        personality: settings.agents?.preferredInteractionStyle || 'mixed',
        assistanceLevel: 2,
        proactiveTips: settings.agents?.autoRecommendations !== false,
        explanationDepth: settings.consciousness?.displayDetailedMetrics ? 'detailed' : 'concise',
        position: 'bottom-right',
        autoHide: 'never',
        preferredTime: 'evening',
        learningStyle: 'hands-on',
        contextualAwareness: true,
        adaptivePersonality: true,
        memoryRetention: settings.agents?.saveConversationHistory !== false,
      },
    })

    // Send notification preferences update
    if (settings.notifications) {
      try {
        await prisma.notifications.create({
          data: {
            userId,
            type: 'settings_updated',
            title: 'Notification settings updated',
            message: 'Your Planetary Agents notification preferences were updated.',
            data: {
              notificationPrefs: settings.notifications,
              updatedAt: new Date().toISOString(),
            } as any,
          },
        })
      } catch (notifError) {
        console.warn('Failed to log settings update notification:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: updatedSettings.id,
        lastUpdated: updatedSettings.updatedAt,
      },
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user settings',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Reset to default settings
    await prisma.monica_user_settings.upsert({
      where: { userId },
      update: {
        personality: defaultSettings.agents.preferredInteractionStyle,
        proactiveTips: defaultSettings.agents.autoRecommendations,
        memoryRetention: defaultSettings.agents.saveConversationHistory,
        explanationDepth: defaultSettings.consciousness.displayDetailedMetrics
          ? 'detailed'
          : 'concise',
        interests: JSON.stringify({
          notifications: defaultSettings.notifications,
          privacy: defaultSettings.privacy,
          interface: defaultSettings.interface,
          evolutionGoals: defaultSettings.consciousness.evolutionGoals,
          preferredGrowthAreas: defaultSettings.consciousness.preferredGrowthAreas,
        }),
      },
      create: {
        userId,
        personality: defaultSettings.agents.preferredInteractionStyle,
        assistanceLevel: 2,
        proactiveTips: defaultSettings.agents.autoRecommendations,
        explanationDepth: 'detailed',
        position: 'bottom-right',
        autoHide: 'never',
        preferredTime: 'evening',
        learningStyle: 'hands-on',
        contextualAwareness: true,
        adaptivePersonality: true,
        memoryRetention: defaultSettings.agents.saveConversationHistory,
        interests: JSON.stringify({
          notifications: defaultSettings.notifications,
          privacy: defaultSettings.privacy,
          interface: defaultSettings.interface,
          evolutionGoals: defaultSettings.consciousness.evolutionGoals,
          preferredGrowthAreas: defaultSettings.consciousness.preferredGrowthAreas,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults',
    })
  } catch (error) {
    console.error('Reset user settings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset user settings',
      },
      { status: 500 }
    )
  }
}
