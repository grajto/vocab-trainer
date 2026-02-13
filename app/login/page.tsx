'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [login, setLogin] = useState('')
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
        body: JSON.stringify({ username: login }),
        credentials: 'include',
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        // Handle error responses
        let errorMessage = 'Nieprawidłowy login.'
        
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface-muted)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[var(--card-radius)] p-6 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Podaj login, aby kontynuować.</p>

        {error && (
          <div className="rounded-[var(--chip-radius)] px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger-dark)' }}>
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm" style={{ color: 'var(--text)' }}>Login</label>
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            placeholder="Wpisz swój login"
            autoComplete="username"
            className="w-full rounded-[var(--input-radius)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          style={{ background: 'var(--primary)' }}
        >
          Zaloguj się
        </button>
      </form>
    </div>
  )
}
