export type DailyGoalMode = 'sessions' | 'minutes' | 'hybrid'
export type DefaultDirection = 'pl-en' | 'en-pl' | 'both'

export interface StudySettings {
  minSessionsPerDay: number
  minMinutesPerDay: number
  dailyGoalMode: DailyGoalMode
  defaultDirection: DefaultDirection
  mixTranslate: number
  mixAbcd: number
  mixSentence: number
  maxNewPerDay: number
}

export const defaultStudySettings: StudySettings = {
  minSessionsPerDay: 1,
  minMinutesPerDay: 10,
  dailyGoalMode: 'sessions',
  defaultDirection: 'pl-en',
  mixTranslate: 50,
  mixAbcd: 30,
  mixSentence: 20,
  maxNewPerDay: 20,
}

export function getStudySettings(user: Record<string, unknown> | null | undefined): StudySettings {
  const settings = (user?.studySettings as Partial<StudySettings> | undefined) ?? {}
  return {
    minSessionsPerDay: Number(settings.minSessionsPerDay ?? defaultStudySettings.minSessionsPerDay),
    minMinutesPerDay: Number(settings.minMinutesPerDay ?? defaultStudySettings.minMinutesPerDay),
    dailyGoalMode: (settings.dailyGoalMode as DailyGoalMode) ?? defaultStudySettings.dailyGoalMode,
    defaultDirection: (settings.defaultDirection as DefaultDirection) ?? defaultStudySettings.defaultDirection,
    mixTranslate: Number(settings.mixTranslate ?? defaultStudySettings.mixTranslate),
    mixAbcd: Number(settings.mixAbcd ?? defaultStudySettings.mixAbcd),
    mixSentence: Number(settings.mixSentence ?? defaultStudySettings.mixSentence),
    maxNewPerDay: Number(settings.maxNewPerDay ?? defaultStudySettings.maxNewPerDay),
  }
}

export function isDailyGoalMet(settings: StudySettings, sessions: number, minutes: number): boolean {
  if (settings.dailyGoalMode === 'minutes') {
    return minutes >= settings.minMinutesPerDay
  }
  if (settings.dailyGoalMode === 'hybrid') {
    return sessions >= settings.minSessionsPerDay || minutes >= settings.minMinutesPerDay
  }
  return sessions >= settings.minSessionsPerDay
}
