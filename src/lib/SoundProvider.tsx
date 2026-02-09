'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface SoundContextType {
  enabled: boolean
  toggle: () => void
  playCorrect: () => void
  playWrong: () => void
  unlock: () => void
}

const SoundContext = createContext<SoundContextType>({
  enabled: true,
  toggle: () => {},
  playCorrect: () => {},
  playWrong: () => {},
  unlock: () => {},
})

export function useSound() {
  return useContext(SoundContext)
}

// Pool of audio elements for rapid-fire playback without cutting off
const POOL_SIZE = 3

function createAudioPool(src: string): HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = []
  for (let i = 0; i < POOL_SIZE; i++) {
    const audio = new Audio(src)
    audio.preload = 'auto'
    pool.push(audio)
  }
  return pool
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true)
  const correctPoolRef = useRef<HTMLAudioElement[]>([])
  const wrongPoolRef = useRef<HTMLAudioElement[]>([])
  const correctIndexRef = useRef(0)
  const wrongIndexRef = useRef(0)
  const unlockedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem('sound-enabled')
    if (stored !== null) setEnabled(stored === 'true')

    correctPoolRef.current = createAudioPool('/sounds/correct.wav')
    wrongPoolRef.current = createAudioPool('/sounds/wrong.wav')
  }, [])

  // Unlock audio on first user interaction (for mobile)
  const unlock = useCallback(() => {
    if (unlockedRef.current) return
    const all = [...correctPoolRef.current, ...wrongPoolRef.current]
    for (const audio of all) {
      audio.play().then(() => {
        audio.pause()
        audio.currentTime = 0
      }).catch(() => {})
    }
    unlockedRef.current = true
  }, [])

  useEffect(() => {
    if (unlockedRef.current) return
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [unlock])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      localStorage.setItem('sound-enabled', String(next))
      return next
    })
  }, [])

  const playCorrect = useCallback(() => {
    if (!enabled) return
    const pool = correctPoolRef.current
    if (pool.length === 0) return
    const audio = pool[correctIndexRef.current % pool.length]
    correctIndexRef.current++
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [enabled])

  const playWrong = useCallback(() => {
    if (!enabled) return
    const pool = wrongPoolRef.current
    if (pool.length === 0) return
    const audio = pool[wrongIndexRef.current % pool.length]
    wrongIndexRef.current++
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [enabled])

  return (
    <SoundContext value={{ enabled, toggle, playCorrect, playWrong, unlock }}>
      {children}
    </SoundContext>
  )
}
