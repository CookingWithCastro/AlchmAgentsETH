import { BorshInstructionCoder, type Idl } from '@coral-xyz/anchor'
import {
  Connection,
  PublicKey,
  type Logs,
  type TransactionInstruction,
  type VersionedTransactionResponse,
} from '@solana/web3.js'

import { AAE_SOLANA_PROGRAM_ID } from '@/lib/solana/esms'
import AAE_SOLANA_IDL from '@/lib/solana/idl/aae_solana.json'
import {
  createResilientSolanaLogSubscription,
  resolveSolanaRpcUrls,
  solanaSlotToBigInt,
  type SolanaServiceHealth,
} from '@/lib/solana/rpc-failover'

export { solanaSlotToBigInt } from '@/lib/solana/rpc-failover'

const MAX_U64 = (1n << 64n) - 1n

type EsmsAmounts = readonly [bigint, bigint, bigint, bigint]

interface SolanaEventBase {
  signature: string
  slot: bigint
}

export interface ClaimMintReceiptEvent extends SolanaEventBase {
  eventType: 'ClaimMintReceipt'
  claimId: string
  ledgerReferenceHash: string
  recipient: string
  amounts: EsmsAmounts
  authority: string
}

export interface OrderReceiptEvent extends SolanaEventBase {
  eventType: 'OrderReceipt'
  orderId: string
  holder: string
  amounts: EsmsAmounts
  submitter: string
  mode: 'self' | 'sponsored'
}

export interface PersonaCommitmentRecordedEvent extends SolanaEventBase {
  eventType: 'PersonaCommitmentRecorded'
  agentId: string
  targetPersonaHash: string
  epochHash: string
  sequence: bigint
  writer: string
}

export type AaeSolanaSyncEvent =
  | ClaimMintReceiptEvent
  | OrderReceiptEvent
  | PersonaCommitmentRecordedEvent

const instructionCoder = new BorshInstructionCoder(AAE_SOLANA_IDL as Idl)

function bytesHex(value: unknown): string {
  return Buffer.from(value as Uint8Array).toString('hex')
}

function u64(value: unknown): bigint {
  const parsed = BigInt(String(value))
  if (parsed < 0n || parsed > MAX_U64) throw new RangeError('Solana integer must fit in u64')
  return parsed
}

function esmsAmounts(value: unknown): EsmsAmounts {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error('AAE ESMS instructions require exactly four amounts')
  }
  return [u64(value[0]), u64(value[1]), u64(value[2]), u64(value[3])]
}

export function decodeAaeInstructionEvent(args: {
  signature: string
  slot: bigint
  instruction: TransactionInstruction
}): AaeSolanaSyncEvent | null {
  const { signature, slot, instruction } = args
  if (!instruction.programId.equals(AAE_SOLANA_PROGRAM_ID)) return null
  const decoded = instructionCoder.decode(instruction.data)
  if (!decoded) return null
  const data = decoded.data as Record<string, unknown>

  if (decoded.name === 'claim_mint_esms') {
    if (instruction.keys.length < 4) throw new Error('claim_mint_esms account list is incomplete')
    return {
      signature,
      slot,
      eventType: 'ClaimMintReceipt',
      claimId: bytesHex(data.claim_id),
      ledgerReferenceHash: bytesHex(data.ledger_reference_hash),
      recipient: instruction.keys[3].pubkey.toBase58(),
      amounts: esmsAmounts(data.amounts),
      authority: instruction.keys[2].pubkey.toBase58(),
    }
  }
  if (decoded.name === 'redeem_esms' || decoded.name === 'redeem_for_esms') {
    const sponsored = decoded.name === 'redeem_for_esms'
    const holderIndex = sponsored ? 3 : 2
    if (instruction.keys.length <= holderIndex) {
      throw new Error(`${decoded.name} account list is incomplete`)
    }
    return {
      signature,
      slot,
      eventType: 'OrderReceipt',
      orderId: bytesHex(data.order_id),
      holder: instruction.keys[holderIndex].pubkey.toBase58(),
      amounts: esmsAmounts(data.amounts),
      submitter: instruction.keys[2].pubkey.toBase58(),
      mode: sponsored ? 'sponsored' : 'self',
    }
  }
  if (decoded.name === 'record_persona_commitment') {
    if (instruction.keys.length < 3) {
      throw new Error('record_persona_commitment account list is incomplete')
    }
    return {
      signature,
      slot,
      eventType: 'PersonaCommitmentRecorded',
      agentId: bytesHex(data.agent_id),
      targetPersonaHash: bytesHex(data.target_persona_hash),
      epochHash: bytesHex(data.epoch_hash),
      sequence: u64(data.sequence),
      writer: instruction.keys[2].pubkey.toBase58(),
    }
  }
  return null
}

