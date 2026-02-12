import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

function toDateSafe(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isMissingDbObjectError(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } }
  const code = candidate?.cause?.code || candidate?.code
  return code === '42P01' || code === '42703'
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const sp = req.nextUrl.searchParams

    const preset = sp.get('preset') || '30' // 7|30|90|custom|all
    const customFrom = toDateSafe(sp.get('from'))
    const customTo = toDateSafe(sp.get('to'))
    const deckId = sp.get('deckId') || ''
    const folderId = sp.get('folderId') || ''
    const mode = sp.get('mode') || 'all'
    const level = Number(sp.get('level') || 0)

    const now = new Date()
    const from = preset === 'all'
      ? new Date(0)
      : preset === 'custom'
        ? (customFrom || new Date(now.getTime() - 30 * 86400000))
        : new Date(now.getTime() - Number(preset) * 86400000)
    const to = preset === 'custom' ? (customTo || now) : now

    const [decks, folders, sessionsRaw, reviewStates, cards] = await Promise.all([
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 500, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
      payload.find({
        collection: 'sessions',
        where: {
          owner: { equals: user.id },
          startedAt: { greater_than_equal: from.toISOString() },
        },
        sort: '-startedAt',
        limit: 1000,
        depth: 0,
      }),
      payload.find({ collection: 'review-states', where: { owner: { equals: user.id } }, limit: 5000, depth: 0 }),
      payload.find({ collection: 'cards', where: { owner: { equals: user.id } }, limit: 5000, depth: 0 }),
    ])

    const deckMap = new Map(decks.docs.map((d) => [String(d.id), d]))
    const cardMap = new Map(cards.docs.map((c) => [String(c.id), c]))
    const rsByCard = new Map(reviewStates.docs.map((r) => [String(r.card), r]))

    let sessions = sessionsRaw.docs.filter((s) => {
      const sd = toDateSafe(s.startedAt)
      if (!sd) return false
      if (sd > to) return false
      if (deckId && String(s.deck) !== String(deckId)) return false
      if (folderId) {
        const d = deckMap.get(String(s.deck))
        if (!d || String(d.folder || '') !== String(folderId)) return false
      }
      if (mode !== 'all' && String(s.mode) !== mode) return false
      return true
    })

    if (level > 0) {
      sessions = sessions.filter((s) => {
        const deckCards = cards.docs.filter((c) => String(c.deck) === String(s.deck))
        if (deckCards.length === 0) return false
        return deckCards.some((c) => Number(rsByCard.get(String(c.id))?.level || 0) === level)
      })
    }

    const sessionIds = sessions.map((s) => s.id)
    let sessionItems: { docs: Array<Record<string, unknown>> } = { docs: [] }
    if (sessionIds.length > 0) {
      try {
        sessionItems = await payload.find({ collection: 'session-items', where: { session: { in: sessionIds } }, limit: 10000, depth: 0 })
      } catch (error: unknown) {
        if (!isMissingDbObjectError(error)) {
          throw error
        }
        sessionItems = { docs: [] }
      }
    }

    const bySession = new Map<string, Array<Record<string, unknown>>>()
    for (const item of sessionItems.docs) {
      const sid = String(item.session)
      const arr = bySession.get(sid) || []
      arr.push(item)
      bySession.set(sid, arr)
    }

    const totalSessions = sessions.length
    const totalCorrect = sessions.reduce((acc, s) => acc + Number(s.correctAnswers || 0), 0)
    const totalWrong = sessions.reduce((acc, s) => acc + Number(s.wrongAnswers || 0), 0)
    const avgSessionMinutes = totalSessions > 0
      ? Math.round(sessions.reduce((a, s) => a + Number(s.durationSeconds || 0), 0) / totalSessions / 60)
      : 0
    const totalMinutes = Math.round(sessions.reduce((a, s) => a + Number(s.durationSeconds || 0), 0) / 60)

    const activityMap = new Map<string, { sessions: number; minutes: number }>()
    for (const s of sessions) {
      const sd = toDateSafe(s.startedAt)
      if (!sd) continue
      const key = dateKey(sd)
      const cur = activityMap.get(key) || { sessions: 0, minutes: 0 }
      cur.sessions += 1
      cur.minutes += Math.max(1, Math.round(Number(s.durationSeconds || 0) / 60))
      activityMap.set(key, cur)
    }

    const activity = Array.from(activityMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, sessions: v.sessions, minutes: v.minutes }))

    const modeStatsMap = new Map<string, number>()
    for (const s of sessions) modeStatsMap.set(String(s.mode), (modeStatsMap.get(String(s.mode)) || 0) + 1)
    const modeStats = Array.from(modeStatsMap.entries()).map(([modeName, count]) => ({ mode: modeName, count }))

    const levelDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const rs of reviewStates.docs) {
      const l = Number(rs.level || 0)
      if (l >= 0 && l <= 5) levelDistribution[l as 0 | 1 | 2 | 3 | 4 | 5] += 1
    }

    let selectedDeckStats: Record<string, unknown> | null = null
    if (deckId) {
      const selectedSessions = sessions.filter((s) => String(s.deck) === String(deckId))
      const selectedItems = selectedSessions.flatMap((s) => bySession.get(String(s.id)) || [])

      const avgResponseTimeMs = selectedItems.length > 0
        ? Math.round(selectedItems.reduce((a, i) => a + Number(i.responseTimeMs || 0), 0) / selectedItems.length)
        : 0

      const totalAnswers = selectedItems.length
      const correctAnswers = selectedItems.filter((i) => Boolean(i.isCorrect)).length
      const accuracyPercent = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

      const cardAgg = new Map<string, { front: string; wrong: number; repeats: number }>()
      for (const i of selectedItems) {
        const cid = String(i.card)
        const c = cardMap.get(cid)
        const item = cardAgg.get(cid) || { front: c?.front || 'Słówko', wrong: 0, repeats: 0 }
        item.repeats += 1
        if (!i.isCorrect) item.wrong += 1
        cardAgg.set(cid, item)
      }

      const hardestWords = Array.from(cardAgg.entries()).map(([id, v]) => ({ cardId: id, ...v })).sort((a, b) => b.wrong - a.wrong).slice(0, 10)
      const mostRepeatedWords = Array.from(cardAgg.entries()).map(([id, v]) => ({ cardId: id, ...v })).sort((a, b) => b.repeats - a.repeats).slice(0, 10)

      const selectedDeckCards = cards.docs.filter((c) => String(c.deck) === String(deckId))
      const selectedLevelDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const c of selectedDeckCards) {
        const l = Number(rsByCard.get(String(c.id))?.level || 0)
        if (l >= 0 && l <= 5) selectedLevelDist[l as 0 | 1 | 2 | 3 | 4 | 5] += 1
      }

      selectedDeckStats = {
        deckId,
        deckName: deckMap.get(String(deckId))?.name || 'Zestaw',
        avgResponseTimeMs,
        avgSessionMinutes: selectedSessions.length > 0 ? Math.round(selectedSessions.reduce((a, s) => a + Number(s.durationSeconds || 0), 0) / selectedSessions.length / 60) : 0,
        sessionsCount: selectedSessions.length,
        correctAnswers,
        totalAnswers,
        accuracyPercent,
        levelDistribution: selectedLevelDist,
        hardestWords,
        mostRepeatedWords,
      }
    }

    let selectedFolderStats: Record<string, unknown> | null = null
    if (folderId && !deckId) {
      const folderDeckIds = decks.docs
        .filter((d) => String(d.folder || '') === String(folderId))
        .map((d) => String(d.id))
      const folderCards = cards.docs.filter((c) => folderDeckIds.includes(String(c.deck)))
      const selectedLevelDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const c of folderCards) {
        const l = Number(rsByCard.get(String(c.id))?.level || 0)
        if (l >= 0 && l <= 5) selectedLevelDist[l as 0 | 1 | 2 | 3 | 4 | 5] += 1
      }
      selectedFolderStats = {
        folderId,
        folderName: folders.docs.find((f) => String(f.id) === String(folderId))?.name || 'Folder',
        levelDistribution: selectedLevelDist,
      }
    }

    return NextResponse.json({
      filters: {
        decks: decks.docs.map((d) => ({ id: String(d.id), name: d.name, folderId: d.folder ? String(d.folder) : '' })),
        folders: folders.docs.map((f) => ({ id: String(f.id), name: f.name })),
      },
      global: {
        totalSessions,
        totalMinutes,
        totalCorrect,
        totalWrong,
        accuracyPercent: totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0,
        avgSessionMinutes,
        levelDistribution,
      },
      activity,
      modeStats,
      selectedDeckStats,
      selectedFolderStats,
      sessions: sessions.slice(0, 200).map((s) => ({
        id: String(s.id),
        mode: String(s.mode),
        deckId: String(s.deck),
        deckName: deckMap.get(String(s.deck))?.name || 'Zestaw',
        startedAt: s.startedAt,
        completedCount: Number(s.completedCount || 0),
      })),
    }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
