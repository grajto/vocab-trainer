import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getPayload()
  const start = Date.now()
  await payload.find({ collection: 'decks', limit: 1, depth: 0 })
  return NextResponse.json({ ok: true, latencyMs: Date.now() - start }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
