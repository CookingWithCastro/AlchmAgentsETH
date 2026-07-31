// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

import { AAE_SOLANA_PROGRAM_ID } from '@/lib/solana/esms'
import {
  createSolanaSyncProcessor,
  decodeAaeInstructionEvent,
  encodeSolanaSyncBody,
  type AaeSolanaSyncEvent,
} from '@/lib/solana/solana-sync-service'
import {
  createBridgeProcessor,
  destinationAmount,
  type PendingBridgeTransfer,
} from '@/lib/solana/bridge-service'
import { AaeSolanaClient } from '@/lib/solana/aae-solana-client'
import {
  MultiChainWalletManager,
  buildSolanaWalletBindingMessage,
  verifySolanaWalletBindingSignature,
} from '@/lib/web3/multi-chain-wallet'

describe('AAE Solana sync worker', () => {
  it('serializes u64 slots and ESMS amounts as unquoted JSON integers without precision loss', () => {
    const body = encodeSolanaSyncBody({
      signature:
        '5T1bw5onpC2XUx3wh494NudK33zKoL4NHqtkPafsBboJjBafqo5yfbhZ4isiyYdT2HuxHPgDSKdCh5Pd8LXEq4dk',
      slot: 18_446_744_073_709_551_615n,
      eventType: 'ClaimMintReceipt',
      claimId: '11'.repeat(32),
      ledgerReferenceHash: '22'.repeat(32),
      recipient: 'AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5',
      amounts: [18_446_744_073_709_551_615n, 1_000_000n, 0n, 1n],
      authority: 'AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5',
    })

    expect(body).toBe(
      '{"signature":"5T1bw5onpC2XUx3wh494NudK33zKoL4NHqtkPafsBboJjBafqo5yfbhZ4isiyYdT2HuxHPgDSKdCh5Pd8LXEq4dk",' +
        '"slot":18446744073709551615,"eventType":"ClaimMintReceipt","claimId":"' +
        '11'.repeat(32) +
        '","ledgerReferenceHash":"' +
        '22'.repeat(32) +
        '","recipient":"AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5",' +
        '"amounts":[18446744073709551615,1000000,0,1],' +
        '"authority":"AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5"}'
    )
    expect(body).not.toContain('"18446744073709551615"')
  })

  it('decodes the deployed claim_mint_esms instruction into a ClaimMintReceipt event', () => {
    const authority = new PublicKey('AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5')
    const recipient = new PublicKey('7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK')
    const data = Buffer.from(
      'c23b7886979dc1ef' +
        '11'.repeat(32) +
        '22'.repeat(32) +
        '0100000000000000' +
        '40420f0000000000' +
        '0000000000000000' +
        'ffffffffffffffff',
      'hex'
    )
    const instruction = new TransactionInstruction({
      programId: AAE_SOLANA_PROGRAM_ID,
      keys: [
        { pubkey: PublicKey.default, isSigner: false, isWritable: false },
        { pubkey: PublicKey.default, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: false },
      ],
      data,
    })

    expect(
      decodeAaeInstructionEvent({
        signature: 'claim-signature',
        slot: 480_000_000n,
        instruction,
      })
    ).toEqual({
      signature: 'claim-signature',
      slot: 480_000_000n,
      eventType: 'ClaimMintReceipt',
      claimId: '11'.repeat(32),
      ledgerReferenceHash: '22'.repeat(32),
      recipient: recipient.toBase58(),
      amounts: [1n, 1_000_000n, 0n, 18_446_744_073_709_551_615n],
      authority: authority.toBase58(),
    })
  })

  it('checks the processed transaction guard before dispatching a decoded event', async () => {
    const processed = new Set<string>()
    const dispatched: string[] = []
    const event: AaeSolanaSyncEvent = {
      signature: 'same-signature',
      slot: 480_000_001n,
      eventType: 'OrderReceipt',
      orderId: '33'.repeat(32),
      holder: '7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK',
      amounts: [1n, 2n, 3n, 4n],
      submitter: 'AhNRjjyhJ4dR6ZSvWyJNSpbJFbFnxhkRdUNMY31fJ3S5',
      mode: 'self',
    }
    const process = createSolanaSyncProcessor({
      store: {
        hasProcessed: async signature => processed.has(signature),
        recordProcessed: async value => {
          processed.add(value.signature)
        },
      },
      onEvent: async value => {
        dispatched.push(value.signature)
      },
    })

    expect(await process(event)).toBe(true)
    expect(await process(event)).toBe(false)
    expect(dispatched).toEqual(['same-signature'])
  })
})

