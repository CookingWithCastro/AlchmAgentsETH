import { NextRequest } from 'next/server'
import { proxyConsciousnessRoute } from '@/lib/consciousness/proxy-route'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyConsciousnessRoute('live', body)
}

export async function GET(_request: NextRequest) {
  const defaultBody = {
    name: 'Current Moment',
    birthDate: new Date().toISOString().slice(0, 10),
    birthTime: '12:00',
    birthLocation: { name: 'Greenwich, UK', lat: 51.4779, lon: 0.0 },
  }
  return proxyConsciousnessRoute('live', defaultBody)
}
