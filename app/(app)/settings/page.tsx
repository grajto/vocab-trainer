'use client'

import { useEffect } from 'react'
import { Target, Clock, Languages, Shuffle, Monitor, TrendingUp, Save, Check, Settings2, Sliders, PlayCircle } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'
import { Card } from '../_components/ui/Card'
import { Button } from '../_components/ui/Button'
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
  } = useSettings()

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
  }

  const handleSessionLengthChange = (value: number) => {
    setSessionLength(value)
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12 text-sm text-[var(--text-muted)]">Ładowanie ustawień…</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Ustawienia"
        icon={Settings2}
      />

      {/* Section 1: Codzienna sesja */}
      <Card>
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <PlayCircle size={20} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Codzienna sesja</h2>
        </div>
        <div className="space-y-5">
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
                    className="cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text)]">{option.label}</span>
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
                    className="cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text)]">{option.label}</span>
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
                className="settings-stepper-btn"
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
                className="settings-slider flex-1"
              />
              <button
                type="button"
                onClick={() => handleSessionLengthChange(Math.min(50, sessionLength + 5))}
                className="settings-stepper-btn"
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
                className="settings-stepper-btn"
              >
                -
              </button>
              <span className="min-w-[60px] text-center font-semibold text-[var(--text)]">{settings.dailyGoalWords}</span>
              <button
                type="button"
                onClick={() => handleChange({ dailyGoalWords: Math.min(100, settings.dailyGoalWords + 10) })}
                className="settings-stepper-btn"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 4: Codzienny cel */}
      <Card>
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Target size={20} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Codzienny cel</h2>
        </div>
        <div className="space-y-5">
          <div className="settings-field">
            <label>
              <Clock size={16} />
              <span>Minuty dziennie: {settings.minMinutesPerDay}</span>
            </label>
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={settings.minMinutesPerDay}
              onChange={(e) => handleChange({ minMinutesPerDay: Number(e.target.value) })}
              className="settings-slider w-full"
            />
          </div>

          <div className="settings-field">
            <label>
              <Clock size={16} />
              <span>Sesje dziennie: {settings.minSessionsPerDay}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={settings.minSessionsPerDay}
              onChange={(e) => handleChange({ minSessionsPerDay: Number(e.target.value) })}
              className="settings-slider w-full"
            />
          </div>
        </div>
      </Card>

      {/* Section 5: Wygląd */}
      <Card>
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Monitor size={20} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Wygląd</h2>
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
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                  className="cursor-pointer accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text)]">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Section 6: Zaawansowane */}
      <Card>
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <TrendingUp size={20} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Zaawansowane</h2>
        </div>
        <div className="space-y-5">
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
              className="settings-slider w-full opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-[var(--text-soft)] mt-1">Funkcja będzie dostępna w przyszłych wersjach</p>
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
        </div>
      </Card>

      {/* Functional toggles section */}
      <Card>
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Shuffle size={20} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Przełączniki funkcjonalne</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'shuffleWords', label: 'Mieszanie słówek' },
            { key: 'soundEnabled', label: 'Dźwięk' },
            { key: 'autoAdvance', label: 'Auto-przejście do kolejnego słowa' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--surface-muted)]"
            >
              <span className="text-sm text-[var(--text)]">
                {item.label}
              </span>
              <input
                type="checkbox"
                checked={Boolean(settings[item.key as keyof typeof settings])}
                onChange={(e) => handleChange({ [item.key]: e.target.checked })}
                className="cursor-pointer accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text)]">
              Zapisz zmiany
            </p>
            <p className="text-xs text-[var(--text-soft)]">
              Zapisz ustawienia po zakończeniu zmian
            </p>
          </div>
          <Button
            variant={saved ? 'success' : 'primary'}
            icon={saving ? Save : saved ? Check : Save}
            loading={saving}
            onClick={() => {
              saveSettings().catch(() => toast.error('Błąd zapisu'))
            }}
            disabled={saving}
          >
            {saving ? 'Zapisywanie...' : saved ? 'Zapisano' : 'Zapisz ustawienia'}
          </Button>
        </div>
      </Card>
    </PageContainer>
  )
}
