import { Connection, PublicKey, type Logs } from '@solana/web3.js'

export const PUBLIC_SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com'

export type SolanaConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'degraded'
  | 'stopped'

export interface SolanaServiceHealth {
  connectionStatus: SolanaConnectionStatus
  activeRpc: string | null
  reconnectAttempts: number
  queueDepth: number
  lastProcessedSlot: bigint | null
  lastError: string | null
}

export function resolveSolanaRpcUrls(
  overrides: {
    primary?: string
    helius?: string
    quickNode?: string
    additional?: string
  } = {}
): string[] {
  const candidates = [
    overrides.primary ?? process.env.SOLANA_RPC_URL,
    overrides.helius ?? process.env.HELIUS_SOLANA_RPC_URL,
    overrides.quickNode ?? process.env.QUICKNODE_SOLANA_RPC_URL,
    ...(overrides.additional ?? process.env.SOLANA_RPC_URLS ?? '')
      .split(',')
      .map(value => value.trim()),
    PUBLIC_SOLANA_DEVNET_RPC,
  ].filter((value): value is string => Boolean(value))
  return [...new Set(candidates)]
}

export function reconnectDelayMs(attempt: number): number {
  return Math.min(30_000, 500 * 2 ** Math.max(0, attempt))
}

export function solanaSlotToBigInt(slot: number): bigint {
  if (!Number.isSafeInteger(slot) || slot < 0) {
    throw new RangeError('Solana SDK slot must be a non-negative safe integer')
  }
  return BigInt(slot)
}

export async function withSolanaRpcFailover<T>(args: {
  operation: (connection: Connection, endpoint: string) => Promise<T>
  rpcUrls?: readonly string[]
  connectionFactory?: (rpcUrl: string) => Connection
}): Promise<T> {
  const urls = [...(args.rpcUrls ?? resolveSolanaRpcUrls())]
  if (!urls.length) throw new Error('No Solana RPC endpoints are configured')
  const connectionFactory =
    args.connectionFactory ?? ((rpcUrl: string) => new Connection(rpcUrl, 'confirmed'))
  const errors: string[] = []
  for (const endpoint of urls) {
    try {
      return await args.operation(connectionFactory(endpoint), endpoint)
    } catch (error) {
      errors.push(
        `${rpcEndpointLabel(endpoint)}: ${error instanceof Error ? error.message : error}`
      )
    }
  }
  throw new Error(`All Solana RPC endpoints failed (${errors.join('; ')})`)
}

export function rpcEndpointLabel(endpoint: string): string {
  try {
    return new URL(endpoint).host
  } catch {
    return 'configured-rpc'
  }
}

export interface ResilientSolanaSubscription {
  readonly connection: Connection
  readonly subscriptionId: number
  getHealth(): SolanaServiceHealth
  stop(): Promise<void>
}

interface RpcWebSocketLike {
  on?(event: 'error' | 'close', listener: (error?: unknown) => void): void
  off?(event: 'error' | 'close', listener: (error?: unknown) => void): void
}

type ObservableConnection = Connection & { _rpcWebSocket?: RpcWebSocketLike }

