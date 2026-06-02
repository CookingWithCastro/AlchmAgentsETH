'use client'

/**
 * Connect a shared cross-site identity (Privy DID) to the current (NextAuth)
 * account, and provision/fund a per-user embedded wallet on Base.
 *
 * Privy is NOT the login here — the user is already authenticated. Connecting
 * attaches a portable Privy DID (the SAME on alchm.kitchen via the shared Privy
 * app) and creates an embedded EVM wallet the user can fund via Privy's fiat
 * on-ramp. PrivyProvider is scoped to this component (rendered only on /account)
 * so the heavy web3 SDK isn't bundled into every route.
 */

import { useCallback, useEffect, useState } from 'react'
import { PrivyProvider, usePrivy, useLogin, useWallets, useFundWallet } from '@privy-io/react-auth'
import { base } from 'viem/chains'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmi9t84qs00acl80dam2j8195'

type LinkState = { connected: boolean; did: string | null; walletAddress: string | null }

function truncateAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

function ConnectInner() {
  const { ready, authenticated, getAccessToken, logout } = usePrivy()
  const { wallets } = useWallets()
  const { fundWallet } = useFundWallet()
  const [state, setState] = useState<LinkState>({
    connected: false,
    did: null,
    walletAddress: null,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Live embedded wallet (when authenticated this session) or the stored address.
  const embedded = wallets.find(w => w.walletClientType === 'privy')
  const walletAddress = embedded?.address ?? state.walletAddress ?? null

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
      else
        setState({
          connected: true,
          did: data.did,
          walletAddress: data.walletAddress ?? null,
        })
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }, [getAccessToken])

  // After the Privy login modal completes, link the DID + wallet to the account.
  const { login } = useLogin({ onComplete: () => link() })

  const disconnect = useCallback(async () => {
    setBusy(true)
    try {
      await fetch('/api/account/privy', { method: 'DELETE' })
      await logout()
      setState({ connected: false, did: null, walletAddress: null })
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }, [logout])

  const fund = useCallback(async () => {
    if (!walletAddress) return
    if (!authenticated) {
      login()
      return
    }
    try {
      await fundWallet({ address: walletAddress, options: { chain: base } })
    } catch {
      /* user exited the on-ramp or it's unsupported in their region */
    }
  }, [walletAddress, authenticated, login, fundWallet])

  const copyAddress = useCallback(() => {
    if (!walletAddress) return
    navigator.clipboard?.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [walletAddress])

  if (state.connected) {
    return (
      <div className="space-y-3">
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

        {walletAddress && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-white/40">Wallet · Base</div>
              <button
                onClick={copyAddress}
                className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-sm text-white/80 hover:text-white"
                title="Copy address"
              >
                {truncateAddress(walletAddress)}
                {copied ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Copy size={13} className="text-white/40" />
                )}
              </button>
            </div>
            <Button
              size="sm"
              disabled={!ready}
              onClick={fund}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              variant="outline"
            >
              Fund wallet
            </Button>
          </div>
        )}
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
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana: { createOnLogin: 'off' },
        },
        defaultChain: base,
        supportedChains: [base],
        appearance: { theme: 'dark', accentColor: '#7c5cf0' },
      }}
    >
      <ConnectInner />
    </PrivyProvider>
  )
}
