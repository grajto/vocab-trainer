import { NextRequest, NextResponse } from 'next/server'
import { getNeonSql } from '@/src/lib/db'
import { requireAppToken } from '@/src/lib/requireAppToken'

export const runtime = 'edge'
export const preferredRegion = ['fra1']

export async function GET(req: NextRequest) {
  if (!requireAppToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = getNeonSql()

  // Basic aggregates — adjust as needed
  const [{ count: cardsCount }] = await sql`SELECT COUNT(*)::int AS count FROM cards`
  const [{ count: sessionsCount }] = await sql`SELECT COUNT(*)::int AS count FROM sessions`
  const [{ dueToday }] = await sql`
    SELECT COUNT(*)::int AS dueToday
    FROM review_states
    WHERE due_at::date <= now()::date
  `

  const res = NextResponse.json({
    cardsCount,
    sessionsCount,
    dueToday,
    ts: Date.now(),
  })

  // Cache for CDN/Server — safe for single-user or non-sensitive aggregate data
  res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=300')
  return res
}
