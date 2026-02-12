'use client'

import { useEffect, useRef } from 'react'
import { Target, Clock, Languages, Shuffle, Monitor, Globe2, TrendingUp, Save, Check, Settings2, Sliders, PlayCircle } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'
import { useSettings } from '@/src/contexts/SettingsContext'
import { toast } from 'sonner'
import type { StudyMode, DefaultDirection } from '@/src/lib/userSettings'

export default function SettingsPage() {
  const {
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
  } = useSettings()

  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('vocab-shuffle', String(settings.shuffleWords))
      localStorage.setItem('sound-enabled', String(settings.soundEnabled))
    }
  }, [settings.shuffleWords, settings.soundEnabled, loading])

  useEffect(() => {
    if (saved) {
      toast.success('Zapisano')
    }
  }, [saved])

  const handleChange = (updates: Partial<typeof settings>) => {
    updateSettings(updates)
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings().catch(() => toast.error('Błąd zapisu'))
    }, 1000)
  }

  const handleSessionLengthChange = (value: number) => {
    setSessionLength(value)
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="settings-loading">Ładowanie ustawień…</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="settings-container">
      <PageHeader
        title="Ustawienia"
        description="Dostosuj swoją naukę do swoich potrzeb"
        icon={Settings2}
      />

      {/* Section 1: Codzienna sesja */}
      <section className="settings-section">
        <div className="settings-section-header">
          <PlayCircle size={20} />
          <h2>Codzienna sesja</h2>
        </div>
        
        <div className="settings-field">
          <label>
            <Languages size={16} />
            <span>Kierunek tłumaczenia</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'pl-en', label: 'Polski → Angielski' },
              { value: 'en-pl', label: 'Angielski → Polski' },
              { value: 'both', label: 'Oba kierunki' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="direction"
                  value={option.value}
                  checked={settings.defaultDirection === option.value}
                  onChange={(e) => handleChange({ defaultDirection: e.target.value as DefaultDirection })}
                  className="cursor-pointer"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-field">
          <label>
            <Languages size={16} />
            <span>Tryb nauki</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'translate', label: 'Tłumaczenie' },
              { value: 'abcd', label: 'ABCD (wybór wielokrotny)' },
              { value: 'sentence', label: 'Zdania' },
              { value: 'describe', label: 'Opisywanie' },
              { value: 'mixed', label: 'Mieszany' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={option.value}
                  checked={settings.defaultStudyMode === option.value}
                  onChange={(e) => handleChange({ defaultStudyMode: e.target.value as StudyMode })}
                  className="cursor-pointer"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="settings-field">
          <label>
            <Clock size={16} />
            <span>Liczba słówek w sesji: {sessionLength}</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSessionLengthChange(Math.max(5, sessionLength - 5))}
              className="px-3 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              -
            </button>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={sessionLength}
              onChange={(e) => handleSessionLengthChange(Number(e.target.value))}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => handleSessionLengthChange(Math.min(50, sessionLength + 5))}
              className="px-3 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              +
            </button>
          </div>
        </div>

        <div className="settings-field">
          <label>
            <Target size={16} />
            <span>Cel - liczba nowych słówek dziennie: {settings.dailyGoalWords}</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleChange({ dailyGoalWords: Math.max(10, settings.dailyGoalWords - 10) })}
              className="px-3 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              -
            </button>
            <span className="min-w-[60px] text-center font-semibold">{settings.dailyGoalWords}</span>
            <button
              type="button"
              onClick={() => handleChange({ dailyGoalWords: Math.min(100, settings.dailyGoalWords + 10) })}
              className="px-3 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              +
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Tryb nauki i język (removed - moved to Codzienna sesja) */}

      {/* Section 3: Długość sesji (removed - moved to Codzienna sesja) */}

      {/* Section 4: Codzienny cel */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Target size={20} />
          <h2>Codzienny cel</h2>
        </div>
        
        <div className="settings-field">
          <label>
            <Clock size={16} />
            <span>Minuty dziennie: {settings.minMinutesPerDay}</span>
          </label>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={settings.minMinutesPerDay}
            onChange={(e) => handleChange({ minMinutesPerDay: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </section>

      {/* Section 5: Wygląd */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Monitor size={20} />
          <h2>Wygląd</h2>
        </div>
        
        <div className="settings-field">
          <label>
            <Monitor size={16} />
            <span>Motyw</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'light', label: 'Jasny' },
              { value: 'dark', label: 'Ciemny' },
              { value: 'system', label: 'Systemowy' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                  className="cursor-pointer"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Język interfejsu */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Globe2 size={20} />
          <h2>Język interfejsu</h2>
        </div>
        
        <div className="settings-field">
          <label>
            <Globe2 size={16} />
            <span>Wybierz język</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'pl', label: 'Polski' },
              { value: 'en', label: 'English' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={language === option.value}
                  onChange={(e) => setLanguage(e.target.value as 'pl' | 'en')}
                  className="cursor-pointer"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Zaawansowane */}
      <section className="settings-section">
        <div className="settings-section-header">
          <TrendingUp size={20} />
          <h2>Zaawansowane</h2>
        </div>
        
        <div className="settings-field">
          <label>
            <Sliders size={16} />
            <span>Walidacja AI (wkrótce)</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={50}
            disabled
            className="w-full opacity-50 cursor-not-allowed"
          />
          <p className="text-xs opacity-60 mt-1">Funkcja będzie dostępna w przyszłych wersjach</p>
        </div>

        <div className="settings-field">
          <label>
            <TrendingUp size={16} />
            <span>Max nowych kart dziennie (SRS)</span>
          </label>
          <input
            type="number"
            min={0}
            max={200}
            value={settings.maxNewPerDay}
            onChange={(e) => handleChange({ maxNewPerDay: Number(e.target.value) })}
            className="settings-input"
          />
        </div>
      </section>

      {/* Functional toggles section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Shuffle size={20} />
          <h2>Przełączniki funkcjonalne</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'shuffleWords', label: 'Mieszanie słówek' },
            { key: 'soundEnabled', label: 'Dźwięk' },
            { key: 'autoAdvance', label: 'Auto-przejście do kolejnego słowa' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {item.label}
              </span>
              <input
                type="checkbox"
                checked={Boolean(settings[item.key as keyof typeof settings])}
                onChange={(e) => handleChange({ [item.key]: e.target.checked })}
                className="cursor-pointer"
              />
            </label>
          ))}
        </div>
      </section>

      {saving && (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <Save size={16} className="animate-pulse" />
          <span>Zapisywanie...</span>
        </div>
      )}
    </PageContainer>
  )
}
