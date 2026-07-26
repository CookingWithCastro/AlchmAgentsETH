/**
 * Knowledge Updater API Endpoint
 *
 * Gated by USE_RAG_GENERATION feature flag.
 * Orchestrates web content ingestion and PDF processing using LangChain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiErrorHandling, withErrorHandling } from '@/lib/error-handling'
import { logger } from '@/lib/structured-logger'

export const runtime = 'nodejs'

/**
 * Knowledge Update Request Interface
 */
interface KnowledgeUpdateRequest {
  type?: 'web' | 'pdf'
  agentId: string
  sources?: string[] // For web (URLs)
  path?: string // For PDF (file path)
  options?: any
}

/**
 * Checks if RAG features are enabled via feature flag
 */
function checkRagEnabled() {
  if (process.env.USE_RAG_GENERATION !== 'true') {
    return NextResponse.json(
      {
        success: false,
        status: 'disabled',
        error: 'RAG features disabled',
        message: 'Knowledge updater requires RAG. Set USE_RAG_GENERATION=true in your environment.',
      },
      { status: 503 }
    )
  }
  return null
}

/**
 * POST /api/knowledge-updater
 * Triggers knowledge ingestion from web URLs or local PDF files
 */
export async function POST(req: NextRequest) {
  const ragDisabled = checkRagEnabled()
  if (ragDisabled) return ragDisabled

  return withApiErrorHandling(
    async () => {
      const body: KnowledgeUpdateRequest = await req
        .json()
        .catch(() => ({}) as KnowledgeUpdateRequest)

      if (!body.agentId) {
        return NextResponse.json({ success: false, error: 'agentId is required' }, { status: 400 })
      }

      const { updateAgentKnowledge } = await import('@/lib/langchain/knowledge-updater')
      const { ingestAstrologicalPDF } = await import('@/lib/langchain/pdf-loader')

      logger.info('Knowledge update request received', {
        system: 'api',
        operation: 'knowledge_update',
        agentId: body.agentId,
        metadata: { type: body.type || 'web' },
      })

      if (body.type === 'pdf') {
        if (!body.path) {
          return NextResponse.json(
            { success: false, error: 'File path is required for PDF ingestion' },
            { status: 400 }
          )
        }
        const result = await ingestAstrologicalPDF(body.path, body.agentId, body.options)
        return result
      } else {
        if (!body.sources || body.sources.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Sources (URLs) are required for web ingestion' },
            { status: 400 }
          )
        }

        // SSRF Defense (OWASP API7:2023): Validate all target URLs
        const { validateUrlForSSRF } = await import('@/lib/utils/url-validator')
        for (const url of body.sources) {
          const validation = validateUrlForSSRF(url)
          if (!validation.valid) {
            return NextResponse.json(
              {
                success: false,
                error: `Invalid or restricted target URL '${url}': ${validation.reason}`,
              },
              { status: 400 }
            )
          }
        }

        const result = await updateAgentKnowledge(body.agentId, body.sources, body.options)
        return result
      }
    },
    {
      system: 'langchain',
      operation: 'api_update_knowledge',
      severity: 'medium',
    }
  )
}

/**
 * GET /api/knowledge-updater
 * Retrieves recent knowledge updates for a specific agent
 */
export async function GET(req: NextRequest) {
  const ragDisabled = checkRagEnabled()
  if (ragDisabled) return ragDisabled

  return withApiErrorHandling(
    async () => {
      const { searchParams } = new URL(req.url)
      const agentId = searchParams.get('agentId')

      if (!agentId) {
        return NextResponse.json({ success: false, error: 'agentId is required' }, { status: 400 })
      }

      const limit = parseInt(searchParams.get('limit') || '10', 10)
      const { getRecentKnowledgeUpdates } = await import('@/lib/langchain/knowledge-updater')

      logger.info('Knowledge update history requested', {
        system: 'api',
        operation: 'get_knowledge_updates',
        agentId,
        metadata: { limit },
      })

      const updates = await getRecentKnowledgeUpdates(agentId, limit)
      return {
        success: true,
        agentId,
        updates,
      }
    },
    {
      system: 'langchain',
      operation: 'api_get_updates',
      severity: 'low',
    }
  )
}
