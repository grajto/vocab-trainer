'use client'

type ToneConfig = {
  frequency: number
  durationMs: number
  type?: OscillatorType
}

const DEFAULT_TONE: ToneConfig = {
  frequency: 520,
  durationMs: 140,
  type: 'sine',
}

export class SoundManager {
  private context: AudioContext | null = null
  private enabled = true
  private unlocked = false

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('sound-enabled')
      if (saved !== null) {
        this.enabled = saved === 'true'
      }
    }
  }

  isEnabled() {
    return this.enabled
  }

  setEnabled(value: boolean) {
    this.enabled = value
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sound-enabled', String(value))
    }
  }

  async unlock() {
    if (typeof window === 'undefined') return
    if (!this.context) {
      this.context = new window.AudioContext()
    }
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
    this.unlocked = true
  }

  private playTone(config: ToneConfig) {
    if (!this.enabled || !this.unlocked || !this.context) return
    const ctx = this.context
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = config.type || DEFAULT_TONE.type || 'sine'
    oscillator.frequency.value = config.frequency

    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.durationMs / 1000)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + config.durationMs / 1000)
  }

  playCorrect() {
    this.playTone({ frequency: 640, durationMs: 140, type: 'triangle' })
  }

  playWrong() {
    this.playTone({ frequency: 220, durationMs: 220, type: 'sawtooth' })
  }
}

let soundManager: SoundManager | null = null

export function getSoundManager() {
  if (!soundManager) {
    soundManager = new SoundManager()
  }
  return soundManager
}
