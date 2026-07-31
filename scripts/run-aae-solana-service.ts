import { Wallet } from '@coral-xyz/anchor'
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import type { Hex } from 'viem'

import { AaeSolanaClient } from '@/lib/solana/aae-solana-client'
import { AsyncCosmicContextEncoder } from '@/lib/jepa/cosmic-context-encoder'
import type { SolanaServiceHealth } from '@/lib/solana/rpc-failover'
import {
  createAaeBridgeProcessor,
  createBaseSepoliaClients,
  createPrismaBridgeStore,
  listenToBridgeSourceEvents,
  startBridgeRelayPolling,
} from '@/lib/solana/bridge-service'
import {
  createPrismaSolanaSyncStore,
  createSolanaSyncWebhookBodyDispatcher,
  encodeSolanaSyncBody,
  startSolanaSyncService,
  startSolanaSyncOutboxPolling,
} from '@/lib/solana/solana-sync-service'

function databaseClient(): PrismaClient {
  const url =
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    process.env.RAILWAY_DATABASE_URL ??
    process.env.POSTGRES_URL
  const base = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient()
  return url?.startsWith('prisma+postgres://')
    ? (base.$extends(withAccelerate()) as unknown as PrismaClient)
    : base
}

function solanaMinter(): Keypair {
  const raw = process.env.SOLANA_MINTER_SECRET_KEY
  if (!raw) throw new Error('SOLANA_MINTER_SECRET_KEY is required')
  if (raw.startsWith('[')) {
    const bytes = JSON.parse(raw) as unknown
    if (!Array.isArray(bytes) || bytes.length !== 64) {
      throw new Error('SOLANA_MINTER_SECRET_KEY JSON must contain 64 bytes')
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes.map(Number)))
  }
  return Keypair.fromSecretKey(bs58.decode(raw))
}

function startServiceHeartbeat(
  client: PrismaClient,
  service: 'sync' | 'bridge',
  getHealth: () => Promise<SolanaServiceHealth>
) {
  const publish = async (overrideStatus?: 'stopped') => {
    const health = await getHealth()
    await client.solanaServiceHeartbeat.upsert({
      where: { service },
      create: {
        service,
        connectionStatus: overrideStatus ?? health.connectionStatus,
        activeRpc: health.activeRpc,
        reconnectAttempts: health.reconnectAttempts,
        queueDepth: health.queueDepth,
        lastProcessedSlot: health.lastProcessedSlot,
        lastError: health.lastError,
      },
      update: {
        connectionStatus: overrideStatus ?? health.connectionStatus,
        activeRpc: health.activeRpc,
        reconnectAttempts: health.reconnectAttempts,
        queueDepth: health.queueDepth,
        lastProcessedSlot: health.lastProcessedSlot,
        lastError: health.lastError,
      },
    })
  }
  const publishSafely = () =>
    publish().catch(error =>
      console.error(
        `[${service}] heartbeat failed:`,
        error instanceof Error ? error.message : error
      )
    )
  const timer = setInterval(publishSafely, 15_000)
  publishSafely()
  return async () => {
    clearInterval(timer)
    await publish('stopped').catch(() => undefined)
  }
}

async function runSync(client: PrismaClient) {
  const store = createPrismaSolanaSyncStore(client)
  const deliver = process.env.SOLANA_SYNC_WEBHOOK_URL
    ? createSolanaSyncWebhookBodyDispatcher({
        url: process.env.SOLANA_SYNC_WEBHOOK_URL,
        bearerToken: process.env.SOLANA_SYNC_WEBHOOK_TOKEN,
      })
    : async (payload: string) => {
        console.log('[SolanaSync]', payload)
      }
  const subscription = startSolanaSyncService({ store, onEvent: async () => undefined })
  const outbox = startSolanaSyncOutboxPolling({ client, deliver })
  const stopHeartbeat = startServiceHeartbeat(client, 'sync', () => subscription.getHealth())
  console.log(`[SolanaSync] listening on ${subscription.connection.rpcEndpoint}`)
  return async () => {
    outbox.stop()
    await subscription.stop()
    await stopHeartbeat()
  }
}

async function runBridge(client: PrismaClient) {
  const privateKey = process.env.MINTER_PRIVATE_KEY as Hex | undefined
  if (!privateKey) throw new Error('MINTER_PRIVATE_KEY is required')
  const solanaClient = new AaeSolanaClient({ wallet: new Wallet(solanaMinter()) })
  const evm = createBaseSepoliaClients(privateKey)
  const processTransfer = createAaeBridgeProcessor({
    store: createPrismaBridgeStore(client),
    solanaClient,
    evmPublicClient: evm.publicClient,
    evmWalletClient: evm.walletClient,
  })
  const polling = startBridgeRelayPolling({
    client,
    processTransfer,
    onError: (error, row) =>
      console.error(
        '[Bridge]',
        row?.claimId ?? 'poll',
        error instanceof Error ? error.message : error
      ),
  })
  const listeners = listenToBridgeSourceEvents({
    onEvmEvent: async event => console.log('[Bridge:EVM]', event),
    onSolanaEvent: async event => console.log('[Bridge:Solana]', encodeSolanaSyncBody(event)),
  })
  const stopHeartbeat = startServiceHeartbeat(client, 'bridge', async () => {
    const [listenerHealth, relayHealth] = await Promise.all([
      listeners.getHealth(),
      polling.getHealth(),
    ])
    return {
      connectionStatus:
        listenerHealth.connectionStatus === 'connected' &&
        relayHealth.connectionStatus === 'connected'
          ? 'connected'
          : listenerHealth.connectionStatus === 'stopped' ||
              relayHealth.connectionStatus === 'stopped'
            ? 'stopped'
            : 'degraded',
      activeRpc: listenerHealth.activeRpc,
      reconnectAttempts: listenerHealth.reconnectAttempts,
      queueDepth: relayHealth.queueDepth,
      lastProcessedSlot: relayHealth.lastProcessedSlot ?? listenerHealth.lastProcessedSlot,
      lastError: listenerHealth.lastError ?? relayHealth.lastError,
    }
  })
  console.log('[Bridge] Base Sepolia ↔ Solana Devnet relay started')
  return async () => {
    polling.stop()
    await listeners.stop()
    await stopHeartbeat()
  }
}

async function runJepaAnchorWorker() {
  const intervalMs = Number(process.env.JEPA_COSMIC_EPOCH_INTERVAL_MS ?? 60_000)
  AsyncCosmicContextEncoder.startCronJob(intervalMs)
  console.log(`[JEPA] dual-chain persona anchor worker started (${intervalMs}ms)`)
  return () => AsyncCosmicContextEncoder.stopCronJob()
}

const mode = process.argv[2]
if (mode !== 'sync' && mode !== 'bridge' && mode !== 'jepa') {
  throw new Error('Usage: bun run scripts/run-aae-solana-service.ts <sync|bridge|jepa>')
}
const client = mode === 'jepa' ? null : databaseClient()
const stop =
  mode === 'sync'
    ? await runSync(client!)
    : mode === 'bridge'
      ? await runBridge(client!)
      : await runJepaAnchorWorker()
let stopping = false
const shutdown = async () => {
  if (stopping) return
  stopping = true
  await stop()
  await client?.$disconnect()
  process.exit(0)
}
process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
