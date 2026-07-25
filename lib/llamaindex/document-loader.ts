/**
 * Document Loader - Historical Agent Knowledge Extraction & Chunking
 *
 * Extracts agent data from lib/agents/historical/* and chunks into vector-ready documents.
 * Preserves semantic boundaries while maintaining optimal chunk sizes for embeddings.
 */

import { DEMO_AGENTS } from '@/lib/demo-agents-data'
import type { CraftedAgent } from '@/lib/agent-types'
import type { DocumentMetadata } from './vector-store'

// Chunking configuration
const DEFAULT_CHUNK_SIZE = 512 // tokens (~2048 characters)
const DEFAULT_OVERLAP = 50 // tokens (~200 characters)
const CHARS_PER_TOKEN = 4 // Approximate ratio

export interface AgentDocument {
  agentId: string
  agentName: string
  content: string
  metadata: DocumentMetadata
}

export interface DocumentChunk {
  id: string // Format: agentId-chunk-0001
  agentId: string
  agentName: string
  content: string
  metadata: DocumentMetadata
  chunkIndex: number
  totalChunks: number
}

export interface ChunkingOptions {
  chunkSize?: number // in tokens
  overlap?: number // in tokens
  preserveSentences?: boolean
}

/**
 * Load all historical agents as documents
 */
export async function loadHistoricalAgents(): Promise<AgentDocument[]> {
  console.log(`[DocumentLoader] Loading ${DEMO_AGENTS.length} historical agents`)

  const documents: AgentDocument[] = []

  for (const agent of DEMO_AGENTS) {
    try {
      const doc = convertAgentToDocument(agent)
      documents.push(doc)
    } catch (error) {
      console.error(`[DocumentLoader] Failed to load agent ${agent.id}:`, error)
    }
  }

  console.log(`[DocumentLoader] Successfully loaded ${documents.length} agent documents`)
  return documents
}

/**
 * Load specific agents by IDs
 */
export async function loadAgentsByIds(agentIds: string[]): Promise<AgentDocument[]> {
  const documents: AgentDocument[] = []

  for (const agentId of agentIds) {
    const agent = DEMO_AGENTS.find(a => a.id === agentId)

    if (agent) {
      try {
        const doc = convertAgentToDocument(agent)
        documents.push(doc)
      } catch (error) {
        console.error(`[DocumentLoader] Failed to load agent ${agentId}:`, error)
      }
    } else {
      console.warn(`[DocumentLoader] Agent not found: ${agentId}`)
    }
  }

  return documents
}

/**
 * Convert a CraftedAgent to an AgentDocument
 */
export function convertAgentToDocument(agent: CraftedAgent): AgentDocument {
  // Extract comprehensive text content from agent
  const content = extractAgentKnowledge(agent)
  const metadata = extractMetadata(agent)

  return {
    agentId: agent.id,
    agentName: agent.name,
    content,
    metadata,
  }
}

/**
 * Extract all meaningful text from agent for embedding
 * PRIORITIZE wisdom, philosophy, and conversational content
 * MINIMIZE structured metadata that shouldn't appear in responses
 */
function extractAgentKnowledge(agent: CraftedAgent): string {
  const sections: string[] = []

  // === PRIMARY CONTENT: Quotes and Core Beliefs (what the agent actually SAYS) ===

  // Quotes - the agent's actual voice
  if (agent.quotes && agent.quotes.length > 0) {
    sections.push('My philosophy and insights:')
    for (const quote of agent.quotes) {
      sections.push(`\n${quote}`)
    }
    sections.push('') // Empty line for separation
  }

  // Core beliefs - their worldview
  if (agent.coreBeliefs && agent.coreBeliefs.length > 0) {
    sections.push('\nMy core beliefs and principles:')
    for (const belief of agent.coreBeliefs) {
      sections.push(`\n${belief}`)
    }
    sections.push('') // Empty line for separation
  }

  // Unique Power - their primary wisdom (conversational, not metadata)
  if (agent.abilities?.uniquePower) {
    sections.push(`\n${agent.abilities.uniquePower}`)
    sections.push('') // Empty line for separation
  }

  // === SECONDARY CONTENT: Gifts and wisdom expressions ===

  // Gifts - expressed naturally
  if (agent.personality?.gifts && agent.personality.gifts.length > 0) {
    for (const gift of agent.personality.gifts) {
      sections.push(`\n${gift.expression}`)
    }
    sections.push('') // Empty line for separation
  }

  // Challenges - growth wisdom
  if (agent.personality?.challenges && agent.personality.challenges.length > 0) {
    for (const challenge of agent.personality.challenges) {
      if (challenge.growthOpportunity) {
        sections.push(`\n${challenge.growthOpportunity}`)
      }
    }
    sections.push('') // Empty line for separation
  }

  // Shadows - transformation wisdom
  if (agent.personality?.shadows && agent.personality.shadows.length > 0) {
    for (const shadow of agent.personality.shadows) {
      if (shadow.transformationPath) {
        sections.push(`\n${shadow.transformationPath}`)
      }
    }
    sections.push('') // Empty line for separation
  }

  // === TERTIARY CONTENT: Personality essence (conversational tone) ===

  // Core personality - natural description
  if (agent.personality?.core) {
    if (agent.personality.core.essence) {
      sections.push(`\nMy essence: ${agent.personality.core.essence}`)
    }
    if (agent.personality.core.expression) {
      sections.push(`My expression: ${agent.personality.core.expression}`)
    }
  }

  // === METADATA: Minimal, only for context (not for direct retrieval) ===
  // This goes last and is brief to avoid polluting search results

  const metadataLines: string[] = []

  if (agent.birthData) {
    const birthYear = new Date(agent.birthData.date).getFullYear()
    metadataLines.push(`[Historical context: ${agent.name}, ${birthYear}]`)
  }

  if (metadataLines.length > 0) {
    sections.push('\n' + metadataLines.join(' '))
  }

  return sections.join('\n').trim()
}

