/**
 * React hook for using OCG Core WASM engine
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  createDuel, 
  testCoreLoad, 
  OcgDuel,
  initializeCore,
} from '@/lib/ocg-core'
import type {
  CreateDuelOptions,
  ParsedGameState,
  DuelEvent,
  WaitingState,
  GameAction,
  DeckConfig,
} from '@/lib/ocg-core/types'
import { toast } from 'sonner'

interface UseOcgDuelOptions {
  player1Deck: DeckConfig
  player2Deck: DeckConfig
  autoStart?: boolean
  onEvent?: (event: DuelEvent) => void
}

interface UseOcgDuelReturn {
  // State
  isLoading: boolean
  isReady: boolean
  error: string | null
  gameState: ParsedGameState | null
  waitingFor: WaitingState | null
  events: DuelEvent[]
  
  // Actions
  startDuel: () => Promise<void>
  sendAction: (action: GameAction) => Promise<void>
  resetDuel: () => void
}

export function useOcgDuel(options: UseOcgDuelOptions): UseOcgDuelReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<ParsedGameState | null>(null)
  const [waitingFor, setWaitingFor] = useState<WaitingState | null>(null)
  const [events, setEvents] = useState<DuelEvent[]>([])
  
  const duelRef = useRef<OcgDuel | null>(null)
  const initializingRef = useRef(false)
  
  // Initialize the core on mount
  useEffect(() => {
    const init = async () => {
      if (initializingRef.current) return
      initializingRef.current = true
      
      try {
        console.log('[v0] Initializing OCG Core...')
        const loaded = await testCoreLoad()
        
        if (!loaded) {
          throw new Error('Failed to load OCG Core WASM module')
        }
        
        setIsReady(true)
        setIsLoading(false)
        console.log('[v0] OCG Core ready')
        
        if (options.autoStart) {
          await startDuelInternal()
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[v0] OCG Core initialization failed:', e)
        setError(message)
        setIsLoading(false)
      }
    }
    
    init()
    
    return () => {
      // Cleanup duel on unmount
      if (duelRef.current) {
        duelRef.current.destroy()
        duelRef.current = null
      }
    }
  }, [])
  
  // Create and start duel
  const startDuelInternal = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Destroy existing duel if any
      if (duelRef.current) {
        duelRef.current.destroy()
        duelRef.current = null
      }
      
      toast.info('Loading cards and scripts...')
      
      const duelOptions: CreateDuelOptions = {
        player1: {
          deck: options.player1Deck,
          startingLP: 8000,
          startingDrawCount: 5,
          drawCountPerTurn: 1,
        },
        player2: {
          deck: options.player2Deck,
          startingLP: 8000,
          startingDrawCount: 5,
          drawCountPerTurn: 1,
        },
      }
      
      const duel = await createDuel(duelOptions)
      duelRef.current = duel
      
      // Subscribe to events
      duel.onEvent((event) => {
        setEvents(prev => [...prev, event])
        options.onEvent?.(event)
        
        // Handle specific events
        if (event.type === 'game_end') {
          toast.success(`Game over! Winner: Player ${event.winner === 0 ? '1' : '2'}`)
        }
      })
      
      toast.info('Starting duel...')
      
      // Start the duel
      await duel.start()
      
      // Get initial state
      const state = duel.getState()
      setGameState(state)
      
      // Check if waiting for input
      // setWaitingFor would be set based on duel state
      
      setIsLoading(false)
      toast.success('Duel started!')
      
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start duel'
      console.error('[v0] Failed to start duel:', e)
      setError(message)
      setIsLoading(false)
      toast.error(message)
    }
  }
  
  const startDuel = useCallback(async () => {
    await startDuelInternal()
  }, [options.player1Deck, options.player2Deck])
  
  const sendAction = useCallback(async (action: GameAction) => {
    if (!duelRef.current) {
      toast.error('Duel not started')
      return
    }
    
    try {
      const nextWaiting = await duelRef.current.respond(action)
      setWaitingFor(nextWaiting)
      
      // Update game state
      const state = duelRef.current.getState()
      setGameState(state)
      
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to process action'
      console.error('[v0] Action failed:', e)
      toast.error(message)
    }
  }, [])
  
  const resetDuel = useCallback(() => {
    if (duelRef.current) {
      duelRef.current.destroy()
      duelRef.current = null
    }
    setGameState(null)
    setWaitingFor(null)
    setEvents([])
    setError(null)
  }, [])
  
  return {
    isLoading,
    isReady,
    error,
    gameState,
    waitingFor,
    events,
    startDuel,
    sendAction,
    resetDuel,
  }
}

/**
 * Simple hook to just test if OCG Core loads
 */
export function useOcgCoreStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [version, setVersion] = useState<string | null>(null)
  
  useEffect(() => {
    const check = async () => {
      try {
        const core = await initializeCore()
        const ver = core.getVersion()
        setVersion(`${ver[0]}.${ver[1]}`)
        setStatus('ready')
      } catch (e) {
        console.error('[v0] OCG Core load failed:', e)
        setStatus('error')
      }
    }
    check()
  }, [])
  
  return { status, version }
}
