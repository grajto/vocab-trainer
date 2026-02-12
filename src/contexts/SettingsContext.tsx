'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { StudySettings, defaultStudySettings } from '@/src/lib/userSettings'

interface SettingsContextValue {
  settings: StudySettings
  updateSettings: (updates: Partial<StudySettings>) => void
  saveSettings: () => Promise<void>
  loading: boolean
  saving: boolean
  saved: boolean
  sessionLength: number
  setSessionLength: (length: number) => void
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  language: 'pl' | 'en'
  setLanguage: (lang: 'pl' | 'en') => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StudySettings>(defaultStudySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sessionLength, setSessionLength] = useState(() => {
    if (typeof window === 'undefined') return 20
    const stored = localStorage.getItem('session-length')
    return stored ? Number(stored) : 20
  })
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem('theme')
    return (stored as 'light' | 'dark' | 'system') || 'system'
  })
  const [language, setLanguageState] = useState<'pl' | 'en'>(() => {
    if (typeof window === 'undefined') return 'pl'
    const stored = localStorage.getItem('language')
    return (stored as 'pl' | 'en') || 'pl'
  })

  // Load settings from API
  useEffect(() => {
    let ignore = false
    fetch('/api/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!ignore && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(err => console.error('Failed to load settings:', err))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => { ignore = true }
  }, [])

  // Apply theme
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('theme', theme)
    
    const applyTheme = (isDark: boolean) => {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  // Apply dark mode from settings
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [settings.darkMode])

  // Apply language
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('language', language)
    document.documentElement.setAttribute('lang', language)
  }, [language])

  // Persist session length
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('session-length', String(sessionLength))
  }, [sessionLength])

  const updateSettings = useCallback((updates: Partial<StudySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const saveSettings = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save')
      
      const data = await res.json()
      setSettings(data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [settings])

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme)
  }, [])

  const setLanguage = useCallback((lang: 'pl' | 'en') => {
    setLanguageState(lang)
  }, [])

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    saveSettings,
    loading,
    saving,
    saved,
    sessionLength,
    setSessionLength,
    theme,
    setTheme,
    language,
    setLanguage,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
