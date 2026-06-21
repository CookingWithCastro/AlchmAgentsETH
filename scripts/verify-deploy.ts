/**
 * Post-deploy smoke test for the Pentacle Star Vaults / ESMS stack.
 * Reads on-chain role wiring + registry/cap/seed state on Arc testnet + Base Sepolia and
 * prints a ✅/❌ checklist. Read-only (no txs, no keys). Re-run after any deploy:
 *
 *   bun run scripts/verify-deploy.ts
 *
 * Addresses are the deterministic deploys (see WEB3_STATUS.md). Note the Base Deed/AMM are at
 * SHIFTED addresses vs Arc (Deploy.s.sol has no StarVault) — handled below.
 */

import { createPublicClient, formatEther, http, parseAbi } from 'viem'
import { ARC_ESMS_ADDRESS, STAR_VAULT_ADDRESS } from '../lib/staking/arc'
import { CONSTELLATION_AMM_ADDRESS, CONSTELLATION_DEED_ADDRESS } from '../lib/staking/amm'
import { PENTACLES_BASE_SEPOLIA_DEPLOYMENT } from '../lib/staking/deployment'

const ARC = { id: 5042002, rpc: 'https://rpc.testnet.arc.io' }
const BASE_SEPOLIA = { id: 84532, rpc: 'https://sepolia.base.org' }

// Read the same configuration the application uses. This makes the script verify the
// integration, not merely a separate hard-coded deployment that the UI may not point at.
const ESMS = ARC_ESMS_ADDRESS
const ARC_VAULT = STAR_VAULT_ADDRESS
const ARC_AMM = CONSTELLATION_AMM_ADDRESS
const ARC_DEED = CONSTELLATION_DEED_ADDRESS
const BASE_ESMS = PENTACLES_BASE_SEPOLIA_DEPLOYMENT.esms
const DEPLOYER = '0x554F991D030aDF539CBD2ff3D896951C6f089804'
const ATTESTOR = '0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be'
const MINTER = '0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99'
// Active claim+redeem settlement wallet — what MINTER_PRIVATE_KEY/REDEEMER_PRIVATE_KEY
// in .env actually derive to. This is the wallet that
// signs claimMint + redeemFor on Base Sepolia, so it's the one that must hold the roles
// AND have gas. (The legacy 0x984dbd above also still holds the roles but is unused.)
const SETTLEMENT = '0x8a332B96232f443931cc423DaC86403a6c752475'
const EXPECTED_ROOT = '0x505ac1166c3d841ea3a0bfe89e887a6204aff19cca24974ed3f309dd4bef2aee'

const vaultAbi = parseAbi([
  'function starRoot() view returns (bytes32)',
  'function maxYieldRatePerUsdcPerDay() view returns (uint256)',
  'function starActivated(uint32) view returns (bool)',
  'function ATTESTOR_ROLE() view returns (bytes32)',
  'function hasRole(bytes32, address) view returns (bool)',
])
const esmsAbi = parseAbi([
  'function MINTER_ROLE() view returns (bytes32)',
  'function BURNER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32, address) view returns (bool)',
  'function uri(uint256) view returns (string)',
])
const ammAbi = parseAbi([
  'function hasRole(bytes32, address) view returns (bool)',
  'function getReserves(uint16) view returns (uint256, uint256)',
])

const ok = (b: boolean) => (b ? '✅' : '❌')
let failures = 0
function check(label: string, pass: boolean, detail = '') {
  if (!pass) failures++
  console.log(`${ok(pass)} ${label}${detail ? `  (${detail})` : ''}`)
}

