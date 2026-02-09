'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface SoundContextType {
  enabled: boolean
  toggle: () => void
  playCorrect: () => void
  playWrong: () => void
}

const SoundContext = createContext<SoundContextType>({
  enabled: true,
  toggle: () => {},
  playCorrect: () => {},
  playWrong: () => {},
})

export function useSound() {
  return useContext(SoundContext)
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true)
  const correctRef = useRef<HTMLAudioElement | null>(null)
  const wrongRef = useRef<HTMLAudioElement | null>(null)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sound-enabled')
    if (stored !== null) setEnabled(stored === 'true')

    // Preload audio
    correctRef.current = new Audio('/sounds/correct.wav')
    wrongRef.current = new Audio('/sounds/wrong.wav')
    correctRef.current.preload = 'auto'
    wrongRef.current.preload = 'auto'
  }, [])

  // Unlock audio on first user interaction (for mobile)
  useEffect(() => {
    if (unlocked) return
    function unlockAudio(audio: HTMLAudioElement | null) {
      if (!audio) return
      audio.play().then(() => { audio.pause(); audio.currentTime = 0 }).catch(() => {})
    }
    function unlock() {
      unlockAudio(correctRef.current)
      unlockAudio(wrongRef.current)
      setUnlocked(true)
    }
    document.addEventListener('click', unlock, { once: true })
    return () => document.removeEventListener('click', unlock)
  }, [unlocked])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      localStorage.setItem('sound-enabled', String(next))
      return next
    })
  }, [])

  const playCorrect = useCallback(() => {
    if (!enabled || !correctRef.current) return
    correctRef.current.currentTime = 0
    correctRef.current.play().catch(() => {})
  }, [enabled])

  const playWrong = useCallback(() => {
    if (!enabled || !wrongRef.current) return
    wrongRef.current.currentTime = 0
    wrongRef.current.play().catch(() => {})
  }, [enabled])

  return (
    <SoundContext value={{ enabled, toggle, playCorrect, playWrong }}>
      {children}
    </SoundContext>
  )
}
