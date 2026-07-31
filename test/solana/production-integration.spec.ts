// @vitest-environment node

import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicKey, type Connection, type Logs } from '@solana/web3.js'

import { buildAgentContext } from '@/lib/agents/persona/build-agent-context'
import { anchorPersonaState, buildPersonaCommitments } from '@/lib/jepa/onchain-sync'
import {
  createResilientSolanaLogSubscription,
  reconnectDelayMs,
  resolveSolanaRpcUrls,
  withSolanaRpcFailover,
} from '@/lib/solana/rpc-failover'
import { buildSolanaAgentMetadata } from '@/lib/solana/agent-metadata'
import { formatEvmEsmsAmount } from '@/lib/solana/base-sepolia-esms'
import { formatEsmsRawAmount } from '@/lib/solana/esms'
import { backfillSolanaSignatures } from '@/lib/solana/solana-sync-service'
import { collectSolanaOperationalHealth } from '@/lib/solana/health'

describe('production Solana integration', () => {
  afterEach(() => vi.useRealTimers())

  it('derives stable PersonaCommitment metadata from the canonical agent id', () => {
    expect(buildSolanaAgentMetadata('plato')).toEqual({
      program_id: '5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD',
      persona_pda: 'G1rx8rLAfcu9S4izC3o4Y9mLwdEoXKT8EWTn5HyxpAqE',
      cluster: 'devnet',
    })

    expect(buildAgentContext('plato')?.metadata.solana).toEqual(buildSolanaAgentMetadata('plato'))
  })

  it('builds the exact same 32-byte commitments for both settlement domains', () => {
    const vector = new Float64Array(64)
    vector[0] = 1.25
    vector[63] = -4.5
    const commitments = buildPersonaCommitments({
      agentId: 'plato',
      targetPersona: vector,
      epochHash: 'cosmic-epoch-42',
    })

    expect(Buffer.from(commitments.agentId).toString('hex')).toBe(
      createHash('sha256').update('plato').digest('hex')
    )
    expect(Buffer.from(commitments.targetPersonaHash).toString('hex')).toBe(
      createHash('sha256').update(Buffer.from(vector.buffer)).digest('hex')
    )
    expect(Buffer.from(commitments.epochHash).toString('hex')).toBe(
      createHash('sha256').update('cosmic-epoch-42').digest('hex')
    )
  })

  it('attempts EVM and Solana anchoring independently', async () => {
    const evm = vi.fn().mockRejectedValue(new Error('Base RPC unavailable'))
    const solana = vi.fn().mockResolvedValue('solana-signature')
    const result = await anchorPersonaState('plato', {
      state: { targetPersona: new Float64Array(64) },
      context: { epochHash: 'epoch' },
      anchorEvm: evm,
      anchorSolana: solana,
    })

    expect(evm).toHaveBeenCalledOnce()
    expect(solana).toHaveBeenCalledOnce()
    expect(result.evm.status).toBe('failed')
    expect(result.solana).toEqual({ status: 'submitted', transactionHash: 'solana-signature' })
  })

  it('orders private RPCs before public devnet and caps reconnect backoff', () => {
    expect(
      resolveSolanaRpcUrls({
        primary: 'https://helius.example/rpc',
        helius: 'https://helius-fallback.example/rpc',
        quickNode: 'https://quicknode.example/rpc',
        additional: 'https://helius.example/rpc, https://third.example/rpc',
      })
    ).toEqual([
      'https://helius.example/rpc',
      'https://helius-fallback.example/rpc',
      'https://quicknode.example/rpc',
      'https://third.example/rpc',
      'https://api.devnet.solana.com',
    ])

    expect(reconnectDelayMs(0)).toBe(500)
    expect(reconnectDelayMs(4)).toBe(8_000)
    expect(reconnectDelayMs(20)).toBe(30_000)
  })

  it('replays finalized program signatures from the durable slot in oldest-first order', async () => {
    const pages = [
      [
        { signature: 'sig-14', slot: 14, err: null },
        { signature: 'sig-13', slot: 13, err: null },
        { signature: 'sig-12', slot: 12, err: null },
      ],
      [
        { signature: 'sig-11', slot: 11, err: null },
        { signature: 'sig-10', slot: 10, err: null },
        { signature: 'sig-9', slot: 9, err: null },
      ],
    ]
    const connection = {
      getSignaturesForAddress: vi.fn(async () => pages.shift() ?? []),
    } as unknown as Connection
    const replayed: string[] = []
    await expect(
      backfillSolanaSignatures({
        connection,
        programId: PublicKey.default,
        cursorSlot: 10n,
        pageSize: 3,
        processSignature: async signature => {
          replayed.push(signature)
        },
      })
    ).resolves.toBe(5)
    expect(replayed).toEqual(['sig-10', 'sig-11', 'sig-12', 'sig-13', 'sig-14'])
  })

  it('formats both chains without converting token atoms to Number', () => {
    expect(formatEsmsRawAmount(18_446_744_073_709_551_615n)).toBe('1844674407370955.1615')
    expect(formatEvmEsmsAmount(100_123_456_789_000_000_000n)).toBe('100.1234')
  })

  it('retries an RPC operation against the ordered fallback endpoints', async () => {
    const visited: string[] = []
    await expect(
      withSolanaRpcFailover({
        rpcUrls: ['https://primary.example/rpc', 'https://fallback.example/rpc'],
        connectionFactory: url => ({ rpcEndpoint: url }) as Connection,
        operation: async (_connection, endpoint) => {
          visited.push(endpoint)
          if (endpoint.includes('primary')) throw new Error('429 rate limited')
          return 'settled'
        },
      })
    ).resolves.toBe('settled')
    expect(visited).toEqual(['https://primary.example/rpc', 'https://fallback.example/rpc'])
  })

  it('reports process liveness from worker heartbeats instead of RPC reachability alone', async () => {
    const heartbeatAt = new Date()
    const store = {
      solanaSyncOutbox: { count: vi.fn(async () => 2) },
      solanaProcessedTx: { findFirst: vi.fn(async () => ({ slot: 12n })) },
      solanaBridgeTransfer: {
        count: vi.fn(async () => 1),
        findFirst: vi.fn(async () => ({ sourceSlot: 11n })),
      },
      solanaServiceHeartbeat: {
        findUnique: vi.fn(async ({ where }: { where: { service: string } }) => ({
          service: where.service,
          connectionStatus: 'connected',
          activeRpc: 'managed.example',
          reconnectAttempts: 0,
          queueDepth: 0,
          lastProcessedSlot: where.service === 'sync' ? 12n : 11n,
          lastError: null,
          heartbeatAt,
        })),
      },
    }
    const health = await collectSolanaOperationalHealth(store, {
      rpcUrls: ['https://managed.example/rpc'],
      connectionFactory: () => ({ getSlot: vi.fn(async () => 13) }),
    })
    expect(health.status).toBe('healthy')
    expect(health.sync).toMatchObject({ queueDepth: 2, heartbeatAt: heartbeatAt.toISOString() })
    expect(health.bridge).toMatchObject({ queueDepth: 1, connectionStatus: 'connected' })
  })

  it('resubscribes on the next RPC after a websocket close with exponential backoff', async () => {
    vi.useFakeTimers()
    const listeners: Array<(error?: unknown) => void> = []
    const makeConnection = (rpcEndpoint: string) =>
      ({
        rpcEndpoint,
        _rpcWebSocket: {
          on: (_event: string, listener: (error?: unknown) => void) => listeners.push(listener),
          off: (_event: string, listener: (error?: unknown) => void) => {
            const index = listeners.indexOf(listener)
            if (index >= 0) listeners.splice(index, 1)
          },
        },
        onLogs: vi.fn(() => 9),
        removeOnLogsListener: vi.fn(async () => undefined),
        getSlot: vi.fn(async () => 480_000_000),
      }) as unknown as Connection
    const created: string[] = []
    const subscription = createResilientSolanaLogSubscription({
      programId: PublicKey.default,
      rpcUrls: ['https://primary.example/rpc', 'https://fallback.example/rpc'],
      connectionFactory: url => {
        created.push(url)
        return makeConnection(url)
      },
      onLogs: async (_logs: Logs) => undefined,
      heartbeatMs: 60_000,
    })

    expect(subscription.getHealth().activeRpc).toBe('primary.example')
    listeners[0](new Error('websocket closed'))
    await Promise.resolve()
    expect(subscription.getHealth().connectionStatus).toBe('reconnecting')
    await Promise.resolve()
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(created).toEqual(['https://primary.example/rpc', 'https://fallback.example/rpc'])
    expect(subscription.getHealth()).toMatchObject({
      connectionStatus: 'degraded',
      activeRpc: 'fallback.example',
      reconnectAttempts: 1,
    })
    vi.advanceTimersByTime(60_000)
    await Promise.resolve()
    await Promise.resolve()
    expect(subscription.getHealth().connectionStatus).toBe('connected')
    await subscription.stop()
  })

  it('buffers live logs until reconnect catch-up has completed', async () => {
    let receiveLogs: ((logs: Logs, context: { slot: number }) => Promise<void>) | undefined
    let releaseCatchup: (() => void) | undefined
    const catchup = new Promise<void>(resolve => {
      releaseCatchup = resolve
    })
    const delivered: number[] = []
    const connection = {
      rpcEndpoint: 'https://primary.example/rpc',
      onLogs: vi.fn((_program, callback) => {
        receiveLogs = callback
        return 7
      }),
      removeOnLogsListener: vi.fn(async () => undefined),
      getSlot: vi.fn(async () => 20),
    } as unknown as Connection
    const subscription = createResilientSolanaLogSubscription({
      programId: PublicKey.default,
      connection,
      onConnectionReady: () => catchup,
      onLogs: async (_logs, slot) => {
        delivered.push(slot)
      },
      heartbeatMs: 60_000,
    })
    await receiveLogs?.({ err: null, logs: [], signature: 'live' }, { slot: 20 })
    expect(delivered).toEqual([])
    releaseCatchup?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(delivered).toEqual([20])
    await subscription.stop()
  })
})
