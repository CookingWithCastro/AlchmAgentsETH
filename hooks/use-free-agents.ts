'use client'

/**
 * useFreeAgents — shared client cache of this week's FREE rotation agent ids
 * (featured guides + active-aspect degree sprites). One fetch of
 * /api/agents/weekly-feature is shared across every card via a module cache.
 */

import { useEffect, useState } from 'react'

let _cache: Set<string> | null = null
let _promise: Promise<Set<string>> | null = null

async function loadFreeSet(): Promise<Set<string>> {
  if (_cache) return _cache
  if (!_promise) {
    _promise = fetch('/api/agents/weekly-feature')
      .then(r => r.json())
      .then(d => {
        const set = new Set<string>(((d?.freeAgentIds as string[]) ?? []).map(s => s.toLowerCase()))
        _cache = set
        return set
      })
      .catch(() => new Set<string>())
  }
  return _promise
}

export function useFreeAgents(): { isFree: (agentId?: string | null) => boolean; loaded: boolean } {
  const [set, setSet] = useState<Set<string>>(_cache ?? new Set<string>())
  const [loaded, setLoaded] = useState<boolean>(Boolean(_cache))

  useEffect(() => {
    let active = true
    loadFreeSet().then(s => {
      if (active) {
        setSet(s)
        setLoaded(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return {
    isFree: (agentId?: string | null) => Boolean(agentId && set.has(agentId.toLowerCase())),
    loaded,
  }
}