function encodeLosslessValue(value: unknown): string {
  if (typeof value === 'bigint') {
    if (value < 0n || value > MAX_U64) {
      throw new RangeError('Solana integer must fit in u64')
    }
    return value.toString()
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError('Numeric JSON values must be safe integers')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(encodeLosslessValue).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${encodeLosslessValue(entry)}`)
      .join(',')}}`
  }
  throw new TypeError(`Unsupported sync JSON value: ${typeof value}`)
}

/**
 * Pentacles-compatible JSON encoding: u64 values are raw JSON integers and
 * never transit JavaScript's lossy Number type.
 */
export function encodeSolanaSyncBody(event: AaeSolanaSyncEvent): string {
  return encodeLosslessValue(event)
}

export interface SolanaSyncStore {
  hasProcessed(signature: string): Promise<boolean>
  enqueueEvents?(events: readonly AaeSolanaSyncEvent[]): Promise<void>
  recordProcessed(marker: { signature: string; slot: bigint; eventType: string }): Promise<void>
  runInTransaction?<T>(work: (store: SolanaSyncStore) => Promise<T>): Promise<T>
  getQueueDepth?(): Promise<number>
  getLastProcessedSlot?(): Promise<bigint | null>
}

export function createSolanaSyncBatchProcessor(args: {
  store: SolanaSyncStore
  onEvent: (event: AaeSolanaSyncEvent, store: SolanaSyncStore) => Promise<void>
}) {
  return async (events: readonly AaeSolanaSyncEvent[]): Promise<boolean> => {
    if (!events.length) return false
    const [first] = events
    if (events.some(event => event.signature !== first.signature || event.slot !== first.slot)) {
      throw new Error('A Solana sync batch must contain one finalized transaction')
    }
    const work = async (store: SolanaSyncStore): Promise<boolean> => {
      if (await store.hasProcessed(first.signature)) return false
      for (const event of events) await args.onEvent(event, store)
      await store.enqueueEvents?.(events)
      await store.recordProcessed({
        signature: first.signature,
        slot: first.slot,
        eventType: events.map(event => event.eventType).join(','),
      })
      return true
    }
    return args.store.runInTransaction ? args.store.runInTransaction(work) : work(args.store)
  }
}

export function createSolanaSyncProcessor(args: {
  store: SolanaSyncStore
  onEvent: (event: AaeSolanaSyncEvent, store: SolanaSyncStore) => Promise<void>
}) {
  const processBatch = createSolanaSyncBatchProcessor(args)
  return (event: AaeSolanaSyncEvent) => processBatch([event])
}

interface PrismaSyncClient {
  solanaProcessedTx: {
    findUnique(args: {
      where: { signature: string }
      select: { signature: true }
    }): Promise<{ signature: string } | null>
    create(args: { data: { signature: string; slot: bigint; eventType: string } }): Promise<unknown>
    findFirst(args: {
      orderBy: { slot: 'desc' }
      select: { slot: true }
    }): Promise<{ slot: bigint } | null>
  }
  solanaSyncOutbox: {
    createMany(args: {
      data: Array<{
        id: string
        signature: string
        eventIndex: number
        eventType: string
        payload: string
      }>
    }): Promise<unknown>
    count(args: { where: { deliveredAt: null } }): Promise<number>
  }
  $transaction<T>(work: (client: PrismaSyncClient) => Promise<T>): Promise<T>
}

