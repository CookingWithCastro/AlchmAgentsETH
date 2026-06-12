/**
 * Multi-format Knowledge Ingestion
 *
 * POST /api/knowledge-updater/ingest  (multipart/form-data)
 *   fields: agentId (string), files (one or more File)
 *
 * Accepts PDF, TXT, MD, JSON and DOCX uploads, extracts text per format, then
 * chunks + embeds into the agent's ChromaDB collection via ingestAgentText.
 * Gated by USE_RAG_GENERATION, like the sibling /api/knowledge-updater route.
 */
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/structured-logger'
import { CORS_HEADERS, corsPreflight } from '@/lib/cors'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

// Ingested chunks are injected into every future chat with the target agent
// (<reference_material> in the persona pipeline), so unauthenticated uploads
// are a stored-prompt-injection vector — cap the rate per IP until ingestion
// is bound to an owner identity.
const INGEST_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 }

export function OPTIONS() {
  return corsPreflight()
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per file
const SUPPORTED = ['pdf', 'txt', 'md', 'json', 'docx'] as const
type SupportedExt = (typeof SUPPORTED)[number]

function checkRagEnabled() {
  if (process.env.USE_RAG_GENERATION !== 'true') {
    return NextResponse.json(
      {
        success: false,
        status: 'disabled',
        error: 'RAG features disabled',
        message:
          'Knowledge ingestion requires RAG. Set USE_RAG_GENERATION=true in your environment.',
      },
      { status: 503, headers: CORS_HEADERS }
    )
  }
  return null
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** Extract plain text from an uploaded file based on its extension. */
async function extractText(file: File, ext: SupportedExt): Promise<string> {
  if (ext === 'txt' || ext === 'md' || ext === 'json') {
    return await file.text()
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default ?? (await import('mammoth'))
    const { value } = await (mammoth as any).extractRawText({ buffer })
    return value || ''
  }

  if (ext === 'pdf') {
    // Parse from a Blob (no temp file). Requires the pdf-parse peer dep used by
    // the existing PDF loader; surfaces a clear error if unavailable.
    const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf')
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const docs = await new PDFLoader(blob).load()
    return docs.map(d => d.pageContent).join('\n\n')
  }

  return ''
}

export async function POST(req: NextRequest) {
  const ragDisabled = checkRagEnabled()
  if (ragDisabled) return ragDisabled

  const ip = getClientIp(req.headers)
  const limited = rateLimit(`knowledge-ingest:${ip}`, INGEST_RATE_LIMIT)
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many ingestion requests — slow down' },
      {
        status: 429,
        headers: { ...CORS_HEADERS, 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) },
      }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data with agentId and files.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const agentId = String(form.get('agentId') || '').trim()
  if (!agentId) {
    return NextResponse.json(
      { success: false, error: 'agentId is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'At least one file is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { ingestAgentText } = await import('@/lib/langchain/knowledge-updater')

  const results: Array<{
    fileName: string
    success: boolean
    chunks?: number
    documentsAdded?: number
    error?: string
  }> = []

  for (const file of files) {
    const ext = extOf(file.name) as SupportedExt
    if (!SUPPORTED.includes(ext)) {
      results.push({
        fileName: file.name,
        success: false,
        error: `Unsupported type .${ext || '?'}`,
      })
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      results.push({ fileName: file.name, success: false, error: 'File exceeds 10 MB limit' })
      continue
    }

    try {
      const text = await extractText(file, ext)
      const result = await ingestAgentText(agentId, text, {
        fileName: file.name,
        contentType: `upload_${ext}`,
      })
      results.push({
        fileName: file.name,
        success: result.success,
        chunks: result.chunks,
        documentsAdded: result.documentsAdded,
        error: result.errors.length ? result.errors.join('; ') : undefined,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error(`Ingestion failed for ${file.name}`, error, {
        system: 'langchain',
        operation: 'ingest_upload',
        agentId,
      })
      results.push({ fileName: file.name, success: false, error: msg })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0)

  return NextResponse.json(
    {
      success: succeeded > 0,
      agentId,
      filesProcessed: files.length,
      filesSucceeded: succeeded,
      totalChunks,
      results,
      timestamp: new Date().toISOString(),
    },
    { headers: CORS_HEADERS }
  )
}
