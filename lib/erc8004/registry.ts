/**
 * ERC-8004 "Trustless Agents" registry — canonical addresses, ABIs, event topics,
 * and identifier helpers.
 *
 * Identity model (from the ERC-8004 spec): every agent is an ERC-721 + URIStorage
 * NFT. `register(agentURI) -> agentId` mints the NFT; `agentURI` points at the
 * agent's registration file ("homepage" JSON — see registration-file.ts).
 *
 * The Identity + Reputation registries are deployed as SINGLETONS on Ethereum
 * mainnet, so we index/reference these fixed addresses (no deploy of our own).
 * Source: github.com/erc-8004/erc-8004-contracts (mainnet singletons).
 *
 * NOTE: the IdentityRegistry address below is also the exact `<registry>` used in
 * the ENSIP-25 canonical example (`agent-registration[...8004a169...][id]`), so
 * registering here makes ERC-8004 + ENSIP-25 + the BigQuery index all line up.
 */

import {
  keccak256,
  toBytes,
  getAddress,
  type Abi,
  type AbiEvent,
  type Address,
  type Hex,
} from 'viem'

/** Ethereum mainnet — where the ERC-8004 singletons live and what BigQuery indexes. */
export const ETH_MAINNET_CHAIN_ID = 1
export const CAIP_NAMESPACE = 'eip155'

/** Mainnet singletons (checksummed). From erc-8004-contracts `scripts/addresses.ts`. */
export const IDENTITY_REGISTRY = getAddress('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432')
export const REPUTATION_REGISTRY = getAddress('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63')
export const VALIDATION_REGISTRY = getAddress('0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58')

/**
 * ERC-8004 is pre-deployed on 40+ chains at the same CREATE2 vanity addresses —
 * you do NOT deploy your own. BigQuery only indexes Ethereum **mainnet**, so the
 * `bigquery-*` layer uses `mainnet`; agents you register on `arcTestnet` (cheap,
 * gas in USDC) anchor the Arc bounty but won't appear in the mainnet index.
 */
export const ERC8004_ADDRESSES = {
  /** Ethereum / Base / Arbitrum / Polygon / Optimism mainnet (shared vanity addrs). */
  mainnet: {
    identity: IDENTITY_REGISTRY,
    reputation: REPUTATION_REGISTRY,
    validation: VALIDATION_REGISTRY,
  },
  /** Sepolia / Base Sepolia / Polygon Amoy testnets (shared vanity addrs). */
  testnet: {
    identity: getAddress('0x8004A818BFB912233c491871b3d84c89A494BD9e'),
    reputation: getAddress('0x8004B663056A597Dffe9eCcC1965A193B7388713'),
    validation: getAddress('0x8004Cb1BF31DAf7788923b405b754f57acEB4272'),
  },
  /** Circle Arc testnet. */
  arcTestnet: {
    identity: getAddress('0x8004A818BFB912233c491871b3d84c89A494BD9e'),
    reputation: getAddress('0x8004B663056A597Dffe9eCcC1965A193B7388713'),
    validation: getAddress('0x8004Cb1BF31DAf7788923b405b754f57acEB4272'),
  },
} as const

/** Circle Arc testnet — viem custom-chain params (gas paid in USDC). Verified values. */
export const ARC_TESTNET = {
  id: 5042002, // eip155:5042002 (confirmed)
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.io',
  explorer: 'https://testnet.arcscan.app',
  /** USDC on Arc (gas token). ERC-20 interface is 6-decimals — use for x402 amounts. */
  usdc: '0x3600000000000000000000000000000000000000',
} as const