describe('AAE two-way bridge relay', () => {
  it('checks the processed transaction guard before source verification or destination dispatch', async () => {
    const calls: string[] = []
    const processed = new Set<string>()
    const transfer: PendingBridgeTransfer = {
      claimId: `0x${'44'.repeat(32)}`,
      sourceTxHash: `0x${'55'.repeat(32)}`,
      sourceChain: 'EvmBaseSepolia',
      targetChain: 'SolanaToken2022',
      sourceAddress: '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F',
      targetAddress: '7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK',
      elementId: 1,
      amount: 1_000_000_000_000_000_000n,
      status: 'PendingMint',
    }
    const process = createBridgeProcessor({
      store: {
        hasProcessed: async signature => processed.has(signature),
        completeTransfer: async (claimId, destinationTxHash) => {
          calls.push(`complete:${claimId}:${destinationTxHash}`)
        },
        recordProcessed: async value => {
          processed.add(value.sourceTxHash)
          calls.push(`record:${value.sourceTxHash}`)
        },
      },
      verifyEvmSource: async () => calls.push('verify-evm'),
      verifySolanaSource: async () => calls.push('verify-solana'),
      mintEvmDestination: async () => {
        calls.push('mint-evm')
        return `0x${'66'.repeat(32)}`
      },
      mintSolanaDestination: async () => {
        calls.push('mint-solana')
        return 'solana-destination-signature'
      },
    })

    expect(await process(transfer)).toBe(true)
    expect(await process(transfer)).toBe(false)
    expect(calls).toEqual([
      'verify-evm',
      'mint-solana',
      `complete:${transfer.claimId}:solana-destination-signature`,
      `record:${transfer.sourceTxHash}`,
    ])
  })

  it('converts 18-decimal EVM atoms to 4-decimal Solana atoms without rounding', () => {
    const transfer: PendingBridgeTransfer = {
      claimId: `0x${'77'.repeat(32)}`,
      sourceTxHash: `0x${'88'.repeat(32)}`,
      sourceChain: 'EvmBaseSepolia',
      targetChain: 'SolanaToken2022',
      sourceAddress: '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F',
      targetAddress: '7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK',
      elementId: 0,
      amount: 100_000_000_000_000_000_000n,
      status: 'PendingMint',
    }
    expect(destinationAmount(transfer)).toBe(1_000_000n)
    expect(() => destinationAmount({ ...transfer, amount: transfer.amount + 1n })).toThrow(/dust/)
    expect(
      destinationAmount({
        ...transfer,
        sourceChain: 'SolanaToken2022',
        targetChain: 'EvmBaseSepolia',
        amount: 1_000_000n,
      })
    ).toBe(100_000_000_000_000_000_000n)
  })
})

describe('AAE Solana Anchor client', () => {
  it('builds claim instructions from the generated IDL with deterministic receipt and mint accounts', async () => {
    const payer = Keypair.generate()
    const client = new AaeSolanaClient({
      connection: new Connection('http://127.0.0.1:8899', 'confirmed'),
      wallet: {
        publicKey: payer.publicKey,
        signTransaction: async transaction => transaction,
        signAllTransactions: async transactions => transactions,
      },
    })
    const claimId = Uint8Array.from({ length: 32 }, (_, index) => index)
    const recipient = Keypair.generate().publicKey
    const instruction = await client.buildClaimMintEsmsInstruction({
      claimId,
      ledgerReferenceHash: Uint8Array.from({ length: 32 }, (_, index) => 255 - index),
      recipient,
      amounts: [1n, 1_000_000n, 0n, 4n],
    })

    expect(instruction.programId.equals(AAE_SOLANA_PROGRAM_ID)).toBe(true)
    expect(instruction.data.subarray(0, 8).toString('hex')).toBe('c23b7886979dc1ef')
    expect(instruction.keys[1].pubkey.equals(client.getClaimReceiptAddress(claimId))).toBe(true)
    expect(instruction.keys.slice(4, 8).map(account => account.pubkey.toBase58())).toEqual(
      client.mints.map(mint => mint.toBase58())
    )
  })
})

describe('AAE multi-chain wallet binding', () => {
  it('verifies the exact Ed25519 challenge and rejects a modified challenge', () => {
    const signer = nacl.sign.keyPair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => index))
    const wallet = bs58.encode(signer.publicKey)
    const challenge = {
      userId: 'user-123',
      wallet,
      nonce: 'nonce-456',
      deadline: 2_000_000_000n,
    }
    const signature = bs58.encode(
      nacl.sign.detached(buildSolanaWalletBindingMessage(challenge), signer.secretKey)
    )

    expect(verifySolanaWalletBindingSignature({ ...challenge, signature })).toBe(true)
    expect(verifySolanaWalletBindingSignature({ ...challenge, nonce: 'tampered', signature })).toBe(
      false
    )
  })

  it('keeps EVM and Solana connection state isolated for Dynamic wallets', () => {
    const manager = new MultiChainWalletManager()
    manager.setDynamicWallet({
      evmAddress: '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F',
      evmChainId: 84_532,
    })
    manager.setDynamicWallet({
      solanaAddress: '7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK',
    })

    expect(manager.snapshot().evm.address).toBe('0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F')
    expect(manager.snapshot().solana.address).toBe('7YVYdyiZzSw64Xy2VJbZEZFwXFPVQtRejv5q8fYynWnK')
    manager.disconnectSolana()
    expect(manager.snapshot().evm.address).not.toBeNull()
    expect(manager.snapshot().solana.address).toBeNull()
  })
})
