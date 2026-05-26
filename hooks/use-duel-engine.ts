'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DuelEngine } from '@/lib/duel-engine'
import type { GameState, DuelPhase, ChainLink } from '@/lib/duel-engine/types'
import type { DuelGameCard, DuelRoom, Player, CardPosition } from '@/lib/types'
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

interface AttackResult {
  success: boolean
  error?: string
  battleResult?: {
    attackerDestroyed: boolean
    defenderDestroyed: boolean
    damageDealt: number
    damageToWho: 'attacker' | 'defender' | 'both' | 'none'
  }
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
    
    // Check for trigger effects on summon (only for face-up summons)
    if (position !== 'face_down_defense' && card.effect_text) {
      const effectText = card.effect_text.toLowerCase()
      
      // Check for common summon trigger phrases
      const hasSummonTrigger = 
        effectText.includes('when this card is summoned') ||
        effectText.includes('when this card is normal summoned') ||
        effectText.includes('if this card is summoned') ||
        effectText.includes('if this card is normal summoned') ||
        effectText.includes('when you normal summon this card') ||
        effectText.includes('if you normal summon this card')
      
      if (hasSummonTrigger) {
        toast.info(`${card.card_name} has a trigger effect! Click the card to activate.`, {
          duration: 5000,
        })
      }
    }
    
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

  // ========== EFFECT EXECUTION FUNCTIONS ==========
  
  // Draw cards from deck
  const drawCardsEffect = useCallback(async (count: number): Promise<{ success: boolean; drawnCards?: string[] }> => {
    const deck = allCards
      .filter(c => c.player_id === myPlayerId && c.location === 'deck')
      .sort((a, b) => a.order_index - b.order_index)

    if (deck.length < count) {
      // Deck out - you lose if you can't draw
      toast.error(`Cannot draw ${count} cards - only ${deck.length} cards left in deck!`)
      return { success: false }
    }

    const cardsToDraw = deck.slice(0, count)
    const drawnNames: string[] = []

    for (const card of cardsToDraw) {
      await supabase
        .from('duel_game_cards')
        .update({ location: 'hand', zone_index: null })
        .eq('id', card.id)
      drawnNames.push(card.card_name)
    }

    toast.success(`Drew ${count} card(s): ${drawnNames.join(', ')}`)
    onCardsChanged()
    return { success: true, drawnCards: drawnNames }
  }, [allCards, myPlayerId, supabase, onCardsChanged])

  // Destroy cards (send to graveyard)
  const destroyCardsEffect = useCallback(async (cardIds: string[]): Promise<{ success: boolean }> => {
    if (cardIds.length === 0) return { success: true }

    const cardsToDestroy = allCards.filter(c => cardIds.includes(c.id))
    const names = cardsToDestroy.map(c => c.card_name)

    await supabase
      .from('duel_game_cards')
      .update({ 
        location: 'graveyard', 
        zone_index: null,
        position: 'face_up_attack' 
      })
      .in('id', cardIds)

    toast.success(`Destroyed: ${names.join(', ')}`)
    onCardsChanged()
    return { success: true }
  }, [allCards, supabase, onCardsChanged])

  // Banish cards
  const banishCardsEffect = useCallback(async (cardIds: string[], faceDown: boolean = false): Promise<{ success: boolean }> => {
    if (cardIds.length === 0) return { success: true }

    const cardsToBanish = allCards.filter(c => cardIds.includes(c.id))
    const names = cardsToBanish.map(c => c.card_name)

    await supabase
      .from('duel_game_cards')
      .update({ 
        location: 'banished', 
        zone_index: null,
        position: faceDown ? 'face_down' : 'face_up_attack' 
      })
      .in('id', cardIds)

    toast.success(`Banished${faceDown ? ' face-down' : ''}: ${names.join(', ')}`)
    onCardsChanged()
    return { success: true }
  }, [allCards, supabase, onCardsChanged])

  // Add card from deck to hand (search)
  const searchDeckEffect = useCallback(async (cardId: string): Promise<{ success: boolean }> => {
    const card = allCards.find(c => c.id === cardId)
    if (!card || card.location !== 'deck') {
      toast.error('Card not found in deck')
      return { success: false }
    }

    await supabase
      .from('duel_game_cards')
      .update({ location: 'hand', zone_index: null })
      .eq('id', cardId)

    toast.success(`Added ${card.card_name} to hand!`)
    onCardsChanged()
    return { success: true }
  }, [allCards, supabase, onCardsChanged])

