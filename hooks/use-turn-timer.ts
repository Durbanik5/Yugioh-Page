'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTurnTimerOptions {
  initialTime?: number // seconds per turn
  enabled?: boolean
  onTimeUp?: () => void
}

interface TurnTimerState {
  timeRemaining: number
  isRunning: boolean
  isPaused: boolean
}

export function useTurnTimer({ 
  initialTime = 180, // 3 minutes default
  enabled = true,
  onTimeUp 
}: UseTurnTimerOptions = {}) {
  const [state, setState] = useState<TurnTimerState>({
    timeRemaining: initialTime,
    isRunning: false,
    isPaused: false,
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onTimeUpRef = useRef(onTimeUp)
  
  // Keep callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  }, [onTimeUp])

  // Timer tick effect
  useEffect(() => {
    if (!enabled || !state.isRunning || state.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          onTimeUpRef.current?.()
          return { ...prev, timeRemaining: 0, isRunning: false }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, state.isRunning, state.isPaused])

  const startTimer = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true, isPaused: false }))
  }, [])

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }))
  }, [])

  const resumeTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }))
  }, [])

  const resetTimer = useCallback((newTime?: number) => {
    setState({
      timeRemaining: newTime ?? initialTime,
      isRunning: false,
      isPaused: false,
    })
  }, [initialTime])

  const newTurn = useCallback((turnTime?: number) => {
    setState({
      timeRemaining: turnTime ?? initialTime,
      isRunning: true,
      isPaused: false,
    })
  }, [initialTime])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    timeRemaining: state.timeRemaining,
    formattedTime: formatTime(state.timeRemaining),
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    isLowTime: state.timeRemaining <= 30,
    isCriticalTime: state.timeRemaining <= 10,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    newTurn,
  }
}
