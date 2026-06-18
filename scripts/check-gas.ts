/** Read Base Sepolia native (gas) balance + ESMS balances for the key wallets. */
import { createPublicClient, http, formatEther, parseAbi, type Hex } from 'viem'
import { baseSepolia } from 'viem/chains'

const ESMS = '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F'
const WALLETS: Record<string, string> = {
  'settlement (0x8a332B)': '0x8a332B96232f443931cc423DaC86403a6c752475',
  'settlement-old (0x984dbd)': '0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99',
  'deployer (0x554F99)': '0x554F991D030aDF539CBD2ff3D896951C6f089804',
  'attestor (0x6a9a90)': '0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be',
}
const c = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })
const abi = parseAbi(['function balanceOfBatch(address[], uint256[]) view returns (uint256[])'])

for (const [label, a] of Object.entries(WALLETS)) {
  const eth = await c.getBalance({ address: a as Hex })
  const bals = (await c.readContract({
    address: ESMS as Hex,
    abi,
    functionName: 'balanceOfBatch',
    args: [Array(4).fill(a), [0n, 1n, 2n, 3n]],
  })) as bigint[]
  console.log(`${label} ${a}`)
  console.log(`  gas ETH: ${formatEther(eth)}   ESMS: [${bals.map(String).join(', ')}]`)
}
