/**
 * Unit tests for the live LocalMcpClient behavior added in D5 (stderr
 * ring buffer) and D7 (retry/backoff + reconnect). These run against
 * the real client with a faked @tauri-apps/plugin-shell sidecar, so
 * they verify the logic that actually ships in the desktop app — not
 * the McpStatusPanel/useLocalMcp scaffolding (which isn't bundled yet).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Listener = (data: any) => void

/**
 * Fake of the Tauri Command child. Captures stdin writes and lets the
 * test drive stdout/stderr/close events. By default it auto-answers any
 * id-bearing JSON-RPC request (e.g. initialize) with a success result
 * so start()'s handshake completes.
 */
class FakeCommand {
  stdoutCbs: Listener[] = []
  stderrCbs: Listener[] = []
  closeCbs: Listener[] = []

  stdout = {
    on: (_evt: string, cb: Listener) => {
      this.stdoutCbs.push(cb)
    },
  }
  stderr = {
    on: (_evt: string, cb: Listener) => {
      this.stderrCbs.push(cb)
    },
  }
  on(evt: string, cb: Listener) {
    if (evt === 'close') this.closeCbs.push(cb)
  }

  async spawn() {
    return spawnMock(this)
  }
}

class FakeChild {
  writes: string[] = []
  killed = false
  autoRespond = true
  cmd: FakeCommand

  constructor(cmd: FakeCommand) {
    this.cmd = cmd
  }

  write(line: string) {
    this.writes.push(line)
    if (!this.autoRespond) return
    try {
      const msg = JSON.parse(line)
      if (msg.id !== undefined && msg.id !== null) {
        queueMicrotask(() =>
          this.emitStdout(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }) + '\n')
        )
      }
    } catch {
      /* notifications have no id; ignore */
    }
  }

  async kill() {
    this.killed = true
  }

  emitStdout(data: string) {
    this.cmd.stdoutCbs.forEach(cb => cb(data))
  }
  emitStderr(data: string) {
    this.cmd.stderrCbs.forEach(cb => cb(data))
  }
  emitClose(data: any) {
    this.cmd.closeCbs.forEach(cb => cb(data))
  }
}

const children: FakeChild[] = []
const spawnMock = vi.fn(async (cmd: FakeCommand) => {
  const c = new FakeChild(cmd)
  children.push(c)
  return c
})

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: {
    sidecar: vi.fn(() => new FakeCommand()),
  },
}))

import { LocalMcpClient } from '../../desktop-shell/src/localMcpClient'
import { Command } from '@tauri-apps/plugin-shell'

