'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { StarActivation } from './zone-pools'
import type { Element, StakeableStar } from './types'

export interface ActivationToast {
  id: string
  hipId: number
  starName: string
  element: Element
  zoneId: number
  /** 0..1 powerLevel at the star's degree (drives the burst size in the UI). */
  dignity: number
}

/**
 * Surfaces "shooting star" toasts when a star newly crosses the user's ascendant. Diffs the
 * live `activations` set each render: a star that wasn't active last pass but is now fires a
 * toast that auto-expires after `ttlMs` (the ~16s activation window). Drives the toast UI.
 */
export function useAscendantActivations(
  activations: StarActivation[],
  stars: StakeableStar[],
  ttlMs = 16_000
) {
  const [toasts, setToasts] = useState<ActivationToast[]>([])
  const activeRef = useRef<Set<number>>(new Set())
  const seqRef = useRef(0)
  const starsRef = useRef(stars)
  starsRef.current = stars

  useEffect(() => {
    const current = new Set(activations.map(a => a.hipId))
    const fresh = activations.filter(a => !activeRef.current.has(a.hipId))
    activeRef.current = current
    if (fresh.length === 0) return
    const newToasts = fresh.map(a => {
      const star = starsRef.current.find(s => s.hipId === a.hipId)
      seqRef.current += 1
      return {
        id: `${a.hipId}-${seqRef.current}`,
        hipId: a.hipId,
        starName: star?.name ?? `HIP ${a.hipId}`,
        element: (star?.element ?? 'Fire') as Element,
        zoneId: a.zoneId,
        dignity: a.dignity,
      }
    })
    setToasts(prev => [...prev, ...newToasts])
  }, [activations])

  // Expire the oldest toast after its window.
  useEffect(() => {
    if (toasts.length === 0) return
    const id = setTimeout(() => setToasts(prev => prev.slice(1)), ttlMs)
    return () => clearTimeout(id)
  }, [toasts, ttlMs])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, dismiss }
}

export default useAscendantActivations
