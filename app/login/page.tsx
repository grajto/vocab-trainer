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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface2)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[var(--radius)] p-6 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p style={{ color: 'var(--muted)' }}>Wprowadź dane, aby kontynuować.</p>

        {error && (
          <div className="rounded-[var(--radiusSm)] px-4 py-3 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
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
            className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-70"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          Zaloguj się
        </button>
      </form>
    </div>
  )
}
