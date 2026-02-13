export type DailyGoalMode = 'sessions' | 'minutes' | 'hybrid'
export type DefaultDirection = 'pl-en' | 'en-pl' | 'both'
export type StudyMode = 'translate' | 'abcd' | 'sentence' | 'describe' | 'mixed'

export interface StudySettings {
  minSessionsPerDay: number
  minMinutesPerDay: number
  dailyGoalMode: DailyGoalMode
  dailyGoalWords: number
  defaultDirection: DefaultDirection
  defaultStudyMode: StudyMode
  mixTranslate: number
  mixAbcd: number
  mixSentence: number
  maxNewPerDay: number
  shuffleWords: boolean
  soundEnabled: boolean
  autoAdvance: boolean
  darkMode: boolean
}

export const defaultStudySettings: StudySettings = {
  minSessionsPerDay: 10,
  minMinutesPerDay: 20,
  dailyGoalMode: 'sessions',
  dailyGoalWords: 20,
  defaultDirection: 'pl-en',
  defaultStudyMode: 'translate',
  mixTranslate: 50,
  mixAbcd: 30,
  mixSentence: 20,
  maxNewPerDay: 20,
  shuffleWords: true,
  soundEnabled: true,
  autoAdvance: true,
  darkMode: false,
}

export function getStudySettings(user: Record<string, unknown> | null | undefined): StudySettings {
  const settings = (user?.studySettings as Partial<StudySettings> | undefined) ?? {}
  return {
    minSessionsPerDay: Number(settings.minSessionsPerDay ?? defaultStudySettings.minSessionsPerDay),
    minMinutesPerDay: Number(settings.minMinutesPerDay ?? defaultStudySettings.minMinutesPerDay),
    dailyGoalMode: (settings.dailyGoalMode as DailyGoalMode) ?? defaultStudySettings.dailyGoalMode,
    dailyGoalWords: Number(settings.dailyGoalWords ?? defaultStudySettings.dailyGoalWords),
    defaultDirection: (settings.defaultDirection as DefaultDirection) ?? defaultStudySettings.defaultDirection,
    defaultStudyMode: (settings.defaultStudyMode as StudyMode) ?? defaultStudySettings.defaultStudyMode,
    mixTranslate: Number(settings.mixTranslate ?? defaultStudySettings.mixTranslate),
    mixAbcd: Number(settings.mixAbcd ?? defaultStudySettings.mixAbcd),
    mixSentence: Number(settings.mixSentence ?? defaultStudySettings.mixSentence),
    maxNewPerDay: Number(settings.maxNewPerDay ?? defaultStudySettings.maxNewPerDay),
    shuffleWords: Boolean(settings.shuffleWords ?? defaultStudySettings.shuffleWords),
    soundEnabled: Boolean(settings.soundEnabled ?? defaultStudySettings.soundEnabled),
    autoAdvance: Boolean(settings.autoAdvance ?? defaultStudySettings.autoAdvance),
    darkMode: Boolean(settings.darkMode ?? defaultStudySettings.darkMode),
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
