'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Identity } from 'spacetimedb'
import { useSpacetime } from '@/lib/spacetime/SpacetimeContext'
import { tables } from '@/lib/spacetime/generated'
import type { OracleReply, OracleRequest } from '@/lib/spacetime/generated/types'

export interface LiveOracleMessage {
  id: string
  requestId: bigint
  role: 'user' | 'assistant'
  text: string
  createdAt: Date
}

function belongsToIdentity(row: OracleRequest | OracleReply, identityHex: string) {
  return row.asker.toHexString() === identityHex
}

export function useLiveOracleChat() {
  const { connection, identityHex, status } = useSpacetime()
  const [requests, setRequests] = useState<OracleRequest[]>([])
  const [replies, setReplies] = useState<OracleReply[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connection || !identityHex) {
      setRequests([])
      setReplies([])
      setError(null)
      return
    }

    const identity = Identity.fromString(identityHex)
    const requestTable = connection.db.oracle_request
    const replyTable = connection.db.oracle_reply
    let disposed = false

    const syncRows = () => {
      if (disposed) return
      setRequests(
        (Array.from(requestTable.iter()) as OracleRequest[]).filter(row =>
          belongsToIdentity(row, identityHex)
        )
      )
      setReplies(
        (Array.from(replyTable.iter()) as OracleReply[]).filter(row =>
          belongsToIdentity(row, identityHex)
        )
      )
      setError(null)
    }
    const onChange = () => syncRows()

    requestTable.onInsert(onChange)
    requestTable.onUpdate(onChange)
    requestTable.onDelete(onChange)
    replyTable.onInsert(onChange)
    replyTable.onUpdate(onChange)
    replyTable.onDelete(onChange)

    const subscription = connection
      .subscriptionBuilder()
      .onApplied(syncRows)
      .onError(() => {
        if (!disposed) setError('Live oracle subscription failed')
      })
      .subscribe([
        tables.oracle_request.where(row => row.asker.eq(identity)),
        tables.oracle_reply.where(row => row.asker.eq(identity)),
      ])

    return () => {
      disposed = true
      requestTable.removeOnInsert(onChange)
      requestTable.removeOnUpdate(onChange)
      requestTable.removeOnDelete(onChange)
      replyTable.removeOnInsert(onChange)
      replyTable.removeOnUpdate(onChange)
      replyTable.removeOnDelete(onChange)
      if (!subscription.isEnded()) subscription.unsubscribe()
    }
  }, [connection, identityHex])

  const messages = useMemo<LiveOracleMessage[]>(() => {
    return [
      ...requests.map(request => ({
        id: `request-${request.requestId}`,
        requestId: request.requestId,
        role: 'user' as const,
        text: request.question,
        createdAt: request.createdAt.toDate(),
      })),
      ...replies.map(reply => ({
        id: `reply-${reply.requestId}`,
        requestId: reply.requestId,
        role: 'assistant' as const,
        text: reply.text,
        createdAt: reply.createdAt.toDate(),
      })),
    ].sort((left, right) => {
      const timeDifference = left.createdAt.getTime() - right.createdAt.getTime()
      if (timeDifference !== 0) return timeDifference
      if (left.requestId !== right.requestId) return left.requestId < right.requestId ? -1 : 1
      return left.role === 'user' ? -1 : 1
    })
  }, [replies, requests])

  const isThinking = useMemo(() => {
    const latestRequest = [...requests].sort((left, right) => {
      const timeDifference = right.createdAt.toDate().getTime() - left.createdAt.toDate().getTime()
      if (timeDifference !== 0) return timeDifference
      return left.requestId < right.requestId ? 1 : -1
    })[0]

    return latestRequest?.answered === false
  }, [requests])

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question) return
      if (!connection || status !== 'connected') {
        throw new Error('The live oracle is not connected yet')
      }

      await connection.reducers.askOracle({
        question,
        context: 'live-sky-summary',
        cacheable: true,
      })
    },
    [connection, status]
  )

  return {
    messages,
    sendMessage,
    isThinking,
    error,
    status,
  }
}

export default useLiveOracleChat
