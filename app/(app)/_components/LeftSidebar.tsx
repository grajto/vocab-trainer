'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSound } from '@/src/lib/SoundProvider'
import { BarChart3, Bell, BookOpen, CalendarDays, ClipboardCheck, FolderOpen, Home, PlayCircle, Plus, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SidebarSearch } from './SidebarSearch'
import { useSettings } from '@/src/contexts/SettingsContext'
import type { DefaultDirection, StudyMode } from '@/src/lib/userSettings'

interface FolderItem {
  id: string
  name: string
}

interface DailyProgress {
  cardsCompleted: number
  minutesSpent: number
  sessionsCompleted: number
}

interface ActiveSession {
  sessionId: string
  deckName: string
  progress: string
  progressRatio: number
}

export function LeftSidebar({
  folders,
  mobile,
  open,
  onClose,
}: {
  folders: FolderItem[]
  mobile?: boolean
  open?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { unlock } = useSound()
  const { settings } = useSettings()
  const [hasNewNotifications, setHasNewNotifications] = useState(false)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)
  const [activeSessionLoading, setActiveSessionLoading] = useState(false)
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  
  // Quick settings overrides (one-time use, not persisted)
  const [quickDirection, setQuickDirection] = useState<DefaultDirection | null>(null)
  const [quickMode, setQuickMode] = useState<StudyMode | null>(null)
  const [quickLength, setQuickLength] = useState<number | null>(null)
  
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  useEffect(() => {
    let ignore = false
    fetch('/api/notifications', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setHasNewNotifications(Number(data.unreadCount || 0) > 0)
      })
      .catch(() => undefined)
    return () => { ignore = true }
  }, [pathname])

  // Fetch daily progress
  useEffect(() => {
    let ignore = false
    setProgressLoading(true)
    fetch('/api/daily-progress', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.cardsCompleted !== undefined) {
          setDailyProgress({
            cardsCompleted: data.cardsCompleted,
            minutesSpent: data.minutesSpent || 0,
            sessionsCompleted: data.sessionsCompleted || 0,
          })
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setProgressLoading(false)
      })
    return () => { ignore = true }
  }, [])

  // Check for active session
  useEffect(() => {
    let ignore = false
    setActiveSessionLoading(true)
    fetch('/api/sessions/active', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.session) {
          setActiveSession({
            sessionId: data.session.id,
            deckName: data.session.deckName || 'Sesja',
            progress: data.session.progress || '0/0',
            progressRatio: data.session.progressRatio || 0,
          })
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setActiveSessionLoading(false)
      })
    return () => { ignore = true }
  }, [])

  const groupTitle = 'px-2 text-[13px] font-semibold'
  const itemClass = (isActive: boolean) =>
    `flex min-h-[40px] items-center gap-[10px] rounded-[var(--radiusSm)] border px-[10px] py-2 text-sm transition-colors ${
      isActive
        ? 'border-[#d9e0ff] bg-[var(--primaryBg)] text-[var(--primary)] font-semibold'
        : 'border-transparent text-[var(--text)] hover:border-[var(--border)] hover:bg-[#f8fafc]'
    }`

  const chipClass = (isActive: boolean) =>
    `px-3 py-1.5 rounded-[var(--radiusSm)] text-xs font-medium transition-colors cursor-pointer ${
      isActive
        ? 'bg-[var(--primary)] text-white'
        : 'bg-[#f1f5f9] text-[var(--muted)] hover:bg-[#e2e8f0]'
    }`

  const toggleChip = <T extends string>(currentValue: T | null, newValue: T): T | null => 
    currentValue === newValue ? null : newValue

  async function startDailySession() {
    if (dailyLoading) return
    setDailyLoading(true)
    try {
      unlock()
      // Use quick overrides if set, otherwise use settings defaults
      const direction = quickDirection || settings.defaultDirection
      const mode = quickMode || settings.defaultStudyMode
      const targetCount = quickLength || settings.dailyGoalWords
      
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          mode, 
          targetCount, 
          direction,
          shuffle: settings.shuffleWords, 
          allowAll: true 
        }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ 
          tasks: data.tasks, 
          mode, 
          returnDeckId: data.deckId ? String(data.deckId) : '' 
        }))
        router.push(`/session/${data.sessionId}`)
        onClose?.()
      }
    } catch {
      // ignore
    } finally {
      setDailyLoading(false)
    }
  }

  async function continueSession() {
    if (!activeSession || dailyLoading) return
    unlock()
    router.push(`/session/${activeSession.sessionId}`)
    onClose?.()
  }

  const dailyGoal = settings.dailyGoalWords
  const cardsCompleted = dailyProgress?.cardsCompleted || 0
  const progressPercent = Math.min(100, Math.round((cardsCompleted / Math.max(1, dailyGoal)) * 100))
  const effectiveLength = quickLength || settings.dailyGoalWords

  const nav = (
    <aside className="flex h-full flex-col overflow-y-auto border-r px-[var(--sidebar-pad)] py-[var(--sidebar-pad)]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="mb-1 flex items-center justify-between px-2 lg:hidden">
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Menu</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--muted)' }} aria-label="Zamknij menu">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Daily Progress Section */}
        <section className="space-y-3 rounded-[var(--radius)] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Codzienna sesja</h3>
          </div>
          
          {/* Progress Display */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Postęp dzisiaj</span>
              {progressLoading ? (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>...</span>
              ) : (
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {cardsCompleted}/{dailyGoal} fiszek
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
              <div 
                className="h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%`, background: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Quick Settings Overrides */}
          <div className="space-y-2.5 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            {/* Direction chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Kierunek</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickDirection(toggleChip(quickDirection, 'pl-en'))}
                  className={chipClass(quickDirection === 'pl-en')}
                >
                  PL→EN
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDirection(toggleChip(quickDirection, 'en-pl'))}
                  className={chipClass(quickDirection === 'en-pl')}
                >
                  EN→PL
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDirection(toggleChip(quickDirection, 'both'))}
                  className={chipClass(quickDirection === 'both')}
                >
                  Oba
                </button>
              </div>
            </div>

            {/* Mode chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Tryb</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickMode(toggleChip(quickMode, 'translate'))}
                  className={chipClass(quickMode === 'translate')}
                >
                  Tłumaczenie
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMode(toggleChip(quickMode, 'sentence'))}
                  className={chipClass(quickMode === 'sentence')}
                >
                  Zdania
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMode(toggleChip(quickMode, 'describe'))}
                  className={chipClass(quickMode === 'describe')}
                >
                  Opis
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMode(toggleChip(quickMode, 'abcd'))}
                  className={chipClass(quickMode === 'abcd')}
                >
                  ABCD
                </button>
              </div>
            </div>

            {/* Session length stepper */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Długość sesji</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickLength(Math.max(5, effectiveLength - 5))}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radiusSm)] bg-[#f1f5f9] text-[var(--muted)] hover:bg-[#e2e8f0] transition-colors"
                  aria-label="Zmniejsz"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {effectiveLength}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickLength(Math.min(50, effectiveLength + 5))}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radiusSm)] bg-[#f1f5f9] text-[var(--muted)] hover:bg-[#e2e8f0] transition-colors"
                  aria-label="Zwiększ"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {activeSession && !activeSessionLoading ? (
              <>
                <button
                  type="button"
                  onClick={continueSession}
                  disabled={dailyLoading}
                  className="flex-1 flex min-h-[42px] items-center justify-center gap-2 rounded-[var(--radius)] px-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  Kontynuuj
                </button>
                <button
                  type="button"
                  onClick={startDailySession}
                  disabled={dailyLoading}
                  className="flex-1 flex min-h-[42px] items-center justify-center gap-2 rounded-[var(--radius)] border px-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Nowa
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startDailySession}
                disabled={dailyLoading || activeSessionLoading}
                className="w-full flex min-h-[42px] items-center justify-center gap-2 rounded-[var(--radius)] px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--primary), #4f46e5)' }}
              >
                <PlayCircle size={18} />
                {dailyLoading ? 'Uruchamianie…' : 'Rozpocznij'}
              </button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className={groupTitle}>Główne</p>
          <div className="space-y-1">
            <Link href="/dashboard" onClick={onClose} className={itemClass(active('/dashboard'))}><Home size={16} />Strona główna</Link>
            <Link href="/library" onClick={onClose} className={itemClass(active('/library'))}><FolderOpen size={16} />Twoje zasoby</Link>
            <Link href="/calendar" onClick={onClose} className={itemClass(active('/calendar'))}><CalendarDays size={16} />Kalendarz</Link>
            <Link href="/stats" onClick={onClose} className={itemClass(active('/stats'))}><BarChart3 size={16} />Statystyki</Link>
            <Link href="/settings" onClick={onClose} className={itemClass(active('/settings'))}><Settings size={16} />Ustawienia</Link>
            <Link href="/notifications" onClick={onClose} className={itemClass(active('/notifications'))}>
              <Bell size={16} />
              <span className="flex items-center gap-2">Powiadomienia{hasNewNotifications ? <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--danger)' }} /> : null}</span>
            </Link>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className={groupTitle}>Twoje foldery</p>
          <div className="space-y-1">
            {folders.slice(0, 8).map((f) => (
              <Link key={f.id} href={`/folders/${f.id}`} onClick={onClose} className={itemClass(pathname === `/folders/${f.id}`)}>
                <FolderOpen size={15} />
                <span className="truncate">{f.name}</span>
              </Link>
            ))}
            <Link href="/folders/new" onClick={onClose} className={itemClass(pathname === '/folders/new')}><Plus size={16} />Nowy folder</Link>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className={groupTitle}>Rozpocznij tutaj</p>
          <div className="space-y-1">
            <Link href="/study" onClick={onClose} className={itemClass(active('/study'))}><BookOpen size={16} />Ucz się</Link>
            <Link href="/create" onClick={onClose} className={itemClass(active('/create'))}><Plus size={16} />Kreator zestawów</Link>
            <Link href="/test" onClick={onClose} className={itemClass(active('/test'))}><ClipboardCheck size={16} />Testy</Link>
          </div>
        </section>

        <section className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <SidebarSearch />
        </section>
      </div>
    </aside>
  )

  if (!mobile) {
    return <div className="sticky top-0 h-screen">{nav}</div>
  }

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(15,23,42,0.3)' }} onClick={onClose} /> : null}
      <div className={`fixed inset-y-0 left-0 z-50 w-[260px] max-w-[88vw] transform transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'var(--surface)' }}>
        {nav}
      </div>
    </>
  )
}
