'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

export function DesktopLinkBridge() {
  const [linking, setLinking] = useState(true)
  const [message, setMessage] = useState('Verifying your account and returning to Alchm Desktop...')
  const [deepLink, setDeepLink] = useState<string | null>(null)

  const linkDesktop = useCallback(async () => {
    setLinking(true)
    setMessage('Verifying your account and returning to Alchm Desktop...')

    try {
      const response = await fetch('/api/desktop/session/link', { method: 'POST' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || typeof data.deepLink !== 'string') {
        throw new Error(data.error || `Desktop link failed (${response.status})`)
      }

      setDeepLink(data.deepLink)
      setMessage('Account linked. Opening Alchm Desktop...')
      window.history.replaceState({}, '', '/profile')
      window.location.href = data.deepLink
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not link Alchm Desktop.')
    } finally {
      setLinking(false)
    }
  }, [])

  useEffect(() => {
    void linkDesktop()
  }, [linkDesktop])

  return (
    <aside className="fixed bottom-5 left-1/2 z-[100] w-[min(92vw,34rem)] -translate-x-1/2 rounded-xl border border-purple-400/30 bg-zinc-950/95 p-4 text-sm text-zinc-200 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3">
        {linking ? <Loader2 className="h-5 w-5 animate-spin text-purple-300" /> : null}
        <p className="flex-1">{message}</p>
        {!linking && deepLink ? (
          <button
            type="button"
            onClick={() => {
              window.location.href = deepLink
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 font-semibold text-white"
          >
            Open desktop
            <ExternalLink className="h-4 w-4" />
          </button>
        ) : null}
        {!linking && !deepLink ? (
          <button
            type="button"
            onClick={() => void linkDesktop()}
            className="rounded-lg bg-purple-600 px-3 py-2 font-semibold text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    </aside>
  )
}
