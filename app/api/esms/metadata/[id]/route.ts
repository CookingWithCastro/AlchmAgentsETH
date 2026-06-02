import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ERC-1155 metadata per token id (Spirit/Essence/Matter/Substance).
const META: Record<string, { name: string; symbol: string; description: string }> = {
  '0': {
    name: 'Spirit',
    symbol: 'SPIRIT',
    description: 'Alchm ESMS — Spirit. Soulbound utility token.',
  },
  '1': {
    name: 'Essence',
    symbol: 'ESSENCE',
    description: 'Alchm ESMS — Essence. Soulbound utility token.',
  },
  '2': {
    name: 'Matter',
    symbol: 'MATTER',
    description: 'Alchm ESMS — Matter. Soulbound utility token.',
  },
  '3': {
    name: 'Substance',
    symbol: 'SUBSTANCE',
    description: 'Alchm ESMS — Substance. Soulbound utility token.',
  },
}

/**
 * GET /api/esms/metadata/{id}. ERC-1155 clients substitute {id} with the 64-char
 * zero-padded lowercase hex token id; we accept that or a plain decimal id.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const raw = id.replace(/\.json$/i, '')
  const tokenId = /^[0-9a-fA-F]{64}$/.test(raw) ? BigInt('0x' + raw).toString() : raw

  const m = META[tokenId]
  if (!m) return NextResponse.json({ error: 'Unknown token id' }, { status: 404 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://agents.alchm.kitchen'
  return NextResponse.json({
    name: m.name,
    description: m.description,
    image: `${origin}/esms/${tokenId}.png`,
    properties: { symbol: m.symbol, family: 'ESMS', soulbound: true },
  })
}
