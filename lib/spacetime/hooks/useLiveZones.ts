'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSpacetime } from '@/lib/spacetime/SpacetimeContext'
import { tables } from '@/lib/spacetime/generated'
import type { Zone } from '@/lib/spacetime/generated/types'
import type { PlanetName } from '@/lib/staking/types'

export interface LiveZone {
  zoneId: number
  kind: 'House' | 'Spire' | 'Crown'
  owner: PlanetName | null
  control: number
}

interface UseLiveZonesOptions {
  enabled?: boolean
}

/** Subscribe to the 11 pentacle `zone` rows (owner planet + control score). */
export function useLiveZones({ enabled = true }: UseLiveZonesOptions = {}) {
  const { connection, status } = useSpacetime()
  const [rows, setRows] = useState<Zone[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!enabled || !connection) {
      setRows([])
      setIsReady(!enabled)
      return
    }

    const table = connection.db.zone
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
      .subscribe(tables.zone)

    return () => {
      disposed = true
      table.removeOnInsert(onChange)
      table.removeOnUpdate(onChange)
      table.removeOnDelete(onChange)
      if (!subscription.isEnded()) subscription.unsubscribe()
    }
  }, [connection, enabled])

  const zones = useMemo<LiveZone[]>(
    () =>
      rows
        .map(r => ({
          zoneId: r.zoneId,
          kind: r.kind.tag,
          owner: r.owner?.tag ?? null,
          control: r.control,
        }))
        .sort((a, b) => a.zoneId - b.zoneId),
    [rows]
  )

  return {
    zones,
    isLive: rows.length > 0,
    loading: enabled && status !== 'disabled' && !isReady,
    status,
  }
}

export default useLiveZones
