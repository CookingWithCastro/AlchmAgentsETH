/**
 * Wake the (free-tier, hibernating) Render backend before using it.
 *
 * The backend hibernates when idle and its cold start is fragile (it only binds
 * Render's port after a Mongo connect), so a hibernated service returns
 * 502 / 503 `x-render-routing: hibernate-wake-error` until it's fully up. This
 * pings `GET /` with backoff until it answers 200, so the subsequent real request
 * lands on a warm server instead of a wake error. Best-effort: never throws.
 *
 * `GET /` is served only once the app has bound Render's port (i.e. after the
 * cold start completes), so a 200 is a reliable "ready for POSTs" signal.
 *
 * IMPORTANT: only use this to protect NON-image endpoints (e.g. /astrologize, or
 * /alchmize-public with the imaginizer skipped). The image endpoints
 * (/generate-image, /alchmize-public WITH image) crash the backend process
 * server-side regardless of wake state — waking can't fix those.
 */

function renderBaseUrl(): string {
  return (
    process.env.ALCHM_RENDER_BACKEND_URL ||
    process.env.ALCHM_BACKEND_URL ||
    'https://alchm-backend.onrender.com'
  ).replace(/\/$/, '')
}

export interface WakeOptions {
  /** Overall budget to keep retrying the wake ping (ms). Default 75s (cold start ≈ 50s). */
  timeoutMs?: number
  /** Per-ping fetch timeout (ms). Default 12s. */
  pingTimeoutMs?: number
  /** First backoff delay between pings (ms). Default 2s. */
  initialDelayMs?: number
  /** Max backoff delay (ms). Default 8s. */
  maxDelayMs?: number
  /** Override the base URL (defaults to the configured Render backend). */
  baseUrl?: string
}

export interface WakeResult {
  awake: boolean
  attempts: number
  elapsedMs: number
}

/**
 * Ping `GET /` with exponential backoff until the backend responds 200 or the
 * budget is exhausted. Returns `{ awake }` rather than throwing, so callers can
 * decide whether to proceed or degrade.
 */
export async function wakeRenderBackend(opts: WakeOptions = {}): Promise<WakeResult> {
  const base = (opts.baseUrl || renderBaseUrl()).replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? 75_000
  const pingTimeoutMs = opts.pingTimeoutMs ?? 12_000
  const maxDelayMs = opts.maxDelayMs ?? 8_000
  let delay = opts.initialDelayMs ?? 2_000

  const start = Date.now()
  const deadline = start + timeoutMs
  let attempts = 0

  while (Date.now() < deadline) {
    attempts++
    try {
      const res = await fetch(`${base}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(pingTimeoutMs),
      })
      if (res.ok) return { awake: true, attempts, elapsedMs: Date.now() - start }
    } catch {
      // Connection refused / timeout during cold start — keep trying.
    }
    if (Date.now() + delay >= deadline) break
    await new Promise(resolve => setTimeout(resolve, delay))
    delay = Math.min(Math.round(delay * 1.5), maxDelayMs)
  }

  return { awake: false, attempts, elapsedMs: Date.now() - start }
}
