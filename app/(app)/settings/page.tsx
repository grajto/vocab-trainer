'use client'

import { useEffect, useState } from 'react'

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
    setStatus('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('save')
      setStatus('Zapisano ustawienia.')
    } catch {
      setStatus('Nie udało się zapisać ustawień.')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <div className="p-6 lg:p-8 max-w-3xl mx-auto text-sm text-slate-400">Ładowanie ustawień…</div>
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Ustawienia</h2>
        <p className="text-sm text-slate-400">Cele dzienne, preferencje językowe i mix trybów.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Min. sesji dziennie</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.minSessionsPerDay}
              onChange={e => setSettings({ ...settings, minSessionsPerDay: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Min. minut dziennie</label>
            <input
              type="number"
              min={5}
              max={180}
              value={settings.minMinutesPerDay}
              onChange={e => setSettings({ ...settings, minMinutesPerDay: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Cel dzienny</label>
          <select
            value={settings.dailyGoalMode}
            onChange={e => setSettings({ ...settings, dailyGoalMode: e.target.value as Settings['dailyGoalMode'] })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="sessions">Sesje</option>
            <option value="minutes">Minuty</option>
            <option value="hybrid">Hybrydowy</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Domyślny kierunek</label>
          <select
            value={settings.defaultDirection}
            onChange={e => setSettings({ ...settings, defaultDirection: e.target.value as Settings['defaultDirection'] })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="pl-en">PL → EN</option>
            <option value="en-pl">EN → PL</option>
            <option value="both">Oba</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Mix Translate %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.mixTranslate}
              onChange={e => setSettings({ ...settings, mixTranslate: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Mix ABCD %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.mixAbcd}
              onChange={e => setSettings({ ...settings, mixAbcd: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Mix Sentence %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.mixSentence}
              onChange={e => setSettings({ ...settings, mixSentence: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Max nowych kart dziennie (SRS)</label>
          <input
            type="number"
            min={0}
            max={200}
            value={settings.maxNewPerDay}
            onChange={e => setSettings({ ...settings, maxNewPerDay: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
        {status && <span className="text-xs text-slate-500">{status}</span>}
      </div>
    </div>
  )
}
