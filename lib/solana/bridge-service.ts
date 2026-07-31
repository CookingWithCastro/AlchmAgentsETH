import { createHash } from 'node:crypto'
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'

import { AaeSolanaClient, type EsmsAmounts } from '@/lib/solana/aae-solana-client'
import { AAE_BASE_SEPOLIA_ESMS_ADDRESS } from '@/lib/solana/base-sepolia-esms'
import { AAE_SOLANA_PROGRAM_ID } from '@/lib/solana/esms'
import {
  resolveSolanaRpcUrls,
  withSolanaRpcFailover,
  type SolanaServiceHealth,
} from '@/lib/solana/rpc-failover'
import {
  decodeAaeTransactionEvents,
  solanaSlotToBigInt,
  startSolanaSyncService,
  type AaeSolanaSyncEvent,
  type SolanaSyncSubscription,
} from '@/lib/solana/solana-sync-service'

export { AAE_BASE_SEPOLIA_ESMS_ADDRESS } from '@/lib/solana/base-sepolia-esms'
export const EVM_ATOMS_PER_SOLANA_ATOM = 100_000_000_000_000n
const MAX_U64 = (1n << 64n) - 1n
const EVM_HASH = /^0x[0-9a-f]{64}$/i
const SOLANA_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/

export type BridgeChain = 'EvmBaseSepolia' | 'SolanaToken2022'

export interface PendingBridgeTransfer {
  claimId: Hex
  sourceTxHash: string
  sourceChain: BridgeChain
  targetChain: BridgeChain
  sourceAddress: string
  targetAddress: string
  elementId: number
  /** Raw amount on the source chain. */
  amount: bigint
  status: 'PendingMint'
  sourceReceiptId?: Hex
  sourceSlot?: bigint
}

function scalar(value: unknown): string {
  if (value && typeof value === 'object' && 'tag' in value) {
    return String((value as { tag: unknown }).tag)
  }
  return String(value ?? '')
}

function field(row: Record<string, unknown>, camel: string, snake: string): unknown {
  return row[camel] ?? row[snake]
}

function normalizeClaimId(value: string): Hex {
  const withPrefix = value.startsWith('0x') ? value : `0x${value}`
  if (!/^0x[0-9a-f]{64}$/i.test(withPrefix)) throw new Error('bridge claimId must be bytes32')
  return withPrefix.toLowerCase() as Hex
}

function normalizeChain(value: unknown): BridgeChain {
  const chain = scalar(value)
  if (chain === 'EvmBaseSepolia' || chain === 'eip155:84532') return 'EvmBaseSepolia'
  if (chain === 'SolanaToken2022' || chain === 'solana:devnet') return 'SolanaToken2022'
  throw new Error(`unsupported bridge chain: ${chain}`)
}

export function parsePendingBridge(row: Record<string, unknown>): PendingBridgeTransfer {
  const sourceChain = normalizeChain(field(row, 'sourceChain', 'source_chain'))
  const targetChain = normalizeChain(field(row, 'targetChain', 'target_chain'))
  const status = scalar(row.status)
  const sourceTxHash = scalar(field(row, 'sourceTxHash', 'source_tx_hash'))
  const sourceAddress = scalar(field(row, 'sourceAddress', 'source_address'))
  const targetAddress = scalar(field(row, 'targetAddress', 'target_address'))
  const sourceReceipt = scalar(field(row, 'sourceReceiptId', 'source_receipt_id'))
  const sourceSlot = scalar(field(row, 'sourceSlot', 'source_slot'))
  const elementId = Number(field(row, 'elementId', 'element_id'))
  const amount = BigInt(scalar(row.amount))
  if (status !== 'PendingMint') throw new Error('bridge transfer is not pending')
  if (sourceChain === targetChain) {
    throw new Error('invalid bridge chain pair')
  }
  if (!Number.isInteger(elementId) || elementId < 0 || elementId > 3 || amount <= 0n) {
    throw new Error('invalid bridge element or amount')
  }
  if (sourceChain === 'SolanaToken2022' && amount > MAX_U64) {
    throw new Error('bridge amount exceeds Solana u64')
  }
  return {
    claimId: normalizeClaimId(scalar(field(row, 'claimId', 'claim_id'))),
    sourceTxHash,
    sourceChain,
    targetChain,
    sourceAddress,
    targetAddress,
    elementId,
    amount,
    status: 'PendingMint',
    ...(sourceReceipt ? { sourceReceiptId: normalizeClaimId(sourceReceipt) } : {}),
    ...(sourceSlot ? { sourceSlot: BigInt(sourceSlot) } : {}),
  }
}

