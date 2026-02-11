'use client'

import { useEffect, useState } from 'react'
import { Target, Clock, Languages, Shuffle, TrendingUp, Save, Check } from 'lucide-react'

type Settings = {
  minSessionsPerDay: number
  minMinutesPerDay: number
  dailyGoalMode: 'sessions' | 'minutes' | 'hybrid'
  defaultDirection: 'pl-en' | 'en-pl' | 'both'
  mixTranslate: number
  mixAbcd: number
  mixSentence: number
  maxNewPerDay: number
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
    return (
      <div className="settings-container">
        <div className="settings-loading">Ładowanie ustawień…</div>
      </div>
    )
  }

  return (
    <div className="settings-container">
      <div className="settings-header flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Target size={20} />
        </span>
        <div>
          <h1 className="settings-title">Ustawienia</h1>
          <p className="settings-subtitle">Dostosuj swoją naukę do swoich potrzeb</p>
        </div>
      </div>

      {/* Daily Goals Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Target size={20} />
          <h2>Cele dzienne</h2>
        </div>
        <div className="settings-grid">
          <div className="settings-field">
            <label>
              <Clock size={16} />
              <span>Min. sesji dziennie</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.minSessionsPerDay}
              onChange={e => setSettings({ ...settings, minSessionsPerDay: Number(e.target.value) })}
              className="settings-input"
            />
            <p className="settings-hint">Ile sesji chcesz robić każdego dnia</p>
          </div>

          <div className="settings-field">
            <label>
              <Clock size={16} />
              <span>Min. minut dziennie</span>
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={settings.minMinutesPerDay}
              onChange={e => setSettings({ ...settings, minMinutesPerDay: Number(e.target.value) })}
              className="settings-input"
            />
            <p className="settings-hint">Ile minut chcesz uczyć się dziennie</p>
          </div>
        </div>

        <div className="settings-field">
          <label>
            <Target size={16} />
            <span>Tryb celu dziennego</span>
          </label>
          <select
            value={settings.dailyGoalMode}
            onChange={e => setSettings({ ...settings, dailyGoalMode: e.target.value as Settings['dailyGoalMode'] })}
            className="settings-select"
          >
            <option value="sessions">Sesje - cel oparty na liczbie sesji</option>
            <option value="minutes">Minuty - cel oparty na czasie nauki</option>
            <option value="hybrid">Hybrydowy - sesje + minuty</option>
          </select>
          <p className="settings-hint">Jak chcesz mierzyć swój dzienny postęp</p>
        </div>
      </section>

      {/* Language Direction Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Languages size={20} />
          <h2>Preferencje językowe</h2>
        </div>
        <div className="settings-field">
          <label>
            <Languages size={16} />
            <span>Domyślny kierunek tłumaczenia</span>
          </label>
          <select
            value={settings.defaultDirection}
            onChange={e => setSettings({ ...settings, defaultDirection: e.target.value as Settings['defaultDirection'] })}
            className="settings-select"
          >
            <option value="pl-en">Polski → Angielski</option>
            <option value="en-pl">Angielski → Polski</option>
            <option value="both">Oba kierunki (losowo)</option>
          </select>
          <p className="settings-hint">W którą stronę chcesz tłumaczyć domyślnie</p>
        </div>
      </section>

      {/* Mode Mix Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Shuffle size={20} />
          <h2>Proporcje trybów w trybie Mixed</h2>
        </div>
        <div className="settings-grid-3">
          <div className="settings-field">
            <label>
              <span>Tłumaczenie</span>
            </label>
            <div className="settings-slider-container">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.mixTranslate}
                onChange={e => setSettings({ ...settings, mixTranslate: Number(e.target.value) })}
                className="settings-slider"
              />
              <span className="settings-slider-value">{settings.mixTranslate}%</span>
            </div>
          </div>

          <div className="settings-field">
            <label>
              <span>Test wyboru (ABCD)</span>
            </label>
            <div className="settings-slider-container">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.mixAbcd}
                onChange={e => setSettings({ ...settings, mixAbcd: Number(e.target.value) })}
                className="settings-slider"
              />
              <span className="settings-slider-value">{settings.mixAbcd}%</span>
            </div>
          </div>

          <div className="settings-field">
            <label>
              <span>Zdania</span>
            </label>
            <div className="settings-slider-container">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.mixSentence}
                onChange={e => setSettings({ ...settings, mixSentence: Number(e.target.value) })}
                className="settings-slider"
              />
              <span className="settings-slider-value">{settings.mixSentence}%</span>
            </div>
          </div>
        </div>
        <p className="settings-hint">Proporcje nie muszą sumować się do 100% - system dostosuje je automatycznie</p>
      </section>

      {/* Advanced Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <TrendingUp size={20} />
          <h2>Zaawansowane</h2>
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
            onChange={e => setSettings({ ...settings, maxNewPerDay: Number(e.target.value) })}
            className="settings-input"
          />
          <p className="settings-hint">Limit nowych kart w systemie powtórek rozłożonych (SRS)</p>
        </div>
      </section>

      {/* Save Button */}
      <div className="settings-actions">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`settings-save-btn ${saved ? 'settings-save-btn--saved' : ''}`}
        >
          {saved ? (
            <>
              <Check size={18} /> Zapisano
            </>
          ) : (
            <>
              <Save size={18} /> {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}
            </>
          )}
        </button>
        {status && <span className="settings-status">{status}</span>}
      </div>
    </div>
  )
}
