'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSpacetime } from '@/lib/spacetime/SpacetimeContext'
import { tables } from '@/lib/spacetime/generated'
import type { StarNode } from '@/lib/spacetime/generated/types'
import { toStakeableStar } from '@/lib/staking/elements'
import { mergeWithFallback } from '@/lib/staking/star-catalog'
import type { StakeableStar } from '@/lib/staking/types'

interface UseLiveStarsOptions {
  enabled?: boolean
}

/**
 * Subscribe to the live SpacetimeDB `star_node` table and return enriched
 * {StakeableStar}s (element + esmsId derived from each star's ecliptic longitude).
 * Falls back to the bright-star catalog when the feed is empty or disabled.
 */
export function useLiveStars({ enabled = true }: UseLiveStarsOptions = {}) {
  const { connection, status } = useSpacetime()
  const [rows, setRows] = useState<StarNode[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!enabled || !connection) {
      setRows([])
      setIsReady(!enabled)
      return
    }

    const table = connection.db.star_node
    let disposed = false
    const sync = () => {
      if (disposed) return
      setRows(Array.from(table.iter()))
      setIsReady(true)
    }
    const onChange = () => sync()

    setRows(Array.from(table.iter()))
    table.onInsert(onChange)
    table.onUpdate(onChange)
    table.onDelete(onChange)

    const subscription = connection
      .subscriptionBuilder()
      .onApplied(sync)
      .onError(() => {
        if (!disposed) setIsReady(true)
      })
      .subscribe(tables.star_node)

    return () => {
      disposed = true
      table.removeOnInsert(onChange)
      table.removeOnUpdate(onChange)
      table.removeOnDelete(onChange)
      if (!subscription.isEnded()) subscription.unsubscribe()
    }
  }, [connection, enabled])

  const stars = useMemo<StakeableStar[]>(() => {
    const live = rows.map(r =>
      toStakeableStar({
        hipId: r.hipId,
        name: r.name,
        ra: r.ra,
        dec: r.dec,
        magnitude: r.magnitude,
        heldBy: r.heldBy?.tag ?? null,
        regionHint: r.regionHint,
      })
    )
    return mergeWithFallback(live)
  }, [rows])

  return {
    stars,
    isLive: rows.length > 0,
    loading: enabled && status !== 'disabled' && !isReady,
    status,
  }
}

export default useLiveStars
