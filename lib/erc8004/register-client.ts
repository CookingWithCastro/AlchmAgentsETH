/**
 * ERC-8004 register() client — mints an agent NFT on the IdentityRegistry by
 * calling `register(agentURI)`, where agentURI is the agent's registration file
 * encoded as a `data:` URI. Defaults to **Arc testnet** (registry pre-deployed at
 * 0x8004A818…, gas paid in USDC) to anchor the Circle/Arc bounty.
 *
 * Signing mirrors lib/esms-chain/minter.ts: prefer a Privy server wallet
 * (PRIVY_MINTER_WALLET_ID, no raw key), fall back to a viem private key
 * (ERC8004_DEPLOYER_PRIVATE_KEY or MINTER_PRIVATE_KEY) for local/testnet.
 *
 * After the tx confirms, the `agentId` (ERC-721 tokenId) is read from the
 * `Registered` event — feed it into the ENSIP-25 `agent-registration` record
 * (see lib/erc8004/ensip.ts → agentRegistrationKey).
 *
 * ⚠️ Set ARC_TESTNET_CHAIN_ID before any live Arc send — the chainId was not
 * confirmed during research (RPC https://rpc.testnet.arc.io/).
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  decodeEventLog,
  encodeFunctionData,
  http,
  type Address,
  type Chain,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { getPrivyClient } from '@/lib/privy/server'
import {
  ARC_TESTNET,
  ERC8004_ADDRESSES,
  IDENTITY_REGISTRY_ABI,
  TOPIC0,
  globalAgentId,
} from './registry'
import {
  buildRegistrationFile,
  toDataUri,
  type BuildRegistrationFileInput,
  type Erc8004RegistrationFile,
} from './registration-file'

export type Erc8004Network = 'mainnet' | 'testnet' | 'arcTestnet'

/** viem chain for the Arc testnet (chainId via env — confirm before signing). */
export function arcTestnetChain(): Chain {
  const id = Number(process.env.ARC_TESTNET_CHAIN_ID ?? ARC_TESTNET.id)
  if (!id) {
    throw new Error('ARC_TESTNET_CHAIN_ID is not set — confirm Arc testnet chainId before signing')
  }
  return defineChain({
    id,
    name: ARC_TESTNET.name,
    // Arc gas is paid in USDC-TESTNET; decimals here are for display only.
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
    rpcUrls: { default: { http: [process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET.rpcUrl] } },
    blockExplorers: { default: { name: 'Arcscan', url: ARC_TESTNET.explorer } },
  })
}

function chainFor(network: Erc8004Network): Chain {
  switch (network) {
    case 'mainnet':
      return mainnet
    case 'testnet':
      return sepolia
    case 'arcTestnet':
    default:
      return arcTestnetChain()
  }
}

function registryFor(network: Erc8004Network): Address {
  return ERC8004_ADDRESSES[network].identity
}

function rpcFor(chain: Chain): string | undefined {
  return process.env.ERC8004_RPC_URL ?? chain.rpcUrls.default.http[0]
}

export interface RegisterAgentOptions {
  /** Target chain (default: arcTestnet). */
  network?: Erc8004Network
  /** A prebuilt registration file, OR `agent` fields to build one. */
  file?: Erc8004RegistrationFile
  agent?: BuildRegistrationFileInput
  /** Override the signing private key (else env). */
  privateKey?: Hex
}

export interface RegisterAgentResult {
  agentId: bigint
  globalId: string
  txHash: Hex
  /** The data: URI registered as the agent's tokenURI. */
  agentURI: string
  registry: Address
  chainId: number
}

/** Send the register() tx via Privy server wallet (preferred) or a viem key. */
async function sendRegisterTx(args: {
  chain: Chain
  to: Address
  data: Hex
  privateKey?: Hex
}): Promise<Hex> {
  const { chain, to, data } = args

  // Preferred: Privy server wallet (no raw key, gas-sponsorable).
  const walletId = process.env.ERC8004_AGENT_WALLET_ID ?? process.env.PRIVY_MINTER_WALLET_ID
  const pk =
    args.privateKey ??
    (process.env.ERC8004_DEPLOYER_PRIVATE_KEY as Hex | undefined) ??
    (process.env.MINTER_PRIVATE_KEY as Hex | undefined)

  if (walletId && !args.privateKey) {
    const privy = getPrivyClient()
    // NOTE: verify the exact input shape against @privy-io/server-auth on first run.
    const res = (await (privy as any).walletApi.ethereum.sendTransaction({
      walletId,
      caip2: `eip155:${chain.id}`,
      transaction: { to, data },
    })) as { hash?: Hex; transactionHash?: Hex }
    const hash = res.hash ?? res.transactionHash
    if (!hash) throw new Error('Privy sendTransaction returned no hash')
    return hash
  }

  if (pk) {
    const account = privateKeyToAccount(pk)
    const client = createWalletClient({ account, chain, transport: http(rpcFor(chain)) })
    return client.sendTransaction({ to, data, account, chain })
  }

  throw new Error(
    'No signer configured: set ERC8004_AGENT_WALLET_ID / PRIVY_MINTER_WALLET_ID, or ERC8004_DEPLOYER_PRIVATE_KEY'
  )
}

/** Decode the `agentId` from a register() receipt's `Registered` event. */
function extractAgentId(
  logs: readonly { address: string; topics: readonly string[]; data: string }[],
  registry: Address
): bigint {
  for (const log of logs) {
    if (log.address.toLowerCase() !== registry.toLowerCase()) continue
    if (log.topics[0]?.toLowerCase() !== TOPIC0.Registered.toLowerCase()) continue
    const { args } = decodeEventLog({
      abi: IDENTITY_REGISTRY_ABI,
      eventName: 'Registered',
      data: log.data as Hex,
      topics: log.topics as [Hex, ...Hex[]],
    }) as { args: { agentId: bigint } }
    return args.agentId
  }
  throw new Error('Registered event not found in tx receipt')
}

/**
 * Register an agent on the ERC-8004 IdentityRegistry. Builds the registration
 * file (if `agent` fields are given), encodes it as a data: URI, sends
 * `register(agentURI)`, waits for the receipt, and returns the minted agentId.
 */
export async function registerAgent(opts: RegisterAgentOptions = {}): Promise<RegisterAgentResult> {
  const network = opts.network ?? 'arcTestnet'
  const chain = chainFor(network)
  const registry = registryFor(network)

  const file = opts.file ?? buildRegistrationFile(requireAgent(opts.agent))
  const agentURI = toDataUri(file)

  const data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
  })

  const publicClient = createPublicClient({ chain, transport: http(rpcFor(chain)) })
  const txHash = await sendRegisterTx({ chain, to: registry, data, privateKey: opts.privateKey })
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  const agentId = extractAgentId(receipt.logs, registry)

  return {
    agentId,
    globalId: globalAgentId(agentId, registry, chain.id),
    txHash,
    agentURI,
    registry,
    chainId: chain.id,
  }
}

function requireAgent(agent?: BuildRegistrationFileInput): BuildRegistrationFileInput {
  if (!agent) throw new Error('registerAgent: provide either `file` or `agent` fields')
  return agent
}
