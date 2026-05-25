'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DuelEngine } from '@/lib/duel-engine'
import type { GameState, DuelPhase, ChainLink } from '@/lib/duel-engine/types'
import type { DuelGameCard, DuelRoom, Player } from '@/lib/types'
import { toast } from 'sonner'

interface UseDuelEngineProps {
  room: DuelRoom
  myPlayerId: string
  allCards: DuelGameCard[]
  onCardsChanged: () => void
}

interface ValidationResult {
  valid: boolean
  reason?: string
  requiresTributes?: number
  tributeTargets?: DuelGameCard[]
}

export function useDuelEngine({ room, myPlayerId, allCards, onCardsChanged }: UseDuelEngineProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTributes, setSelectedTributes] = useState<string[]>([])
  const [pendingTributeAction, setPendingTributeAction] = useState<{
    card: DuelGameCard
    position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense'
    requiredTributes: number
  } | null>(null)

  const supabase = createClient()

  // Initialize or load game state
  useEffect(() => {
    async function loadGameState() {
      const { data, error } = await supabase
        .from('duel_game_state')
        .select('*')
        .eq('room_id', room.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading game state:', error)
      }

      if (data) {
        setGameState({
          roomId: data.room_id,
          turnPlayer: data.turn_player,
          turnCount: data.turn_count,
          phase: data.phase as DuelPhase,
          chain: data.chain || [],
          isChainBuilding: data.is_chain_building,
          priorityPlayer: data.priority_player,
          battlePhaseEnabled: data.battle_phase_enabled,
          pendingAction: data.pending_action,
          responseWindow: data.response_window,
        })
      } else {
        // Initialize new game state
        const players = room.duel_room_participants?.map(p => p.player_id) || []
        const initialState: GameState = {
          roomId: room.id,
          turnPlayer: players[0] || myPlayerId,
          turnCount: 1,
          phase: 'draw',
          chain: [],
          isChainBuilding: false,
          priorityPlayer: players[0] || myPlayerId,
          battlePhaseEnabled: false,
          pendingAction: null,
          responseWindow: null,
        }

        // Save to database
        await supabase.from('duel_game_state').upsert({
          room_id: room.id,
          turn_player: initialState.turnPlayer,
          turn_count: initialState.turnCount,
          phase: initialState.phase,
          chain: initialState.chain,
          is_chain_building: initialState.isChainBuilding,
          priority_player: initialState.priorityPlayer,
          battle_phase_enabled: initialState.battlePhaseEnabled,
        })

        setGameState(initialState)
      }
      setIsLoading(false)
    }

    loadGameState()
  }, [room.id, myPlayerId, supabase])

  // Subscribe to game state changes
  useEffect(() => {
    const channel = supabase
      .channel(`game_state_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duel_game_state',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const data = payload.new as Record<string, unknown>
            setGameState({
              roomId: data.room_id as string,
              turnPlayer: data.turn_player as string,
              turnCount: data.turn_count as number,
              phase: data.phase as DuelPhase,
              chain: (data.chain as ChainLink[]) || [],
              isChainBuilding: data.is_chain_building as boolean,
              priorityPlayer: data.priority_player as string,
              battlePhaseEnabled: data.battle_phase_enabled as boolean,
              pendingAction: data.pending_action as GameState['pendingAction'],
              responseWindow: data.response_window as GameState['responseWindow'],
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, supabase])

  // Check if it's my turn
  const isMyTurn = useMemo(() => {
    return gameState?.turnPlayer === myPlayerId
  }, [gameState?.turnPlayer, myPlayerId])

  // Get my monsters on field
  const myFieldMonsters = useMemo(() => {
    return allCards.filter(
      c => c.player_id === myPlayerId && c.location === 'monster_zone'
    )
  }, [allCards, myPlayerId])

  // Check if I've already normal summoned this turn
  const hasNormalSummoned = useMemo(() => {
    return myFieldMonsters.some(c => c.turn_summoned === gameState?.turnCount)
  }, [myFieldMonsters, gameState?.turnCount])

  // Validate normal summon
  const validateNormalSummon = useCallback((card: DuelGameCard): ValidationResult => {
    if (!gameState) {
      return { valid: false, reason: 'Game not initialized' }
    }

    if (!isMyTurn) {
      return { valid: false, reason: "It's not your turn" }
    }

    if (gameState.phase !== 'main1' && gameState.phase !== 'main2') {
      return { valid: false, reason: 'You can only summon during Main Phase' }
    }

    if (hasNormalSummoned) {
      return { valid: false, reason: 'You can only Normal Summon once per turn' }
    }

    // Check monster level for tribute requirements
    const level = card.level || 0
    let requiredTributes = 0

    if (level >= 5 && level <= 6) {
      requiredTributes = 1
    } else if (level >= 7) {
      requiredTributes = 2
    }

    if (requiredTributes > 0) {
      // Check if we have enough monsters to tribute
      const availableTributes = myFieldMonsters.filter(m => m.id !== card.id)
      if (availableTributes.length < requiredTributes) {
        return { 
          valid: false, 
          reason: `Level ${level} monsters require ${requiredTributes} tribute(s). You only have ${availableTributes.length} monster(s) on the field.`
        }
      }
      return { 
        valid: true, 
        requiresTributes: requiredTributes,
        tributeTargets: availableTributes
      }
    }

    // Check for empty monster zone
    const occupiedZones = myFieldMonsters.map(c => c.zone_index)
    let hasEmptyZone = false
    for (let i = 0; i < 5; i++) {
      if (!occupiedZones.includes(i)) {
        hasEmptyZone = true
        break
      }
    }

    if (!hasEmptyZone) {
      return { valid: false, reason: 'No empty monster zones' }
    }

    return { valid: true }
  }, [gameState, isMyTurn, hasNormalSummoned, myFieldMonsters])

  // Execute normal summon
  const executeNormalSummon = useCallback(async (
    card: DuelGameCard, 
    position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense',
    tributeIds?: string[]
  ) => {
    const validation = validateNormalSummon(card)
    
    if (!validation.valid) {
      toast.error(validation.reason)
      return { success: false, error: validation.reason }
    }

    // If tributes are required but not provided, prompt for tribute selection
    if (validation.requiresTributes && (!tributeIds || tributeIds.length < validation.requiresTributes)) {
      setPendingTributeAction({
        card,
        position,
        requiredTributes: validation.requiresTributes
      })
      toast.info(`Select ${validation.requiresTributes} monster(s) to tribute`)
      return { success: false, requiresTributes: validation.requiresTributes }
    }

    // Find empty zone
    const occupiedZones = myFieldMonsters.map(c => c.zone_index)
    let targetZone = -1
    for (let i = 0; i < 5; i++) {
      if (!occupiedZones.includes(i)) {
        targetZone = i
        break
      }
    }

    // Send tributes to graveyard if any
    if (tributeIds && tributeIds.length > 0) {
      const { error: tributeError } = await supabase
        .from('duel_game_cards')
        .update({ 
          location: 'graveyard',
          zone_index: null,
          position: 'face_up_attack'
        })
        .in('id', tributeIds)

      if (tributeError) {
        toast.error('Failed to tribute monsters')
        return { success: false, error: 'Failed to tribute' }
      }
    }

    // Summon the monster
    const { error } = await supabase
      .from('duel_game_cards')
      .update({
        location: 'monster_zone',
        zone_index: targetZone,
        position,
        turn_summoned: gameState?.turnCount,
        has_changed_position: false,
        attacks_declared: 0,
      })
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to summon monster')
      return { success: false, error: 'Database error' }
    }

    // Clear pending tribute action
    setPendingTributeAction(null)
    setSelectedTributes([])

    const summonType = position === 'face_down_defense' ? 'Set' : 'Normal Summoned'
    toast.success(`${summonType} ${card.card_name}!`)
    onCardsChanged()

    return { success: true }
  }, [validateNormalSummon, myFieldMonsters, gameState?.turnCount, supabase, onCardsChanged])

  // Handle tribute selection
  const selectTribute = useCallback((cardId: string) => {
    if (!pendingTributeAction) return

    setSelectedTributes(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId)
      }
      if (prev.length < pendingTributeAction.requiredTributes) {
        return [...prev, cardId]
      }
      return prev
    })
  }, [pendingTributeAction])

  // Confirm tribute summon
  const confirmTributeSummon = useCallback(async () => {
    if (!pendingTributeAction || selectedTributes.length < pendingTributeAction.requiredTributes) {
      toast.error(`Select ${pendingTributeAction?.requiredTributes} monster(s) to tribute`)
      return
    }

    await executeNormalSummon(
      pendingTributeAction.card,
      pendingTributeAction.position,
      selectedTributes
    )
  }, [pendingTributeAction, selectedTributes, executeNormalSummon])

  // Cancel tribute summon
  const cancelTributeSummon = useCallback(() => {
    setPendingTributeAction(null)
    setSelectedTributes([])
  }, [])

  // Validate spell/trap activation
  const validateSpellTrapActivation = useCallback((card: DuelGameCard): ValidationResult => {
    if (!gameState) {
      return { valid: false, reason: 'Game not initialized' }
    }

    // Traps must be set before activation (unless specified)
    if (card.card_type === 'trap' && card.location === 'hand') {
      return { valid: false, reason: 'Trap cards must be Set before they can be activated' }
    }

    // Traps cannot be activated the turn they are set
    if (card.card_type === 'trap' && card.turn_set === gameState.turnCount) {
      return { valid: false, reason: 'Trap cards cannot be activated the same turn they are Set' }
    }

    // Normal spells can only be activated during own Main Phase
    // (Quick-Play spells have different rules but we'll handle that separately)
    if (card.card_type === 'spell' && card.location === 'hand') {
      if (!isMyTurn) {
        return { valid: false, reason: "You can only activate Spell cards during your turn" }
      }
      if (gameState.phase !== 'main1' && gameState.phase !== 'main2') {
        return { valid: false, reason: 'You can only activate Spell cards during Main Phase' }
      }
    }

    return { valid: true }
  }, [gameState, isMyTurn])

  // Execute spell/trap activation (sends to GY after resolution for normal spells)
  const executeSpellTrapActivation = useCallback(async (card: DuelGameCard) => {
    const validation = validateSpellTrapActivation(card)
    
    if (!validation.valid) {
      toast.error(validation.reason)
      return { success: false, error: validation.reason }
    }

    // For cards in hand, first move to spell zone face-up
    if (card.location === 'hand') {
      const occupiedZones = allCards
        .filter(c => c.player_id === myPlayerId && c.location === 'spell_zone')
        .map(c => c.zone_index)
      
      let targetZone = -1
      for (let i = 0; i < 5; i++) {
        if (!occupiedZones.includes(i)) {
          targetZone = i
          break
        }
      }

      if (targetZone === -1) {
        toast.error('No empty Spell/Trap zones')
        return { success: false, error: 'No empty zones' }
      }

      // Move to field then immediately to graveyard for normal spells
      const { error } = await supabase
        .from('duel_game_cards')
        .update({
          location: 'graveyard', // Normal spells go to GY after activation
          zone_index: null,
          position: 'face_up_attack',
        })
        .eq('id', card.id)

      if (error) {
        toast.error('Failed to activate')
        return { success: false, error: 'Database error' }
      }
    } else {
      // Card is already set on field - activate and send to GY
      const { error } = await supabase
        .from('duel_game_cards')
        .update({
          location: 'graveyard',
          zone_index: null,
          position: 'face_up_attack',
        })
        .eq('id', card.id)

      if (error) {
        toast.error('Failed to activate')
        return { success: false, error: 'Database error' }
      }
    }

    toast.success(`Activated ${card.card_name}!`)
    toast.info(`Effect: ${card.effect_text?.substring(0, 100) || 'No effect text'}...`)
    onCardsChanged()

    return { success: true }
  }, [validateSpellTrapActivation, allCards, myPlayerId, supabase, onCardsChanged])

  // Set spell/trap face-down
  const setSpellTrap = useCallback(async (card: DuelGameCard) => {
    if (!isMyTurn) {
      toast.error("It's not your turn")
      return { success: false }
    }

    if (gameState?.phase !== 'main1' && gameState?.phase !== 'main2') {
      toast.error('You can only Set cards during Main Phase')
      return { success: false }
    }

    const occupiedZones = allCards
      .filter(c => c.player_id === myPlayerId && c.location === 'spell_zone')
      .map(c => c.zone_index)
    
    let targetZone = -1
    for (let i = 0; i < 5; i++) {
      if (!occupiedZones.includes(i)) {
        targetZone = i
        break
      }
    }

    if (targetZone === -1) {
      toast.error('No empty Spell/Trap zones')
      return { success: false }
    }

    const { error } = await supabase
      .from('duel_game_cards')
      .update({
        location: 'spell_zone',
        zone_index: targetZone,
        position: 'face_down',
        turn_set: gameState?.turnCount,
      })
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to set card')
      return { success: false }
    }

    toast.success(`Set a card`)
    onCardsChanged()

    return { success: true }
  }, [isMyTurn, gameState?.phase, gameState?.turnCount, allCards, myPlayerId, supabase, onCardsChanged])

  // Change phase
  const changePhase = useCallback(async (newPhase: DuelPhase) => {
    if (!isMyTurn) {
      toast.error("It's not your turn")
      return
    }

    // Validate phase transitions
    const validTransitions: Record<DuelPhase, DuelPhase[]> = {
      'draw': ['standby'],
      'standby': ['main1'],
      'main1': ['battle', 'end'],
      'battle': ['main2'],
      'main2': ['end'],
      'end': ['draw'], // This triggers turn change
    }

    if (!validTransitions[gameState?.phase || 'draw'].includes(newPhase)) {
      toast.error('Invalid phase transition')
      return
    }

    // If moving to end phase, trigger turn change
    if (newPhase === 'end') {
      // Get opponent
      const participants = room.duel_room_participants || []
      const opponent = participants.find(p => p.player_id !== myPlayerId)
      
      if (opponent) {
        // Draw card for opponent's draw phase
        const opponentDeck = allCards.filter(
          c => c.player_id === opponent.player_id && c.location === 'deck'
        ).sort((a, b) => a.order_index - b.order_index)

        if (opponentDeck.length > 0) {
          await supabase
            .from('duel_game_cards')
            .update({ location: 'hand' })
            .eq('id', opponentDeck[0].id)
        }

        // Reset position change flags for opponent's monsters
        await supabase
          .from('duel_game_cards')
          .update({ 
            has_changed_position: false,
            attacks_declared: 0 
          })
          .eq('player_id', opponent.player_id)
          .eq('location', 'monster_zone')

        // Update game state
        const newTurnCount = (gameState?.turnCount || 1) + 1
        await supabase
          .from('duel_game_state')
          .update({
            turn_player: opponent.player_id,
            turn_count: newTurnCount,
            phase: 'draw',
            priority_player: opponent.player_id,
          })
          .eq('room_id', room.id)

        // Update local state
        setGameState(prev => prev ? {
          ...prev,
          turnPlayer: opponent.player_id,
          turnCount: newTurnCount,
          phase: 'draw',
          priorityPlayer: opponent.player_id,
        } : null)

        toast.info(`Turn ${newTurnCount}: Opponent's turn`)
      }
    } else {
      await supabase
        .from('duel_game_state')
        .update({ phase: newPhase })
        .eq('room_id', room.id)

      // Update local state
      setGameState(prev => prev ? {
        ...prev,
        phase: newPhase,
      } : null)

      toast.info(`Moved to ${newPhase} phase`)
    }

    onCardsChanged()
  }, [isMyTurn, gameState, room, myPlayerId, allCards, supabase, onCardsChanged])

  // Start the duel (called when both players are ready)
  const startDuel = useCallback(async () => {
    const participants = room.duel_room_participants || []
    if (participants.length < 2) {
      toast.error('Need 2 players to start')
      return
    }

    // Determine who goes first (could be random or choice)
    const firstPlayer = participants[0].player_id

    // Draw 5 cards for each player
    for (const participant of participants) {
      const deck = allCards.filter(
        c => c.player_id === participant.player_id && c.location === 'deck'
      ).sort((a, b) => a.order_index - b.order_index)

      const cardsToDraw = deck.slice(0, 5)
      for (const card of cardsToDraw) {
        await supabase
          .from('duel_game_cards')
          .update({ location: 'hand' })
          .eq('id', card.id)
      }
    }

    // Set initial game state
    await supabase
      .from('duel_game_state')
      .upsert({
        room_id: room.id,
        turn_player: firstPlayer,
        turn_count: 1,
        phase: 'draw',
        priority_player: firstPlayer,
        battle_phase_enabled: false, // First turn player can't enter battle phase
      })

    toast.success('Duel started! Draw your opening hand.')
    onCardsChanged()
  }, [room, allCards, supabase, onCardsChanged])

  return {
    gameState,
    isLoading,
    isMyTurn,
    hasNormalSummoned,
    
    // Tribute summon state
    pendingTributeAction,
    selectedTributes,
    selectTribute,
    confirmTributeSummon,
    cancelTributeSummon,
    
    // Actions
    validateNormalSummon,
    executeNormalSummon,
    validateSpellTrapActivation,
    executeSpellTrapActivation,
    setSpellTrap,
    changePhase,
    startDuel,
  }
}
