import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import { Keypair, PublicKey } from '@solana/web3.js'

const EXPECTED_PROGRAM_ID = new PublicKey('5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD')
const configuredPath =
  process.env.AAE_SOLANA_PROGRAM_KEYPAIR ?? 'target/deploy/aae_solana-keypair.json'
const keypairPath = isAbsolute(configuredPath)
  ? configuredPath
  : resolve(process.cwd(), configuredPath)

if (!existsSync(keypairPath)) {
  throw new Error(
    `Missing stable Solana program keypair. Set AAE_SOLANA_PROGRAM_KEYPAIR or provision ${keypairPath}.`
  )
}

let programKeypair
try {
  const bytes = JSON.parse(readFileSync(keypairPath, 'utf8'))
  programKeypair = Keypair.fromSecretKey(Uint8Array.from(bytes))
} catch (error) {
  throw new Error(`Invalid Solana program keypair at ${keypairPath}`, { cause: error })
}

if (!programKeypair.publicKey.equals(EXPECTED_PROGRAM_ID)) {
  throw new Error(
    `Refusing deployment: program keypair resolves to ${programKeypair.publicKey.toBase58()}, expected ${EXPECTED_PROGRAM_ID.toBase58()}.`
  )
}

console.log(`Deploying reviewed program identity ${EXPECTED_PROGRAM_ID.toBase58()} to Devnet`)
const result = spawnSync(
  'anchor',
  [
    'deploy',
    '--provider.cluster',
    'devnet',
    '--program-name',
    'aae_solana',
    '--program-keypair',
    keypairPath,
  ],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit' }
)

if (result.error) throw result.error
process.exit(result.status ?? 1)
