/**
 * Chain-level proof of the ESMS spend primitive on Base Sepolia (testnet).
 *
 *   1. fund the settlement wallet (0x5A38F3) from the deployer if it has no gas
 *   2. claimMint ESMS to a throwaway holder            (settlement = MINTER)
 *   3. holder signs an EIP-712 RedeemAuthorization      (off-chain, no gas)
 *   4. settlement burns it via redeemFor                (settlement = BURNER)
 *   5. read holder balances before/after — proves the on-chain balance decreasing
 *
 * Read keys from env; prints ONLY addresses, tx hashes, and balances — never keys.
 * Run: bun run scripts/prove-loop.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  keccak256,
  toHex,
  parseEther,
  type Hex,
  type Address,
} from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
import fs from 'fs'

const ESMS = '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F' as Address
const RPC = 'https://sepolia.base.org'
const IDS = [0n, 1n, 2n, 3n] // spirit, essence, matter, substance
const LABELS = ['spirit', 'essence', 'matter', 'substance']
const bs = (n: string) => `https://sepolia.basescan.org/tx/${n}`

const root = dotenv.parse(fs.readFileSync('.env'))
const contracts = dotenv.parse(fs.readFileSync('contracts/.env'))
const norm = (k?: string) => (k ? ((k.startsWith('0x') ? k : `0x${k}`) as Hex) : undefined)

const deployerKey = norm(contracts.DEPLOYER_PRIVATE_KEY)
const settlementKey = norm(root.MINTER_PRIVATE_KEY || root.REDEEMER_PRIVATE_KEY)
if (!deployerKey || !settlementKey) throw new Error('missing deployer or settlement key in env')

const deployer = privateKeyToAccount(deployerKey)
const settlement = privateKeyToAccount(settlementKey)
const holder = privateKeyToAccount(generatePrivateKey()) // fresh throwaway buyer

const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) })
const deployerW = createWalletClient({
  account: deployer,
  chain: baseSepolia,
  transport: http(RPC),
})
const settlementW = createWalletClient({
  account: settlement,
  chain: baseSepolia,
  transport: http(RPC),
})

const claimMintAbi = [
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
] as const
const redeemForAbi = [
  {
    type: 'function',
    name: 'redeemFor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'orderId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'deadline', type: 'uint256' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
] as const
const balAbi = [
  {
    type: 'function',
    name: 'balanceOfBatch',
    stateMutability: 'view',
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
] as const

async function balances(addr: Address): Promise<bigint[]> {
  return (await pub.readContract({
    address: ESMS,
    abi: balAbi,
    functionName: 'balanceOfBatch',
    args: [IDS.map(() => addr), IDS],
  })) as bigint[]
}
// The public Base Sepolia RPC is read-after-write inconsistent — poll until the
// post-tx state we expect actually shows up (or give up after ~15s).
async function balancesUntil(addr: Address, ok: (b: bigint[]) => boolean): Promise<bigint[]> {
  let b = await balances(addr)
  for (let i = 0; i < 10 && !ok(b); i++) {
    await new Promise(r => setTimeout(r, 1500))
    b = await balances(addr)
  }
  return b
}
const fmt = (b: bigint[]) => LABELS.map((l, i) => `${l}=${formatUnits(b[i], 18)}`).join('  ')

console.log('=== actors ===')
console.log('deployer  :', deployer.address)
console.log('settlement:', settlement.address)
console.log('holder    :', holder.address, '(throwaway, signs only)\n')

// 1) fund settlement if needed
let gas = await pub.getBalance({ address: settlement.address })
console.log('settlement gas:', formatEther(gas), 'ETH')
if (gas === 0n) {
  const depGas = await pub.getBalance({ address: deployer.address })
  console.log('deployer gas  :', formatEther(depGas), 'ETH — funding settlement with 0.01 ETH...')
  const fundTx = await deployerW.sendTransaction({
    to: settlement.address,
    value: parseEther('0.01'),
  })
  console.log('  fund tx:', bs(fundTx))
  await pub.waitForTransactionReceipt({ hash: fundTx })
  gas = await pub.getBalance({ address: settlement.address })
  console.log('  settlement gas now:', formatEther(gas), 'ETH\n')
}

// 2) claimMint to holder
const mintAmts = [
  parseUnits('5', 18),
  parseUnits('3', 18),
  parseUnits('2', 18),
  parseUnits('1', 18),
]
const claimId = keccak256(toHex(`${holder.address}:${randomUUID()}`))
console.log('=== step 1: claimMint 5/3/2/1 ESMS to holder ===')
const mintTx = await settlementW.writeContract({
  address: ESMS,
  abi: claimMintAbi,
  functionName: 'claimMint',
  args: [holder.address, claimId, IDS, mintAmts],
})
console.log('  mint tx:', bs(mintTx))
await pub.waitForTransactionReceipt({ hash: mintTx })
const before = await balancesUntil(holder.address, b => b.some(x => x > 0n))
console.log('  holder balance AFTER mint :', fmt(before), '\n')

// 3) holder signs EIP-712 RedeemAuthorization
const orderId = keccak256(toHex(`shop:${holder.address}:proof-item:`))
const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
const sig = await holder.signTypedData({
  domain: { name: 'EsmsToken', version: '1', chainId: baseSepolia.id, verifyingContract: ESMS },
  types: {
    RedeemAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'orderId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'RedeemAuthorization',
  message: { from: holder.address, orderId, ids: IDS, amounts: mintAmts, deadline },
})
console.log('=== step 2: holder signed RedeemAuthorization (off-chain, gasless) ===')
console.log('  orderId:', orderId, '\n')

// 4) settlement burns via redeemFor
console.log('=== step 3: settlement burns holder ESMS via redeemFor ===')
const burnTx = await settlementW.writeContract({
  address: ESMS,
  abi: redeemForAbi,
  functionName: 'redeemFor',
  args: [holder.address, orderId, IDS, mintAmts, deadline, sig],
})
console.log('  burn tx:', bs(burnTx))
await pub.waitForTransactionReceipt({ hash: burnTx })
const after = await balancesUntil(holder.address, b => b.every(x => x === 0n))
console.log('  holder balance AFTER burn :', fmt(after), '\n')

const allZero = after.every(b => b === 0n)
const minted = before.every((b, i) => b === mintAmts[i])
console.log('=== RESULT ===')
console.log(minted ? '✅ mint credited holder' : '❌ mint amounts mismatch')
console.log(
  allZero
    ? '✅ burn zeroed holder balance — spend primitive works end-to-end'
    : '❌ burn did not zero balance'
)
process.exit(minted && allZero ? 0 : 1)
