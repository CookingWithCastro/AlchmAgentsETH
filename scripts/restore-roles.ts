/**
 * Repair the broken ESMS roles on Base Sepolia (testnet) via the deployer (DEFAULT_ADMIN):
 *   grant MINTER+BURNER to 0x8a332B (the wallet .env signs with),
 *   revoke MINTER+BURNER from the stranded 0x5A38F3.
 * Idempotent (skips no-op grants/revokes). Prints only addresses/role booleans/tx hashes.
 * Run: bun run scripts/restore-roles.ts
 */
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import dotenv from 'dotenv'
import fs from 'fs'

const ESMS = '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F'
const RESTORE = '0x8a332B96232f443931cc423DaC86403a6c752475' as Hex // .env signer, has gas
const STRANDED = '0x5A38F3834Ca6554DBC73F3CDA1551FCa83551668' as Hex // unusable, no key
const RPC = 'https://sepolia.base.org'
const bs = (h: string) => `https://sepolia.basescan.org/tx/${h}`

const contracts = dotenv.parse(fs.readFileSync('contracts/.env'))
const dk = contracts.DEPLOYER_PRIVATE_KEY
if (!dk) throw new Error('DEPLOYER_PRIVATE_KEY missing in contracts/.env')
const deployer = privateKeyToAccount((dk.startsWith('0x') ? dk : `0x${dk}`) as Hex)

const abi = parseAbi([
  'function MINTER_ROLE() view returns (bytes32)',
  'function BURNER_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32, address) view returns (bool)',
  'function grantRole(bytes32, address)',
  'function revokeRole(bytes32, address)',
])
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) })
const wallet = createWalletClient({ account: deployer, chain: baseSepolia, transport: http(RPC) })
const read = (fn: string, args: unknown[] = []) =>
  pub.readContract({ address: ESMS as Hex, abi, functionName: fn as never, args }) as Promise<any>

const MR = (await read('MINTER_ROLE')) as Hex
const BR = (await read('BURNER_ROLE')) as Hex
const ADMIN = (await read('DEFAULT_ADMIN_ROLE')) as Hex

console.log('deployer:', deployer.address)
const isAdmin = await read('hasRole', [ADMIN, deployer.address])
console.log('deployer is DEFAULT_ADMIN:', isAdmin)
if (!isAdmin) throw new Error('deployer lacks DEFAULT_ADMIN — cannot grant/revoke')

async function ensure(action: 'grant' | 'revoke', role: Hex, name: string, who: Hex) {
  const has = (await read('hasRole', [role, who])) as boolean
  const want = action === 'grant'
  if (has === want) {
    console.log(`  • ${action} ${name} -> ${who}: already ${has ? 'present' : 'absent'}, skip`)
    return
  }
  const tx = await wallet.writeContract({
    address: ESMS as Hex,
    abi,
    functionName: action === 'grant' ? 'grantRole' : 'revokeRole',
    args: [role, who],
  })
  console.log(`  • ${action} ${name} -> ${who}: ${bs(tx)}`)
  await pub.waitForTransactionReceipt({ hash: tx })
}

console.log('\n=== restoring 0x8a332B ===')
await ensure('grant', MR, 'MINTER', RESTORE)
await ensure('grant', BR, 'BURNER', RESTORE)
console.log('\n=== revoking stranded 0x5A38F3 ===')
await ensure('revoke', MR, 'MINTER', STRANDED)
await ensure('revoke', BR, 'BURNER', STRANDED)

// confirm final state (poll past RPC read-after-write lag)
async function until(pred: () => Promise<boolean>) {
  for (let i = 0; i < 10; i++) {
    if (await pred()) return true
    await new Promise(r => setTimeout(r, 1500))
  }
  return false
}
const ok = await until(async () => {
  const [rm, rb, sm, sb] = await Promise.all([
    read('hasRole', [MR, RESTORE]),
    read('hasRole', [BR, RESTORE]),
    read('hasRole', [MR, STRANDED]),
    read('hasRole', [BR, STRANDED]),
  ])
  return rm && rb && !sm && !sb
})
console.log('\n=== final ===')
console.log(
  `0x8a332B: MINTER=${await read('hasRole', [MR, RESTORE])} BURNER=${await read('hasRole', [BR, RESTORE])}`
)
console.log(
  `0x5A38F3: MINTER=${await read('hasRole', [MR, STRANDED])} BURNER=${await read('hasRole', [BR, STRANDED])}`
)
console.log(
  ok ? '✅ roles restored to 0x8a332B; stranded wallet revoked' : '❌ unexpected final state'
)
process.exit(ok ? 0 : 1)
