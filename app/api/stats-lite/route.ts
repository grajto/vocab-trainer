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

  // Combine multiple aggregates into a single query for better performance
  const [stats] = await sql`
    SELECT 
      (SELECT COUNT(*)::int FROM cards) AS "cardsCount",
      (SELECT COUNT(*)::int FROM sessions) AS "sessionsCount",
      (SELECT COUNT(*)::int FROM review_states WHERE due_at::date <= now()::date) AS "dueToday"
  `

  const res = NextResponse.json({
    cardsCount: stats.cardsCount,
    sessionsCount: stats.sessionsCount,
    dueToday: stats.dueToday,
    ts: Date.now(),
  })

  // Cache for CDN/Server — safe for single-user or non-sensitive aggregate data
  res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=300')
  return res
}
