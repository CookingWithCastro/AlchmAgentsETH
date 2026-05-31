/**
 * McpStatusPanel — settings panel showing per-sidecar MCP health.
 *
 * Renders one row per LocalMcpClient passed in: status, last call
 * timestamp + latency, last error, and a "Test" button that fires a
 * known-cheap tool call and shows the result. Diagnostics (the
 * captured stderr ring buffer from the sidecar) is collapsible per
 * row so a healthy panel stays compact.
 *
 * NOT YET BUNDLED. The desktop shell (desktop-shell/src/main.ts) is
 * currently vanilla TypeScript with a string-template render loop.
 * This component is authored ahead of the React migration documented
 * in desktop-shell/README.md so that when the shell gains a React
 * mount point, this is ready to drop in.
 *
 * To wire up later, you need:
 *
 *   - desktop-shell/vite.config.ts: add `@vitejs/plugin-react`.
 *   - desktop-shell/tsconfig.json (or root): jsx: "react-jsx".
 *   - desktop-shell/index.html: mount a React root in a <div id="settings-root"/>.
 *   - desktop-shell/src/main.ts: dynamic-import this component and call
 *     ReactDOM.createRoot(...).render(<McpStatusPanel sidecars={[...]}/>).
 *
 * Until then this file just typechecks under the root tsconfig (which
 * already covers every .tsx file) and lives as documentation-by-code.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocalMcp } from '../../hooks/useLocalMcp'
import type { LocalMcpClient } from '../../localMcpClient'

/** Description of one sidecar to render a row for. */
export interface McpSidecarDescriptor {
  /** Display name shown in the row header. */
  label: string
  /** The LocalMcpClient instance backing this sidecar. */
  client: LocalMcpClient
  /**
   * MCP tool name + arguments for the "Test" button. Should be cheap
   * and side-effect-free. Typical: a tools/list (no args) or a
   * tools/call to a no-op debug method.
   */
  testCall?: { method: string; params?: any }
  /**
   * Optional extra metric: a getter that returns a human-readable
   * status string for sidecar-specific concerns. Example: the
   * orchestrator sidecar exposes Swiss Ephemeris load status that
   * isn't captured by generic MCP status.
   */
  extraStatus?: () => string | null
}

export interface McpStatusPanelProps {
  sidecars: McpSidecarDescriptor[]
}

export function McpStatusPanel({ sidecars }: McpStatusPanelProps) {
  return (
    <section className="mcp-status-panel">
      <header>
        <h2>MCP Node Health</h2>
        <p className="mcp-status-panel__hint">
          Local MCP sidecars spawned by the Tauri shell. Use the Test button to confirm round-trip
          JSON-RPC is healthy.
        </p>
      </header>
      <ul className="mcp-status-panel__list" role="list">
        {sidecars.map(descriptor => (
          <McpStatusRow key={descriptor.label} descriptor={descriptor} />
        ))}
      </ul>
    </section>
  )
}

interface McpStatusRowProps {
  descriptor: McpSidecarDescriptor
}

function McpStatusRow({ descriptor }: McpStatusRowProps) {
  const { status, lastError, stderrLog, call } = useLocalMcp(descriptor.client)

  // Local state for the Test button: capture last call's timestamp,
  // latency, and either the response summary or the error message.
  // Stored as a single object so we get atomic updates and don't
  // flicker between "ran" / "succeeded" / "showed result".
  const [lastTest, setLastTest] = useState<{
    timestamp: number
    latencyMs: number
    ok: boolean
    summary: string
  } | null>(null)

  const [testing, setTesting] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      // Guard against state updates on unmount when the Test call
      // resolves after the panel is closed.
      mountedRef.current = false
    },
    []
  )

  const handleTest = useCallback(async () => {
    if (!descriptor.testCall) return
    setTesting(true)
    const start = performance.now()
    try {
      const result = await call(descriptor.testCall.method, descriptor.testCall.params ?? {})
      const latencyMs = Math.round(performance.now() - start)
      if (mountedRef.current) {
        setLastTest({
          timestamp: Date.now(),
          latencyMs,
          ok: true,
          summary: summarizeResult(result),
        })
      }
    } catch (e) {
      const latencyMs = Math.round(performance.now() - start)
      if (mountedRef.current) {
        setLastTest({
          timestamp: Date.now(),
          latencyMs,
          ok: false,
          summary: e instanceof Error ? e.message : String(e),
        })
      }
    } finally {
      if (mountedRef.current) {
        setTesting(false)
      }
    }
  }, [call, descriptor.testCall])

  const extra = descriptor.extraStatus?.() ?? null

  return (
    <li className={`mcp-status-row mcp-status-row--${status}`}>
      <div className="mcp-status-row__header">
        <strong className="mcp-status-row__label">{descriptor.label}</strong>
        <StatusBadge status={status} />
        {descriptor.testCall && (
          <button
            type="button"
            className="mcp-status-row__test"
            onClick={handleTest}
            disabled={testing || status !== 'online'}
            aria-label={`Test ${descriptor.label} sidecar`}
          >
            {testing ? 'Testing…' : 'Test'}
          </button>
        )}
      </div>

      {extra && <div className="mcp-status-row__extra">{extra}</div>}

      {lastTest && (
        <div
          className={
            lastTest.ok
              ? 'mcp-status-row__result mcp-status-row__result--ok'
              : 'mcp-status-row__result mcp-status-row__result--err'
          }
        >
          <span>
            Last test {formatRelative(lastTest.timestamp)} · {lastTest.latencyMs}
            ms
          </span>
          <code>{lastTest.summary}</code>
        </div>
      )}

      {lastError && (
        <div className="mcp-status-row__error" role="alert">
          {lastError}
        </div>
      )}

      <details
        className="mcp-status-row__diagnostics"
        open={diagnosticsOpen}
        onToggle={evt => setDiagnosticsOpen((evt.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>Diagnostics ({stderrLog.length} stderr lines)</summary>
        <pre className="mcp-status-row__stderr">
          {stderrLog.length === 0 ? '(no stderr captured)' : stderrLog.slice(-100).join('\n')}
        </pre>
      </details>
    </li>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === 'online' ? '● online' : status === 'checking' ? '◐ checking' : '○ offline'
  return <span className={`mcp-status-badge mcp-status-badge--${status}`}>{label}</span>
}

function summarizeResult(result: unknown): string {
  if (result == null) return '(empty result)'
  if (typeof result === 'string') return truncate(result, 120)
  try {
    return truncate(JSON.stringify(result), 120)
  } catch {
    return String(result)
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

function formatRelative(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}