  // Special summon from hand/deck/graveyard
  const specialSummonEffect = useCallback(async (
    cardId: string, 
    position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense' = 'face_up_attack'
  ): Promise<{ success: boolean }> => {
    const card = allCards.find(c => c.id === cardId)
    if (!card) {
      toast.error('Card not found')
      return { success: false }
    }

    // Find empty monster zone
    const occupiedZones = allCards
      .filter(c => c.player_id === myPlayerId && c.location === 'monster_zone')
      .map(c => c.zone_index)
    
    let targetZone = -1
    for (let i = 0; i < 5; i++) {
      if (!occupiedZones.includes(i)) {
        targetZone = i
        break
      }
    }

    if (targetZone === -1) {
      toast.error('No empty Monster zones')
      return { success: false }
    }

    await supabase
      .from('duel_game_cards')
      .update({ 
        location: 'monster_zone',
        zone_index: targetZone,
        position,
        turn_summoned: gameState?.turnCount,
        has_changed_position: false,
      })
      .eq('id', cardId)

    toast.success(`Special Summoned ${card.card_name}!`)
    
    // Check for trigger effects on special summon
    if (position !== 'face_down_defense' && card.effect_text) {
      const effectText = card.effect_text.toLowerCase()
      
      const hasSpecialSummonTrigger = 
        effectText.includes('when this card is special summoned') ||
        effectText.includes('if this card is special summoned') ||
        effectText.includes('when this card is summoned') ||
        effectText.includes('if this card is summoned')
      
      if (hasSpecialSummonTrigger) {
        toast.info(`${card.card_name} has a trigger effect! Click the card to activate.`, {
          duration: 5000,
        })
      }
    }
    
    onCardsChanged()
    return { success: true }
  }, [allCards, myPlayerId, supabase, gameState?.turnCount, onCardsChanged])

  // Return card to hand
  const returnToHandEffect = useCallback(async (cardId: string): Promise<{ success: boolean }> => {
    const card = allCards.find(c => c.id === cardId)
    if (!card) {
      toast.error('Card not found')
      return { success: false }
    }

    await supabase
      .from('duel_game_cards')
      .update({ location: 'hand', zone_index: null })
      .eq('id', cardId)

    toast.success(`Returned ${card.card_name} to hand!`)
    onCardsChanged()
    return { success: true }
  }, [allCards, supabase, onCardsChanged])

  // Send card to graveyard (without "destroying")
  const sendToGraveyardEffect = useCallback(async (cardIds: string[]): Promise<{ success: boolean }> => {
    if (cardIds.length === 0) return { success: true }

    const cards = allCards.filter(c => cardIds.includes(c.id))
    const names = cards.map(c => c.card_name)

    await supabase
      .from('duel_game_cards')
      .update({ 
        location: 'graveyard', 
        zone_index: null,
        position: 'face_up_attack' 
      })
      .in('id', cardIds)

    toast.success(`Sent to GY: ${names.join(', ')}`)
    onCardsChanged()
    return { success: true }
  }, [allCards, supabase, onCardsChanged])

  // Inflict damage to player
  const inflictDamageEffect = useCallback(async (
    targetPlayerId: string, 
    amount: number
  ): Promise<{ success: boolean }> => {
    const participants = room.duel_room_participants || []
    const target = participants.find(p => p.player_id === targetPlayerId)
    
    if (!target) {
      toast.error('Target player not found')
      return { success: false }
    }

    const newLP = Math.max(0, (target.life_points || 8000) - amount)
    await supabase
      .from('duel_room_participants')
      .update({ life_points: newLP })
      .eq('id', target.id)

    toast.success(`Inflicted ${amount} damage!`)

    if (newLP <= 0) {
      const winner = participants.find(p => p.player_id !== targetPlayerId)
      toast.success(`${winner?.player?.nickname || 'Player'} wins!`)
      await supabase
        .from('duel_rooms')
        .update({ status: 'completed', winner_id: winner?.player_id })
        .eq('id', room.id)
    }

    onCardsChanged()
    return { success: true }
  }, [room, supabase, onCardsChanged])

  // Gain life points
  const gainLifePointsEffect = useCallback(async (amount: number): Promise<{ success: boolean }> => {
    const participants = room.duel_room_participants || []
    const me = participants.find(p => p.player_id === myPlayerId)
    
    if (!me) {
      toast.error('Player not found')
      return { success: false }
    }

    const newLP = (me.life_points || 8000) + amount
    await supabase
      .from('duel_room_participants')
      .update({ life_points: newLP })
      .eq('id', me.id)

    toast.success(`Gained ${amount} LP! (Now: ${newLP})`)
    onCardsChanged()
    return { success: true }
  }, [room, myPlayerId, supabase, onCardsChanged])