/**
 * Extract metadata from agent
 */
export function extractMetadata(agent: CraftedAgent): DocumentMetadata {
  // Determine era from birth date
  let era = 'Unknown'
  if (agent.birthData?.date) {
    const year = new Date(agent.birthData.date).getFullYear()
    if (year < 500) era = 'Ancient'
    else if (year < 1500) era = 'Medieval'
    else if (year < 1700) era = 'Renaissance'
    else if (year < 1800) era = 'Enlightenment'
    else if (year < 1900) era = 'Industrial'
    else if (year < 2000) era = 'Modern'
    else era = 'Contemporary'
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    era,
    chunkIndex: 0,
    totalChunks: 1,
    source: 'historical_agent',
    title: agent.title || '',
    specialty: agent.abilities?.specialty || '',
    wisdomDomains: agent.abilities?.wisdomDomains ? agent.abilities.wisdomDomains.join(', ') : '',
    teachingStyle: agent.abilities?.teachingStyle || '',
    consciousnessLevel: agent.consciousness?.level || 'Unknown',
    monicaConstant: agent.consciousness?.monicaConstant ?? null,
    dominantElement: agent.consciousness?.dominantElement || '',
    birthYear: agent.birthData?.date ? new Date(agent.birthData.date).getFullYear() : null,
  }
}

/**
 * Chunk a document into smaller pieces for embedding
 */
export function chunkDocument(doc: AgentDocument, options?: ChunkingOptions): DocumentChunk[] {
  const chunkSize = (options?.chunkSize || DEFAULT_CHUNK_SIZE) * CHARS_PER_TOKEN
  const overlap = (options?.overlap || DEFAULT_OVERLAP) * CHARS_PER_TOKEN
  const preserveSentences = options?.preserveSentences !== false

  const chunks: DocumentChunk[] = []
  const text = doc.content

  if (text.length <= chunkSize) {
    // Document fits in one chunk
    return [
      {
        id: `${doc.agentId}-chunk-0000`,
        agentId: doc.agentId,
        agentName: doc.agentName,
        content: text,
        metadata: { ...doc.metadata, chunkIndex: 0, totalChunks: 1 },
        chunkIndex: 0,
        totalChunks: 1,
      },
    ]
  }

  // Split into chunks with overlap
  let startIndex = 0
  let chunkIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize

    // Adjust end index to preserve sentence boundaries
    if (preserveSentences && endIndex < text.length) {
      // Look for sentence ending near the chunk boundary
      const searchStart = Math.max(startIndex, endIndex - 200)
      const searchText = text.substring(searchStart, endIndex + 200)

      const sentenceEndings = ['. ', '.\n', '? ', '?\n', '! ', '!\n']
      let bestSplit = -1

      for (const ending of sentenceEndings) {
        const lastIndex = searchText.lastIndexOf(ending, chunkSize)
        if (lastIndex > 0 && lastIndex > bestSplit) {
          bestSplit = lastIndex + ending.length
        }
      }

      if (bestSplit > 0) {
        endIndex = searchStart + bestSplit
      }
    }

    endIndex = Math.min(endIndex, text.length)
    const chunkContent = text.substring(startIndex, endIndex).trim()

    if (chunkContent.length > 0) {
      chunks.push({
        id: `${doc.agentId}-chunk-${String(chunkIndex).padStart(4, '0')}`,
        agentId: doc.agentId,
        agentName: doc.agentName,
        content: chunkContent,
        metadata: { ...doc.metadata, chunkIndex, totalChunks: 0 }, // totalChunks updated later
        chunkIndex,
        totalChunks: 0,
      })

      chunkIndex++
    }

    // Move start index forward with overlap
    startIndex = endIndex - overlap
    if (startIndex >= text.length - overlap) {
      break
    }
  }

  // Update totalChunks for all chunks
  const totalChunks = chunks.length
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks
    chunk.metadata.totalChunks = totalChunks
  })

  console.log(`[DocumentLoader] Chunked agent ${doc.agentId} into ${totalChunks} pieces`)

  return chunks
}

/**
 * Chunk multiple documents
 */
export function chunkDocuments(docs: AgentDocument[], options?: ChunkingOptions): DocumentChunk[] {
  const allChunks: DocumentChunk[] = []

  for (const doc of docs) {
    const chunks = chunkDocument(doc, options)
    allChunks.push(...chunks)
  }

  console.log(
    `[DocumentLoader] Created ${allChunks.length} total chunks from ${docs.length} documents`
  )

  return allChunks
}

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Get statistics about loaded documents
 */
export function getDocumentStats(docs: AgentDocument[]): {
  totalDocuments: number
  totalCharacters: number
  totalTokens: number
  averageLength: number
  eras: Record<string, number>
} {
  const stats = {
    totalDocuments: docs.length,
    totalCharacters: 0,
    totalTokens: 0,
    averageLength: 0,
    eras: {} as Record<string, number>,
  }

  for (const doc of docs) {
    stats.totalCharacters += doc.content.length
    stats.totalTokens += estimateTokens(doc.content)

    const era = doc.metadata.era || 'Unknown'
    stats.eras[era] = (stats.eras[era] || 0) + 1
  }

  stats.averageLength = stats.totalDocuments > 0 ? stats.totalCharacters / stats.totalDocuments : 0

  return stats
}
