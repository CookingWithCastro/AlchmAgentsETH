// @vitest-environment node

import * as anchor from '@coral-xyz/anchor'
import { createHash, randomBytes } from 'node:crypto'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMetadataPointerState,
  getMint,
  getNonTransferable,
  getPermanentDelegate,
  getPermissionedBurn,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  AAE_SOLANA_SEEDS,
  buildRedeemAuthorizationMessage,
  getEsmsMintAddresses,
  getProgramConfigAddress,
  getReceiptAddress,
} from '@/lib/solana/esms'
import type { AaeSolana } from '@/lib/solana/idl/aae_solana'

const toBytes = (value: Uint8Array): number[] => [...value]
const toAmounts = (values: readonly bigint[]): anchor.BN[] =>
  values.map(value => new anchor.BN(value.toString()))
const BPF_UPGRADEABLE_LOADER_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')

async function getRawTokenBalance(connection: Connection, account: PublicKey): Promise<bigint> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const info = await connection.getAccountInfo(account, 'confirmed')
    if (info) return info.data.readBigUInt64LE(64)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Token account was not visible at confirmed commitment: ${account.toBase58()}`)
}

describe.sequential('AAE Solana ESMS and persona program on Devnet', () => {
  const environmentProvider = anchor.AnchorProvider.env()
  let nextRequestAt = 0
  const connection = new Connection(environmentProvider.connection.rpcEndpoint, {
    commitment: 'confirmed',
    fetchMiddleware: (info, init, fetch) => {
      const now = Date.now()
      const delay = Math.max(0, nextRequestAt - now)
      nextRequestAt = Math.max(now, nextRequestAt) + 350
      setTimeout(() => fetch(info, init), delay)
    },
  })
  const provider = new anchor.AnchorProvider(connection, environmentProvider.wallet, {
    ...environmentProvider.opts,
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  anchor.setProvider(provider)
  const program = anchor.workspace.AaeSolana as anchor.Program<AaeSolana>
  const admin = provider.wallet.publicKey
  const attestor = Keypair.generate()
  const pauser = Keypair.generate()
  const outsider = Keypair.generate()
  const holder = Keypair.generate()
  const attestorRecipient = Keypair.generate()
  const clusterDomain = Uint8Array.from(randomBytes(32))
  const [programConfig] = PublicKey.findProgramAddressSync(
    [AAE_SOLANA_SEEDS.programAuthority],
    program.programId
  )
  const mints = getEsmsMintAddresses(program.programId)
  const [programData] = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    BPF_UPGRADEABLE_LOADER_ID
  )
  const holderAccounts = mints.map(mint =>
    getAssociatedTokenAddressSync(mint, holder.publicKey, false, TOKEN_2022_PROGRAM_ID)
  )
  const tokenAccounts = {
    spiritAccount: holderAccounts[0],
    essenceAccount: holderAccounts[1],
    matterAccount: holderAccounts[2],
    substanceAccount: holderAccounts[3],
  }
  const mintAccounts = {
    spiritMint: mints[0],
    essenceMint: mints[1],
    matterMint: mints[2],
    substanceMint: mints[3],
  }
  const attestorRecipientAccounts = mints.map(mint =>
    getAssociatedTokenAddressSync(mint, attestorRecipient.publicKey, false, TOKEN_2022_PROGRAM_ID)
  )

  let configuredDomain: Uint8Array

  beforeAll(async () => {
    expect(getProgramConfigAddress(program.programId).equals(programConfig)).toBe(true)
    const existing = await provider.connection.getAccountInfo(programConfig, 'confirmed')
    if (!existing) {
      await program.methods
        .initializeConfig(attestor.publicKey, pauser.publicKey, toBytes(clusterDomain))
        .accounts({
          programConfig,
          admin,
          program: program.programId,
          programData,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    }
    const config = await program.account.programConfig.fetch(programConfig)
    expect(config.admin.equals(admin)).toBe(true)
    configuredDomain = Uint8Array.from(config.clusterDomain)

    const funding = new Transaction()
      .add(
        SystemProgram.transfer({
          fromPubkey: admin,
          toPubkey: outsider.publicKey,
          lamports: 10_000_000,
        })
      )
      .add(
        SystemProgram.transfer({
          fromPubkey: admin,
          toPubkey: holder.publicKey,
          lamports: 30_000_000,
        })
      )
      .add(
        SystemProgram.transfer({
          fromPubkey: admin,
          toPubkey: attestor.publicKey,
          lamports: 30_000_000,
        })
      )
    await provider.sendAndConfirm(funding)
    await program.methods
      .initializeEsmsMints()
      .accounts({
        programConfig,
        admin,
        ...mintAccounts,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }, 120_000)

  it('allows only the admin to rotate or revoke service authorities', async () => {
    await expect(
      program.methods
        .setServiceAuthorities(outsider.publicKey, outsider.publicKey)
        .accounts({ programConfig, authority: outsider.publicKey })
        .signers([outsider])
        .rpc()
    ).rejects.toThrow(/Unauthorized/)

    await program.methods
      .setServiceAuthorities(PublicKey.default, PublicKey.default)
      .accounts({ programConfig, authority: admin })
      .rpc()
    const revoked = await program.account.programConfig.fetch(programConfig)
    expect(revoked.attestor.equals(PublicKey.default)).toBe(true)
    expect(revoked.pauser.equals(PublicKey.default)).toBe(true)

    await program.methods
      .setServiceAuthorities(attestor.publicKey, pauser.publicKey)
      .accounts({ programConfig, authority: admin })
      .rpc()

    const config = await program.account.programConfig.fetch(programConfig)
    expect(config.attestor.equals(attestor.publicKey)).toBe(true)
    expect(config.pauser.equals(pauser.publicKey)).toBe(true)
  }, 120_000)

  it('rejects unauthorized claims and accepts the configured attestor', async () => {
    const amounts = [1n, 2n, 3n, 4n] as const
    const accounts = {
      programConfig,
      recipient: attestorRecipient.publicKey,
      ...mintAccounts,
      spiritAccount: attestorRecipientAccounts[0],
      essenceAccount: attestorRecipientAccounts[1],
      matterAccount: attestorRecipientAccounts[2],
      substanceAccount: attestorRecipientAccounts[3],
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }
    const unauthorizedClaimId = Uint8Array.from(randomBytes(32))
    await expect(
      program.methods
        .claimMintEsms(
          toBytes(unauthorizedClaimId),
          toBytes(Uint8Array.from(randomBytes(32))),
          toAmounts(amounts)
        )
        .accounts({
          ...accounts,
          claimReceipt: getReceiptAddress('claim', unauthorizedClaimId, program.programId),
          authority: outsider.publicKey,
        })
        .signers([outsider])
        .rpc()
    ).rejects.toThrow(/Unauthorized/)

    const attestedClaimId = Uint8Array.from(randomBytes(32))
    const attestedReceipt = getReceiptAddress('claim', attestedClaimId, program.programId)
    await program.methods
      .claimMintEsms(
        toBytes(attestedClaimId),
        toBytes(Uint8Array.from(randomBytes(32))),
        toAmounts(amounts)
      )
      .accounts({
        ...accounts,
        claimReceipt: attestedReceipt,
        authority: attestor.publicKey,
      })
      .signers([attestor])
      .rpc()

    const receipt = await program.account.claimReceipt.fetch(attestedReceipt)
    expect(receipt.authority.equals(attestor.publicKey)).toBe(true)
  }, 120_000)

  it('creates all four Token-2022 ESMS mints idempotently', async () => {
    const accounts = {
      programConfig,
      admin,
      ...mintAccounts,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }
    await program.methods.initializeEsmsMints().accounts(accounts).rpc()
    await program.methods.initializeEsmsMints().accounts(accounts).rpc()

    for (const mint of mints) {
      const info = await provider.connection.getAccountInfo(mint, 'confirmed')
      expect(info?.owner.equals(TOKEN_2022_PROGRAM_ID)).toBe(true)
      expect(info?.data.length).toBeGreaterThan(300)
      const state = await getMint(provider.connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID)
      expect(getNonTransferable(state)).not.toBeNull()
      expect(getPermanentDelegate(state)?.delegate.equals(programConfig)).toBe(true)
      expect(getPermissionedBurn(state)?.authority?.equals(programConfig)).toBe(true)
      expect(getMetadataPointerState(state)?.authority?.equals(programConfig)).toBe(true)
      expect(getMetadataPointerState(state)?.metadataAddress?.equals(mint)).toBe(true)
    }
  }, 120_000)

  it('records monotonic persona commitments and rejects unauthorized writers', async () => {
    const agentId = Uint8Array.from(randomBytes(32))
    const targetHash = Uint8Array.from(createHash('sha256').update('target-v1').digest())
    const epochHash = Uint8Array.from(createHash('sha256').update('epoch-v1').digest())
    const [personaCommitment] = PublicKey.findProgramAddressSync(
      [AAE_SOLANA_SEEDS.personaCommitment, Buffer.from(agentId)],
      program.programId
    )

    await program.methods
      .recordPersonaCommitment(
        toBytes(agentId),
        toBytes(targetHash),
        toBytes(epochHash),
        new anchor.BN(1)
      )
      .accounts({
        programConfig,
        personaCommitment,
        writer: admin,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const commitment = await program.account.personaCommitment.fetch(personaCommitment)
    expect(commitment.sequence.toString()).toBe('1')
    expect(commitment.writer.equals(admin)).toBe(true)

    await expect(
      program.methods
        .recordPersonaCommitment(
          toBytes(agentId),
          toBytes(targetHash),
          toBytes(epochHash),
          new anchor.BN(2)
        )
        .accounts({
          programConfig,
          personaCommitment,
          writer: outsider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([outsider])
        .rpc()
    ).rejects.toThrow(/Unauthorized/)
  }, 120_000)

  it('claims once, self-redeems once, and rejects both replay attempts', async () => {
    const claimId = Uint8Array.from(randomBytes(32))
    const ledgerReference = Uint8Array.from(randomBytes(32))
    const claimAmounts = [1_000_000n, 500_000n, 250_000n, 125_000n] as const
    const claimReceipt = getReceiptAddress('claim', claimId, program.programId)
    const claim = program.methods
      .claimMintEsms(toBytes(claimId), toBytes(ledgerReference), toAmounts(claimAmounts))
      .accounts({
        programConfig,
        claimReceipt,
        authority: admin,
        recipient: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
    await claim.rpc({ commitment: 'confirmed', preflightCommitment: 'confirmed' })
    await expect(claim.rpc()).rejects.toThrow()

    const balances: bigint[] = []
    for (const account of holderAccounts) {
      balances.push(await getRawTokenBalance(provider.connection, account))
    }
    expect(balances).toEqual([...claimAmounts])

    const orderId = Uint8Array.from(randomBytes(32))
    const redeemAmounts = [100_000n, 50_000n, 25_000n, 12_500n] as const
    const orderReceipt = getReceiptAddress('order', orderId, program.programId)
    const redeem = program.methods
      .redeemEsms(toBytes(orderId), toAmounts(redeemAmounts))
      .accounts({
        programConfig,
        orderReceipt,
        holder: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([holder])
    await redeem.rpc()
    await expect(redeem.rpc()).rejects.toThrow()

    const receipt = await program.account.orderReceipt.fetch(orderReceipt)
    expect(receipt.mode).toBe(0)
    expect(receipt.holder.equals(holder.publicKey)).toBe(true)
  }, 120_000)

  it('executes a sponsored redeem only with an immediately preceding holder signature', async () => {
    const orderId = Uint8Array.from(randomBytes(32))
    const amounts = [10_000n, 20_000n, 30_000n, 40_000n] as const
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)
    const orderReceipt = getReceiptAddress('order', orderId, program.programId)
    const message = buildRedeemAuthorizationMessage({
      programId: program.programId,
      clusterDomain: configuredDomain,
      holder: holder.publicKey,
      orderId,
      amounts,
      deadline,
    })
    const signatureInstruction = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: holder.secretKey,
      message,
    })
    const redeemInstruction = await program.methods
      .redeemForEsms(toBytes(orderId), toAmounts(amounts), new anchor.BN(deadline.toString()))
      .accounts({
        programConfig,
        orderReceipt,
        sponsor: admin,
        holder: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()

    await provider.sendAndConfirm(new Transaction().add(signatureInstruction, redeemInstruction))
    const receipt = await program.account.orderReceipt.fetch(orderReceipt)
    expect(receipt.mode).toBe(1)
    expect(receipt.submitter.equals(admin)).toBe(true)

    const missingSignatureOrder = Uint8Array.from(randomBytes(32))
    const missingSignatureReceipt = getReceiptAddress(
      'order',
      missingSignatureOrder,
      program.programId
    )
    await expect(
      program.methods
        .redeemForEsms(
          toBytes(missingSignatureOrder),
          toAmounts(amounts),
          new anchor.BN(deadline.toString())
        )
        .accounts({
          programConfig,
          orderReceipt: missingSignatureReceipt,
          sponsor: admin,
          holder: holder.publicKey,
          ...mintAccounts,
          ...tokenAccounts,
          instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    ).rejects.toThrow(/Ed25519 holder authorization/)
  }, 120_000)

  it('enforces granular pauses on claims and both redemption modes', async () => {
    await expect(
      program.methods
        .setPauseState(true, true)
        .accounts({ programConfig, authority: outsider.publicKey })
        .signers([outsider])
        .rpc()
    ).rejects.toThrow(/Unauthorized/)

    await program.methods
      .setPauseState(true, false)
      .accounts({ programConfig, authority: pauser.publicKey })
      .signers([pauser])
      .rpc()
    const paused = await program.account.programConfig.fetch(programConfig)
    expect(paused.pauseClaims).toBe(true)
    expect(paused.pauseRedemptions).toBe(false)

    const pausedClaimId = Uint8Array.from(randomBytes(32))
    await expect(
      program.methods
        .claimMintEsms(
          toBytes(pausedClaimId),
          toBytes(Uint8Array.from(randomBytes(32))),
          toAmounts([1n, 1n, 1n, 1n])
        )
        .accounts({
          programConfig,
          claimReceipt: getReceiptAddress('claim', pausedClaimId, program.programId),
          authority: admin,
          recipient: holder.publicKey,
          ...mintAccounts,
          ...tokenAccounts,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    ).rejects.toThrow(/Claims are paused/)

    const liveOrderId = Uint8Array.from(randomBytes(32))
    await program.methods
      .redeemEsms(toBytes(liveOrderId), toAmounts([1n, 1n, 1n, 1n]))
      .accounts({
        programConfig,
        orderReceipt: getReceiptAddress('order', liveOrderId, program.programId),
        holder: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([holder])
      .rpc()

    await program.methods
      .setPauseState(false, true)
      .accounts({ programConfig, authority: pauser.publicKey })
      .signers([pauser])
      .rpc()

    const pausedOrderId = Uint8Array.from(randomBytes(32))
    await expect(
      program.methods
        .redeemEsms(toBytes(pausedOrderId), toAmounts([1n, 1n, 1n, 1n]))
        .accounts({
          programConfig,
          orderReceipt: getReceiptAddress('order', pausedOrderId, program.programId),
          holder: holder.publicKey,
          ...mintAccounts,
          ...tokenAccounts,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([holder])
        .rpc()
    ).rejects.toThrow(/Redemptions are paused/)

    const sponsoredOrderId = Uint8Array.from(randomBytes(32))
    const sponsoredAmounts = [1n, 1n, 1n, 1n] as const
    const sponsoredDeadline = BigInt(Math.floor(Date.now() / 1000) + 300)
    const sponsoredMessage = buildRedeemAuthorizationMessage({
      programId: program.programId,
      clusterDomain: configuredDomain,
      holder: holder.publicKey,
      orderId: sponsoredOrderId,
      amounts: sponsoredAmounts,
      deadline: sponsoredDeadline,
    })
    const sponsoredSignature = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: holder.secretKey,
      message: sponsoredMessage,
    })
    const sponsoredRedeem = await program.methods
      .redeemForEsms(
        toBytes(sponsoredOrderId),
        toAmounts(sponsoredAmounts),
        new anchor.BN(sponsoredDeadline.toString())
      )
      .accounts({
        programConfig,
        orderReceipt: getReceiptAddress('order', sponsoredOrderId, program.programId),
        sponsor: admin,
        holder: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
    await expect(
      provider.sendAndConfirm(new Transaction().add(sponsoredSignature, sponsoredRedeem))
    ).rejects.toThrow(/Redemptions are paused/)

    const liveClaimId = Uint8Array.from(randomBytes(32))
    await program.methods
      .claimMintEsms(
        toBytes(liveClaimId),
        toBytes(Uint8Array.from(randomBytes(32))),
        toAmounts([1n, 1n, 1n, 1n])
      )
      .accounts({
        programConfig,
        claimReceipt: getReceiptAddress('claim', liveClaimId, program.programId),
        authority: admin,
        recipient: holder.publicKey,
        ...mintAccounts,
        ...tokenAccounts,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    await program.methods
      .setPauseState(false, false)
      .accounts({ programConfig, authority: admin })
      .rpc()
  }, 120_000)
})
