'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { Button } from '@/app/(app)/_components/ui/Button'
import { Input } from '@/app/(app)/_components/ui/Input'

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
        let errorMessage = 'Nieprawidłowy login.'
        
        try {
          const data = await res.json()
          if (data.errors && data.errors.length > 0) {
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
    <div className="flex min-h-screen items-center justify-center px-4 bg-[var(--surface-muted)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
      >
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Witaj!</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Podaj login, aby kontynuować.</p>
        </div>

        {error && (
          <div className="rounded-[var(--chip-radius)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-dark)]">
            {error}
          </div>
        )}

        <Input
          label="Login"
          type="text"
          value={login}
          onChange={e => setLogin(e.target.value)}
          required
          minLength={2}
          maxLength={50}
          placeholder="Wpisz swój login"
          autoComplete="username"
          fullWidth
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={LogIn}
        >
          Zaloguj się
        </Button>
      </form>
    </div>
  )
}
