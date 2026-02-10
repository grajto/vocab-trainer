'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login.includes('@') ? { email: login, password } : { username: login, password }),
        credentials: 'include',
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        // Handle error responses
        let errorMessage = 'Nieprawidłowy login lub hasło.'
        
        try {
          const data = await res.json()
          if (data.errors && data.errors.length > 0) {
            // Payload CMS error format
            const firstError = data.errors[0]
            if (firstError.message) {
              errorMessage = firstError.message
            }
          } else if (data.message) {
            errorMessage = data.message
          }
        } catch {
          // If JSON parsing fails, use default error message
        }

        // Translate common error messages to Polish
        const errorLower = errorMessage.toLowerCase()
        if (errorLower.includes('too many failed login attempts') || 
            errorLower.includes('locked due to')) {
          errorMessage = 'To konto zostało zablokowane z powodu zbyt wielu nieudanych prób logowania. Skontaktuj się z administratorem, aby odblokować konto.'
        } else if (errorLower.includes('invalid login credentials')) {
          errorMessage = 'Nieprawidłowy login lub hasło.'
        } else if (errorLower.includes('invalid') && (errorLower.includes('username') || errorLower.includes('password') || errorLower.includes('email'))) {
          errorMessage = 'Nieprawidłowy login lub hasło.'
        }

        setError(errorMessage)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 space-y-4">
        <p className="text-slate-600">Wprowadź dane, aby kontynuować.</p>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm text-slate-700">Login</label>
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm text-slate-700">Hasło</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-70"
        >
          Zaloguj się
        </button>
      </form>
    </div>
  )
}
