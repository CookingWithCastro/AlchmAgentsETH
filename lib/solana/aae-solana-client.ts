import { AnchorProvider, BN, Program, type Wallet } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import {
  Connection,
  Ed25519Program,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  type ConfirmOptions,
  type TransactionInstruction,
} from '@solana/web3.js'

import {
  AAE_SOLANA_PROGRAM_ID,
  AAE_SOLANA_SEEDS,
  TOKEN_2022_PROGRAM_ID,
  buildRedeemAuthorizationMessage,
  getEsmsMintAddresses,
  getProgramConfigAddress,
  getReceiptAddress,
} from '@/lib/solana/esms'
import AAE_SOLANA_IDL from '@/lib/solana/idl/aae_solana.json'
import type { AaeSolana } from '@/lib/solana/idl/aae_solana'

const MAX_U64 = (1n << 64n) - 1n
const DEFAULT_RPC = 'https://api.devnet.solana.com'

export type EsmsAmounts = readonly [bigint, bigint, bigint, bigint]

function bytes32(value: Uint8Array, label: string): number[] {
  if (value.length !== 32) throw new Error(`${label} must be exactly 32 bytes`)
  return [...value]
}

function amountsToBn(amounts: EsmsAmounts): [BN, BN, BN, BN] {
  return amounts.map(amount => {
    if (amount < 0n || amount > MAX_U64) throw new RangeError('ESMS amount must fit in u64')
    return new BN(amount.toString())
  }) as [BN, BN, BN, BN]
}

export interface AaeSolanaClientOptions {
  wallet: Wallet
  connection?: Connection
  confirmOptions?: ConfirmOptions
}

/**
 * Thin Anchor client adapted from Pentacles' Solana helper. Chain state stays
 * isolated in this object; no browser provider is read at module load time.
 */
export class AaeSolanaClient {
  readonly connection: Connection
  readonly wallet: Wallet
  readonly program: Program<AaeSolana>
  readonly programId: PublicKey
  readonly programConfig: PublicKey
  readonly mints: readonly PublicKey[]

  constructor(options: AaeSolanaClientOptions) {
    this.connection =
      options.connection ??
      new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_RPC, 'confirmed')
    this.wallet = options.wallet
    const provider = new AnchorProvider(
      this.connection,
      options.wallet,
      options.confirmOptions ?? { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    )
    this.program = new Program<AaeSolana>(AAE_SOLANA_IDL as unknown as AaeSolana, provider)
    this.programId = AAE_SOLANA_PROGRAM_ID
    this.programConfig = getProgramConfigAddress(this.programId)
    this.mints = getEsmsMintAddresses(this.programId)
  }

  getClaimReceiptAddress(claimId: Uint8Array): PublicKey {
    return getReceiptAddress('claim', claimId, this.programId)
  }

  getOrderReceiptAddress(orderId: Uint8Array): PublicKey {
    return getReceiptAddress('order', orderId, this.programId)
  }

  getPersonaCommitmentAddress(agentId: Uint8Array): PublicKey {
    if (agentId.length !== 32) throw new Error('agentId must be exactly 32 bytes')
    return PublicKey.findProgramAddressSync(
      [AAE_SOLANA_SEEDS.personaCommitment, Buffer.from(agentId)],
      this.programId
    )[0]
  }

  getTokenAccounts(owner: PublicKey): readonly PublicKey[] {
    return this.mints.map(mint =>
      getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID)
    )
  }

  private mintAccounts() {
    return {
      spiritMint: this.mints[0],
      essenceMint: this.mints[1],
      matterMint: this.mints[2],
      substanceMint: this.mints[3],
    }
  }

  private tokenAccounts(owner: PublicKey) {
    const accounts = this.getTokenAccounts(owner)
    return {
      spiritAccount: accounts[0],
      essenceAccount: accounts[1],
      matterAccount: accounts[2],
      substanceAccount: accounts[3],
    }
  }

  async buildClaimMintEsmsInstruction(args: {
    claimId: Uint8Array
    ledgerReferenceHash: Uint8Array
    recipient: PublicKey
    amounts: EsmsAmounts
    authority?: PublicKey
  }): Promise<TransactionInstruction> {
    const authority = args.authority ?? this.wallet.publicKey
    return this.program.methods
      .claimMintEsms(
        bytes32(args.claimId, 'claimId'),
        bytes32(args.ledgerReferenceHash, 'ledgerReferenceHash'),
        amountsToBn(args.amounts)
      )
      .accounts({
        authority,
        recipient: args.recipient,
        ...this.mintAccounts(),
        ...this.tokenAccounts(args.recipient),
      })
      .instruction()
  }

  async buildRedeemEsmsInstruction(args: {
    orderId: Uint8Array
    amounts: EsmsAmounts
    holder?: PublicKey
  }): Promise<TransactionInstruction> {
    const holder = args.holder ?? this.wallet.publicKey
    return this.program.methods
      .redeemEsms(bytes32(args.orderId, 'orderId'), amountsToBn(args.amounts))
      .accounts({
        holder,
        ...this.mintAccounts(),
        ...this.tokenAccounts(holder),
      })
      .instruction()
  }

  async buildRedeemForEsmsInstructions(args: {
    orderId: Uint8Array
    amounts: EsmsAmounts
    holder: PublicKey
    holderSignature: Uint8Array
    clusterDomain: Uint8Array
    deadline: bigint
    sponsor?: PublicKey
  }): Promise<readonly [TransactionInstruction, TransactionInstruction]> {
    if (args.holderSignature.length !== 64) {
      throw new Error('holderSignature must be exactly 64 bytes')
    }
    const message = buildRedeemAuthorizationMessage({
      programId: this.programId,
      clusterDomain: args.clusterDomain,
      holder: args.holder,
      orderId: args.orderId,
      amounts: args.amounts,
      deadline: args.deadline,
    })
    const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey: args.holder.toBytes(),
      message,
      signature: args.holderSignature,
    })
    const redeemInstruction = await this.program.methods
      .redeemForEsms(
        bytes32(args.orderId, 'orderId'),
        amountsToBn(args.amounts),
        new BN(args.deadline.toString())
      )
      .accounts({
        sponsor: args.sponsor ?? this.wallet.publicKey,
        holder: args.holder,
        ...this.mintAccounts(),
        ...this.tokenAccounts(args.holder),
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction()
    return [ed25519Instruction, redeemInstruction]
  }

  async buildRecordPersonaCommitmentInstruction(args: {
    agentId: Uint8Array
    targetPersonaHash: Uint8Array
    epochHash: Uint8Array
    sequence: bigint
    writer?: PublicKey
  }): Promise<TransactionInstruction> {
    return this.program.methods
      .recordPersonaCommitment(
        bytes32(args.agentId, 'agentId'),
        bytes32(args.targetPersonaHash, 'targetPersonaHash'),
        bytes32(args.epochHash, 'epochHash'),
        new BN(args.sequence.toString())
      )
      .accounts({
        writer: args.writer ?? this.wallet.publicKey,
      })
      .instruction()
  }

  async readEsmsBalances(owner: PublicKey | string): Promise<EsmsAmounts> {
    const publicKey = typeof owner === 'string' ? new PublicKey(owner) : owner
    const balances = await Promise.all(
      this.getTokenAccounts(publicKey).map(async account => {
        try {
          return BigInt(
            (await this.connection.getTokenAccountBalance(account, 'confirmed')).value.amount
          )
        } catch {
          return 0n
        }
      })
    )
    return balances as [bigint, bigint, bigint, bigint]
  }
}
