import type { FeedEvent, InsightEvent, LabEntryEvent } from '@/components/cosmic-agents/types'

/**
 * Normalizes a database `agent_action_events` row into the frontend FeedEvent
 * union shape.  Shared between the `/api/feed` route (GET/POST) and the
 * server-component bootstrap in `page.tsx` so the mapping logic is never
 * duplicated.
 */
export function normalizeDbActionToFeedEvent(row: any): FeedEvent {
  const metadata = (row.metadataPayload || {}) as Record<string, any>
  const agentId = row.agentId
  const rawAgentName = (metadata.agentName || row.agentEmail?.split('@')[0] || '').trim()
  const agentName = rawAgentName ? `${rawAgentName} ` : ''
  const timestamp = row.postedAt || row.createdAt || new Date()

  const baseEvent = {
    id: row.id || row.idempotencyKey,
    timestamp: typeof timestamp === 'string' ? timestamp : timestamp.toISOString(),
    imageUrl: metadata.imageUrl || metadata.image_URL || undefined,
    imagePrompt: metadata.imagePrompt || metadata.renderImage?.prompt || undefined,
  }

  if (row.eventType === 'insight') {
    return {
      ...baseEvent,
      type: 'insight',
      agentId,
      title: metadata.insightTitle || `${agentName}shared an insight`,
      body: metadata.insightContent || metadata.message || '',
      confidence: metadata.internalConfidence || row.score || 0.85,
      trigger: row.triggerSummary || undefined,
    } as InsightEvent
  }

  if (
    row.eventType === 'lab_entry' ||
    row.eventType === 'lab-entry' ||
    row.eventType === 'transmutation'
  ) {
    return {
      ...baseEvent,
      type: 'lab-entry',
      agentId,
      title: metadata.dishName || 'Transmuted Cosmic Elixir',
      body: metadata.description || metadata.message || '',
      aNumber: metadata.aNumber || 7.43,
      rating: metadata.rating || 5,
      elementalTags: metadata.elemental_tags || { Fire: 0.8 },
    } as LabEntryEvent
  }

  if (row.eventType === 'recipe_generation' || row.eventType === 'recipe') {
    return {
      ...baseEvent,
      type: 'lab-entry',
      agentId,
      title: metadata.recipeName || 'Cosmic Recipe Channeling',
      body:
        metadata.review || metadata.messageExcerpt || metadata.summary || metadata.message || '',
      aNumber: metadata.aNumber || 7.43,
      rating: metadata.rating || 5,
      elementalTags: metadata.elemental_tags || { Earth: 0.8 },
    } as LabEntryEvent
  }

  if (row.eventType === 'claim_daily' || row.eventType === 'claim-daily') {
    return {
      ...baseEvent,
      type: 'insight',
      agentId,
      title: `${agentName}claimed their daily alchemical yield`,
      body: metadata.message || 'Claimed automated cosmic yield.',
      confidence: 0.9,
    } as InsightEvent
  }

  if (row.eventType === 'made_it' || row.eventType === 'made-it') {
    return {
      ...baseEvent,
      type: 'insight',
      agentId,
      title: `Made: ${metadata.recipeName || 'Alchemical Recipe'}`,
      body: metadata.review || metadata.message || 'Successfully prepared the cosmic recipe!',
      confidence: 0.85,
    } as InsightEvent
  }

  // Agent Scrabble League — render as an insight card (no new public card type).
  if (row.eventType === 'word_duel') {
    return {
      ...baseEvent,
      type: 'insight',
      agentId,
      title:
        metadata.insightTitle ||
        `${agentName}faced ${metadata.opponentName || 'a rival'} in the Agent Scrabble League`,
      body: metadata.insightContent || metadata.message || metadata.summary || '',
      confidence: metadata.internalConfidence || row.score || 0.85,
      trigger: row.triggerSummary || undefined,
    } as InsightEvent
  }

  // Fallback to a generalized insight card
  return {
    ...baseEvent,
    type: 'insight',
    agentId,
    title: `${agentName}action: ${row.eventType}`,
    body: metadata.message || row.triggerSummary || '',
    confidence: row.score || 0.8,
  } as InsightEvent
}
