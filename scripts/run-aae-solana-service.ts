import { Wallet } from '@coral-xyz/anchor'
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import type { Hex } from 'viem'

import { AaeSolanaClient } from '@/lib/solana/aae-solana-client'
import {
  createAaeBridgeProcessor,
  createBaseSepoliaClients,
  createPrismaBridgeStore,
  listenToBridgeSourceEvents,
  startBridgeRelayPolling,
} from '@/lib/solana/bridge-service'
import {
  createPrismaSolanaSyncStore,
  createSolanaSyncWebhookDispatcher,
  encodeSolanaSyncBody,
  startSolanaSyncService,
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

async function runSync(client: PrismaClient) {
  const store = createPrismaSolanaSyncStore(client)
  const dispatcher = process.env.SOLANA_SYNC_WEBHOOK_URL
    ? createSolanaSyncWebhookDispatcher({
        url: process.env.SOLANA_SYNC_WEBHOOK_URL,
        bearerToken: process.env.SOLANA_SYNC_WEBHOOK_TOKEN,
      })
    : async (event: Parameters<typeof encodeSolanaSyncBody>[0]) => {
        console.log('[SolanaSync]', encodeSolanaSyncBody(event))
      }
  const subscription = startSolanaSyncService({ store, onEvent: dispatcher })
  console.log(`[SolanaSync] listening on ${subscription.connection.rpcEndpoint}`)
  return () => subscription.stop()
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
  console.log('[Bridge] Base Sepolia ↔ Solana Devnet relay started')
  return async () => {
    polling.stop()
    await listeners.stop()
  }
}

const mode = process.argv[2]
if (mode !== 'sync' && mode !== 'bridge') {
  throw new Error('Usage: bun run scripts/run-aae-solana-service.ts <sync|bridge>')
}
const client = databaseClient()
const stop = mode === 'sync' ? await runSync(client) : await runBridge(client)
let stopping = false
const shutdown = async () => {
  if (stopping) return
  stopping = true
  await stop()
  await client.$disconnect()
  process.exit(0)
}
process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
