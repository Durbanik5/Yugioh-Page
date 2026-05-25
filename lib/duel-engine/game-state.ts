// Yu-Gi-Oh! Duel Engine - Game State Manager
// Manages the authoritative game state and state transitions

import { createClient } from '@/lib/supabase/client'
import type { 
  GameState, 
  GameCard, 
  PlayerState, 
  Phase,
  ActionResult,
  ChainLink
} from './types'
import { 
  STARTING_LIFE_POINTS,
  STARTING_HAND_SIZE,
  PHASE_ORDER
} from './constants'

export class GameStateManager {
  private state: GameState
  private supabase = createClient()
  private listeners: ((state: GameState) => void)[] = []

  constructor(roomId: string, player1Id: string, player2Id: string) {
    this.state = this.createInitialState(roomId, player1Id, player2Id)
  }

  private createInitialState(roomId: string, player1Id: string, player2Id: string): GameState {
    return {
      roomId,
      turnPlayer: player1Id, // Player 1 goes first
      turnCount: 1,
      phase: 'draw',
      players: {
        [player1Id]: {
          id: player1Id,
          lifePoints: STARTING_LIFE_POINTS,
          hasNormalSummoned: false,
          hasDrawnForTurn: false,
          cannotDrawNextTurn: false,
          skipPhases: []
        },
        [player2Id]: {
          id: player2Id,
          lifePoints: STARTING_LIFE_POINTS,
          hasNormalSummoned: false,
          hasDrawnForTurn: false,
          cannotDrawNextTurn: false,
          skipPhases: []
        }
      },
      cards: [],
      chain: [],
      isChainBuilding: false,
      priorityPlayer: null,
      canNormalSummon: true,
      battlePhaseEnabled: false // First turn player cannot battle
    }
  }

  // Get current state (immutable copy)
  getState(): Readonly<GameState> {
    return { ...this.state }
  }

  // Get current player state
  getCurrentPlayer(): PlayerState {
    return this.state.players[this.state.turnPlayer]
  }

  // Get opponent player state
  getOpponentPlayer(): PlayerState {
    const opponentId = Object.keys(this.state.players).find(
      id => id !== this.state.turnPlayer
    )!
    return this.state.players[opponentId]
  }