export function createPrismaSolanaSyncStore(client: PrismaSyncClient): SolanaSyncStore {
  const createStore = (
    scopedClient: PrismaSyncClient,
    transactional: boolean
  ): SolanaSyncStore => ({
    hasProcessed: async signature =>
      Boolean(
        await scopedClient.solanaProcessedTx.findUnique({
          where: { signature },
          select: { signature: true },
        })
      ),
    recordProcessed: async marker => {
      await scopedClient.solanaProcessedTx.create({
        data: {
          signature: marker.signature,
          slot: marker.slot,
          eventType: marker.eventType,
        },
      })
    },
    enqueueEvents: async events => {
      await scopedClient.solanaSyncOutbox.createMany({
        data: events.map((event, eventIndex) => ({
          id: `${event.signature}:${eventIndex}`,
          signature: event.signature,
          eventIndex,
          eventType: event.eventType,
          payload: encodeSolanaSyncBody(event),
        })),
      })
    },
    getQueueDepth: () => scopedClient.solanaSyncOutbox.count({ where: { deliveredAt: null } }),
    getLastProcessedSlot: async () =>
      (
        await scopedClient.solanaProcessedTx.findFirst({
          orderBy: { slot: 'desc' },
          select: { slot: true },
        })
      )?.slot ?? null,
    ...(!transactional
      ? {
          runInTransaction: <T>(work: (store: SolanaSyncStore) => Promise<T>) =>
            scopedClient.$transaction(transactionClient =>
              work(createStore(transactionClient, true))
            ),
        }
      : {}),
  })
  return createStore(client, false)
}

function keyAtTransactionIndex(
  transaction: VersionedTransactionResponse,
  index: number
): PublicKey | undefined {
  const message = transaction.transaction.message
  const keys =
    message.version === 0
      ? message.getAccountKeys({ accountKeysFromLookups: transaction.meta?.loadedAddresses })
      : message.getAccountKeys()
  return keys.get(index)
}

function transactionInstructions(
  transaction: VersionedTransactionResponse
): TransactionInstruction[] {
  const message = transaction.transaction.message
  const compiled = message.compiledInstructions

  return compiled.flatMap(compiledInstruction => {
    const programId = keyAtTransactionIndex(transaction, compiledInstruction.programIdIndex)
    if (!programId) return []
    const keys = Array.from(compiledInstruction.accountKeyIndexes).flatMap(index => {
      const pubkey = keyAtTransactionIndex(transaction, index)
      return pubkey ? [{ pubkey, isSigner: false, isWritable: false }] : []
    })
    const data = Buffer.from(compiledInstruction.data)
    return [{ programId, keys, data }]
  })
}

export function decodeAaeTransactionEvents(args: {
  signature: string
  slot: bigint
  transaction: VersionedTransactionResponse
}): AaeSolanaSyncEvent[] {
  return transactionInstructions(args.transaction).flatMap(instruction => {
    const event = decodeAaeInstructionEvent({
      signature: args.signature,
      slot: args.slot,
      instruction,
    })
    return event ? [event] : []
  })
}

async function getFinalizedTransaction(
  connection: Connection,
  signature: string
): Promise<VersionedTransactionResponse> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    })
    if (transaction) return transaction
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
  }
  throw new Error(`Finalized Solana transaction is unavailable: ${signature}`)
}