/**
 * IdentityRegistry ABI — VERBATIM from erc-8004-contracts v2.0.0
 * (IdentityRegistryUpgradeable.sol; the impl behind the mainnet/Arc singletons):
 *   Registered(uint256 indexed agentId, string agentURI, address indexed owner)
 *   URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)
 *   MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey,
 *               string metadataKey, bytes metadataValue)   ← 4 params, value is BYTES
 *   Transfer(address indexed from, address indexed to, uint256 indexed tokenId)  // ERC-721
 *
 * ⚠️ The presentation slide showed a simplified 3-param `MetadataSet(agentId,key,value)`.
 * The deployed contract emits the 4-param form above; topic0 is derived from THIS
 * signature so the BigQuery filter matches real logs. `agentId` is the ERC-721
 * tokenId, assigned incrementally from 0. `agentWallet` is a reserved metadata key
 * settable only via a signed EIP-712 message (cleared on every Transfer).
 */
export const IDENTITY_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'URIUpdated',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'newURI', type: 'string', indexed: false },
      { name: 'updatedBy', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MetadataSet',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      // indexed dynamic string => topic carries keccak256(metadataKey), not plaintext
      { name: 'indexedMetadataKey', type: 'string', indexed: true },
      { name: 'metadataKey', type: 'string', indexed: false }, // plaintext key (in data)
      { name: 'metadataValue', type: 'bytes', indexed: false }, // value bytes (in data)
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
    anonymous: false,
  },
  // register() — three overloads (v2.0.0). agentId is returned and also emitted.
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'metadataKey', type: 'string' },
          { name: 'metadataValue', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setMetadata',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
      { name: 'metadataValue', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAgentURI',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getAgentWallet',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi

/**
 * ReputationRegistry ABI — VERBATIM from erc-8004-contracts
 * (ReputationRegistryUpgradeable.sol). The score-bearing event is `NewFeedback`;
 * the rating is signed fixed-point `value / 10**valueDecimals` (NOT a fixed 0–100).
 * `agentId` is indexed (topic1), so feedback attributes to an agent with no join.
 * `indexedTag1` is an indexed string → its topic is keccak256(tag1), not plaintext.
 */
export const REPUTATION_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'NewFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'clientAddress', type: 'address', indexed: true },
      { name: 'feedbackIndex', type: 'uint64', indexed: false },
      { name: 'value', type: 'int128', indexed: false }, // signed fixed-point
      { name: 'valueDecimals', type: 'uint8', indexed: false }, // value / 10**decimals
      { name: 'indexedTag1', type: 'string', indexed: true }, // topic = keccak256(tag1)
      { name: 'tag1', type: 'string', indexed: false },
      { name: 'tag2', type: 'string', indexed: false },
      { name: 'endpoint', type: 'string', indexed: false },
      { name: 'feedbackURI', type: 'string', indexed: false },
      { name: 'feedbackHash', type: 'bytes32', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeedbackRevoked',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'clientAddress', type: 'address', indexed: true },
      { name: 'feedbackIndex', type: 'uint64', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ResponseAppended',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'clientAddress', type: 'address', indexed: true },
      { name: 'feedbackIndex', type: 'uint64', indexed: false },
      { name: 'responder', type: 'address', indexed: true },
      { name: 'responseURI', type: 'string', indexed: false },
      { name: 'responseHash', type: 'bytes32', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'feedbackIndex', type: 'uint64' },
    ],
    outputs: [],
  },
] as const satisfies Abi

/**
 * ValidationRegistry ABI — VERBATIM from erc-8004-contracts
 * (ValidationRegistryUpgradeable.sol). `ValidationResponse.response` is a uint8
 * 0–100 (enforced on-chain; 0=fail, 100=pass). `agentId` is indexed (topic2) on
 * BOTH events, so validations attribute to an agent without a request join.
 */
export const VALIDATION_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'ValidationRequest',
    inputs: [
      { name: 'validatorAddress', type: 'address', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'requestURI', type: 'string', indexed: false },
      { name: 'requestHash', type: 'bytes32', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ValidationResponse',
    inputs: [
      { name: 'validatorAddress', type: 'address', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'requestHash', type: 'bytes32', indexed: true },
      { name: 'response', type: 'uint8', indexed: false }, // 0–100
      { name: 'responseURI', type: 'string', indexed: false },
      { name: 'responseHash', type: 'bytes32', indexed: false },
      { name: 'tag', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'validationRequest',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'requestURI', type: 'string' },
      { name: 'requestHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'validationResponse',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestHash', type: 'bytes32' },
      { name: 'response', type: 'uint8' },
      { name: 'responseURI', type: 'string' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
    ],
    outputs: [],
  },
] as const satisfies Abi

/** Reserved IdentityRegistry metadata key whose change requires a signature proof. */
export const RESERVED_METADATA_KEY_AGENT_WALLET = 'agentWallet'

// ── Event-topic derivation ──────────────────────────────────────────────────

/** Canonical Solidity signature of an event, e.g. "Registered(uint256,string,address)". */
export function eventSignature(ev: AbiEvent): string {
  return `${ev.name}(${ev.inputs.map(i => i.type).join(',')})`
}

function abiEvent(abi: Abi, name: string): AbiEvent {
  const ev = abi.find((i): i is AbiEvent => i.type === 'event' && i.name === name)
  if (!ev) throw new Error(`ERC-8004: event "${name}" not found in ABI`)
  return ev
}

/** topic0 (32-byte keccak of the canonical signature) for an event by name. */
export function topic0For(abi: Abi, name: string): Hex {
  return keccak256(toBytes(eventSignature(abiEvent(abi, name))))
}

/** Precomputed topic0 (event signature hash) for every event we index. */
export const TOPIC0 = {
  // IdentityRegistry
  Registered: topic0For(IDENTITY_REGISTRY_ABI, 'Registered'),
  URIUpdated: topic0For(IDENTITY_REGISTRY_ABI, 'URIUpdated'),
  MetadataSet: topic0For(IDENTITY_REGISTRY_ABI, 'MetadataSet'),
  Transfer: topic0For(IDENTITY_REGISTRY_ABI, 'Transfer'),
  // ReputationRegistry
  NewFeedback: topic0For(REPUTATION_REGISTRY_ABI, 'NewFeedback'),
  FeedbackRevoked: topic0For(REPUTATION_REGISTRY_ABI, 'FeedbackRevoked'),
  ResponseAppended: topic0For(REPUTATION_REGISTRY_ABI, 'ResponseAppended'),
  // ValidationRegistry
  ValidationRequest: topic0For(VALIDATION_REGISTRY_ABI, 'ValidationRequest'),
  ValidationResponse: topic0For(VALIDATION_REGISTRY_ABI, 'ValidationResponse'),
} as const

// ── Identifier + topic-encoding helpers ──────────────────────────────────────

/** CAIP-style registry id used in the registration file's `registrations[].agentRegistry`. */
export function agentRegistryCaip(
  registry: Address = IDENTITY_REGISTRY,
  chainId: number = ETH_MAINNET_CHAIN_ID
): string {
  return `${CAIP_NAMESPACE}:${chainId}:${getAddress(registry)}`
}

/** Global agent id, e.g. "eip155:1:0x8004A1…#42" (slide: {namespace}:{chainId}:{registry} + agentId). */
export function globalAgentId(
  agentId: bigint | number,
  registry: Address = IDENTITY_REGISTRY,
  chainId: number = ETH_MAINNET_CHAIN_ID
): string {
  return `${agentRegistryCaip(registry, chainId)}#${agentId}`
}

/** keccak256 of an indexed dynamic string (e.g. a MetadataSet `key` like "agentWallet"). */
export function hashIndexedString(value: string): Hex {
  return keccak256(toBytes(value))
}

/** 32-byte left-padded topic encoding of a uint (for filtering indexed agentId/tokenId). */
export function uintTopic(value: bigint | number): Hex {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}` as Hex
}

/** 32-byte left-padded topic encoding of an address (for filtering indexed address topics). */
export function addressTopic(addr: Address): Hex {
  return `0x${addr.toLowerCase().replace(/^0x/, '').padStart(64, '0')}` as Hex
}
