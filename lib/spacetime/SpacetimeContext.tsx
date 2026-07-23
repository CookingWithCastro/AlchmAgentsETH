'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getSpacetimeConfig, SPACETIME_TOKEN_STORAGE_KEY } from './config'
// Adjust import path based on the generated TS output
import { DbConnection } from './generated'

export type SpacetimeStatus = 'disabled' | 'connecting' | 'connected' | 'degraded'

interface SpacetimeContextValue {
  connection: DbConnection | null
  status: SpacetimeStatus
  identityHex: string | null
}

const SpacetimeContext = createContext<SpacetimeContextValue>({
  connection: null,
  status: 'disabled',
  identityHex: null,
})

const DEGRADED_AFTER_FAILURES = 3
const BACKOFF_BASE_MS = 1_000
const BACKOFF_CAP_MS = 30_000

function readStoredToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage.getItem(SPACETIME_TOKEN_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function storeToken(token: string) {
  try {
    window.localStorage.setItem(SPACETIME_TOKEN_STORAGE_KEY, token)
  } catch {
    // ignore
  }
}

export function SpacetimeProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => getSpacetimeConfig(), [])
  const [status, setStatus] = useState<SpacetimeStatus>(config ? 'connecting' : 'disabled')
  const [connection, setConnection] = useState<DbConnection | null>(null)
  const [identityHex, setIdentityHex] = useState<string | null>(null)

  const failuresRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disposedRef = useRef(false)
  const activeConnRef = useRef<DbConnection | null>(null)

  useEffect(() => {
    if (!config) return
    disposedRef.current = false

    const scheduleReconnect = (connectFn: () => void) => {
      if (disposedRef.current) return
      failuresRef.current += 1
      if (failuresRef.current >= DEGRADED_AFTER_FAILURES) {
        setStatus('degraded')
      }
      const delay = Math.min(
        BACKOFF_CAP_MS,
        BACKOFF_BASE_MS * 2 ** Math.min(failuresRef.current - 1, 5)
      )
      retryTimerRef.current = setTimeout(connectFn, delay)
    }

    const connect = () => {
      if (disposedRef.current) return
      if (failuresRef.current === 0) setStatus('connecting')
      try {
        const conn = DbConnection.builder()
          .withUri(config.uri)
          .withDatabaseName(config.moduleName)
          .withToken(readStoredToken())
          .onConnect((c, identity, token) => {
            if (disposedRef.current) return
            failuresRef.current = 0
            storeToken(token)
            setIdentityHex(identity.toHexString())
            setConnection(c)
            setStatus('connected')
          })
          .onConnectError((_ctx, error) => {
            if (disposedRef.current) return
            console.warn('[pa-spacetime] connect error:', error.message)
            setConnection(null)
            scheduleReconnect(connect)
          })
          .onDisconnect(() => {
            if (disposedRef.current) return
            setConnection(null)
            setStatus('connecting')
            scheduleReconnect(connect)
          })
          .build()
        activeConnRef.current = conn
      } catch (error) {
        console.warn('[pa-spacetime] failed to build connection:', error)
        scheduleReconnect(connect)
      }
    }

    connect()

    return () => {
      disposedRef.current = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      try {
        activeConnRef.current?.disconnect()
      } catch {
        // Already closed.
      }
      activeConnRef.current = null
    }
  }, [config])

  const value = useMemo<SpacetimeContextValue>(
    () => ({ connection, status, identityHex }),
    [connection, status, identityHex]
  )

  return <SpacetimeContext.Provider value={value}>{children}</SpacetimeContext.Provider>
}

export function useSpacetime(): SpacetimeContextValue {
  return useContext(SpacetimeContext)
}
