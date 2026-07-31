import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'
import { createWalletClient, custom, getAddress, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'

const BINDING_DOMAIN = 'AAE Solana Wallet Binding'
const EVM_RECONNECT_KEY = 'aae_evm_wallet_reconnect'
const SOLANA_RECONNECT_KEY = 'aae_solana_wallet_reconnect'

export interface SolanaWalletBindingChallenge {
  userId: string
  wallet: string
  nonce: string
  deadline: bigint
}

export function buildSolanaWalletBindingMessage(
  challenge: SolanaWalletBindingChallenge
): Uint8Array {
  if (!challenge.userId || !challenge.nonce)
    throw new Error('binding userId and nonce are required')
  const wallet = new PublicKey(challenge.wallet).toBase58()
  if (challenge.deadline <= 0n) throw new Error('binding deadline must be positive')
  return new TextEncoder().encode(
    [
      BINDING_DOMAIN,
      `User: ${challenge.userId}`,
      `Wallet: ${wallet}`,
      `Nonce: ${challenge.nonce}`,
      `Deadline: ${challenge.deadline}`,
    ].join('\n')
  )
}

export function verifySolanaWalletBindingSignature(
  challenge: SolanaWalletBindingChallenge & { signature: string }
): boolean {
  try {
    const publicKey = new PublicKey(challenge.wallet).toBytes()
    const signature = bs58.decode(challenge.signature)
    if (signature.length !== nacl.sign.signatureLength) return false
    return nacl.sign.detached.verify(
      buildSolanaWalletBindingMessage(challenge),
      signature,
      publicKey
    )
  } catch {
    return false
  }
}

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
}

export interface SolanaBrowserProvider {
  publicKey?: { toBase58(): string } | null
  isPhantom?: boolean
  isSolflare?: boolean
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{
    publicKey?: { toBase58(): string }
  } | void>
  disconnect?(): Promise<void>
  signMessage(
    message: Uint8Array,
    encoding?: string
  ): Promise<Uint8Array | { signature: Uint8Array | string }>
  on?(event: string, listener: (...args: unknown[]) => void): void
}

export interface MultiChainWalletSnapshot {
  evm: {
    address: Address | null
    chainId: number | null
    source: 'injected' | 'dynamic' | null
  }
  solana: {
    address: string | null
    source: 'phantom' | 'solflare' | 'dynamic' | null
  }
  connected: boolean
}

type WalletListener = (snapshot: MultiChainWalletSnapshot) => void

function browserWallets(): {
  ethereum?: Eip1193Provider
  solana?: SolanaBrowserProvider
  solflare?: SolanaBrowserProvider
} {
  if (typeof window === 'undefined') return {}
  return window as unknown as {
    ethereum?: Eip1193Provider
    solana?: SolanaBrowserProvider
    solflare?: SolanaBrowserProvider
  }
}

function randomNonce(): string {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return bs58.encode(bytes)
}

