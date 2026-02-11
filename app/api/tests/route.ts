import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await getPayload()
  const sp = req.nextUrl.searchParams
  const range = sp.get('range') || '30'
  const source = sp.get('source') || 'all'
  const mode = sp.get('mode') || 'all'

  const from = new Date(Date.now() - Number(range) * 86400000)

  const tests = await payload.find({
    collection: 'tests',
    where: {
      owner: { equals: user.id },
      createdAt: { greater_than_equal: from.toISOString() },
    },
    sort: '-createdAt',
    limit: 200,
    depth: 2,
  })

  const filtered = tests.docs.filter((t: any) => {
    const sourceOk = source === 'all' || t.sourceType === source
    const modeOk = mode === 'all' || (Array.isArray(t.enabledModes) && t.enabledModes.some((m: any) => m?.mode === mode))
    return sourceOk && modeOk
  })

  const byDeck = new Map<string, { deckName: string; sum: number; count: number; last: string }>()
  for (const t of filtered.filter((x: any) => x.status === 'finished')) {
    const deck = t.sourceDeck
    const key = deck ? String(typeof deck === 'object' ? deck.id : deck) : `folder:${String(typeof t.sourceFolder === 'object' ? t.sourceFolder.id : t.sourceFolder || '')}`
    const name = deck
      ? (typeof deck === 'object' ? deck.name : `Deck ${deck}`)
      : `Folder ${typeof t.sourceFolder === 'object' ? t.sourceFolder.name : t.sourceFolder || ''}`
    const cur = byDeck.get(key) || { deckName: name, sum: 0, count: 0, last: '' }
    cur.sum += Number(t.scorePercent || 0)
    cur.count += 1
    cur.last = t.finishedAt || t.createdAt
    byDeck.set(key, cur)
  }

  const ranking = Array.from(byDeck.entries())
    .map(([id, v]) => ({
      key: id,
      deckName: v.deckName,
      avgScore: v.count > 0 ? Math.round(v.sum / v.count) : 0,
      testsCount: v.count,
      lastTest: v.last,
    }))
    .sort((a, b) => (b.avgScore - a.avgScore) || (b.testsCount - a.testsCount))
    .slice(0, 20)

  return NextResponse.json({
    tests: filtered.slice(0, 20).map((t: any) => ({
      id: String(t.id),
      status: t.status,
      sourceType: t.sourceType,
      sourceName: t.sourceType === 'set'
        ? (typeof t.sourceDeck === 'object' ? t.sourceDeck.name : `Deck ${t.sourceDeck}`)
        : (typeof t.sourceFolder === 'object' ? t.sourceFolder.name : `Folder ${t.sourceFolder}`),
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      questionCount: t.questionCount,
      scoreCorrect: t.scoreCorrect,
      scoreTotal: t.scoreTotal,
      scorePercent: t.scorePercent,
      durationMs: t.durationMs,
      enabledModes: Array.isArray(t.enabledModes) ? t.enabledModes.map((m: any) => m?.mode).filter(Boolean) : [],
    })),
    ranking,
  }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const payload = await getPayload()

  const questionCount = Math.max(5, Math.min(100, Number(body.questionCount || 20)))
  const sourceType = body.sourceType === 'folder' ? 'folder' : 'set'
  const enabledModes = Array.isArray(body.enabledModes) && body.enabledModes.length > 0
    ? body.enabledModes.filter((m: string) => ['abcd', 'translate', 'sentence', 'describe'].includes(m))
    : ['abcd', 'translate']

  const sourceDeck = sourceType === 'set' ? body.deckId : null
  const sourceFolder = sourceType === 'folder' ? body.folderId : null

  if ((sourceType === 'set' && !sourceDeck) || (sourceType === 'folder' && !sourceFolder)) {
    return NextResponse.json({ error: 'Missing source id' }, { status: 400 })
  }

  const test = await payload.create({
    collection: 'tests',
    data: {
      owner: user.id,
      sourceType,
      sourceDeck,
      sourceFolder,
      enabledModes: enabledModes.map((mode: string) => ({ mode })),
      questionCount,
      randomQuestionOrder: Boolean(body.randomQuestionOrder ?? true),
      randomAnswerOrder: Boolean(body.randomAnswerOrder ?? true),
      startedAt: new Date().toISOString(),
      status: 'in_progress',
    },
  })

  return NextResponse.json({ testId: test.id })
}
