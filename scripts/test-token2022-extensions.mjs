#!/usr/bin/env bun

import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createInitializeNonTransferableMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializePermissionedBurnInstruction,
  createMintToCheckedInstruction,
  createPermissionedBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getPermissionedBurn,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const DECIMALS = 4
const INITIAL_AMOUNT = 1_000_000n
const BURN_AMOUNT = 100_000n

function argument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

async function loadKeypair(path) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, 'utf8'))))
}

async function send(connection, transaction, signers, label) {
  const signature = await sendAndConfirmTransaction(connection, transaction, signers, {
    commitment: 'confirmed',
  })
  console.log(`${label}: ${signature}`)
  return signature
}

async function expectFailure(label, action) {
  try {
    await action()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`${label}: rejected as expected (${message.split('\n')[0]})`)
    return
  }
  throw new Error(`${label}: unexpectedly succeeded`)
}

const cluster = argument('--cluster', 'devnet')
const rpcUrl = argument(
  '--url',
  cluster === 'localnet' ? 'http://127.0.0.1:8899' : clusterApiUrl(cluster)
)
const keypairPath = resolve(
  argument('--keypair', `${homedir()}/.config/solana/id.json`).replace(/^~(?=\/)/, homedir())
)
const connection = new Connection(rpcUrl, 'confirmed')
const payer = await loadKeypair(keypairPath)
const mint = Keypair.generate()
const holder = Keypair.generate()
const recipient = Keypair.generate()
const permanentDelegate = Keypair.generate()
const fakePermissionedBurnAuthority = Keypair.generate()

if ((await connection.getBalance(payer.publicKey, 'confirmed')) < 20_000_000) {
  throw new Error(`Insufficient SOL for extension spike: ${payer.publicKey.toBase58()}`)
}

const extensions = [
  ExtensionType.NonTransferable,
  ExtensionType.PermissionedBurn,
  ExtensionType.PermanentDelegate,
  ExtensionType.MetadataPointer,
]
const mintLen = getMintLen(extensions)
const rent = await connection.getMinimumBalanceForRentExemption(mintLen)
const holderAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  holder.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
)
const recipientAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  recipient.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
)

const initialize = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: rent,
    space: mintLen,
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  createInitializeNonTransferableMintInstruction(mint.publicKey, TOKEN_2022_PROGRAM_ID),
  createInitializePermanentDelegateInstruction(
    mint.publicKey,
    permanentDelegate.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createInitializeMetadataPointerInstruction(
    mint.publicKey,
    payer.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createInitializePermissionedBurnInstruction(
    mint.publicKey,
    payer.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createInitializeMint2Instruction(
    mint.publicKey,
    DECIMALS,
    payer.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  ),
  createAssociatedTokenAccountIdempotentInstruction(
    payer.publicKey,
    holderAta,
    holder.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createAssociatedTokenAccountIdempotentInstruction(
    payer.publicKey,
    recipientAta,
    recipient.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createMintToCheckedInstruction(
    mint.publicKey,
    holderAta,
    payer.publicKey,
    INITIAL_AMOUNT,
    DECIMALS,
    [],
    TOKEN_2022_PROGRAM_ID
  )
)
await send(connection, initialize, [payer, mint], 'initialize mint and extensions')

const mintState = await getMint(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID)
const permissionedBurn = getPermissionedBurn(mintState)
if (!permissionedBurn?.authority?.equals(payer.publicKey)) {
  throw new Error('PermissionedBurn authority was not initialized correctly')
}

await expectFailure('direct Token-2022 transfer', () =>
  send(
    connection,
    new Transaction().add(
      createTransferCheckedInstruction(
        holderAta,
        mint.publicKey,
        recipientAta,
        holder.publicKey,
        1n,
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    ),
    [payer, holder],
    'unexpected transfer'
  )
)

await expectFailure('direct holder burn without AAE permission', () =>
  send(
    connection,
    new Transaction().add(
      createBurnCheckedInstruction(
        holderAta,
        mint.publicKey,
        holder.publicKey,
        BURN_AMOUNT,
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    ),
    [payer, holder],
    'unexpected direct burn'
  )
)

await expectFailure('permissioned burn with unauthorized co-signer', () =>
  send(
    connection,
    new Transaction().add(
      createPermissionedBurnCheckedInstruction(
        holderAta,
        mint.publicKey,
        holder.publicKey,
        fakePermissionedBurnAuthority.publicKey,
        BURN_AMOUNT,
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    ),
    [payer, holder, fakePermissionedBurnAuthority],
    'unexpected unauthorized permissioned burn'
  )
)

await send(
  connection,
  new Transaction().add(
    createPermissionedBurnCheckedInstruction(
      holderAta,
      mint.publicKey,
      permanentDelegate.publicKey,
      payer.publicKey,
      BURN_AMOUNT,
      DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  ),
  [payer, permanentDelegate],
  'sponsored redeem_for burn'
)

const holderState = await getAccount(connection, holderAta, 'confirmed', TOKEN_2022_PROGRAM_ID)
if (holderState.amount !== INITIAL_AMOUNT - BURN_AMOUNT) {
  throw new Error(`Unexpected balance after sponsored burn: ${holderState.amount}`)
}

console.log(
  JSON.stringify(
    {
      cluster,
      rpcUrl,
      mint: mint.publicKey.toBase58(),
      holderAta: holderAta.toBase58(),
      permanentDelegate: permanentDelegate.publicKey.toBase58(),
      permissionedBurnAuthority: payer.publicKey.toBase58(),
      finalRawBalance: holderState.amount.toString(),
      verified: {
        nonTransferable: true,
        unauthorizedBurnRejected: true,
        permanentDelegateSponsoredBurn: true,
        metadataPointer: mint.publicKey.toBase58(),
      },
    },
    null,
    2
  )
)