function localStorageOrNull(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

/**
 * Pentacles-compatible wallet facade with deliberately independent EVM and
 * Solana provider slots, so connecting or disconnecting one family cannot
 * erase the other's address.
 */
export class MultiChainWalletManager {
  private evmAddress: Address | null = null
  private evmChainId: number | null = null
  private evmProvider: Eip1193Provider | null = null
  private evmSource: 'injected' | 'dynamic' | null = null
  private solanaAddress: string | null = null
  private solanaProvider: SolanaBrowserProvider | null = null
  private solanaSource: 'phantom' | 'solflare' | 'dynamic' | null = null
  private listeners = new Set<WalletListener>()
  private wiredEvmProvider: Eip1193Provider | null = null
  private wiredSolanaProvider: SolanaBrowserProvider | null = null

  snapshot(): MultiChainWalletSnapshot {
    return {
      evm: {
        address: this.evmAddress,
        chainId: this.evmChainId,
        source: this.evmSource,
      },
      solana: {
        address: this.solanaAddress,
        source: this.solanaSource,
      },
      connected: Boolean(this.evmAddress || this.solanaAddress),
    }
  }

  onChange(listener: WalletListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }

  async connectEvm(provider = browserWallets().ethereum): Promise<Address> {
    if (!provider) throw new Error('No injected EVM wallet was detected')
    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts?.length) throw new Error('The EVM wallet returned no accounts')
    this.evmAddress = getAddress(accounts[0])
    this.evmChainId = Number(await provider.request({ method: 'eth_chainId' }))
    this.evmProvider = provider
    this.evmSource = 'injected'
    localStorageOrNull()?.setItem(EVM_RECONNECT_KEY, '1')
    this.wireEvm(provider)
    this.emit()
    return this.evmAddress
  }

  private wireEvm(provider: Eip1193Provider): void {
    if (this.wiredEvmProvider === provider || !provider.on) return
    this.wiredEvmProvider = provider
    provider.on('accountsChanged', (...args) => {
      const accounts = args[0] as string[]
      this.evmAddress = accounts?.[0] ? getAddress(accounts[0]) : null
      this.emit()
    })
    provider.on('chainChanged', (...args) => {
      const chainId = args[0]
      this.evmChainId = typeof chainId === 'string' ? Number.parseInt(chainId, 16) : Number(chainId)
      this.emit()
    })
  }

  async connectSolana(
    preference: 'phantom' | 'solflare' = 'phantom',
    explicitProvider?: SolanaBrowserProvider
  ): Promise<string> {
    const wallets = browserWallets()
    const provider =
      explicitProvider ?? (preference === 'solflare' ? wallets.solflare : wallets.solana)
    if (!provider) throw new Error(`No ${preference} Solana wallet was detected`)
    const result = await provider.connect()
    const publicKey = result?.publicKey ?? provider.publicKey
    if (!publicKey) throw new Error('The Solana wallet returned no public key')
    this.solanaAddress = new PublicKey(publicKey.toBase58()).toBase58()
    this.solanaProvider = provider
    this.solanaSource = preference
    localStorageOrNull()?.setItem(SOLANA_RECONNECT_KEY, preference)
    this.wireSolana(provider)
    this.emit()
    return this.solanaAddress
  }

  private wireSolana(provider: SolanaBrowserProvider): void {
    if (this.wiredSolanaProvider === provider || !provider.on) return
    this.wiredSolanaProvider = provider
    provider.on('accountChanged', (...args) => {
      const publicKey = args[0] as { toBase58?(): string } | null
      this.solanaAddress = publicKey?.toBase58
        ? new PublicKey(publicKey.toBase58()).toBase58()
        : null
      this.emit()
    })
    provider.on('disconnect', () => this.disconnectSolana())
  }

  setDynamicWallet(args: {
    evmAddress?: string | null
    evmChainId?: number | null
    evmProvider?: Eip1193Provider | null
    solanaAddress?: string | null
    solanaProvider?: SolanaBrowserProvider | null
  }): void {
    if ('evmAddress' in args) {
      this.evmAddress = args.evmAddress ? getAddress(args.evmAddress) : null
      this.evmSource = this.evmAddress ? 'dynamic' : null
      if (this.evmAddress) localStorageOrNull()?.setItem(EVM_RECONNECT_KEY, '1')
      else localStorageOrNull()?.removeItem(EVM_RECONNECT_KEY)
    }
    if ('evmChainId' in args) this.evmChainId = args.evmChainId ?? null
    if ('evmProvider' in args) this.evmProvider = args.evmProvider ?? null
    if ('solanaAddress' in args) {
      this.solanaAddress = args.solanaAddress ? new PublicKey(args.solanaAddress).toBase58() : null
      this.solanaSource = this.solanaAddress ? 'dynamic' : null
      if (this.solanaAddress) localStorageOrNull()?.setItem(SOLANA_RECONNECT_KEY, 'dynamic')
      else localStorageOrNull()?.removeItem(SOLANA_RECONNECT_KEY)
    }
    if ('solanaProvider' in args) this.solanaProvider = args.solanaProvider ?? null
    this.emit()
  }

  async tryReconnect(): Promise<void> {
    const storage = localStorageOrNull()
    const wallets = browserWallets()
    if (storage?.getItem(EVM_RECONNECT_KEY) === '1' && wallets.ethereum) {
      try {
        const accounts = (await wallets.ethereum.request({ method: 'eth_accounts' })) as string[]
        if (accounts?.length) {
          this.evmAddress = getAddress(accounts[0])
          this.evmChainId = Number(await wallets.ethereum.request({ method: 'eth_chainId' }))
          this.evmProvider = wallets.ethereum
          this.evmSource = 'injected'
          this.wireEvm(wallets.ethereum)
        }
      } catch {
        storage.removeItem(EVM_RECONNECT_KEY)
      }
    }
    const solanaPreference = storage?.getItem(SOLANA_RECONNECT_KEY)
    const solanaProvider =
      solanaPreference === 'solflare'
        ? wallets.solflare
        : solanaPreference === 'phantom'
          ? wallets.solana
          : undefined
    if (solanaProvider) {
      try {
        const result = await solanaProvider.connect({ onlyIfTrusted: true })
        const publicKey = result?.publicKey ?? solanaProvider.publicKey
        if (publicKey) {
          this.solanaAddress = new PublicKey(publicKey.toBase58()).toBase58()
          this.solanaProvider = solanaProvider
          this.solanaSource = solanaPreference as 'phantom' | 'solflare'
          this.wireSolana(solanaProvider)
        }
      } catch {
        storage?.removeItem(SOLANA_RECONNECT_KEY)
      }
    }
    this.emit()
  }

  evmWalletClient() {
    if (!this.evmProvider || !this.evmAddress) return null
    return createWalletClient({
      account: this.evmAddress,
      chain: baseSepolia,
      transport: custom(this.evmProvider),
    })
  }

  async bindSolanaWallet(args: {
    userId: string
    nonce?: string
    deadline?: bigint
    fetchImpl?: typeof fetch
  }): Promise<void> {
    if (!this.solanaAddress || !this.solanaProvider) {
      throw new Error('No signable Solana wallet is connected')
    }
    const challenge: SolanaWalletBindingChallenge = {
      userId: args.userId,
      wallet: this.solanaAddress,
      nonce: args.nonce ?? randomNonce(),
      deadline: args.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 600),
    }
    const signed = await this.solanaProvider.signMessage(
      buildSolanaWalletBindingMessage(challenge),
      'utf8'
    )
    const rawSignature = signed instanceof Uint8Array ? signed : signed.signature
    const signature = typeof rawSignature === 'string' ? rawSignature : bs58.encode(rawSignature)
    const response = await (args.fetchImpl ?? fetch)('/api/web3/verify-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: 'solana',
        ...challenge,
        deadline: challenge.deadline.toString(),
        signature,
      }),
    })
    const body = (await response.json().catch(() => ({}))) as {
      verified?: boolean
      error?: string
    }
    if (!response.ok || !body.verified) {
      throw new Error(body.error ?? `Solana wallet verification failed (${response.status})`)
    }
  }

  disconnectEvm(): void {
    this.evmAddress = null
    this.evmChainId = null
    this.evmProvider = null
    this.evmSource = null
    localStorageOrNull()?.removeItem(EVM_RECONNECT_KEY)
    this.emit()
  }

  disconnectSolana(): void {
    const provider = this.solanaProvider
    this.solanaAddress = null
    this.solanaProvider = null
    this.solanaSource = null
    localStorageOrNull()?.removeItem(SOLANA_RECONNECT_KEY)
    this.emit()
    void provider?.disconnect?.()
  }

  disconnect(): void {
    this.disconnectEvm()
    this.disconnectSolana()
  }
}

export const multiChainWallet = new MultiChainWalletManager()
export default multiChainWallet
