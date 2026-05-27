'use client'

import { useCallback, useRef, useEffect } from 'react'

// Sound effect URLs - using royalty-free sounds
const SOUND_URLS = {
  // Card actions
  cardDraw: '/sounds/card-draw.mp3',
  cardPlace: '/sounds/card-place.mp3',
  cardFlip: '/sounds/card-flip.mp3',
  
  // Battle sounds
  attack: '/sounds/attack.mp3',
  destroy: '/sounds/destroy.mp3',
  directAttack: '/sounds/direct-attack.mp3',
  
  // Life point changes
  damage: '/sounds/damage.mp3',
  heal: '/sounds/heal.mp3',
  
  // Phase/turn
  turnStart: '/sounds/turn-start.mp3',
  phaseChange: '/sounds/phase-change.mp3',
  
  // Special effects
  summon: '/sounds/summon.mp3',
  specialSummon: '/sounds/special-summon.mp3',
  activate: '/sounds/activate.mp3',
  chainLink: '/sounds/chain-link.mp3',
  
  // UI
  buttonClick: '/sounds/button-click.mp3',
  notification: '/sounds/notification.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
}

export type SoundEffect = keyof typeof SOUND_URLS

interface UseDuelSoundsOptions {
  enabled?: boolean
  volume?: number
}

export function useDuelSounds({ enabled = true, volume = 0.5 }: UseDuelSoundsOptions = {}) {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map())
  const isMuted = useRef(!enabled)
  const currentVolume = useRef(volume)

  // Update refs when props change
  useEffect(() => {
    isMuted.current = !enabled
    currentVolume.current = volume
  }, [enabled, volume])

  // Preload commonly used sounds
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const commonSounds: SoundEffect[] = ['cardPlace', 'attack', 'damage', 'summon', 'activate']
    commonSounds.forEach(sound => {
      const audio = new Audio(SOUND_URLS[sound])
      audio.preload = 'auto'
      audio.volume = currentVolume.current
      audioCache.current.set(sound, audio)
    })

    return () => {
      audioCache.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      audioCache.current.clear()
    }
  }, [])

  const playSound = useCallback((sound: SoundEffect) => {
    if (isMuted.current || typeof window === 'undefined') return

    try {
      // Try to get from cache first
      let audio = audioCache.current.get(sound)
      
      if (!audio) {
        // Create new audio element if not cached
        audio = new Audio(SOUND_URLS[sound])
        audioCache.current.set(sound, audio)
      }

      // Reset and play
      audio.currentTime = 0
      audio.volume = currentVolume.current
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      })
    } catch {
      // Ignore audio errors
    }
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    isMuted.current = muted
  }, [])

  const setVolume = useCallback((vol: number) => {
    currentVolume.current = Math.max(0, Math.min(1, vol))
  }, [])

  return {
    playSound,
    setMuted,
    setVolume,
    sounds: SOUND_URLS,
  }
}
