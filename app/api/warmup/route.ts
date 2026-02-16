import { NextRequest, NextResponse } from 'next/server'
import { getNeonSql } from '@/src/lib/db'
import { requireAppToken } from '@/src/lib/requireAppToken'

export const runtime = 'edge'
export const preferredRegion = ['fra1']

export async function GET(req: NextRequest) {
  const start = Date.now()

  // Warmup can be public or protected; keep token check if required
  if (!requireAppToken(req)) {
    // For cron without token, consider removing this check or set APP_ACCESS_TOKEN in headers
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sql = getNeonSql()
    // Minimal query to wake DB; alternatively: SELECT id FROM decks LIMIT 1
    await sql`SELECT 1 AS ok`
    const ms = Date.now() - start

    const res = NextResponse.json({ ok: true, latencyMs: ms })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e) {
    const ms = Date.now() - start
    return NextResponse.json({ ok: false, error: 'warmup_failed', latencyMs: ms }, { status: 500 })
  }
}