  // Get deck cards for searching
  const getSearchableDeck = useCallback(() => {
    return allCards.filter(c => c.player_id === myPlayerId && c.location === 'deck')
  }, [allCards, myPlayerId])

  // Get graveyard cards
  const getGraveyard = useCallback((playerId?: string) => {
    const targetPlayer = playerId || myPlayerId
    return allCards.filter(c => c.player_id === targetPlayer && c.location === 'graveyard')
  }, [allCards, myPlayerId])

  // Get opponent's player ID
  const getOpponentId = useCallback(() => {
    const participants = room.duel_room_participants || []
    const opponent = participants.find(p => p.player_id !== myPlayerId)
    return opponent?.player_id
  }, [room.duel_room_participants, myPlayerId])

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

  // Get opponent field monsters
  const opponentFieldMonsters = useMemo(() => {
    const participants = room.duel_room_participants || []
    const opponent = participants.find(p => p.player_id !== myPlayerId)
    if (!opponent) return []
    return allCards.filter(
      c => c.player_id === opponent.player_id && c.location === 'monster_zone'
    )
  }, [allCards, room.duel_room_participants, myPlayerId])

  // Validate attack
  const validateAttack = useCallback((attacker: DuelGameCard, target?: DuelGameCard): ValidationResult => {
    if (!gameState) {
      return { valid: false, reason: 'Game not initialized' }
    }

    if (!isMyTurn) {
      return { valid: false, reason: "It's not your turn" }
    }

    if (gameState.phase !== 'battle') {
      return { valid: false, reason: 'You can only attack during Battle Phase' }
    }

    // Check if attacker can attack
    if (attacker.position?.includes('defense')) {
      return { valid: false, reason: 'Defense position monsters cannot attack' }
    }

    if (attacker.has_attacked) {
      return { valid: false, reason: 'This monster already attacked this turn' }
    }

    // Monsters cannot attack the turn they are summoned (except with effects)
    if (attacker.turn_summoned === gameState.turnCount && gameState.turnCount > 1) {
      return { valid: false, reason: 'This monster cannot attack the turn it was summoned' }
    }

    // If opponent has monsters, must attack a monster (unless direct attack allowed)
    if (!target && opponentFieldMonsters.length > 0) {
      return { valid: false, reason: 'You must attack a monster when your opponent controls one' }
    }

    return { valid: true }
  }, [gameState, isMyTurn, opponentFieldMonsters])