beforeEach(() => {
  children.length = 0
  spawnMock.mockClear()
  // The client stashes the child on window[`__mcp_child_<name>`]; clear
  // it between tests so the "kill previous process" path doesn't fire.
  for (const key of Object.keys(window as any)) {
    if (key.startsWith('__mcp_child_')) delete (window as any)[key]
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LocalMcpClient — start + status (D3 plumbing)', () => {
  it('reaches online after the initialize handshake and notifies subscribers', async () => {
    const client = new LocalMcpClient('pa-mcp')
    const seen: string[] = []
    client.subscribe(() => seen.push(client.getSnapshot().status))

    await client.start()

    expect(client.getSnapshot().status).toBe('online')
    expect(client.isOnline()).toBe(true)
    // checking → online transitions both observed
    expect(seen).toContain('checking')
    expect(seen).toContain('online')
  })

  it('bridges the legacy onStatusChange callback', async () => {
    const cb = vi.fn()
    const client = new LocalMcpClient('pa-mcp', cb)
    await client.start()
    expect(cb).toHaveBeenCalledWith('online')
  })
})

describe('LocalMcpClient — stderr ring buffer (D5)', () => {
  it('captures sidecar stderr into the snapshot, split per line', async () => {
    const client = new LocalMcpClient('pa-mcp')
    await client.start()

    children[0].emitStderr('Traceback line 1\nTraceback line 2\n')
    children[0].emitStderr('a third line')

    const log = client.getSnapshot().stderrLog
    expect(log).toContain('Traceback line 1')
    expect(log).toContain('Traceback line 2')
    expect(log).toContain('a third line')
  })

  it('caps the ring so it never grows unbounded', async () => {
    const client = new LocalMcpClient('pa-mcp')
    await client.start()

    // Emit well past the 200-line cap.
    for (let i = 0; i < 250; i++) children[0].emitStderr(`line ${i}`)

    const log = client.getSnapshot().stderrLog
    expect(log.length).toBeLessThanOrEqual(200)
    // Oldest lines evicted; newest retained.
    expect(log).toContain('line 249')
    expect(log).not.toContain('line 0')
  })
})

describe('LocalMcpClient — retry/backoff (D7)', () => {
  it('retries a transport failure the configured number of times then throws', async () => {
    vi.useFakeTimers()
    // Never started → child is null → every attempt is a transport error.
    const client = new LocalMcpClient('pa-mcp')

    const promise = client.call('tools/list', {})
    // Attach the rejection handler BEFORE advancing timers so the
    // rejection is never momentarily unhandled.
    const assertion = expect(promise).rejects.toThrow(/not running/i)
    // Drain the 250ms + 500ms backoff sleeps.
    await vi.advanceTimersByTimeAsync(1000)
    await assertion

    // lastError surfaced on the snapshot.
    expect(client.getSnapshot().lastError).toMatch(/not running/i)
  })
})

describe('LocalMcpClient — reconnect cycle (D7)', () => {
  it('schedules a respawn ~30s after the sidecar closes', async () => {
    // Fake timers from the start so the reconnect setTimeout is
    // registered with the fake clock (enabling them after the close
    // would leave the already-scheduled real-timer uncontrolled).
    vi.useFakeTimers()
    const client = new LocalMcpClient('pa-mcp')
    const startP = client.start()
    // Flush the microtask-driven initialize handshake.
    await vi.advanceTimersByTimeAsync(0)
    await startP
    expect(spawnMock).toHaveBeenCalledTimes(1)

    // Sidecar dies.
    children[0].emitClose({ code: 1 })
    expect(client.getSnapshot().status).toBe('offline')

    // Advance to the 30s reconnect tick; the timer calls start() again.
    // The extra 0-advance flushes the respawn's own handshake.
    await vi.advanceTimersByTimeAsync(30_000)
    await vi.advanceTimersByTimeAsync(0)

    expect(spawnMock).toHaveBeenCalledTimes(2)
  })

  it('does not reconnect after an explicit stop()', async () => {
    const client = new LocalMcpClient('pa-mcp')
    await client.start()
    await client.stop()
    expect(client.getSnapshot().status).toBe('offline')

    vi.useFakeTimers()
    await vi.advanceTimersByTimeAsync(60_000)
    vi.useRealTimers()

    // Only the original spawn — stop() cancels the reconnect path.
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })
})

describe('LocalMcpClient — sidecar env injection', () => {
  it('passes the provided env to Command.sidecar so the sidecar hits prod, not localhost', async () => {
    const sidecarMock = vi.mocked(Command.sidecar)
    sidecarMock.mockClear()
    const env = { PLANETARY_AGENTS_BACKEND_URL: 'https://api.agents.alchm.kitchen' }

    const client = new LocalMcpClient('bin/pa-mcp', undefined, env)
    await client.start()

    expect(sidecarMock).toHaveBeenCalledWith('bin/pa-mcp', [], { env })
  })

  it('spawns with no options when no env is given (back-compat)', async () => {
    const sidecarMock = vi.mocked(Command.sidecar)
    sidecarMock.mockClear()

    const client = new LocalMcpClient('bin/pa-mcp')
    await client.start()

    expect(sidecarMock).toHaveBeenCalledWith('bin/pa-mcp')
  })
})
