import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { defaultStudySettings, getStudySettings } from '@/src/lib/userSettings'

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, num))
}

function normalizeSettings(body: Record<string, unknown>) {
  return {
    minSessionsPerDay: clampNumber(body.minSessionsPerDay, defaultStudySettings.minSessionsPerDay, 1, 10),
    minMinutesPerDay: clampNumber(body.minMinutesPerDay, defaultStudySettings.minMinutesPerDay, 5, 180),
    dailyGoalMode: ['sessions', 'minutes', 'hybrid'].includes(String(body.dailyGoalMode))
      ? String(body.dailyGoalMode)
      : defaultStudySettings.dailyGoalMode,
    dailyGoalWords: clampNumber(body.dailyGoalWords, defaultStudySettings.dailyGoalWords, 5, 500),
    defaultDirection: ['pl-en', 'en-pl', 'both'].includes(String(body.defaultDirection))
      ? String(body.defaultDirection)
      : defaultStudySettings.defaultDirection,
    defaultStudyMode: ['translate', 'abcd', 'sentence', 'describe', 'mixed'].includes(String(body.defaultStudyMode))
      ? String(body.defaultStudyMode)
      : defaultStudySettings.defaultStudyMode,
    mixTranslate: clampNumber(body.mixTranslate, defaultStudySettings.mixTranslate, 0, 100),
    mixAbcd: clampNumber(body.mixAbcd, defaultStudySettings.mixAbcd, 0, 100),
    mixSentence: clampNumber(body.mixSentence, defaultStudySettings.mixSentence, 0, 100),
    maxNewPerDay: clampNumber(body.maxNewPerDay, defaultStudySettings.maxNewPerDay, 0, 200),
    shuffleWords: Boolean(body.shuffleWords ?? defaultStudySettings.shuffleWords),
    soundEnabled: Boolean(body.soundEnabled ?? defaultStudySettings.soundEnabled),
    autoAdvance: Boolean(body.autoAdvance ?? defaultStudySettings.autoAdvance),
    darkMode: Boolean(body.darkMode ?? defaultStudySettings.darkMode),
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = getStudySettings(user as Record<string, unknown>)
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await getPayload()
    const body = await req.json()
    const settings = normalizeSettings((body || {}) as Record<string, unknown>)

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { studySettings: settings },
      overrideAccess: true,
      overrideLock: true,
    })

    const merged = getStudySettings({ ...(user as Record<string, unknown>), studySettings: settings })
    return NextResponse.json({ settings: merged })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Nie udało się zapisać ustawień.' }, { status: 500 })
  }
}