  // Execute attack
  const executeAttack = useCallback(async (
    attacker: DuelGameCard,
    target?: DuelGameCard
  ): Promise<AttackResult> => {
    const validation = validateAttack(attacker, target)
    if (!validation.valid) {
      toast.error(validation.reason)
      return { success: false, error: validation.reason }
    }

    const attackerATK = attacker.attack || 0
    
    // Mark attacker as having attacked
    await supabase
      .from('duel_game_cards')
      .update({ has_attacked: true })
      .eq('id', attacker.id)

    // Direct attack
    if (!target) {
      const participants = room.duel_room_participants || []
      const opponent = participants.find(p => p.player_id !== myPlayerId)
      
      if (opponent) {
        const newLP = Math.max(0, (opponent.life_points || 8000) - attackerATK)
        await supabase
          .from('duel_room_participants')
          .update({ life_points: newLP })
          .eq('id', opponent.id)

        toast.success(`Direct attack! ${attacker.card_name} deals ${attackerATK} damage!`)
        
        if (newLP <= 0) {
          toast.success('You win! Opponent\'s LP reached 0!')
          await supabase
            .from('duel_rooms')
            .update({ 
              status: 'completed',
              winner_id: myPlayerId
            })
            .eq('id', room.id)
        }
        
        onCardsChanged()
        return { 
          success: true, 
          battleResult: {
            attackerDestroyed: false,
            defenderDestroyed: false,
            damageDealt: attackerATK,
            damageToWho: 'defender'
          }
        }
      }
      return { success: false, error: 'No opponent found' }
    }

    // Battle calculation
    const defenderIsAttack = target.position === 'face_up_attack'
    const defenderValue = defenderIsAttack ? (target.attack || 0) : (target.defense || 0)
    
    // Flip face-down monsters
    if (target.position === 'face_down_defense') {
      await supabase
        .from('duel_game_cards')
        .update({ position: 'face_up_defense' })
        .eq('id', target.id)
      toast.info(`${target.card_name} was flipped face-up!`)
    }

    const participants = room.duel_room_participants || []
    const opponent = participants.find(p => p.player_id !== myPlayerId)
    const me = participants.find(p => p.player_id === myPlayerId)

    let result: AttackResult['battleResult'] = {
      attackerDestroyed: false,
      defenderDestroyed: false,
      damageDealt: 0,
      damageToWho: 'none'
    }

    if (defenderIsAttack) {
      // ATK vs ATK
      if (attackerATK > defenderValue) {
        // Attacker wins
        result.damageDealt = attackerATK - defenderValue
        result.damageToWho = 'defender'
        result.defenderDestroyed = true

        // Send defender to GY
        await supabase
          .from('duel_game_cards')
          .update({ location: 'graveyard', zone_index: null })
          .eq('id', target.id)

        // Deal damage to opponent
        if (opponent) {
          const newLP = Math.max(0, (opponent.life_points || 8000) - result.damageDealt)
          await supabase
            .from('duel_room_participants')
            .update({ life_points: newLP })
            .eq('id', opponent.id)
          
          if (newLP <= 0) {
            toast.success('You win! Opponent\'s LP reached 0!')
            await supabase
              .from('duel_rooms')
              .update({ status: 'completed', winner_id: myPlayerId })
              .eq('id', room.id)
          }
        }

        toast.success(`${attacker.card_name} destroyed ${target.card_name}! ${result.damageDealt} damage!`)

      } else if (attackerATK < defenderValue) {
        // Defender wins
        result.damageDealt = defenderValue - attackerATK
        result.damageToWho = 'attacker'
        result.attackerDestroyed = true

        // Send attacker to GY
        await supabase
          .from('duel_game_cards')
          .update({ location: 'graveyard', zone_index: null })
          .eq('id', attacker.id)

        // Deal damage to self
        if (me) {
          const newLP = Math.max(0, (me.life_points || 8000) - result.damageDealt)
          await supabase
            .from('duel_room_participants')
            .update({ life_points: newLP })
            .eq('id', me.id)
          
          if (newLP <= 0) {
            toast.error('You lose! Your LP reached 0!')
            await supabase
              .from('duel_rooms')
              .update({ status: 'completed', winner_id: opponent?.player_id })
              .eq('id', room.id)
          }
        }

        toast.error(`${attacker.card_name} was destroyed by ${target.card_name}! You take ${result.damageDealt} damage!`)

      } else {
        // Tie - both destroyed
        result.attackerDestroyed = true
        result.defenderDestroyed = true
        result.damageToWho = 'both'

        await supabase
          .from('duel_game_cards')
          .update({ location: 'graveyard', zone_index: null })
          .in('id', [attacker.id, target.id])

        toast.info(`Both ${attacker.card_name} and ${target.card_name} were destroyed!`)
      }
    } else {
      // ATK vs DEF
      if (attackerATK > defenderValue) {
        // Attacker wins, no damage
        result.defenderDestroyed = true

        await supabase
          .from('duel_game_cards')
          .update({ location: 'graveyard', zone_index: null })
          .eq('id', target.id)

        toast.success(`${attacker.card_name} destroyed ${target.card_name}!`)

      } else if (attackerATK < defenderValue) {
        // Defender wins, attacker takes damage
        result.damageDealt = defenderValue - attackerATK
        result.damageToWho = 'attacker'

        if (me) {
          const newLP = Math.max(0, (me.life_points || 8000) - result.damageDealt)
          await supabase
            .from('duel_room_participants')
            .update({ life_points: newLP })
            .eq('id', me.id)
          
          if (newLP <= 0) {
            toast.error('You lose! Your LP reached 0!')
            await supabase
              .from('duel_rooms')
              .update({ status: 'completed', winner_id: opponent?.player_id })
              .eq('id', room.id)
          }
        }

        toast.error(`${attacker.card_name} crashed into ${target.card_name}'s defense! You take ${result.damageDealt} damage!`)

      } else {
        // Tie - nothing happens
        toast.info(`${attacker.card_name}'s attack was blocked by ${target.card_name}!`)
      }
    }

    onCardsChanged()
    return { success: true, battleResult: result }
  }, [validateAttack, supabase, room, myPlayerId, onCardsChanged])

