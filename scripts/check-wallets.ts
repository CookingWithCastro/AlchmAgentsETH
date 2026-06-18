import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'
import fs from 'fs'

const env = dotenv.parse(fs.readFileSync('.env'))
const contractsEnv = dotenv.parse(fs.readFileSync('contracts/.env'))

function getAddress(pk) {
  if (!pk) return 'Not set'
  try {
    const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`)
    return account.address
  } catch (e) {
    return 'Invalid Key'
  }
}

console.log('--- Root .env Addresses ---')
console.log('ERC8004 Deployer:', getAddress(env.ERC8004_DEPLOYER_PRIVATE_KEY))
console.log('Arc Operator:', getAddress(env.ARC_OPERATOR_PRIVATE_KEY))
console.log(
  'AgentKit Wallet:',
  env.AGENTKIT_WALLET_ADDRESS || getAddress(env.AGENTKIT_WALLET_PRIVATE_KEY)
)

console.log('\n--- Contracts .env Addresses ---')
console.log('Deployer (from PK):', getAddress(contractsEnv.DEPLOYER_PRIVATE_KEY))
console.log('Attestor:', contractsEnv.ATTESTOR_ADDRESS)
console.log('Minter:', contractsEnv.MINTER_ADDRESS)
