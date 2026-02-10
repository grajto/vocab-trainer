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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl p-8 space-y-5" style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
        <p style={{ color: 'var(--muted)' }}>Wprowadź dane, aby kontynuować.</p>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
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
            className="w-full rounded-xl px-4 py-3 text-base focus:outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm" style={{ color: 'var(--text)' }}>Hasło</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-base focus:outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-base font-semibold text-white disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #4255ff 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(66, 85, 255, 0.3)' }}
        >
          Zaloguj się
        </button>
      </form>
    </div>
  )
}