export async function backfillSolanaSignatures(args: {
  connection: Connection
  programId: PublicKey
  cursorSlot: bigint
  processSignature: (signature: string, slot: bigint) => Promise<void>
  pageSize?: number
}): Promise<number> {
  const pageSize = args.pageSize ?? 1_000
  let before: string | undefined
  const candidates: Array<{ signature: string; slot: number }> = []
  for (;;) {
    const page = await args.connection.getSignaturesForAddress(
      args.programId,
      { before, limit: pageSize },
      'finalized'
    )
    candidates.push(
      ...page
        .filter(entry => !entry.err && solanaSlotToBigInt(entry.slot) >= args.cursorSlot)
        .map(entry => ({ signature: entry.signature, slot: entry.slot }))
    )
    const oldest = page.at(-1)
    if (page.length < pageSize || !oldest || solanaSlotToBigInt(oldest.slot) < args.cursorSlot) {
      break
    }
    before = oldest.signature
  }
  for (const entry of candidates.reverse()) {
    await args.processSignature(entry.signature, solanaSlotToBigInt(entry.slot))
  }
  return candidates.length
}

const AAE_INSTRUCTION_LOGS = [
  'Instruction: ClaimMintEsms',
  'Instruction: RedeemEsms',
  'Instruction: RedeemForEsms',
  'Instruction: RecordPersonaCommitment',
]

export function createSolanaSyncWebhookDispatcher(args: {
  url: string
  bearerToken?: string
  fetchImpl?: typeof fetch
}) {
  const dispatchBody = createSolanaSyncWebhookBodyDispatcher(args)
  return (event: AaeSolanaSyncEvent): Promise<void> => dispatchBody(encodeSolanaSyncBody(event))
}

export function createSolanaSyncWebhookBodyDispatcher(args: {
  url: string
  bearerToken?: string
  fetchImpl?: typeof fetch
}) {
  const fetchImpl = args.fetchImpl ?? fetch
  return async (body: string): Promise<void> => {
    const response = await fetchImpl(args.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(args.bearerToken ? { Authorization: `Bearer ${args.bearerToken}` } : {}),
      },
      body,
    })
    if (!response.ok) {
      throw new Error(`Solana sync webhook failed (${response.status}): ${await response.text()}`)
    }
  }
}

interface PrismaSyncOutboxClient {
  solanaSyncOutbox: {
    findMany(args: {
      where: { deliveredAt: null }
      orderBy: { createdAt: 'asc' }
      take: number
    }): Promise<Array<{ id: string; payload: string }>>
    update(args: {
      where: { id: string }
      data:
        | { deliveredAt: Date; attempts: { increment: number }; lastError: null }
        | { attempts: { increment: number }; lastError: string }
    }): Promise<unknown>
  }
}

export function startSolanaSyncOutboxPolling(args: {
  client: PrismaSyncOutboxClient
  deliver: (payload: string) => Promise<void>
  intervalMs?: number
  batchSize?: number
}): { tick(): Promise<void>; stop(): void } {
  let active = false
  let stopped = false
  const tick = async () => {
    if (active || stopped) return
    active = true
    try {
      const rows = await args.client.solanaSyncOutbox.findMany({
        where: { deliveredAt: null },
        orderBy: { createdAt: 'asc' },
        take: args.batchSize ?? 100,
      })
      for (const row of rows) {
        try {
          await args.deliver(row.payload)
          await args.client.solanaSyncOutbox.update({
            where: { id: row.id },
            data: { deliveredAt: new Date(), attempts: { increment: 1 }, lastError: null },
          })
        } catch (error) {
          await args.client.solanaSyncOutbox.update({
            where: { id: row.id },
            data: {
              attempts: { increment: 1 },
              lastError: error instanceof Error ? error.message : String(error),
            },
          })
          break
        }
      }
    } finally {
      active = false
    }
  }
  const timer = setInterval(() => void tick(), args.intervalMs ?? 2_000)
  void tick()
  return {
    tick,
    stop: () => {
      stopped = true
      clearInterval(timer)
    },
  }
}

