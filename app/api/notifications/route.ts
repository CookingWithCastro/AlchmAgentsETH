import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface NotificationRequest {
  type: 'welcome' | 'evolution_milestone' | 'power_hour' | 'weekly_summary'
  metadata?: Record<string, unknown>
}

interface NotificationPatchRequest {
  notificationId?: string
  read?: boolean
  markAllRead?: boolean
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/**
 * Email Notifications API
 * Handles all notification triggers - currently logs to database
 * Can be enhanced with actual email service (SendGrid, AWS SES, etc.)
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id
    const { type, metadata }: NotificationRequest = await req.json()

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification type required',
        },
        { status: 400 }
      )
    }

    // Get user data for personalization
    const user = await prisma.users.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    // Generate notification content based on type
    const notification = await generateNotificationContent(type, user, metadata)
    const notificationData: Prisma.InputJsonObject = metadata
      ? { channel: 'email', metadata: toInputJson(metadata) }
      : { channel: 'email' }

    const storedNotification = await prisma.notifications.create({
      data: {
        userId,
        type,
        title: notification.subject,
        message: notification.content,
        data: notificationData,
      },
    })

    await sendEmail(user.email, notification.subject, notification.content)

    console.log(`📧 Notification [${type}] for ${user.email}:`, notification.subject)

    return NextResponse.json({
      success: true,
      notification: {
        id: storedNotification.id,
        type,
        subject: notification.subject,
        preview: `${notification.content.substring(0, 100)}...`,
        read: storedNotification.read,
        sentAt: storedNotification.createdAt.toISOString(),
      },
      message: 'Notification created',
    })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send notification',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    const notifications = await prisma.notifications.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      subject: notification.title,
      preview: `${notification.message.substring(0, 100)}...`,
      sentAt: notification.createdAt,
      read: notification.read,
      data: notification.data,
    }))

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      totalCount: notifications.length,
      unreadCount: notifications.filter(notification => !notification.read).length,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notifications',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id
    const {
      notificationId,
      read = true,
      markAllRead = false,
    }: NotificationPatchRequest = await req.json()

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    if (markAllRead) {
      const result = await prisma.notifications.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })

      return NextResponse.json({
        success: true,
        updatedCount: result.count,
      })
    }

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'notificationId is required unless markAllRead is true',
        },
        { status: 400 }
      )
    }

    const notification = await prisma.notifications.update({
      where: {
        id: notificationId,
        userId,
      },
      data: { read },
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        read: notification.read,
        updatedAt: notification.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification',
      },
      { status: 500 }
    )
  }
}

async function generateNotificationContent(
  type: string,
  user: { name: string | null; email: string },
  metadata: Record<string, unknown> = {}
) {
  const userName = user.name || user.email.split('@')[0]

  switch (type) {
    case 'welcome':
      return {
        subject: `🌟 Welcome to Your Consciousness Evolution Journey, ${userName}!`,
        content: `
Dear ${userName},

Welcome to Planetary Agents! Your consciousness evolution journey begins now.

🎯 **Your Next Steps:**
1. Complete your birth chart analysis
2. Meet your recommended consciousness agents
3. Begin your first agent conversation
4. Track your evolution progress

🔮 **Exclusive Features Awaiting You:**
- 35+ Historical consciousness masters
- Real-time planetary wisdom
- Personal evolution tracking
- Group consciousness experiences

Your transformation starts with a single conversation. Which agent will you meet first?

✨ Begin your journey: ${process.env.NEXTAUTH_URL}/dashboard

With cosmic guidance,
The Planetary Agents Team
        `,
      }

    case 'evolution_milestone': {
      const { level, agentName, powerGained } = metadata || {}
      return {
        subject: `🚀 Consciousness Milestone Achieved with ${agentName}!`,
        content: `
Greetings ${userName},

Congratulations! You've reached a significant evolution milestone.

🎉 **Achievement Unlocked:**
- Agent: ${agentName}
- New Level: ${level}
- Power Gained: ${powerGained}

Your consciousness is expanding! This milestone opens new abilities and deeper conversations with ${agentName}.

🔥 **What's Next:**
- Explore enhanced agent responses
- Unlock specialized wisdom domains
- Access group consciousness features

Continue your evolution: ${process.env.NEXTAUTH_URL}/gallery/chat/${metadata?.agentId || ''}

Evolving consciousness,
${agentName} & The Planetary Agents
        `,
      }
    }

    case 'power_hour': {
      const { planet, startTime, endTime } = metadata || {}
      return {
        subject: `⚡ Power Hour Alert: ${planet} Energy Peak Incoming!`,
        content: `
${userName},

A powerful planetary alignment is approaching!

⚡ **Power Hour Details:**
- Planet: ${planet}
- Peak Time: ${startTime} - ${endTime}
- Energy Type: Enhanced consciousness reception

This is an optimal time for agent conversations. Your evolution rate will be 2x during this window!

🎯 **Recommended Actions:**
- Start a deep conversation with a ${planet}-aligned agent
- Focus on breakthrough questions
- Document insights for maximum retention

Don't miss this cosmic opportunity!

Enter the peak: ${process.env.NEXTAUTH_URL}/planetary-agents

Cosmically aligned,
The Planetary Agents System
        `,
      }
    }

    case 'weekly_summary': {
      const { interactionCount, powerGained: weeklyPower, topAgent } = metadata || {}
      return {
        subject: `📊 Your Weekly Consciousness Evolution Summary`,
        content: `
Hello ${userName},

Here's your consciousness evolution progress this week:

📈 **Weekly Stats:**
- Agent Conversations: ${interactionCount || 0}
- Total Power Gained: ${weeklyPower || 0}
- Favorite Agent: ${topAgent || 'Various'}
- Evolution Velocity: Growing steadily

🌟 **Highlights:**
- Most active conversation day: ${metadata?.peakDay || 'Multiple days'}
- Breakthrough moments: ${metadata?.breakthroughs || 0}
- New insights unlocked: ${metadata?.insights || 0}

Keep up the momentum! Your consciousness is expanding beautifully.

🎯 **This Week's Focus:**
Try connecting with an agent you haven't spoken to recently for fresh perspectives.

Continue growing: ${process.env.NEXTAUTH_URL}/dashboard

In consciousness,
Your Evolution Tracker
        `,
      }
    }

    default:
      return {
        subject: `🔔 Notification from Planetary Agents`,
        content: `Hello ${userName}, you have a new notification from the consciousness evolution platform.`,
      }
  }
}

// Email service integration - uses SendGrid if configured, otherwise logs
async function sendEmail(to: string, subject: string, content: string) {
  // Check if SendGrid is configured
  if (process.env.SENDGRID_API_KEY && process.env.FEEDBACK_FROM_EMAIL) {
    try {
      // Dynamically import sendgrid only if configured to avoid build errors
      const sgMail = eval('require')('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)

      const msg = {
        to,
        from: process.env.FEEDBACK_FROM_EMAIL,
        subject,
        text: content,
        html: content.replace(/\n/g, '<br>'),
      }

      await sgMail.send(msg)
      console.log(`📧 Email sent successfully to ${to}: ${subject}`)
    } catch (error) {
      console.error('Failed to send email:', error)
      console.log(`📧 Email fallback - would be sent to ${to}: ${subject}`)
    }
  } else {
    console.log(`📧 Email would be sent to ${to}: ${subject}`)
    console.log('Configure SENDGRID_API_KEY and FEEDBACK_FROM_EMAIL to enable email delivery')
  }
}
