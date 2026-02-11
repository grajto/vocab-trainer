import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { defaultStudySettings, getStudySettings } from '@/src/lib/userSettings'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = getStudySettings(user as Record<string, unknown>)
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload()
  const body = await req.json()

  const settings = {
    minSessionsPerDay: Math.max(1, Number(body.minSessionsPerDay ?? defaultStudySettings.minSessionsPerDay)),
    minMinutesPerDay: Math.max(5, Number(body.minMinutesPerDay ?? defaultStudySettings.minMinutesPerDay)),
    dailyGoalMode: body.dailyGoalMode ?? defaultStudySettings.dailyGoalMode,
    defaultDirection: body.defaultDirection ?? defaultStudySettings.defaultDirection,
    mixTranslate: Number(body.mixTranslate ?? defaultStudySettings.mixTranslate),
    mixAbcd: Number(body.mixAbcd ?? defaultStudySettings.mixAbcd),
    mixSentence: Number(body.mixSentence ?? defaultStudySettings.mixSentence),
    maxNewPerDay: Number(body.maxNewPerDay ?? defaultStudySettings.maxNewPerDay),
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { studySettings: settings },
  })

  const merged = getStudySettings({ ...(user as Record<string, unknown>), studySettings: settings })
  return NextResponse.json({ settings: merged })
}