/** Convert without rounding between EVM's 18 decimals and Solana's 4 decimals. */
export function destinationAmount(transfer: PendingBridgeTransfer): bigint {
  if (transfer.sourceChain === 'SolanaToken2022') {
    return transfer.amount * EVM_ATOMS_PER_SOLANA_ATOM
  }
  if (transfer.amount % EVM_ATOMS_PER_SOLANA_ATOM !== 0n) {
    throw new Error('EVM bridge amount has dust below the Solana 4-decimal boundary')
  }
  const amount = transfer.amount / EVM_ATOMS_PER_SOLANA_ATOM
  if (amount > MAX_U64) throw new Error('bridge amount exceeds Solana u64')
  return amount
}

export interface BridgeStore {
  hasProcessed(sourceTxHash: string): Promise<boolean>
  completeTransfer(claimId: string, destinationTxHash: string): Promise<void>
  recordProcessed(transfer: PendingBridgeTransfer): Promise<void>
}

interface PrismaBridgeClient {
  solanaProcessedTx: {
    findUnique(args: {
      where: { signature: string }
      select: { signature: true }
    }): Promise<{ signature: string } | null>
    create(args: { data: { signature: string; slot: bigint; eventType: string } }): Promise<unknown>
  }
  solanaBridgeTransfer: {
    update(args: {
      where: { claimId: string }
      data: { status: string; destinationTxHash: string }
    }): Promise<unknown>
  }
}

export function createPrismaBridgeStore(client: PrismaBridgeClient): BridgeStore {
  const replayKey = (signature: string) => `bridge:${signature}`
  return {
    hasProcessed: async signature =>
      Boolean(
        await client.solanaProcessedTx.findUnique({
          where: { signature: replayKey(signature) },
          select: { signature: true },
        })
      ),
    completeTransfer: async (claimId, destinationTxHash) => {
      await client.solanaBridgeTransfer.update({
        where: { claimId },
        data: { status: 'Completed', destinationTxHash },
      })
    },
    recordProcessed: async transfer => {
      await client.solanaProcessedTx.create({
        data: {
          signature: replayKey(transfer.sourceTxHash),
          slot: transfer.sourceSlot ?? 0n,
          eventType: `Bridge:${transfer.sourceChain}:${transfer.targetChain}`,
        },
      })
    },
  }
}

export function createBridgeProcessor(args: {
  store: BridgeStore
  verifyEvmSource: (transfer: PendingBridgeTransfer) => Promise<void>
  verifySolanaSource: (transfer: PendingBridgeTransfer) => Promise<void>
  mintEvmDestination: (transfer: PendingBridgeTransfer) => Promise<string>
  mintSolanaDestination: (transfer: PendingBridgeTransfer) => Promise<string>
}) {
  return async (input: PendingBridgeTransfer | Record<string, unknown>): Promise<boolean> => {
    const transfer =
      typeof input.amount === 'bigint'
        ? (input as PendingBridgeTransfer)
        : parsePendingBridge(input as Record<string, unknown>)
    // Preserve Pentacles' ordering: the durable replay check occurs before any
    // source RPC or destination-chain transaction is dispatched.
    if (await args.store.hasProcessed(transfer.sourceTxHash)) return false
    if (transfer.sourceChain === 'EvmBaseSepolia') await args.verifyEvmSource(transfer)
    else await args.verifySolanaSource(transfer)
    const destinationTxHash =
      transfer.targetChain === 'EvmBaseSepolia'
        ? await args.mintEvmDestination(transfer)
        : await args.mintSolanaDestination(transfer)
    await args.store.completeTransfer(transfer.claimId, destinationTxHash)
    await args.store.recordProcessed(transfer)
    return true
  }
}

export const AAE_ESMS_BRIDGE_ABI = [
  {
    type: 'function',
    name: 'claimMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'claimId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'ClaimExecuted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'claimId', type: 'bytes32', indexed: true },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Redeemed',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'orderId', type: 'bytes32', indexed: true },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
    ],
    anonymous: false,
  },
] as const

