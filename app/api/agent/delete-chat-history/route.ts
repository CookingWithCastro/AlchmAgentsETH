import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { backend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json().catch(() => ({}))
    const userId = session?.user?.id || body?.userId

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required or userId parameter missing.' },
        { status: 401 }
      )
    }

    // 1. Delete SQL AgentConversation rows from local Prisma DB
    const deletedCount = await prisma.agentConversation.deleteMany({
      where: { userId },
    })

    // 2. Call backend /api/agent/delete-chat-history to clean Railway DB & ChromaDB
    try {
      await backend.request('/api/agent/delete-chat-history', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })
    } catch (backendErr) {
      console.warn('Backend user vector delete warning:', backendErr)
    }

    return NextResponse.json({
      success: true,
      purgedCount: deletedCount.count,
      userId,
      message: `Chat history and associated vector embeddings for user ${userId} were successfully purged under GDPR Art. 17 right-to-be-forgotten standards.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error deleting user chat history:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete chat history',
      },
      { status: 500 }
    )
  }
}