export function createResilientSolanaLogSubscription(args: {
  programId: PublicKey
  onLogs: (logs: Logs, slot: number) => Promise<void>
  rpcUrls?: readonly string[]
  connection?: Connection
  connectionFactory?: (rpcUrl: string) => Connection
  heartbeatMs?: number
  onConnectionReady?: (connection: Connection, reconnected: boolean) => Promise<void>
}): ResilientSolanaSubscription {
  const urls = args.connection ? [args.connection.rpcEndpoint] : [...(args.rpcUrls ?? [])]
  if (urls.length === 0) urls.push(...resolveSolanaRpcUrls())
  const connectionFactory =
    args.connectionFactory ?? ((rpcUrl: string) => new Connection(rpcUrl, 'finalized'))
  let endpointIndex = 0
  let connection: Connection
  let subscriptionId = -1
  let connectionStatus: SolanaConnectionStatus = 'connecting'
  let reconnectAttempts = 0
  let lastProcessedSlot: bigint | null = null
  let lastError: string | null = null
  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let socket: RpcWebSocketLike | undefined
  let connectionGeneration = 0
  let readyForLiveLogs = false
  let pendingLogs: Array<{ logs: Logs; slot: number }> = []

  const websocketFailed = (error?: unknown) => {
    void scheduleReconnect(error ?? new Error('Solana WebSocket closed'))
  }

  const detachSocketListeners = () => {
    socket?.off?.('error', websocketFailed)
    socket?.off?.('close', websocketFailed)
    socket = undefined
  }

  const clearHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  const removeSubscription = async () => {
    connectionGeneration += 1
    readyForLiveLogs = false
    pendingLogs = []
    detachSocketListeners()
    clearHeartbeat()
    if (subscriptionId >= 0) {
      const currentId = subscriptionId
      subscriptionId = -1
      try {
        await connection.removeOnLogsListener(currentId)
      } catch {
        // The failed endpoint may already have dropped the subscription.
      }
    }
  }

  const connect = () => {
    if (stopped) return
    connectionStatus = reconnectAttempts > 0 ? 'degraded' : 'connecting'
    connection = args.connection ?? connectionFactory(urls[endpointIndex])
    const generation = ++connectionGeneration
    readyForLiveLogs = !args.onConnectionReady
    pendingLogs = []
    const dispatchLogs = async (logs: Logs, slot: number) => {
      if (logs.err || generation !== connectionGeneration) return
      try {
        await args.onLogs(logs, slot)
        lastProcessedSlot = solanaSlotToBigInt(slot)
        connectionStatus = 'connected'
        lastError = null
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        await scheduleReconnect(error)
        throw error
      }
    }
    try {
      subscriptionId = connection.onLogs(
        args.programId,
        async (logs, context) => {
          if (generation !== connectionGeneration || logs.err) return
          if (!readyForLiveLogs) {
            pendingLogs.push({ logs, slot: context.slot })
            return
          }
          await dispatchLogs(logs, context.slot).catch(() => undefined)
        },
        'finalized'
      )
      connectionStatus = reconnectAttempts > 0 ? 'degraded' : 'connected'
      socket = (connection as ObservableConnection)._rpcWebSocket
      socket?.on?.('error', websocketFailed)
      socket?.on?.('close', websocketFailed)
      heartbeatTimer = setInterval(() => {
        void connection
          .getSlot('finalized')
          .then(() => {
            connectionStatus = 'connected'
            lastError = null
          })
          .catch(websocketFailed)
      }, args.heartbeatMs ?? 30_000)
      if (args.onConnectionReady) {
        void args
          .onConnectionReady(connection, reconnectAttempts > 0)
          .then(async () => {
            while (generation === connectionGeneration && pendingLogs.length > 0) {
              const pending = pendingLogs.shift()!
              await dispatchLogs(pending.logs, pending.slot)
            }
            if (generation === connectionGeneration) readyForLiveLogs = true
          })
          .catch(error => scheduleReconnect(error))
      }
    } catch (error) {
      void scheduleReconnect(error)
    }
  }

  async function scheduleReconnect(error: unknown): Promise<void> {
    if (stopped || reconnectTimer || connectionStatus === 'reconnecting') return
    lastError = error instanceof Error ? error.message : String(error)
    connectionStatus = 'reconnecting'
    await removeSubscription()
    endpointIndex = (endpointIndex + 1) % urls.length
    const delay = reconnectDelayMs(reconnectAttempts)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  connect()

  return {
    get connection() {
      return connection
    },
    get subscriptionId() {
      return subscriptionId
    },
    getHealth: () => ({
      connectionStatus,
      activeRpc: rpcEndpointLabel(connection.rpcEndpoint),
      reconnectAttempts,
      queueDepth: 0,
      lastProcessedSlot,
      lastError,
    }),
    stop: async () => {
      stopped = true
      connectionStatus = 'stopped'
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = null
      await removeSubscription()
    },
  }
}
