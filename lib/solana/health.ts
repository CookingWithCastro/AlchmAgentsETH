import { Connection } from '@solana/web3.js'

import {
  reconnectDelayMs,
  resolveSolanaRpcUrls,
  rpcEndpointLabel,
  solanaSlotToBigInt,
  type SolanaConnectionStatus,
} from '@/lib/solana/rpc-failover'

interface SolanaHealthStore {
  solanaSyncOutbox: {
    count(args: { where: { deliveredAt: null } }): Promise<number>
  }
  solanaProcessedTx: {
    findFirst(args: {
      orderBy: { slot: 'desc' }
      select: { slot: true }
    }): Promise<{ slot: bigint } | null>
  }
  solanaBridgeTransfer: {
    count(args: { where: { status: string } }): Promise<number>
    findFirst(args: {
      where: { sourceSlot: { not: null } }
      orderBy: { sourceSlot: 'desc' }
      select: { sourceSlot: true }
    }): Promise<{ sourceSlot: bigint | null } | null>
  }
  solanaServiceHeartbeat: {
    findUnique(args: { where: { service: string } }): Promise<{
      service: string
      connectionStatus: string
      activeRpc: string | null
      reconnectAttempts: number
      queueDepth: number
      lastProcessedSlot: bigint | null
      lastError: string | null
      heartbeatAt: Date
    } | null>
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('RPC health probe timed out')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function probeSolanaRpc(
  args: {
    rpcUrls?: readonly string[]
    timeoutMs?: number
    connectionFactory?: (url: string) => Pick<Connection, 'getSlot'>
  } = {}
): Promise<{
  connectionStatus: SolanaConnectionStatus
  activeRpc: string | null
  reconnectAttempts: number
  slot: bigint | null
  lastError: string | null
  nextBackoffMs: number
}> {
  const urls = [...(args.rpcUrls ?? resolveSolanaRpcUrls())]
  const connectionFactory =
    args.connectionFactory ?? ((url: string) => new Connection(url, 'finalized'))
  let lastError: string | null = null
  for (let index = 0; index < urls.length; index += 1) {
    try {
      const slot = await withTimeout(
        connectionFactory(urls[index]).getSlot('finalized'),
        args.timeoutMs ?? 4_000
      )
      return {
        connectionStatus: index === 0 ? 'connected' : 'degraded',
        activeRpc: rpcEndpointLabel(urls[index]),
        reconnectAttempts: index,
        slot: solanaSlotToBigInt(slot),
        lastError,
        nextBackoffMs: reconnectDelayMs(index),
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  return {
    connectionStatus: 'degraded',
    activeRpc: null,
    reconnectAttempts: urls.length,
    slot: null,
    lastError,
    nextBackoffMs: reconnectDelayMs(urls.length),
  }
}

export async function collectSolanaOperationalHealth(
  store: SolanaHealthStore,
  options: Parameters<typeof probeSolanaRpc>[0] = {}
) {
  const [
    rpc,
    syncQueueDepth,
    latestProcessed,
    bridgeQueueDepth,
    latestBridge,
    syncHeartbeat,
    bridgeHeartbeat,
  ] = await Promise.all([
    probeSolanaRpc(options),
    store.solanaSyncOutbox.count({ where: { deliveredAt: null } }),
    store.solanaProcessedTx.findFirst({
      orderBy: { slot: 'desc' },
      select: { slot: true },
    }),
    store.solanaBridgeTransfer.count({ where: { status: 'PendingMint' } }),
    store.solanaBridgeTransfer.findFirst({
      where: { sourceSlot: { not: null } },
      orderBy: { sourceSlot: 'desc' },
      select: { sourceSlot: true },
    }),
    store.solanaServiceHeartbeat.findUnique({ where: { service: 'sync' } }),
    store.solanaServiceHeartbeat.findUnique({ where: { service: 'bridge' } }),
  ])
  const staleAfterMs = Number(process.env.SOLANA_SERVICE_HEARTBEAT_STALE_MS ?? 45_000)
  const workerHealth = (
    heartbeat: typeof syncHeartbeat,
    durableQueueDepth: number,
    durableSlot: bigint | null
  ) => {
    const stale = !heartbeat || Date.now() - heartbeat.heartbeatAt.getTime() > staleAfterMs
    return {
      connectionStatus: stale ? ('stopped' as const) : heartbeat.connectionStatus,
      activeRpc: heartbeat?.activeRpc ?? null,
      reconnectAttempts: heartbeat?.reconnectAttempts ?? 0,
      queueDepth: durableQueueDepth,
      lastProcessedSlot: (heartbeat?.lastProcessedSlot ?? durableSlot)?.toString() ?? null,
      lastError: stale ? 'worker heartbeat is missing or stale' : heartbeat.lastError,
      heartbeatAt: heartbeat?.heartbeatAt.toISOString() ?? null,
    }
  }
  const sync = workerHealth(syncHeartbeat, syncQueueDepth, latestProcessed?.slot ?? null)
  const bridge = workerHealth(bridgeHeartbeat, bridgeQueueDepth, latestBridge?.sourceSlot ?? null)
  return {
    status:
      rpc.connectionStatus === 'connected' &&
      sync.connectionStatus === 'connected' &&
      bridge.connectionStatus === 'connected'
        ? 'healthy'
        : 'degraded',
    cluster: 'devnet',
    checkedAt: new Date().toISOString(),
    rpc: {
      connectionStatus: rpc.connectionStatus,
      activeRpc: rpc.activeRpc,
      reconnectAttempts: rpc.reconnectAttempts,
      observedSlot: rpc.slot?.toString() ?? null,
      lastError: rpc.lastError,
    },
    sync,
    bridge,
  }
}