  // Subscribe to state changes
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    const stateCopy = this.getState()
    this.listeners.forEach(listener => listener(stateCopy))
  }

  // Update state and persist
  private async updateState(changes: Partial<GameState>): Promise<void> {
    this.state = { ...this.state, ...changes }
    await this.persistState()
    this.notifyListeners()
  }

  // Update player state
  async updatePlayer(playerId: string, changes: Partial<PlayerState>): Promise<void> {
    this.state.players[playerId] = {
      ...this.state.players[playerId],
      ...changes
    }
    await this.persistState()
    this.notifyListeners()
  }

  // Update a card's state
  async updateCard(cardId: string, changes: Partial<GameCard>): Promise<void> {
    this.state.cards = this.state.cards.map(card =>
      card.id === cardId ? { ...card, ...changes } : card
    )
    await this.persistState()
    this.notifyListeners()
  }

  // Move card to a new location
  async moveCard(
    cardId: string, 
    newLocation: GameCard['location'], 
    zoneIndex: number | null = null,
    position?: GameCard['position']
  ): Promise<ActionResult> {
    const card = this.state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const updates: Partial<GameCard> = {
      location: newLocation,
      zoneIndex
    }

    if (position) {
      updates.position = position
    }

    // Reset state when changing locations
    if (newLocation !== card.location) {
      updates.hasAttacked = false
      updates.hasChangedPosition = false
      updates.attacksDeclared = 0
    }

    await this.updateCard(cardId, updates)
    return { success: true }
  }

  // Advance to next phase
  async advancePhase(): Promise<ActionResult> {
    const currentIndex = PHASE_ORDER.indexOf(this.state.phase)
    let nextIndex = currentIndex + 1

    // Skip battle phases if not enabled (turn 1 for first player)
    if (!this.state.battlePhaseEnabled) {
      while (
        nextIndex < PHASE_ORDER.length && 
        PHASE_ORDER[nextIndex].startsWith('battle')
      ) {
        nextIndex++
      }
    }

    // If we've gone past end phase, start new turn
    if (nextIndex >= PHASE_ORDER.length) {
      return this.startNewTurn()
    }

    const newPhase = PHASE_ORDER[nextIndex] as Phase
    
    // Check if current player needs to skip this phase
    const player = this.getCurrentPlayer()
    if (player.skipPhases.includes(newPhase)) {
      await this.updatePlayer(player.id, {
        skipPhases: player.skipPhases.filter(p => p !== newPhase)
      })
      // Recursively advance to next phase
      await this.updateState({ phase: newPhase })
      return this.advancePhase()
    }

    await this.updateState({ phase: newPhase })
    
    // Handle phase-specific logic
    await this.handlePhaseStart(newPhase)

    return { 
      success: true, 
      log: `Phase changed to ${newPhase}`
    }
  }

  // Handle logic when a phase starts
  private async handlePhaseStart(phase: Phase): Promise<void> {
    switch (phase) {
      case 'draw':
        // Auto-draw for turn player (except turn 1 player 1)
        if (this.state.turnCount > 1 || this.state.turnPlayer !== Object.keys(this.state.players)[0]) {
          const player = this.getCurrentPlayer()
          if (!player.cannotDrawNextTurn) {
            await this.drawCards(this.state.turnPlayer, 1)
          }
          await this.updatePlayer(this.state.turnPlayer, {
            hasDrawnForTurn: true,
            cannotDrawNextTurn: false
          })
        }
        break
      
      case 'end':
        // Check for hand size limit
        await this.handleEndPhase()
        break
    }
  }

  // Start a new turn
  private async startNewTurn(): Promise<ActionResult> {
    const currentPlayerId = this.state.turnPlayer
    const opponentId = Object.keys(this.state.players).find(
      id => id !== currentPlayerId
    )!

    // Reset current player's per-turn states
    await this.updatePlayer(currentPlayerId, {
      hasNormalSummoned: false,
      hasDrawnForTurn: false
    })

    // Reset all cards' per-turn states for the player who just ended
    const cardUpdates = this.state.cards
      .filter(c => c.controllerId === currentPlayerId)
      .map(c => this.updateCard(c.id, {
        hasAttacked: false,
        hasChangedPosition: false,
        attacksDeclared: 0
      }))
    await Promise.all(cardUpdates)

    // Switch turn player
    const newTurnCount = this.state.turnCount + 1
    await this.updateState({
      turnPlayer: opponentId,
      turnCount: newTurnCount,
      phase: 'draw',
      canNormalSummon: true,
      battlePhaseEnabled: newTurnCount > 1 // Battle enabled from turn 2
    })

    // Handle draw phase for new turn player
    await this.handlePhaseStart('draw')

    return {
      success: true,
      log: `Turn ${newTurnCount} - ${opponentId}'s turn`
    }
  }

  // Draw cards for a player
  async drawCards(playerId: string, count: number): Promise<ActionResult> {
    const deck = this.state.cards.filter(
      c => c.ownerId === playerId && c.location === 'deck'
    ).sort((a, b) => (a.zoneIndex || 0) - (b.zoneIndex || 0))

    if (deck.length < count) {
      // Deck out - player loses!
      return { 
        success: false, 
        error: 'Cannot draw - not enough cards in deck',
        log: `${playerId} cannot draw - deck out!`
      }
    }

    const handSize = this.state.cards.filter(
      c => c.ownerId === playerId && c.location === 'hand'
    ).length

    for (let i = 0; i < count; i++) {
      const card = deck[i]
      await this.moveCard(card.id, 'hand', handSize + i, 'face_down')
    }

    return { 
      success: true, 
      log: `${playerId} drew ${count} card(s)`
    }
  }

  // Handle end phase (hand size check)
  private async handleEndPhase(): Promise<void> {
    const player = this.getCurrentPlayer()
    const hand = this.state.cards.filter(
      c => c.ownerId === player.id && c.location === 'hand'
    )

    if (hand.length > 6) {
      // Player must discard - this should trigger a UI prompt
      this.state.pendingAction = {
        type: 'effect',
        playerId: player.id,
        cardId: '',
        data: { action: 'discard', count: hand.length - 6 }
      }
    }
  }

  // Add a link to the chain
  async addToChain(link: ChainLink): Promise<ActionResult> {
    // Validate spell speed
    if (this.state.chain.length > 0) {
      const lastLink = this.state.chain[this.state.chain.length - 1]
      if (link.spellSpeed < lastLink.spellSpeed) {
        return {
          success: false,
          error: `Cannot chain Spell Speed ${link.spellSpeed} to Spell Speed ${lastLink.spellSpeed}`
        }
      }
    }

    this.state.chain.push(link)
    this.state.isChainBuilding = true
    await this.persistState()
    this.notifyListeners()

    return {
      success: true,
      log: `Chain Link ${this.state.chain.length}: ${link.cardId}`
    }
  }

  // Resolve the chain (LIFO - last in, first out)
  async resolveChain(): Promise<ActionResult> {
    if (this.state.chain.length === 0) {
      return { success: true }
    }

    const logs: string[] = []

    // Resolve from last to first
    while (this.state.chain.length > 0) {
      const link = this.state.chain.pop()!
      logs.push(`Resolving Chain Link ${this.state.chain.length + 1}: ${link.cardId}`)
      
      try {
        await link.resolve()
      } catch (error) {
        logs.push(`Effect failed to resolve: ${error}`)
      }
    }

    this.state.isChainBuilding = false
    await this.persistState()
    this.notifyListeners()

    return {
      success: true,
      log: logs.join('\n')
    }
  }

  // Persist state to database
  private async persistState(): Promise<void> {
    const { error } = await this.supabase
      .from('duel_game_state')
      .upsert({
        room_id: this.state.roomId,
        turn_player: this.state.turnPlayer,
        turn_count: this.state.turnCount,
        phase: this.state.phase,
        chain: this.state.chain,
        is_chain_building: this.state.isChainBuilding,
        priority_player: this.state.priorityPlayer,
        can_normal_summon: this.state.canNormalSummon,
        battle_phase_enabled: this.state.battlePhaseEnabled,
        pending_action: this.state.pendingAction,
        response_window: this.state.responseWindow,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'room_id'
      })

    if (error) {
      console.error('[v0] Failed to persist game state:', error)
    }
  }

  // Load state from database
  async loadState(): Promise<void> {
    const { data, error } = await this.supabase
      .from('duel_game_state')
      .select('*')
      .eq('room_id', this.state.roomId)
      .single()

    if (error || !data) {
      console.log('[v0] No existing state found, using initial state')
      return
    }

    this.state = {
      ...this.state,
      turnPlayer: data.turn_player,
      turnCount: data.turn_count,
      phase: data.phase,
      chain: data.chain || [],
      isChainBuilding: data.is_chain_building || false,
      priorityPlayer: data.priority_player,
      canNormalSummon: data.can_normal_summon ?? true,
      battlePhaseEnabled: data.battle_phase_enabled ?? false,
      pendingAction: data.pending_action,
      responseWindow: data.response_window
    }
  }

  // Load cards from database
  async loadCards(): Promise<void> {
    const { data, error } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .eq('room_id', this.state.roomId)

    if (error || !data) {
      console.error('[v0] Failed to load cards:', error)
      return
    }

    this.state.cards = data.map(card => ({
      id: card.id,
      cardId: card.card_id,
      name: card.card_name,
      category: card.card_type,
      level: card.level,
      attack: card.attack,
      defense: card.defense,
      attribute: card.attribute,
      effectText: card.effect_text || '',
      location: card.location,
      zoneIndex: card.zone_index,
      position: card.position,
      ownerId: card.player_id,
      controllerId: card.player_id, // Same as owner initially
      counters: {},
      equipCards: [],
      isRevealed: card.is_revealed,
      hasAttacked: card.has_attacked,
      hasChangedPosition: false,
      attacksDeclared: 0,
      race: null
    }))

    this.notifyListeners()
  }

  // Load player states from database
  async loadPlayers(): Promise<void> {
    const { data, error } = await this.supabase
      .from('duel_participants')
      .select('player_id, life_points')
      .eq('room_id', this.state.roomId)

    if (error || !data) {
      console.error('[v0] Failed to load players:', error)
      return
    }

    data.forEach(participant => {
      if (this.state.players[participant.player_id]) {
        this.state.players[participant.player_id].lifePoints = participant.life_points
      }
    })

    this.notifyListeners()
  }
}

// Singleton instance factory
const instances: Map<string, GameStateManager> = new Map()

export function getGameStateManager(
  roomId: string,
  player1Id?: string,
  player2Id?: string
): GameStateManager {
  if (!instances.has(roomId)) {
    if (!player1Id || !player2Id) {
      throw new Error('Player IDs required for new game')
    }
    instances.set(roomId, new GameStateManager(roomId, player1Id, player2Id))
  }
  return instances.get(roomId)!
}

export function clearGameStateManager(roomId: string): void {
  instances.delete(roomId)
}