function exactEvmElement(
  ids: readonly bigint[],
  amounts: readonly bigint[],
  transfer: PendingBridgeTransfer
): boolean {
  return (
    ids.length === 1 &&
    amounts.length === 1 &&
    ids[0] === BigInt(transfer.elementId) &&
    amounts[0] === transfer.amount
  )
}

function exactSolanaElement(amounts: readonly bigint[], transfer: PendingBridgeTransfer): boolean {
  return amounts.every((amount, index) =>
    index === transfer.elementId ? amount === transfer.amount : amount === 0n
  )
}

export async function verifyEvmBridgeSource(args: {
  transfer: PendingBridgeTransfer
  publicClient: PublicClient
  contractAddress?: Address
  confirmations?: number
}): Promise<void> {
  const { transfer } = args
  if (!EVM_HASH.test(transfer.sourceTxHash)) throw new Error('invalid Base Sepolia source hash')
  const receipt = await args.publicClient.getTransactionReceipt({
    hash: transfer.sourceTxHash as Hex,
  })
  if (receipt.status !== 'success') throw new Error('Base Sepolia source transaction reverted')
  const confirmations = BigInt(args.confirmations ?? 12)
  const latestBlock = await args.publicClient.getBlockNumber({ cacheTime: 0 })
  if (latestBlock - receipt.blockNumber + 1n < confirmations) {
    throw new Error(`Base Sepolia source is awaiting ${confirmations} confirmations`)
  }
  const contractAddress = args.contractAddress ?? AAE_BASE_SEPOLIA_ESMS_ADDRESS
  const expectedFrom = getAddress(transfer.sourceAddress)
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({
        abi: AAE_ESMS_BRIDGE_ABI,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName !== 'Redeemed') continue
      const event = decoded.args
      if (
        getAddress(event.from) === expectedFrom &&
        (!transfer.sourceReceiptId ||
          event.orderId.toLowerCase() === transfer.sourceReceiptId.toLowerCase()) &&
        exactEvmElement(event.ids, event.amounts, transfer)
      ) {
        return
      }
    } catch {
      // Ignore unrelated contract logs.
    }
  }
  throw new Error('transaction does not contain the claimed ESMS redeem')
}

export function createEvmDestinationMinter(args: {
  publicClient?: PublicClient
  walletClient: WalletClient
  contractAddress?: Address
  confirmations?: number
}) {
  const publicClient: PublicClient =
    args.publicClient ??
    (createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'),
    }) as unknown as PublicClient)
  const contractAddress = args.contractAddress ?? AAE_BASE_SEPOLIA_ESMS_ADDRESS
  return async (transfer: PendingBridgeTransfer): Promise<string> => {
    const existing = await publicClient.readContract({
      address: contractAddress,
      abi: AAE_ESMS_BRIDGE_ABI,
      functionName: 'claimed',
      args: [transfer.claimId],
    })
    if (existing) {
      const existingHash = await findEvmDestinationClaim({
        publicClient,
        contractAddress,
        transfer,
        confirmations: args.confirmations ?? 12,
      })
      if (!existingHash) throw new Error('existing EVM bridge mint could not be reconciled')
      return existingHash
    }
    const account = args.walletClient.account
    if (!account) throw new Error('EVM bridge wallet client has no account')
    const hash = await args.walletClient.writeContract({
      account,
      chain: baseSepolia,
      address: contractAddress,
      abi: AAE_ESMS_BRIDGE_ABI,
      functionName: 'claimMint',
      args: [
        getAddress(transfer.targetAddress),
        transfer.claimId,
        [BigInt(transfer.elementId)],
        [destinationAmount(transfer)],
      ],
    })
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: args.confirmations ?? 12,
    })
    if (receipt.status !== 'success') throw new Error('EVM bridge mint reverted')
    const exactMint = receipt.logs.some(log => {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) return false
      try {
        const decoded = decodeEventLog({
          abi: AAE_ESMS_BRIDGE_ABI,
          data: log.data,
          topics: log.topics,
        })
        return (
          decoded.eventName === 'ClaimExecuted' &&
          getAddress(decoded.args.to) === getAddress(transfer.targetAddress) &&
          decoded.args.claimId.toLowerCase() === transfer.claimId.toLowerCase() &&
          decoded.args.ids.length === 1 &&
          decoded.args.ids[0] === BigInt(transfer.elementId) &&
          decoded.args.amounts.length === 1 &&
          decoded.args.amounts[0] === destinationAmount(transfer)
        )
      } catch {
        return false
      }
    })
    if (!exactMint) throw new Error('EVM receipt did not contain the exact bridge mint')
    return hash
  }
}

