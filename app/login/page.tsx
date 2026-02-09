'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          login.includes('@')
            ? { email: login, password }
            : { username: login, password },
        ),
        credentials: 'include',
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.errors?.[0]?.message || 'Login failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vocab Trainer</h1>
          <p className="text-slate-500">
            Ucz się słówek w stylu Quizlet z SRS, trybem Sentence i statystykami.
          </p>
          <div className="bg-white/70 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-2">Co dostajesz:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Tryby Translate / ABCD / Sentence</li>
              <li>Streak i kalendarz aktywności</li>
              <li>Powiadomienia o zaległościach</li>
            </ul>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Zaloguj się</h2>
            <p className="text-sm text-slate-400">Wprowadź dane, aby kontynuować.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Username lub email</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="username123 lub you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Hasło</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Logowanie…' : 'Zaloguj'}
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-400 text-center">
            Pierwszy raz? 11yUtwórz konto w{' '}
            <Link href="/admin" className="text-indigo-600 underline underline-offset-2">/admin</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
