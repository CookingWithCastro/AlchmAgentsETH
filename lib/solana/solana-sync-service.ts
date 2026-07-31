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

export function solanaSlotToBigInt(slot: number): bigint {
  if (!Number.isSafeInteger(slot) || slot < 0) {
    throw new RangeError('Solana SDK slot must be a non-negative safe integer')
  }
  return BigInt(slot)
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
}): SolanaSyncSubscription {
  const connection =
    args.connection ??
    new Connection(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com', 'finalized')
  const onEvent =
    args.onEvent ?? (async event => console.log('[SolanaSync]', encodeSolanaSyncBody(event)))
  const processBatch = createSolanaSyncBatchProcessor({ store: args.store, onEvent })
  return listenToSolanaEvents(
    async (logs, slot) => {
      if (!logs.logs.some(log => AAE_INSTRUCTION_LOGS.some(marker => log.includes(marker)))) return
      const transaction = await getFinalizedTransaction(connection, logs.signature)
      const events = decodeAaeTransactionEvents({
        signature: logs.signature,
        slot,
        transaction,
      })
      await processBatch(events)
    },
    { connection, programId: args.programId }
  )
}

export interface SolanaSyncSubscription {
  connection: Connection
  subscriptionId: number
  stop(): Promise<void>
}

/**
 * Subscribe to AAE program logs. Transaction decoding and persistence are
 * added below; this shell keeps the same WebSocket lifecycle as Pentacles.
 */
export function listenToSolanaEvents(
  onLogs: (logs: Logs, slot: bigint) => Promise<void>,
  options: { connection?: Connection; programId?: PublicKey } = {}
): SolanaSyncSubscription {
  const connection =
    options.connection ??
    new Connection(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com', 'finalized')
  const programId = options.programId ?? AAE_SOLANA_PROGRAM_ID
  const subscriptionId = connection.onLogs(
    programId,
    async (logs, context) => {
      if (logs.err) return
      await onLogs(logs, solanaSlotToBigInt(context.slot))
    },
    'finalized'
  )
  return {
    connection,
    subscriptionId,
    stop: async () => {
      await connection.removeOnLogsListener(subscriptionId)
    },
  }
}