async function findEvmDestinationClaim(args: {
  publicClient: PublicClient
  contractAddress: Address
  transfer: PendingBridgeTransfer
  confirmations: number
}): Promise<Hex | null> {
  const latest = await args.publicClient.getBlockNumber({ cacheTime: 0 })
  const confirmationOffset = BigInt(Math.max(0, args.confirmations - 1))
  const finalBlock = latest >= confirmationOffset ? latest - confirmationOffset : 0n
  const floor = finalBlock > 50_000n ? finalBlock - 50_000n : 0n
  const event = AAE_ESMS_BRIDGE_ABI.find(
    item => item.type === 'event' && item.name === 'ClaimExecuted'
  )!
  for (let toBlock = finalBlock; toBlock >= floor; ) {
    const fromBlock = toBlock > floor + 1_999n ? toBlock - 1_999n : floor
    const logs = await args.publicClient.getLogs({
      address: args.contractAddress,
      event,
      args: { to: getAddress(args.transfer.targetAddress), claimId: args.transfer.claimId },
      fromBlock,
      toBlock,
    })
    for (const log of [...logs].reverse()) {
      try {
        const decoded = decodeEventLog({
          abi: AAE_ESMS_BRIDGE_ABI,
          data: log.data,
          topics: log.topics,
        })
        if (
          decoded.eventName === 'ClaimExecuted' &&
          getAddress(decoded.args.to) === getAddress(args.transfer.targetAddress) &&
          decoded.args.claimId.toLowerCase() === args.transfer.claimId.toLowerCase() &&
          decoded.args.ids.length === 1 &&
          decoded.args.ids[0] === BigInt(args.transfer.elementId) &&
          decoded.args.amounts.length === 1 &&
          decoded.args.amounts[0] === destinationAmount(args.transfer)
        ) {
          return log.transactionHash
        }
      } catch {
        // Keep scanning older claim logs.
      }
    }
    if (fromBlock === floor) break
    toBlock = fromBlock - 1n
  }
  return null
}

export async function verifySolanaBridgeSource(args: {
  transfer: PendingBridgeTransfer
  connection: Connection
}): Promise<void> {
  const { transfer } = args
  if (!SOLANA_SIGNATURE.test(transfer.sourceTxHash))
    throw new Error('invalid Solana source signature')
  const transaction = await args.connection.getTransaction(transfer.sourceTxHash, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  })
  if (!transaction || transaction.meta?.err) {
    throw new Error('Solana source transaction is missing or failed')
  }
  const events = decodeAaeTransactionEvents({
    signature: transfer.sourceTxHash,
    slot: solanaSlotToBigInt(transaction.slot),
    transaction,
  })
  const exact = events.some(event => {
    if (event.eventType !== 'OrderReceipt') return false
    return (
      event.holder === new PublicKey(transfer.sourceAddress).toBase58() &&
      (!transfer.sourceReceiptId ||
        event.orderId === transfer.sourceReceiptId.slice(2).toLowerCase()) &&
      exactSolanaElement(event.amounts, transfer)
    )
  })
  if (!exact) throw new Error('transaction does not contain the claimed Token-2022 redeem')
}

async function getSolanaTransaction(connection: Connection, signature: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    })
    if (transaction) return transaction
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
  }
  return null
}

function bridgeLedgerReference(transfer: PendingBridgeTransfer): Uint8Array {
  return createHash('sha256')
    .update(`AAE_BRIDGE:${transfer.sourceChain}:${transfer.sourceTxHash}`)
    .digest()
}

function claimBytes(transfer: PendingBridgeTransfer): Uint8Array {
  return Uint8Array.from(Buffer.from(transfer.claimId.slice(2), 'hex'))
}

function destinationAmounts(transfer: PendingBridgeTransfer): EsmsAmounts {
  const amounts: [bigint, bigint, bigint, bigint] = [0n, 0n, 0n, 0n]
  amounts[transfer.elementId] = destinationAmount(transfer)
  return amounts
}

