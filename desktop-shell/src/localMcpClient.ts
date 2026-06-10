import { Command } from '@tauri-apps/plugin-shell'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: any
  id?: string | number
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: string | number | null
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export type LocalMcpStatus = 'checking' | 'online' | 'offline'

/**
 * Snapshot of the client's externally-observable state. Consumed by
 * useSyncExternalStore in the React hook (see hooks/useLocalMcp.ts).
 * The reference identity changes on every update so React sees a
 * change; mutating in place would break that contract.
 */
export interface LocalMcpSnapshot {
  status: LocalMcpStatus
  lastError: string | null
  /**
   * Tail of recent stderr lines from the sidecar process. Capped at
   * STDERR_RING_SIZE so this never grows unbounded for a long-lived
   * client. Diagnostic UI panels read this directly.
   */
  stderrLog: readonly string[]
}

/**
 * Maximum stderr lines retained per client. Tuned so a chatty sidecar
 * (e.g. PyInstaller bootstrap noise + a few crash traces) fits without
 * having to scroll back through hours of history.
 */
const STDERR_RING_SIZE = 200

/**
 * call() retry budget for transient JSON-RPC failures: 2 retries on
 * top of the initial attempt, with exponential backoff starting at
 * 250ms. Currently transient failures are detected as either the
 * underlying child process being dead or a write error to stdin — a
 * fully-handed JSON-RPC error response is NOT retried, since the
 * sidecar made an intentional decision to refuse.
 */
const CALL_RETRY_ATTEMPTS = 2
const CALL_RETRY_BASE_DELAY_MS = 250

/**
 * Idle reconnect cadence. When the sidecar reports 'offline', the
 * client schedules a restart attempt this often until either start()
 * succeeds or stop() is called explicitly.
 */
const RECONNECT_INTERVAL_MS = 30_000

export class LocalMcpClient {
  private commandName: string
  private env?: Record<string, string>
  private child: any = null
  private pendingRequests = new Map<
    string | number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >()
  private nextId = 1
  private buffer = ''

