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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-indigo-600">Home</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Username or email</label>
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="username123 or you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-400 text-center">
          First time1? Create your account at{' '}
          <Link href="/admin" className="text-indigo-600 underline underline-offset-2">/admin</Link>
        </p>
      </div>
    </div>
  )
}