  // Flip summon
  const flipSummon = useCallback(async (card: DuelGameCard): Promise<{ success: boolean; error?: string }> => {
    if (!gameState) {
      return { success: false, error: 'Game not initialized' }
    }

    if (!isMyTurn) {
      return { success: false, error: "It's not your turn" }
    }

    if (gameState.phase !== 'main1' && gameState.phase !== 'main2') {
      return { success: false, error: 'Can only Flip Summon during Main Phase' }
    }

    if (card.position !== 'face_down_defense') {
      return { success: false, error: 'Can only Flip Summon face-down Defense position monsters' }
    }

    if (card.turn_set === gameState.turnCount) {
      return { success: false, error: 'Cannot Flip Summon a monster the turn it was Set' }
    }

    if (card.has_changed_position) {
      return { success: false, error: 'This monster already changed position this turn' }
    }

    const { error } = await supabase
      .from('duel_game_cards')
      .update({ 
        position: 'face_up_attack',
        has_changed_position: true
      })
      .eq('id', card.id)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    toast.success(`Flip Summoned ${card.card_name}!`)
    onCardsChanged()
    return { success: true }
  }, [gameState, isMyTurn, supabase, onCardsChanged])

  // Change monster position
  const changeMonsterPosition = useCallback(async (
    card: DuelGameCard, 
    newPosition: CardPosition
  ): Promise<{ success: boolean; error?: string }> => {
    if (!gameState) {
      return { success: false, error: 'Game not initialized' }
    }

    if (!isMyTurn) {
      return { success: false, error: "It's not your turn" }
    }

    if (gameState.phase !== 'main1' && gameState.phase !== 'main2') {
      return { success: false, error: 'Can only change position during Main Phase' }
    }

    if (card.turn_summoned === gameState.turnCount) {
      return { success: false, error: 'Cannot change position of a monster summoned this turn' }
    }

    if (card.has_changed_position) {
      return { success: false, error: 'This monster already changed position this turn' }
    }

    if (card.has_attacked) {
      return { success: false, error: 'Cannot change position of a monster that attacked this turn' }
    }

    const { error } = await supabase
      .from('duel_game_cards')
      .update({ 
        position: newPosition,
        has_changed_position: true
      })
      .eq('id', card.id)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    toast.success(`Changed ${card.card_name} to ${newPosition.replace(/_/g, ' ')}`)
    onCardsChanged()
    return { success: true }
  }, [gameState, isMyTurn, supabase, onCardsChanged])

  // Enter battle phase
  const enterBattlePhase = useCallback(async () => {
    if (!isMyTurn) {
      toast.error("It's not your turn")
      return
    }

    if (gameState?.phase !== 'main1') {
      toast.error('Can only enter Battle Phase from Main Phase 1')
      return
    }

    // First turn player cannot enter battle phase
    if (gameState.turnCount === 1) {
      toast.error('Cannot enter Battle Phase on the first turn')
      return
    }

    await supabase
      .from('duel_game_state')
      .update({ phase: 'battle' })
      .eq('room_id', room.id)

    setGameState(prev => prev ? { ...prev, phase: 'battle' } : null)
    toast.info('Entered Battle Phase')
  }, [isMyTurn, gameState, supabase, room.id])

  // Enter main phase 2
  const enterMain2 = useCallback(async () => {
    if (!isMyTurn) {
      toast.error("It's not your turn")
      return
    }

    if (gameState?.phase !== 'battle') {
      toast.error('Can only enter Main Phase 2 from Battle Phase')
      return
    }

    await supabase
      .from('duel_game_state')
      .update({ phase: 'main2' })
      .eq('room_id', room.id)

    setGameState(prev => prev ? { ...prev, phase: 'main2' } : null)
    toast.info('Entered Main Phase 2')
  }, [isMyTurn, gameState, supabase, room.id])

  return {
    gameState,
    isLoading,
    isMyTurn,
    hasNormalSummoned,
    
    // Field info
    myFieldMonsters,
    opponentFieldMonsters,
    
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
    
    // Battle actions
    validateAttack,
    executeAttack,
    enterBattlePhase,
    enterMain2,
    
    // Position actions
    flipSummon,
    changeMonsterPosition,
    
    // Effect execution functions
    drawCardsEffect,
    destroyCardsEffect,
    banishCardsEffect,
    searchDeckEffect,
    specialSummonEffect,
    returnToHandEffect,
    sendToGraveyardEffect,
    inflictDamageEffect,
    gainLifePointsEffect,
    
    // Utility getters
    getSearchableDeck,
    getGraveyard,
    getOpponentId,
  }
}