  // ---- Subscriber-style state. Replaces the single onStatusChange
  // callback the constructor used to take, but the constructor still
  // accepts an optional callback to stay backward-compatible with the
  // existing main.ts call sites that wired one in.
  private listeners = new Set<() => void>()
  private snapshot: LocalMcpSnapshot = {
    status: 'offline',
    lastError: null,
    stderrLog: [],
  }
  private stderrRing: string[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * Set to true while stop() is in flight or after a manual stop. The
   * reconnect cycle checks this so a user-initiated shutdown doesn't
   * immediately race a restart.
   */
  private stopped = false

  constructor(
    commandName: string,
    onStatusChange?: (status: LocalMcpStatus) => void,
    env?: Record<string, string>
  ) {
    this.commandName = commandName
    // Extra env merged into the sidecar process (clearEnv stays false, so the
    // parent env — PATH etc. — is preserved). Used to point the bundled MCP
    // servers at the production backend instead of their localhost defaults.
    this.env = env
    if (onStatusChange) {
      // Bridge old-style callback into the new subscribe API so legacy
      // call sites (main.ts) keep working without changes.
      let lastStatus = this.snapshot.status
      this.subscribe(() => {
        const next = this.snapshot.status
        if (next !== lastStatus) {
          lastStatus = next
          onStatusChange(next)
        }
      })
    }
  }

  // ---- External-store interface (for React useSyncExternalStore). ----

  /** Subscribe to snapshot updates. Returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Return the current snapshot. Stable reference between updates —
   * useSyncExternalStore relies on referential equality to skip
   * re-renders. We allocate a new object only inside emit().
   */
  getSnapshot = (): LocalMcpSnapshot => this.snapshot

  private emit(partial: Partial<LocalMcpSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
      // stderrLog is always a fresh slice so external consumers can't
      // mutate our internal ring buffer.
      stderrLog: partial.stderrLog ?? [...this.stderrRing],
    }
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (e) {
        console.error('LocalMcpClient listener threw:', e)
      }
    }
  }

  private appendStderr(line: string): void {
    // The Tauri shell plugin tends to hand us either a single line or
    // a multi-line chunk depending on flushing. Split defensively so
    // each entry in the ring is one logical line.
    const lines = line.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return
    this.stderrRing.push(...lines)
    while (this.stderrRing.length > STDERR_RING_SIZE) {
      this.stderrRing.shift()
    }
    this.emit({ stderrLog: [...this.stderrRing] })
  }

  // ---- Lifecycle. ----

  async start(): Promise<void> {
    // Cancel any pending reconnect — an explicit start() supersedes
    // the timer-driven retry path.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopped = false

    try {
      this.emit({ status: 'checking', lastError: null })

      // Process hygiene: kill existing process attached to window if any.
      const globalKey = `__mcp_child_${this.commandName}`
      const oldChild = (window as any)[globalKey]
      if (oldChild) {
        try {
          await oldChild.kill()
        } catch (e) {
          console.warn('Failed to kill previous sidecar process:', e)
        }
      }

      console.log(`Spawning local MCP sidecar: ${this.commandName}`)
      const command = this.env
        ? Command.sidecar(this.commandName, [], { env: this.env })
        : Command.sidecar(this.commandName)

      command.stdout.on('data', (data: string) => {
        this.handleStdout(data)
      })

      command.stderr.on('data', (data: string) => {
        // Keep the console log for dev-tools visibility, but also
        // capture so a UI Diagnostics panel can read it.
        console.error(`[${this.commandName} stderr]:`, data)
        this.appendStderr(typeof data === 'string' ? data : String(data))
      })

      command.on('close', (data: any) => {
        console.warn(`[${this.commandName}] sidecar process closed:`, data)
        this.handleProcessClose()
      })

      this.child = await command.spawn()
      ;(window as any)[globalKey] = this.child

      // MCP initialize handshake. Using the same call() path the rest
      // of the client uses means initialize benefits from the retry
      // budget — useful for the first-spawn race where the sidecar's
      // stdin isn't fully wired yet.
      const initResult = await this.call('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'alchm-desktop-shell', version: '1.0.0' },
      })
      console.log(`[${this.commandName}] initialized successfully:`, initResult)

      await this.sendNotification('notifications/initialized')

      this.emit({ status: 'online', lastError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed to start sidecar ${this.commandName}:`, error)
      this.child = null
      this.emit({ status: 'offline', lastError: message })
      this.scheduleReconnect()
    }
  }

  async stop(): Promise<void> {
    this.stopped = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.child) {
      try {
        await this.child.kill()
      } catch (e) {
        console.error(`Failed to kill sidecar ${this.commandName}:`, e)
      }
      this.child = null
    }
    this.emit({ status: 'offline' })
  }

  private handleProcessClose(): void {
    this.child = null
    // Fail any in-flight requests so callers don't hang forever waiting
    // on a response that will never arrive.
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(`Sidecar ${this.commandName} exited mid-request`))
    }
    this.pendingRequests.clear()

    this.emit({
      status: 'offline',
      lastError: this.snapshot.lastError ?? 'sidecar process closed',
    })
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.stopped) return
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      // Only retry if we're still offline. If something else brought
      // us back online (e.g. a manual start()), skip silently.
      if (this.snapshot.status === 'offline' && !this.stopped) {
        console.log(`[${this.commandName}] reconnect attempt`)
        void this.start()
      }
    }, RECONNECT_INTERVAL_MS)
  }

  // ---- JSON-RPC. ----

  /**
   * Send a JSON-RPC request and await the response.
   *
   * Retries: transient failures (no child process, write error) are
   * retried up to CALL_RETRY_ATTEMPTS times with exponential backoff.
   * Server-side JSON-RPC errors (response.error populated) are NOT
   * retried — the sidecar made a decision and asking again won't
   * change it.
   */
  async call(method: string, params: any = {}): Promise<any> {
    let lastErr: unknown = null
    for (let attempt = 0; attempt <= CALL_RETRY_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = CALL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
        await new Promise(r => setTimeout(r, delay))
      }
      if (!this.child) {
        lastErr = new Error(`Sidecar ${this.commandName} is not running`)
        continue
      }
      try {
        return await this.callOnce(method, params)
      } catch (e) {
        lastErr = e
        // Server-side JSON-RPC errors come through with a message
        // sourced from response.error.message. If the message wasn't
        // a wire/transport failure, don't retry — assume the sidecar
        // meant it.
        if (!isTransportError(e)) {
          throw e
        }
        console.warn(
          `[${this.commandName}] transport error on ${method} (attempt ${attempt + 1}):`,
          e
        )
      }
    }
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr)
    this.emit({ lastError: message })
    throw lastErr instanceof Error ? lastErr : new Error(message)
  }

  private callOnce(method: string, params: any): Promise<any> {
    if (!this.child) {
      return Promise.reject(new Error(`Sidecar ${this.commandName} is not running`))
    }
    const id = this.nextId++
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id,
    }
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      try {
        this.writeToStdin(request)
      } catch (e) {
        this.pendingRequests.delete(id)
        reject(new TransportError(`stdin write failed: ${describeError(e)}`))
        return
      }

      // Auto-timeout after 30 seconds. The retry layer in call() can
      // give us another attempt, so this isn't terminal on its own.
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`MCP Request timed out: ${method} (id: ${id})`))
        }
      }, 30000)
    })
  }

  private async sendNotification(method: string, params: any = {}): Promise<void> {
    if (!this.child) return
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
    }
    this.writeToStdin(request)
  }

  private writeToStdin(request: JsonRpcRequest) {
    if (!this.child) {
      throw new TransportError('child process not running')
    }
    const line = JSON.stringify(request) + '\n'
    this.child.write(line)
  }

  private handleStdout(data: string) {
    this.buffer += data
    let newlineIndex: number
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)

      if (!line) continue

      try {
        const response: JsonRpcResponse = JSON.parse(line)
        if (response.id !== undefined && response.id !== null) {
          const handler = this.pendingRequests.get(response.id)
          if (handler) {
            this.pendingRequests.delete(response.id)
            if (response.error) {
              handler.reject(new Error(response.error.message))
            } else {
              handler.resolve(response.result)
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON-RPC line from stdout:', line, e)
      }
    }
  }

  isOnline(): boolean {
    return this.child !== null && this.snapshot.status === 'online'
  }
}

/**
 * Marker type for failures the retry layer should re-attempt. We
 * deliberately do NOT extend from a vendor error type — duck-typing
 * keeps it cheap to throw these from anywhere and easy for the retry
 * predicate to check without imports.
 */
class TransportError extends Error {
  readonly isTransportError = true
  constructor(message: string) {
    super(message)
    this.name = 'TransportError'
  }
}

function isTransportError(e: unknown): boolean {
  if (e instanceof TransportError) return true
  if (e && typeof e === 'object' && 'isTransportError' in e) {
    return Boolean((e as { isTransportError?: boolean }).isTransportError)
  }
  // "not running" failures come from callOnce() before we even have
  // a request id; treat them as transport-layer issues.
  if (e instanceof Error && /is not running/.test(e.message)) return true
  return false
}

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}