export function startSolanaSyncService(args: {
  store: SolanaSyncStore
  onEvent?: (event: AaeSolanaSyncEvent) => Promise<void>
  connection?: Connection
  programId?: PublicKey
  rpcUrls?: readonly string[]
}): SolanaSyncSubscription {
  const onEvent =
    args.onEvent ?? (async event => console.log('[SolanaSync]', encodeSolanaSyncBody(event)))
  const processBatch = createSolanaSyncBatchProcessor({ store: args.store, onEvent })
  let lastProcessedSlot: bigint | null = null
  let observedCursorSlot: bigint | null = null
  let processingTail = Promise.resolve()
  const processSignatureNow = async (connection: Connection, signature: string, slot: bigint) => {
    const transaction = await getFinalizedTransaction(connection, signature)
    const events = decodeAaeTransactionEvents({ signature, slot, transaction })
    if (await processBatch(events)) lastProcessedSlot = slot
  }
  const processSignature = (connection: Connection, signature: string, slot: bigint) => {
    const work = processingTail.then(() => processSignatureNow(connection, signature, slot))
    processingTail = work.catch(() => undefined)
    return work
  }
  const subscription = listenToSolanaEvents(
    async (logs, slot) => {
      if (!logs.logs.some(log => AAE_INSTRUCTION_LOGS.some(marker => log.includes(marker)))) return
      await processSignature(subscription.connection, logs.signature, slot)
    },
    {
      connection: args.connection,
      programId: args.programId,
      rpcUrls: args.rpcUrls,
      onConnectionReady: async connection => {
        const durableCursor = (await args.store.getLastProcessedSlot?.()) ?? null
        const cursor = durableCursor ?? observedCursorSlot
        if (cursor !== null) {
          await backfillSolanaSignatures({
            connection,
            programId: args.programId ?? AAE_SOLANA_PROGRAM_ID,
            cursorSlot: cursor,
            processSignature: (signature, slot) => processSignature(connection, signature, slot),
          })
        }
        observedCursorSlot = solanaSlotToBigInt(await connection.getSlot('finalized'))
      },
    }
  )
  return {
    get connection() {
      return subscription.connection
    },
    get subscriptionId() {
      return subscription.subscriptionId
    },
    stop: () => subscription.stop(),
    getHealth: async () => {
      const base = await subscription.getHealth()
      const persistedSlot = (await args.store.getLastProcessedSlot?.()) ?? null
      return {
        ...base,
        queueDepth: (await args.store.getQueueDepth?.()) ?? 0,
        lastProcessedSlot: lastProcessedSlot ?? persistedSlot,
      }
    },
  }
}

export interface SolanaSyncSubscription {
  readonly connection: Connection
  readonly subscriptionId: number
  getHealth(): Promise<SolanaServiceHealth>
  stop(): Promise<void>
}

/**
 * Subscribe to AAE program logs. Transaction decoding and persistence are
 * added below; this shell keeps the same WebSocket lifecycle as Pentacles.
 */
export function listenToSolanaEvents(
  onLogs: (logs: Logs, slot: bigint) => Promise<void>,
  options: {
    connection?: Connection
    programId?: PublicKey
    rpcUrls?: readonly string[]
    onConnectionReady?: (connection: Connection, reconnected: boolean) => Promise<void>
  } = {}
): SolanaSyncSubscription {
  const programId = options.programId ?? AAE_SOLANA_PROGRAM_ID
  const subscription = createResilientSolanaLogSubscription({
    programId,
    onLogs: (logs, slot) => onLogs(logs, solanaSlotToBigInt(slot)),
    connection: options.connection,
    rpcUrls: options.rpcUrls ?? resolveSolanaRpcUrls(),
    onConnectionReady: options.onConnectionReady,
  })
  return {
    get connection() {
      return subscription.connection
    },
    get subscriptionId() {
      return subscription.subscriptionId
    },
    getHealth: async () => subscription.getHealth(),
    stop: () => subscription.stop(),
  }
}