async function isExactSolanaDestinationMint(args: {
  client: AaeSolanaClient
  transfer: PendingBridgeTransfer
  signature: string
}): Promise<boolean> {
  const transaction = await getSolanaTransaction(args.client.connection, args.signature)
  if (!transaction || transaction.meta?.err) return false
  const events = decodeAaeTransactionEvents({
    signature: args.signature,
    slot: solanaSlotToBigInt(transaction.slot),
    transaction,
  })
  const expectedAmounts = destinationAmounts(args.transfer)
  return events.some(
    event =>
      event.eventType === 'ClaimMintReceipt' &&
      event.claimId === args.transfer.claimId.slice(2).toLowerCase() &&
      event.recipient === new PublicKey(args.transfer.targetAddress).toBase58() &&
      event.amounts.every((amount, index) => amount === expectedAmounts[index])
  )
}

async function mintSolanaDestinationOnce(
  client: AaeSolanaClient,
  transfer: PendingBridgeTransfer
): Promise<string> {
  const claimId = claimBytes(transfer)
  const receipt = client.getClaimReceiptAddress(claimId)
  if (await client.connection.getAccountInfo(receipt, 'finalized')) {
    const signatures = await client.connection.getSignaturesForAddress(receipt, {
      limit: 10,
    })
    for (const existing of signatures) {
      if (
        await isExactSolanaDestinationMint({
          client,
          transfer,
          signature: existing.signature,
        })
      ) {
        return existing.signature
      }
    }
    throw new Error('existing Solana bridge mint could not be reconciled')
  }
  const instruction = await client.buildClaimMintEsmsInstruction({
    claimId,
    ledgerReferenceHash: bridgeLedgerReference(transfer),
    recipient: new PublicKey(transfer.targetAddress),
    amounts: destinationAmounts(transfer),
  })
  const latest = await client.connection.getLatestBlockhash('finalized')
  const transaction = new Transaction({
    feePayer: client.wallet.publicKey,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  }).add(instruction)
  const signed = await client.wallet.signTransaction(transaction)
  const signature = await client.connection.sendRawTransaction(signed.serialize())
  await client.connection.confirmTransaction({ signature, ...latest }, 'finalized')
  if (!(await isExactSolanaDestinationMint({ client, transfer, signature }))) {
    throw new Error('Solana receipt did not contain the exact bridge mint')
  }
  return signature
}

export function createSolanaDestinationMinter(args: {
  client: AaeSolanaClient
  rpcUrls?: readonly string[]
  connectionFactory?: (rpcUrl: string) => Connection
}) {
  const rpcUrls = [
    args.client.connection.rpcEndpoint,
    ...(args.rpcUrls ?? resolveSolanaRpcUrls()),
  ].filter((value, index, values) => values.indexOf(value) === index)
  return (transfer: PendingBridgeTransfer): Promise<string> =>
    withSolanaRpcFailover({
      rpcUrls,
      connectionFactory: args.connectionFactory,
      operation: connection =>
        mintSolanaDestinationOnce(
          new AaeSolanaClient({ connection, wallet: args.client.wallet }),
          transfer
        ),
    })
}

export function createAaeBridgeProcessor(args: {
  store: BridgeStore
  solanaClient: AaeSolanaClient
  evmPublicClient: PublicClient
  evmWalletClient: WalletClient
  evmConfirmations?: number
  solanaRpcUrls?: readonly string[]
  solanaConnectionFactory?: (rpcUrl: string) => Connection
}) {
  const rpcUrls = [
    args.solanaClient.connection.rpcEndpoint,
    ...(args.solanaRpcUrls ?? resolveSolanaRpcUrls()),
  ].filter((value, index, values) => values.indexOf(value) === index)
  return createBridgeProcessor({
    store: args.store,
    verifyEvmSource: transfer =>
      verifyEvmBridgeSource({
        transfer,
        publicClient: args.evmPublicClient,
        confirmations: args.evmConfirmations,
      }),
    verifySolanaSource: transfer =>
      withSolanaRpcFailover({
        rpcUrls,
        connectionFactory: args.solanaConnectionFactory,
        operation: connection => verifySolanaBridgeSource({ transfer, connection }),
      }),
    mintEvmDestination: createEvmDestinationMinter({
      publicClient: args.evmPublicClient,
      walletClient: args.evmWalletClient,
      confirmations: args.evmConfirmations,
    }),
    mintSolanaDestination: createSolanaDestinationMinter({
      client: args.solanaClient,
      rpcUrls,
      connectionFactory: args.solanaConnectionFactory,
    }),
  })
}