function makeReader(rpc: string, id: number) {
  const chain = {
    id,
    name: 'x',
    nativeCurrency: { name: 'x', symbol: 'X', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  }
  const c = createPublicClient({ chain: chain as never, transport: http(rpc) })
  return <T>(address: string, abi: unknown, functionName: string, args: unknown[] = []) =>
    c.readContract({
      address: address as `0x${string}`,
      abi: abi as never,
      functionName,
      args,
    }) as Promise<T>
}

async function arc() {
  console.log('\n========== ARC TESTNET (5042002) ==========')
  const r = makeReader(ARC.rpc, ARC.id)
  const configured = [ESMS, ARC_VAULT, ARC_AMM, ARC_DEED]
  check(
    'app has all four Pentacles addresses',
    configured.every(a => /^0x[0-9a-fA-F]{40}$/.test(a))
  )
  check('app addresses are distinct', new Set(configured.map(a => a.toLowerCase())).size === 4)
  const codes = await Promise.all(
    configured.map(address =>
      createPublicClient({
        chain: {
          id: ARC.id,
          name: 'arc-testnet',
          nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
          rpcUrls: { default: { http: [ARC.rpc] } },
        } as never,
        transport: http(ARC.rpc),
      }).getBytecode({ address })
    )
  )
  check(
    'all four configured addresses have bytecode',
    codes.every(code => Boolean(code && code !== '0x'))
  )
  const MR = await r<`0x${string}`>(ESMS, esmsAbi, 'MINTER_ROLE')
  const BR = await r<`0x${string}`>(ESMS, esmsAbi, 'BURNER_ROLE')
  const AR = await r<`0x${string}`>(ARC_VAULT, vaultAbi, 'ATTESTOR_ROLE')

  check(
    'starRoot matches registry',
    (await r<string>(ARC_VAULT, vaultAbi, 'starRoot')).toLowerCase() === EXPECTED_ROOT
  )
  const rate = await r<bigint>(ARC_VAULT, vaultAbi, 'maxYieldRatePerUsdcPerDay')
  check('mint cap (maxYieldRate) set', rate > 0n, rate.toString())
  check(
    'Sirius(32349) pre-activated',
    await r<boolean>(ARC_VAULT, vaultAbi, 'starActivated', [32349])
  )
  check(
    'un-registered star gated off',
    !(await r<boolean>(ARC_VAULT, vaultAbi, 'starActivated', [40000]))
  )
  check(
    'attestor has ATTESTOR_ROLE (vault)',
    await r<boolean>(ARC_VAULT, vaultAbi, 'hasRole', [AR, ATTESTOR])
  )
  check(
    'attestor has ATTESTOR_ROLE (amm)',
    await r<boolean>(ARC_AMM, ammAbi, 'hasRole', [AR, ATTESTOR])
  )
  check('vault has MINTER on ESMS', await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, ARC_VAULT]))
  check('amm has MINTER on ESMS', await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, ARC_AMM]))
  check('amm has BURNER on ESMS', await r<boolean>(ESMS, esmsAbi, 'hasRole', [BR, ARC_AMM]))
  check('separate minter has MINTER', await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, MINTER]))
  check(
    'deployer is NOT a minter (separation)',
    !(await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, DEPLOYER]))
  )
  const [r0a, r0b] = await r<[bigint, bigint]>(ARC_AMM, ammAbi, 'getReserves', [0])
  check('pool0 admin-seeded', r0a > 0n && r0b > 0n, `${r0a}/${r0b}`)
}

async function baseSepolia() {
  console.log('\n========== BASE SEPOLIA (84532) ==========')
  const r = makeReader(BASE_SEPOLIA.rpc, BASE_SEPOLIA.id)
  const gasClient = createPublicClient({
    chain: {
      id: BASE_SEPOLIA.id,
      name: 'base-sepolia',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [BASE_SEPOLIA.rpc] } },
    } as never,
    transport: http(BASE_SEPOLIA.rpc),
  })
  const MR = await r<`0x${string}`>(BASE_ESMS, esmsAbi, 'MINTER_ROLE')
  const BR = await r<`0x${string}`>(BASE_ESMS, esmsAbi, 'BURNER_ROLE')
  console.log(`   shop ESMS uri: ${await r<string>(BASE_ESMS, esmsAbi, 'uri', [0])}`)
  // The ACTIVE settlement wallet (signs claimMint + redeemFor) must hold BOTH roles.
  check(
    'settlement wallet has MINTER (claim/mint works)',
    await r<boolean>(BASE_ESMS, esmsAbi, 'hasRole', [MR, SETTLEMENT])
  )
  check(
    'settlement wallet has BURNER (sponsored redeemFor)',
    await r<boolean>(BASE_ESMS, esmsAbi, 'hasRole', [BR, SETTLEMENT]),
    'if ❌: grant BURNER to the settlement wallet — see WEB3_STATUS.md'
  )
  check(
    'deployer is NOT a minter',
    !(await r<boolean>(BASE_ESMS, esmsAbi, 'hasRole', [MR, DEPLOYER]))
  )
  // Roles are useless without gas: a 0-balance settlement wallet cannot send claimMint
  // or redeemFor, so the whole on-chain rail is dead even when every role check is green.
  const gas = await gasClient.getBalance({ address: SETTLEMENT as `0x${string}` })
  check(
    'settlement wallet has gas (can send txs)',
    gas > 0n,
    gas > 0n
      ? `${formatEther(gas)} ETH`
      : 'fund 0x8a332B with Base Sepolia ETH — see WEB3_STATUS.md'
  )
}

await arc()
await baseSepolia()
console.log(
  failures === 0 ? '\n✅ All checks passed.\n' : `\n❌ ${failures} check(s) failed — see above.\n`
)
process.exit(failures === 0 ? 0 : 1)
