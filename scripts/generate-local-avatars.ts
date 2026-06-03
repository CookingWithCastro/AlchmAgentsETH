/**
 * Generate deterministic, offline avatar images for the canonical historical
 * agents into `public/avatars/`, matching each agent's existing
 * `appearance.avatar` reference (e.g. `/avatars/twain.png`).
 *
 * These are NOT AI portraits — that's the paid Render pipeline
 * (`lib/agents/avatar-generator.ts`). These are tasteful, zero-cost placeholders
 * (a gradient from the agent's own `appearance.color` + their initials) so every
 * agent has a real, committed local image instead of a 404. Re-runnable.
 *
 *   bun run scripts/generate-local-avatars.ts
 */

import { mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import sharp from 'sharp'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'

const OUT_DIR = join(process.cwd(), 'public', 'avatars')
const SIZE = 512

/** First letter of the first and last name word, uppercased (single word → first two). */
function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\s'-]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '✦'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** Parse #rgb / #rrggbb → [r,g,b]; default to a calm violet on anything odd. */
function parseHex(hex: string): [number, number, number] {
  let h = (hex || '').trim().replace(/^#/, '')
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [124, 58, 237] // #7c3aed
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Mix toward white (amount>0) or black (amount<0), amount in [-1,1]. */
function shade([r, g, b]: [number, number, number], amount: number): string {
  const target = amount >= 0 ? 255 : 0
  const t = Math.abs(amount)
  const mix = (c: number) => clampByte(c + (target - c) * t)
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

function svgFor(name: string, color: string): string {
  const rgb = parseHex(color)
  const light = shade(rgb, 0.18)
  const dark = shade(rgb, -0.4)
  const text = initials(name)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="36%" r="62%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  <circle cx="256" cy="256" r="170" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="3"/>
  <text x="256" y="332" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="210" font-weight="600" fill="#ffffff" fill-opacity="0.97">${text}</text>
</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  let written = 0
  let skipped = 0
  for (const agent of HISTORICAL_AGENTS as any[]) {
    const ref: string | undefined = agent?.appearance?.avatar
    if (!ref || !ref.includes('/avatars/')) {
      skipped++
      continue
    }
    const file = basename(ref).replace(/\.(png|jpe?g|webp|svg)$/i, '') + '.png'
    const color: string = agent?.appearance?.color || '#7c3aed'
    const svg = svgFor(agent.name || file, color)
    // palette+max compression keeps these gradient placeholders small (~15KB).
    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(join(OUT_DIR, file))
    written++
  }

  console.log(`[avatars] wrote ${written} → public/avatars/ (skipped ${skipped})`)
}

main().catch(err => {
  console.error('[avatars] failed:', err)
  process.exit(1)
})