interface PrismaBridgeQueueClient {
  solanaBridgeTransfer: {
    findMany(args: {
      where: { status: string }
      orderBy: { updatedAt: 'asc' }
      take: number
    }): Promise<unknown[]>
    count(args: { where: { status: string } }): Promise<number>
  }
}

export interface BridgeRelayPolling {
  tick(): Promise<void>
  stop(): void
  getHealth(): Promise<SolanaServiceHealth>
}

export function startBridgeRelayPolling(args: {
  client: PrismaBridgeQueueClient
  processTransfer: (transfer: Record<string, unknown>) => Promise<boolean>
  intervalMs?: number
  batchSize?: number
  onError?: (error: unknown, row?: Record<string, unknown>) => void
}): BridgeRelayPolling {
  let active = false
  let stopped = false
  let lastProcessedSlot: bigint | null = null
  let lastError: string | null = null
  const tick = async () => {
    if (active || stopped) return
    active = true
    try {
      const rows = await args.client.solanaBridgeTransfer.findMany({
        where: { status: 'PendingMint' },
        orderBy: { updatedAt: 'asc' },
        take: args.batchSize ?? 25,
      })
      for (const value of rows) {
        const row = value as Record<string, unknown>
        try {
          const processed = await args.processTransfer(row)
          if (processed && row.sourceSlot != null)
            lastProcessedSlot = BigInt(String(row.sourceSlot))
          lastError = null
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
          args.onError?.(error, row)
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      args.onError?.(error)
    } finally {
      active = false
    }
  }
  const timer = setInterval(() => void tick(), args.intervalMs ?? 5_000)
  void tick()
  return {
    tick,
    getHealth: async () => ({
      connectionStatus: stopped ? 'stopped' : lastError ? 'degraded' : 'connected',
      activeRpc: null,
      reconnectAttempts: 0,
      queueDepth: await args.client.solanaBridgeTransfer.count({
        where: { status: 'PendingMint' },
      }),
      lastProcessedSlot,
      lastError,
    }),
    stop: () => {
      stopped = true
      clearInterval(timer)
    },
  }
}

export function createBaseSepoliaClients(privateKey: Hex) {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'),
  })
  // Account construction stays at the executable boundary so importing this
  // module never reads or materializes a private key.
  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'),
    account: privateKeyToAccount(privateKey),
  })
  return { publicClient, walletClient }
}

export interface BridgeSourceListeners {
  getHealth(): Promise<SolanaServiceHealth>
  stop(): Promise<void>
}

/**
 * Observe both settlement domains. These listeners intentionally only enqueue
 * observed receipts; the processor above consumes explicit PendingMint rows so
 * an ordinary ledger claim is never silently mirrored to a second chain.
 */
export function listenToBridgeSourceEvents(args: {
  onEvmEvent: (event: unknown) => Promise<void>
  onSolanaEvent: (event: AaeSolanaSyncEvent) => Promise<void>
  publicClient?: PublicClient
  rpcUrls?: readonly string[]
}): BridgeSourceListeners {
  const publicClient =
    args.publicClient ??
    createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'),
    })
  const unwatchClaim = publicClient.watchContractEvent({
    address: AAE_BASE_SEPOLIA_ESMS_ADDRESS,
    abi: AAE_ESMS_BRIDGE_ABI,
    eventName: 'ClaimExecuted',
    onLogs: logs => void Promise.all(logs.map(args.onEvmEvent)),
  })
  const unwatchRedeem = publicClient.watchContractEvent({
    address: AAE_BASE_SEPOLIA_ESMS_ADDRESS,
    abi: AAE_ESMS_BRIDGE_ABI,
    eventName: 'Redeemed',
    onLogs: logs => void Promise.all(logs.map(args.onEvmEvent)),
  })
  let solanaSubscription: SolanaSyncSubscription | undefined
  solanaSubscription = startSolanaSyncService({
    store: {
      hasProcessed: async () => false,
      recordProcessed: async () => undefined,
    },
    onEvent: args.onSolanaEvent,
    programId: AAE_SOLANA_PROGRAM_ID,
    rpcUrls: args.rpcUrls,
  })
  return {
    getHealth: () => solanaSubscription!.getHealth(),
    stop: async () => {
      unwatchClaim()
      unwatchRedeem()
      await solanaSubscription?.stop()
    },
  }
}
