/**
 * Generate caricature avatars for the 71 canonical historical agents via the
 * Render backend, download them, normalize to 512×512 PNG, and write them to
 * public/avatars/<slug>.png — the exact path each agent already references. This
 * replaces the deterministic placeholders with recognizable persona caricatures.
 *
 *   bun run scripts/generate-agent-caricatures.ts --dry-run            # print prompts only
 *   bun run scripts/generate-agent-caricatures.ts --only=albert-einstein
 *   bun run scripts/generate-agent-caricatures.ts --limit=3
 *   bun run scripts/generate-agent-caricatures.ts --skip-existing      # resume (manifest)
 *   bun run scripts/generate-agent-caricatures.ts --concurrency=3      # all 71
 *
 * Each agent = one gpt-image generation on the Render backend (the project's
 * OpenAI billing), ~10-40s. Resumable via public/avatars/.caricatures.json.
 * Render base URL: ALCHM_RENDER_BACKEND_URL / ALCHM_BACKEND_URL (defaults to the
 * public Render service).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import sharp from 'sharp'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import {
  buildAvatarPrompt,
  generateAgentAvatar,
  type AgentAvatarMeta,
} from '@/lib/agents/avatar-generator'
import { getHistoricalPortraitHint } from '@/lib/agents/portrait-hints'

const OUT_DIR = join(process.cwd(), 'public', 'avatars')
const MANIFEST = join(OUT_DIR, '.caricatures.json')
const SIZE = 512

const args = process.argv.slice(2)
const getArg = (name: string): string | undefined =>
  args.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

const only = getArg('only')
const limitArg = getArg('limit')
const limit = limitArg ? parseInt(limitArg, 10) : undefined
const concurrency = Math.max(1, parseInt(getArg('concurrency') || '3', 10))
const dryRun = hasFlag('dry-run')
const skipExisting = hasFlag('skip-existing')

function slugFor(agent: any): string {
  const ref: string | undefined = agent?.appearance?.avatar
  if (ref && ref.includes('/avatars/')) return basename(ref).replace(/\.[a-z0-9]+$/i, '')
  return agent.id
}

function metaFor(agent: any): AgentAvatarMeta {
  const slug = slugFor(agent)
  const core = agent?.personality?.core
  const traits = Array.isArray(agent?.personality?.traits)
    ? agent.personality.traits.slice(0, 4).join(', ')
    : ''
  const personality =
    [core?.essence, core?.expression, traits].filter(Boolean).join('; ') || undefined
  return {
    agentId: agent.id,
    name: agent.name,
    slug,
    title: agent.title,
    element: agent?.consciousness?.dominantElement || agent?.dominantElement,
    cosmicRole: agent?.abilities?.specialty || agent?.specialty,
    personality,
    portraitDescription:
      agent?.appearance?.portraitDescription ||
      getHistoricalPortraitHint(agent.id, slug) ||
      undefined,
    zodiacSign: agent?.consciousness?.natalChart?.planets?.Sun?.sign,
    birthInfo: null,
  }
}

async function toPng(imageUrl: string): Promise<Buffer> {
  let input: Buffer
  if (imageUrl.startsWith('data:')) {
    input = Buffer.from(imageUrl.split(',')[1] || '', 'base64')
  } else {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`download ${res.status}`)
    input = Buffer.from(await res.arrayBuffer())
  }
  return sharp(input).resize(SIZE, SIZE, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer()
}

function loadManifest(): Set<string> {
  try {
    return new Set(JSON.parse(readFileSync(MANIFEST, 'utf8')))
  } catch {
    return new Set()
  }
}
function saveManifest(done: Set<string>): void {
  writeFileSync(MANIFEST, JSON.stringify([...done].sort(), null, 2) + '\n')
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  let agents = HISTORICAL_AGENTS as any[]
  if (only) agents = agents.filter(a => slugFor(a) === only || a.id === only)
  if (limit) agents = agents.slice(0, limit)

  const done = loadManifest()
  console.log(
    `[caricatures] ${agents.length} agent(s)` +
      (dryRun ? ' — DRY RUN' : '') +
      (skipExisting ? ` (${done.size} already generated)` : '')
  )

  if (dryRun) {
    for (const a of agents) console.log(`\n• ${slugFor(a)}\n  ${buildAvatarPrompt(metaFor(a))}`)
    return
  }

  const results = { ok: 0, fail: 0, skip: 0 }
  const failed: string[] = []
  let idx = 0

  async function worker() {
    while (idx < agents.length) {
      const agent = agents[idx++]
      const slug = slugFor(agent)
      if (skipExisting && done.has(slug)) {
        results.skip++
        continue
      }
      let ok = false
      let lastErr: unknown
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        try {
          const res = await generateAgentAvatar(metaFor(agent))
          if (!res.success || !res.imageUrl) throw new Error(res.error || 'no image url')
          writeFileSync(join(OUT_DIR, `${slug}.png`), await toPng(res.imageUrl))
          ok = true
        } catch (e) {
          lastErr = e
          if (attempt < 2) await new Promise(r => setTimeout(r, 2500))
        }
      }
      if (ok) {
        results.ok++
        done.add(slug)
        saveManifest(done)
        console.log(`  ✓ ${slug} (${results.ok}/${agents.length})`)
      } else {
        results.fail++
        failed.push(slug)
        console.error(`  ✗ ${slug}: ${(lastErr as Error)?.message ?? lastErr}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, agents.length) }, worker))

  console.log(`\n[caricatures] ok=${results.ok} fail=${results.fail} skip=${results.skip}`)
  if (failed.length) console.log(`failed: ${failed.join(', ')}`)
}

main().catch(err => {
  console.error('[caricatures] fatal:', err)
  process.exit(1)
})
