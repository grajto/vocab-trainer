import { NextRequest, NextResponse } from 'next/server'
import { getNeonSql } from '@/src/lib/db'

export const runtime = 'edge'
export const preferredRegion = ['fra1']

export async function GET(req: NextRequest) {
  const start = Date.now()

  try {
    const sql = getNeonSql()
    // Minimal query to wake DB
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
