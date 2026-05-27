'use client'

import { useState, useCallback } from 'react'
import type { DuelGameCard } from '@/lib/types'

interface ChainLink {
  chainNumber: number
  card: DuelGameCard
  playerId: string
  timestamp: number
}

interface ChainState {
  isChainActive: boolean
  chainLinks: ChainLink[]
  currentChainNumber: number
  isResolving: boolean
  waitingForResponse: boolean
  responsePlayerId: string | null
}

export function useChainSystem() {
  const [chainState, setChainState] = useState<ChainState>({
    isChainActive: false,
    chainLinks: [],
    currentChainNumber: 0,
    isResolving: false,
    waitingForResponse: false,
    responsePlayerId: null,
  })

  // Start a new chain with the first card
  const startChain = useCallback((card: DuelGameCard, playerId: string) => {
    setChainState({
      isChainActive: true,
      chainLinks: [{
        chainNumber: 1,
        card,
        playerId,
        timestamp: Date.now(),
      }],
      currentChainNumber: 1,
      isResolving: false,
      waitingForResponse: true,
      responsePlayerId: null, // Opponent gets priority to respond
    })
  }, [])

  // Add a response to the chain
  const addToChain = useCallback((card: DuelGameCard, playerId: string) => {
    setChainState(prev => ({
      ...prev,
      chainLinks: [
        ...prev.chainLinks,
        {
          chainNumber: prev.currentChainNumber + 1,
          card,
          playerId,
          timestamp: Date.now(),
        }
      ],
      currentChainNumber: prev.currentChainNumber + 1,
      waitingForResponse: true,
      responsePlayerId: null,
    }))
  }, [])

  // Pass priority (don't add to chain)
  const passPriority = useCallback(() => {
    setChainState(prev => {
      // If both players passed, start resolving
      if (prev.waitingForResponse && prev.responsePlayerId !== null) {
        return {
          ...prev,
          waitingForResponse: false,
          isResolving: true,
        }
      }
      // First pass, wait for other player
      return {
        ...prev,
        waitingForResponse: true,
        responsePlayerId: 'passed',
      }
    })
  }, [])

  // Resolve the next chain link (LIFO - last in, first out)
  const resolveNextLink = useCallback(() => {
    setChainState(prev => {
      if (prev.chainLinks.length === 0) {
        // Chain fully resolved
        return {
          isChainActive: false,
          chainLinks: [],
          currentChainNumber: 0,
          isResolving: false,
          waitingForResponse: false,
          responsePlayerId: null,
        }
      }

      // Remove the last link (resolve it)
      const newLinks = prev.chainLinks.slice(0, -1)
      
      if (newLinks.length === 0) {
        // Last link resolved, chain ends
        return {
          isChainActive: false,
          chainLinks: [],
          currentChainNumber: 0,
          isResolving: false,
          waitingForResponse: false,
          responsePlayerId: null,
        }
      }

      return {
        ...prev,
        chainLinks: newLinks,
        currentChainNumber: newLinks.length,
      }
    })
  }, [])

  // Cancel/clear the chain
  const cancelChain = useCallback(() => {
    setChainState({
      isChainActive: false,
      chainLinks: [],
      currentChainNumber: 0,
      isResolving: false,
      waitingForResponse: false,
      responsePlayerId: null,
    })
  }, [])

  // Get the current chain link being resolved
  const getCurrentResolving = useCallback(() => {
    if (!chainState.isResolving || chainState.chainLinks.length === 0) {
      return null
    }
    return chainState.chainLinks[chainState.chainLinks.length - 1]
  }, [chainState.isResolving, chainState.chainLinks])

  return {
    // State
    isChainActive: chainState.isChainActive,
    chainLinks: chainState.chainLinks,
    currentChainNumber: chainState.currentChainNumber,
    isResolving: chainState.isResolving,
    waitingForResponse: chainState.waitingForResponse,
    
    // Actions
    startChain,
    addToChain,
    passPriority,
    resolveNextLink,
    cancelChain,
    getCurrentResolving,
  }
}
