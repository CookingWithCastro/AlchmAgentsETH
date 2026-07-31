/** Dual-chain JEPA persona commitment publisher (Base Sepolia + Solana Devnet). */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Wallet } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { createWalletClient, http, publicActions, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

import { AaeSolanaClient } from '@/lib/solana/aae-solana-client'
import { solanaAgentIdBytes } from '@/lib/solana/agent-metadata'
import { resolveSolanaRpcUrls, withSolanaRpcFailover } from '@/lib/solana/rpc-failover'
import { AsyncCosmicContextEncoder } from '@/lib/jepa/cosmic-context-encoder'
import { EMAMemoryMatrix } from '@/lib/jepa/ema-memory'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex

const REGISTRY_ABI = [
  {
    inputs: [
      { name: 'agentNode', type: 'bytes32' },
      { name: '_targetPersonaHash', type: 'bytes32' },
      { name: '_epochHash', type: 'bytes32' },
    ],
    name: 'anchorAgentState',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export interface PersonaCommitments {
  agentId: Uint8Array
  agentNode: Hex
  targetPersonaHash: Uint8Array
  targetPersonaHashHex: Hex
  epochHash: Uint8Array
  epochHashHex: Hex
}

export interface ChainAnchorResult {
  status: 'submitted' | 'skipped' | 'failed'
  transactionHash?: string
  reason?: string
}

export interface DualChainAnchorResult {
  agentId: string
  commitments: PersonaCommitments
  evm: ChainAnchorResult
  solana: ChainAnchorResult
}

interface AnchorInput {
  agentId: string
  commitments: PersonaCommitments
}

export interface AnchorPersonaStateDependencies {
  state?: { targetPersona: Float64Array }
  context?: { epochHash: string }
  anchorEvm?: (input: AnchorInput) => Promise<string | null>
  anchorSolana?: (input: AnchorInput) => Promise<string | null>
}

function sha256(value: string | Uint8Array): Uint8Array {
  return Uint8Array.from(createHash('sha256').update(value).digest())
}

function bytesHex(value: Uint8Array): Hex {
  return `0x${Buffer.from(value).toString('hex')}` as Hex
}

function epochCommitment(epochHash: string): Uint8Array {
  return /^[0-9a-f]{64}$/i.test(epochHash)
    ? Uint8Array.from(Buffer.from(epochHash, 'hex'))
    : sha256(epochHash)
}

export function buildPersonaCommitments(args: {
  agentId: string
  targetPersona: Float64Array
  epochHash: string
}): PersonaCommitments {
  const vector = Buffer.from(
    args.targetPersona.buffer,
    args.targetPersona.byteOffset,
    args.targetPersona.byteLength
  )
  const targetPersonaHash = sha256(vector)
  const epochHash = epochCommitment(args.epochHash)
  const agentId = solanaAgentIdBytes(args.agentId)
  return {
    agentId,
    agentNode: bytesHex(agentId),
    targetPersonaHash,
    targetPersonaHashHex: bytesHex(targetPersonaHash),
    epochHash,
    epochHashHex: bytesHex(epochHash),
  }
}

function solanaPayerFromEnvironment(): Keypair | null {
  let raw = process.env.SOLANA_AGENT_PAYER_KEY?.trim()
  if (!raw && process.env.NODE_ENV !== 'production') {
    const localPath =
      process.env.SOLANA_AGENT_PAYER_PATH ??
      process.env.ANCHOR_WALLET ??
      join(homedir(), '.config', 'solana', 'id.json')
    try {
      raw = readFileSync(localPath, 'utf8').trim()
    } catch {
      return null
    }
  }
  if (!raw) return null
  try {
    const bytes = raw.startsWith('[')
      ? Uint8Array.from((JSON.parse(raw) as unknown[]).map(Number))
      : bs58.decode(raw)
    if (bytes.length !== 64) throw new Error('expected a 64-byte secret key')
    return Keypair.fromSecretKey(bytes)
  } catch (error) {
    throw new Error(
      `SOLANA_AGENT_PAYER_KEY is invalid: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function anchorEvmDefault(input: AnchorInput): Promise<string | null> {
  const registry = (process.env.REGISTRY_ADDRESS as Hex | undefined) ?? ZERO_ADDRESS
  const key = process.env.AGENT_DEPLOYER_KEY as Hex | undefined
  if (registry === ZERO_ADDRESS || !key) return null
  const account = privateKeyToAccount(key)
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? process.env.RPC_URL),
  }).extend(publicActions)
  const { request } = await client.simulateContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: 'anchorAgentState',
    args: [
      input.commitments.agentNode,
      input.commitments.targetPersonaHashHex,
      input.commitments.epochHashHex,
    ],
  })
  return client.writeContract(request)
}

async function anchorSolanaDefault(input: AnchorInput): Promise<string | null> {
  const payer = solanaPayerFromEnvironment()
  if (!payer) return null
  const wallet = new Wallet(payer)
  return withSolanaRpcFailover({
    rpcUrls: resolveSolanaRpcUrls(),
    operation: connection =>
      new AaeSolanaClient({ connection, wallet }).recordPersonaCommitment({
        agentId: input.commitments.agentId,
        targetPersonaHash: input.commitments.targetPersonaHash,
        epochHash: input.commitments.epochHash,
      }),
  })
}

async function settleAnchor(
  label: 'EVM' | 'Solana',
  publish: (input: AnchorInput) => Promise<string | null>,
  input: AnchorInput
): Promise<ChainAnchorResult> {
  try {
    const transactionHash = await publish(input)
    if (!transactionHash) {
      return {
        status: 'skipped',
        reason:
          label === 'EVM'
            ? 'REGISTRY_ADDRESS or AGENT_DEPLOYER_KEY is unconfigured'
            : 'SOLANA_AGENT_PAYER_KEY is unconfigured',
      }
    }
    return { status: 'submitted', transactionHash }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`[OnChainSync] ${label} anchor failed for ${input.agentId}:`, reason)
    return { status: 'failed', reason }
  }
}

/**
 * Publish one canonical pair of bytes32 commitments to both chains. A failure
 * on one settlement domain never suppresses the attempt on the other.
 */
export async function anchorPersonaState(
  agentId: string,
  dependencies: AnchorPersonaStateDependencies = {}
): Promise<DualChainAnchorResult> {
  const state = dependencies.state ?? EMAMemoryMatrix.getOrCreatePersona(agentId)
  const context = dependencies.context ?? AsyncCosmicContextEncoder.getCachedContext()
  const commitments = buildPersonaCommitments({
    agentId,
    targetPersona: state.targetPersona,
    epochHash: context.epochHash,
  })
  const input = { agentId, commitments }
  const [evm, solana] = await Promise.all([
    settleAnchor('EVM', dependencies.anchorEvm ?? anchorEvmDefault, input),
    settleAnchor('Solana', dependencies.anchorSolana ?? anchorSolanaDefault, input),
  ])
  return { agentId, commitments, evm, solana }
}
