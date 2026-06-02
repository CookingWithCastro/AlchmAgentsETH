'use client'

/**
 * Connect a shared cross-site identity (Privy DID) to the current (NextAuth)
 * account. Privy is NOT the login here — the user is already authenticated; this
 * attaches a portable Privy DID that's the SAME on alchm.kitchen (shared Privy
 * app), giving a stable cross-site join key.
 *
 * PrivyProvider is scoped to this component (rendered only on /account) so the
 * heavy web3 SDK isn't bundled into every route.
 */

import { useCallback, useEffect, useState } from 'react'
import { PrivyProvider, usePrivy, useLogin } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmi9t84qs00acl80dam2j8195'

type LinkState = { connected: boolean; did: string | null }

function ConnectInner() {
  const { ready, authenticated, getAccessToken, logout } = usePrivy()
  const [state, setState] = useState<LinkState>({ connected: false, did: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/account/privy', { cache: 'no-store' })
      if (res.ok) setState(await res.json())
    } catch {
      /* ignore — show connect button */
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const link = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Could not retrieve your Privy token. Try again.')
        return
      }
      const res = await fetch('/api/account/privy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Could not link identity')
      else setState({ connected: true, did: data.did })
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }, [getAccessToken])

  // After the Privy login modal completes, link the DID to the account.
  const { login } = useLogin({ onComplete: () => link() })

  const disconnect = useCallback(async () => {
    setBusy(true)
    try {
      await fetch('/api/account/privy', { method: 'DELETE' })
      await logout()
      setState({ connected: false, did: null })
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }, [logout])

  if (state.connected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
        <span className="text-sm text-emerald-400">✓ Linked · {state.did}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={disconnect}
          className="text-white/70 hover:text-white"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Button
        disabled={!ready || busy}
        onClick={() => (authenticated ? link() : login())}
        className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        variant="outline"
      >
        {busy ? 'Linking…' : 'Connect cross-site identity'}
      </Button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function PrivyConnect() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'off' },
        },
        appearance: { theme: 'dark', accentColor: '#7c5cf0' },
      }}
    >
      <ConnectInner />
    </PrivyProvider>
  )
}
