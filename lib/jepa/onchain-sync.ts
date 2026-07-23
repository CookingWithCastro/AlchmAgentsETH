/**
 * Task 5: On-Chain State Sync Client (viem / Bun Native)
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Chain: Base Sepolia / Circle Arc
 */

import { createWalletClient, http, publicActions, type Hex } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { EMAMemoryMatrix } from './ema-memory'
import { AsyncCosmicContextEncoder } from './cosmic-context-encoder'
import { createHash } from 'crypto'

const defaultKey: Hex = '0x1111111111111111111111111111111111111111111111111111111111111111'
const privateKey = (process.env.AGENT_DEPLOYER_KEY as Hex) || defaultKey
const account = privateKeyToAccount(privateKey)

const client = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.RPC_URL),
}).extend(publicActions)

const REGISTRY_ADDRESS =
  (process.env.REGISTRY_ADDRESS as Hex) || '0x0000000000000000000000000000000000000000'

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

/**
 * Anchors agent's 64-dim TargetPersona vector hash and Cosmic Context epoch hash on-chain.
 */
export async function anchorPersonaState(agentId: string): Promise<Hex | null> {
  try {
    const state = EMAMemoryMatrix.getOrCreatePersona(agentId)
    const context = AsyncCosmicContextEncoder.getCachedContext()

    // Hash the 64-dim Float64Array to a bytes32 commitment
    const vectorBuffer = Buffer.from(state.targetPersona.buffer)
    const targetPersonaHash = `0x${createHash('sha256').update(vectorBuffer).digest('hex')}` as Hex
    const epochHashHex = `0x${context.epochHash.padEnd(64, '0').slice(0, 64)}` as Hex

    // Simulate ENS node hash for the agent (e.g., mars.planetaryagents.eth)
    const agentNode = `0x${createHash('sha256').update(agentId).digest('hex')}` as Hex

    if (REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log(
        `[OnChainSync] Mock Anchored ${agentId}: Node=${agentNode.slice(0, 10)}... VectorHash=${targetPersonaHash.slice(0, 10)}... Epoch=${epochHashHex.slice(0, 10)}...`
      )
      return targetPersonaHash
    }

    const { request } = await client.simulateContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'anchorAgentState',
      args: [agentNode, targetPersonaHash, epochHashHex],
    })

    const txHash = await client.writeContract(request)
    return txHash
  } catch (err: any) {
    console.error(`[OnChainSync] Failed to anchor state for ${agentId}:`, err?.message || err)
    return null
  }
}
