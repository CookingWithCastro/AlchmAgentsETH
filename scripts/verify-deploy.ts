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

import { createPublicClient, http, parseAbi } from 'viem'

const ARC = { id: 5042002, rpc: 'https://rpc.testnet.arc.io' }
const BASE_SEPOLIA = { id: 84532, rpc: 'https://sepolia.base.org' }

const ESMS = '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F'
const ARC_VAULT = '0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6'
const ARC_AMM = '0x34d860Cb460ecD2595584138d22Ad6fe7DAeA3BB'
const ARC_DEED = '0x6B4EE164320e9E5583C0F6BEe14D5BABb5ba5095'
const DEPLOYER = '0x554F991D030aDF539CBD2ff3D896951C6f089804'
const ATTESTOR = '0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be'
const MINTER = '0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99'
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
  const MR = await r<`0x${string}`>(ESMS, esmsAbi, 'MINTER_ROLE')
  const BR = await r<`0x${string}`>(ESMS, esmsAbi, 'BURNER_ROLE')
  console.log(`   shop ESMS uri: ${await r<string>(ESMS, esmsAbi, 'uri', [0])}`)
  check(
    'separate minter has MINTER (claim/mint works)',
    await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, MINTER])
  )
  check('deployer is NOT a minter', !(await r<boolean>(ESMS, esmsAbi, 'hasRole', [MR, DEPLOYER])))
  // Action item: the shop settlement wallet must hold BURNER for sponsored redeemFor.
  check(
    'settlement wallet has BURNER (sponsored redeemFor)',
    await r<boolean>(ESMS, esmsAbi, 'hasRole', [BR, MINTER]),
    'if ❌: grant BURNER to your redeemer wallet — see WEB3_STATUS.md'
  )
}

await arc()
await baseSepolia()
console.log(
  failures === 0 ? '\n✅ All checks passed.\n' : `\n❌ ${failures} check(s) failed — see above.\n`
)
process.exit(failures === 0 ? 0 : 1)
