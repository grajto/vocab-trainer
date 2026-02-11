'use client'

import { useEffect, useState } from 'react'
import { Target, Clock, Languages, Shuffle, TrendingUp, Save, Check, Settings2 } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'

type StudyMode = 'translate' | 'abcd' | 'sentence' | 'describe' | 'mixed'

type Settings = {
  minSessionsPerDay: number
  minMinutesPerDay: number
  dailyGoalMode: 'sessions' | 'minutes' | 'hybrid'
  dailyGoalWords: number
  defaultDirection: 'pl-en' | 'en-pl' | 'both'
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSettings(data.settings))
      .catch(() => setStatus('Nie udało się wczytać ustawień.'))
  }, [])

  useEffect(() => {
    if (!settings) return
    localStorage.setItem('vocab-shuffle', String(settings.shuffleWords))
    localStorage.setItem('sound-enabled', String(settings.soundEnabled))
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  }, [settings])

  async function save() {
    if (!settings) return
    setSaving(true)
    setSaved(false)
    setStatus('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('save')
      setSaved(true)
      setStatus('Zapisano ustawienia.')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setStatus('Nie udało się zapisać ustawień.')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <PageContainer><div className="settings-loading">Ładowanie ustawień…</div></PageContainer>
  }

  return (
    <PageContainer className="settings-container">
      <PageHeader title="Ustawienia" description="Dostosuj swoją naukę do swoich potrzeb" icon={Settings2} />

      <section className="settings-section">
        <div className="settings-section-header"><Target size={20} /><h2>Cele dzienne</h2></div>
        <div className="settings-grid">
          <div className="settings-field">
            <label><Clock size={16} /><span>Min. sesji dziennie</span></label>
            <input type="number" min={1} max={10} value={settings.minSessionsPerDay} onChange={e => setSettings({ ...settings, minSessionsPerDay: Number(e.target.value) })} className="settings-input" />
          </div>
          <div className="settings-field">
            <label><Clock size={16} /><span>Min. minut dziennie</span></label>
            <input type="number" min={5} max={180} value={settings.minMinutesPerDay} onChange={e => setSettings({ ...settings, minMinutesPerDay: Number(e.target.value) })} className="settings-input" />
          </div>
          <div className="settings-field">
            <label><Target size={16} /><span>Cel dzienny (liczba słówek)</span></label>
            <input type="number" min={5} max={500} value={settings.dailyGoalWords} onChange={e => setSettings({ ...settings, dailyGoalWords: Number(e.target.value) })} className="settings-input" />
          </div>
        </div>
        <div className="settings-field">
          <label><Target size={16} /><span>Tryb celu dziennego</span></label>
          <select value={settings.dailyGoalMode} onChange={e => setSettings({ ...settings, dailyGoalMode: e.target.value as Settings['dailyGoalMode'] })} className="settings-select">
            <option value="sessions">Sesje</option><option value="minutes">Minuty</option><option value="hybrid">Hybrydowy</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header"><Languages size={20} /><h2>Tryb nauki i język</h2></div>
        <div className="settings-grid">
          <div className="settings-field">
            <label><Languages size={16} /><span>Domyślny kierunek</span></label>
            <select value={settings.defaultDirection} onChange={e => setSettings({ ...settings, defaultDirection: e.target.value as Settings['defaultDirection'] })} className="settings-select">
              <option value="pl-en">Polski → Angielski</option><option value="en-pl">Angielski → Polski</option><option value="both">Oba</option>
            </select>
          </div>
          <div className="settings-field">
            <label><Languages size={16} /><span>Domyślny tryb</span></label>
            <select value={settings.defaultStudyMode} onChange={e => setSettings({ ...settings, defaultStudyMode: e.target.value as StudyMode })} className="settings-select">
              <option value="translate">Tłumaczenie</option><option value="abcd">ABCD</option><option value="sentence">Sentence</option><option value="describe">Described</option><option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header"><Shuffle size={20} /><h2>Przełączniki funkcjonalne</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'shuffleWords', label: 'Mieszanie słówek' },
            { key: 'soundEnabled', label: 'Dźwięk' },
            { key: 'autoAdvance', label: 'Auto-przejście do kolejnego słowa' },
            { key: 'darkMode', label: 'Tryb ciemny' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[item.key as keyof Settings])}
                onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header"><TrendingUp size={20} /><h2>Zaawansowane</h2></div>
        <div className="settings-field">
          <label><TrendingUp size={16} /><span>Max nowych kart dziennie (SRS)</span></label>
          <input type="number" min={0} max={200} value={settings.maxNewPerDay} onChange={e => setSettings({ ...settings, maxNewPerDay: Number(e.target.value) })} className="settings-input" />
        </div>
      </section>

      <div className="settings-actions">
        <button type="button" onClick={save} disabled={saving} className={`settings-save-btn ${saved ? 'settings-save-btn--saved' : ''}`}>
          {saved ? <><Check size={18} /> Zapisano</> : <><Save size={18} /> {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</>}
        </button>
        {status && <span className="settings-status">{status}</span>}
      </div>
    </PageContainer>
  )
}
