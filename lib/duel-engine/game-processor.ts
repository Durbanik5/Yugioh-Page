/**
 * Yu-Gi-Oh! Duel Engine - Game Processor
 * Based on ygopro-core architecture
 * 
 * This is the core game loop processor that handles all game actions,
 * event raising, chain building, and effect resolution.
 */

import { createClient } from '@/lib/supabase/client'
import type { DuelGameCard, CardPosition } from '@/lib/types'

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

export enum ProcessorType {
  // Game flow
  IDLE = 0,
  TURN_START = 1,
  PHASE_START = 2,
  PHASE_END = 3,
  TURN_END = 4,
  
  // Summon processors
  SUMMON = 10,
  FLIP_SUMMON = 11,
  SPECIAL_SUMMON = 12,
  TRIBUTE_SUMMON = 13,
  SET_MONSTER = 14,
  
  // Spell/Trap processors
  ACTIVATE = 20,
  SET_SPTRAP = 21,
  RESOLVE_CHAIN = 22,
  
  // Card movement
  DRAW = 30,
  DISCARD = 31,
  SEND_TO_GY = 32,
  BANISH = 33,
  RETURN_TO_HAND = 34,
  RETURN_TO_DECK = 35,
  MOVE_CARD = 36,
  
  // Battle processors
  ATTACK_DECLARE = 40,
  DAMAGE_STEP = 41,
  BATTLE_DAMAGE = 42,
  DESTROY_BATTLE = 43,
  
  // Effect processors
  EFFECT_RESOLVE = 50,
  TARGET_SELECT = 51,
  COST_PAY = 52,
  
  // LP processors
  DAMAGE = 60,
  RECOVER = 61,
  PAY_LP = 62,
  
  // Chain processors
  CHAIN_BUILD = 70,
  CHAIN_RESOLVE = 71,
  CHAIN_END = 72,
}

export enum GameEvent {
  // Summon events
  SUMMON = 'SUMMON',
  SUMMON_SUCCESS = 'SUMMON_SUCCESS',
  FLIP_SUMMON = 'FLIP_SUMMON',
  SPECIAL_SUMMON = 'SPECIAL_SUMMON',
  SPECIAL_SUMMON_SUCCESS = 'SPECIAL_SUMMON_SUCCESS',
  
  // Spell/Trap events
  ACTIVATE = 'ACTIVATE',
  CHAIN_ACTIVATED = 'CHAIN_ACTIVATED',
  CHAIN_RESOLVED = 'CHAIN_RESOLVED',
  CHAIN_END = 'CHAIN_END',
  
  // Movement events
  DRAW = 'DRAW',
  TO_HAND = 'TO_HAND',
  TO_GRAVE = 'TO_GRAVE',
  REMOVE = 'REMOVE', // Banish
  TO_DECK = 'TO_DECK',
  MOVE = 'MOVE',
  LEAVE_FIELD = 'LEAVE_FIELD',
  
  // Battle events
  ATTACK_ANNOUNCE = 'ATTACK_ANNOUNCE',
  ATTACK = 'ATTACK',
  ATTACK_DISABLED = 'ATTACK_DISABLED',
  BATTLED = 'BATTLED',
  DAMAGE_STEP_START = 'DAMAGE_STEP_START',
  DAMAGE_STEP_END = 'DAMAGE_STEP_END',
  BATTLE_DAMAGE = 'BATTLE_DAMAGE',
  BATTLE_DESTROYED = 'BATTLE_DESTROYED',
  
  // LP events
  DAMAGE = 'DAMAGE',
  RECOVER = 'RECOVER',
  PAY_LP = 'PAY_LP',
  
  // Phase events
  PHASE_START = 'PHASE_START',
  PHASE_END = 'PHASE_END',
  TURN_START = 'TURN_START',
  TURN_END = 'TURN_END',
  
  // Card state events
  DESTROY = 'DESTROY',
  DESTROYED = 'DESTROYED',
  RELEASE = 'RELEASE',
  FLIP = 'FLIP',
  CHANGE_POSITION = 'CHANGE_POSITION',
  EQUIP = 'EQUIP',
  CONTROL_CHANGED = 'CONTROL_CHANGED',
  
  // Counter events
  ADD_COUNTER = 'ADD_COUNTER',
  REMOVE_COUNTER = 'REMOVE_COUNTER',
  
  // Special events
  NEGATE = 'NEGATE',
  NEGATE_SUMMON = 'NEGATE_SUMMON',
  NEGATE_ACTIVATION = 'NEGATE_ACTIVATION',
  NEGATE_EFFECT = 'NEGATE_EFFECT',
}

export enum Reason {
  EFFECT = 0x1,
  COST = 0x2,
  BATTLE = 0x4,
  RULE = 0x8,
  DESTROY = 0x10,
  RELEASE = 0x20,
  DISCARD = 0x40,
  DRAW = 0x80,
  SUMMON = 0x100,
  FLIP = 0x200,
  SPECIAL_SUMMON = 0x400,
  RETURN = 0x800,
}

export enum Phase {
  DRAW = 'draw',
  STANDBY = 'standby',
  MAIN1 = 'main1',
  BATTLE_START = 'battle_start',
  BATTLE_STEP = 'battle_step',
  DAMAGE_STEP = 'damage_step',
  BATTLE_END = 'battle_end',
  MAIN2 = 'main2',
  END = 'end',
}

export enum Location {
  DECK = 'deck',
  HAND = 'hand',
  MONSTER_ZONE = 'monster_zone',
  SPELL_ZONE = 'spell_zone',
  GRAVEYARD = 'graveyard',
  BANISHED = 'banished',
  EXTRA_DECK = 'extra_deck',
  FIELD_ZONE = 'field_zone',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcessorUnit {
  type: ProcessorType
  step: number
  playerId: string
  cardId?: string
  targetIds?: string[]
  params?: Record<string, unknown>
  completed: boolean
}

export interface GameEventData {
  event: GameEvent
  triggerCard?: DuelGameCard
  targetCards?: DuelGameCard[]
  reason: number
  reasonPlayer: string
  reasonEffect?: string
  value?: number
}

export interface ChainLink {
  chainCount: number
  triggeringPlayer: string
  triggeringCard: DuelGameCard
  triggeringEffect: string
  targetCards?: DuelGameCard[]
  targetPlayer?: string
  resolved: boolean
  negated: boolean
}

export interface PlayerState {
  id: string
  lp: number
  hasNormalSummoned: boolean
  hasDrawnForTurn: boolean
  canBattle: boolean
}

export interface FieldState {
  roomId: string
  turnPlayer: string
  turnCount: number
  phase: Phase
  players: Record<string, PlayerState>
  chain: ChainLink[]
  isChainBuilding: boolean
  priorityPlayer: string
  processorQueue: ProcessorUnit[]
  eventQueue: GameEventData[]
  pendingResponses: string[] // Player IDs who need to respond
}

// ============================================================================
// GAME PROCESSOR CLASS
// ============================================================================

export class GameProcessor {
  private roomId: string
  private state: FieldState
  private supabase: ReturnType<typeof createClient>
  private onStateChange?: (state: FieldState) => void
  private onEventLog?: (message: string) => void

  constructor(
    roomId: string,
    initialState?: Partial<FieldState>,
    callbacks?: {
      onStateChange?: (state: FieldState) => void
      onEventLog?: (message: string) => void
    }
  ) {
    this.roomId = roomId
    this.supabase = createClient()
    this.onStateChange = callbacks?.onStateChange
    this.onEventLog = callbacks?.onEventLog
    
    this.state = {
      roomId,
      turnPlayer: initialState?.turnPlayer || '',
      turnCount: initialState?.turnCount || 1,
      phase: initialState?.phase || Phase.DRAW,
      players: initialState?.players || {},
      chain: [],
      isChainBuilding: false,
      priorityPlayer: initialState?.turnPlayer || '',
      processorQueue: [],
      eventQueue: [],
      pendingResponses: [],
    }
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  getState(): FieldState {
    return { ...this.state }
  }

  private updateState(updates: Partial<FieldState>) {
    this.state = { ...this.state, ...updates }
    this.onStateChange?.(this.state)
  }

  private log(message: string) {
    console.log(`[GameProcessor] ${message}`)
    this.onEventLog?.(message)
  }

  // ==========================================================================
  // PROCESSOR QUEUE MANAGEMENT
  // ==========================================================================

  private addProcessor(unit: Omit<ProcessorUnit, 'step' | 'completed'>) {
    this.state.processorQueue.push({
      ...unit,
      step: 0,
      completed: false,
    })
  }

  private async processQueue(): Promise<void> {
    while (this.state.processorQueue.length > 0) {
      const unit = this.state.processorQueue[0]
      
      if (unit.completed) {
        this.state.processorQueue.shift()
        continue
      }
      
      const shouldContinue = await this.executeProcessor(unit)
      
      if (!shouldContinue) {
        // Processor needs to wait for response or is paused
        break
      }
      
      if (unit.completed) {
        this.state.processorQueue.shift()
      }
    }
    
    // Process any pending events after processors complete
    await this.processEventQueue()
  }

  private async executeProcessor(unit: ProcessorUnit): Promise<boolean> {
    switch (unit.type) {
      case ProcessorType.DRAW:
        return this.processDraw(unit)
      case ProcessorType.SUMMON:
        return this.processSummon(unit)
      case ProcessorType.TRIBUTE_SUMMON:
        return this.processTributeSummon(unit)
      case ProcessorType.SPECIAL_SUMMON:
        return this.processSpecialSummon(unit)
      case ProcessorType.SET_MONSTER:
        return this.processSetMonster(unit)
      case ProcessorType.ACTIVATE:
        return this.processActivate(unit)
      case ProcessorType.SET_SPTRAP:
        return this.processSetSpellTrap(unit)
      case ProcessorType.SEND_TO_GY:
        return this.processSendToGY(unit)
      case ProcessorType.BANISH:
        return this.processBanish(unit)
      case ProcessorType.DAMAGE:
        return this.processDamage(unit)
      case ProcessorType.RECOVER:
        return this.processRecover(unit)
      case ProcessorType.CHAIN_RESOLVE:
        return this.processChainResolve(unit)
      case ProcessorType.ATTACK_DECLARE:
        return this.processAttackDeclare(unit)
      case ProcessorType.DAMAGE_STEP:
        return this.processDamageStep(unit)
      case ProcessorType.PHASE_START:
        return this.processPhaseStart(unit)
      case ProcessorType.PHASE_END:
        return this.processPhaseEnd(unit)
      case ProcessorType.TURN_START:
        return this.processTurnStart(unit)
      case ProcessorType.TURN_END:
        return this.processTurnEnd(unit)
      default:
        unit.completed = true
        return true
    }
  }

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  private raiseEvent(eventData: GameEventData) {
    this.state.eventQueue.push(eventData)
    this.log(`Event raised: ${eventData.event}`)
  }

  private async processEventQueue(): Promise<void> {
    while (this.state.eventQueue.length > 0) {
      const event = this.state.eventQueue.shift()!
      await this.handleEvent(event)
    }
  }

  private async handleEvent(event: GameEventData): Promise<void> {
    // Check for triggered effects that respond to this event
    // This is where card scripts would check their trigger conditions
    this.log(`Processing event: ${event.event}`)
    
    // Log to database for game history
    await this.supabase.from('duel_room_events').insert({
      room_id: this.roomId,
      event_type: event.event.toLowerCase(),
      description: this.getEventDescription(event),
      card_id: event.triggerCard?.card_id?.toString(),
      player_id: event.reasonPlayer,
    })
  }

  private getEventDescription(event: GameEventData): string {
    const cardName = event.triggerCard?.card_name || 'A card'
    
    switch (event.event) {
      case GameEvent.SUMMON_SUCCESS:
        return `${cardName} was Normal Summoned`
      case GameEvent.SPECIAL_SUMMON_SUCCESS:
        return `${cardName} was Special Summoned`
      case GameEvent.FLIP_SUMMON:
        return `${cardName} was Flip Summoned`
      case GameEvent.ACTIVATE:
        return `${cardName} was activated`
      case GameEvent.DRAW:
        return `Drew ${event.value || 1} card(s)`
      case GameEvent.TO_GRAVE:
        return `${cardName} was sent to the Graveyard`
      case GameEvent.REMOVE:
        return `${cardName} was banished`
      case GameEvent.DESTROY:
        return `${cardName} was destroyed`
      case GameEvent.DAMAGE:
        return `${event.value} damage was inflicted`
      case GameEvent.RECOVER:
        return `${event.value} LP was recovered`
      case GameEvent.ATTACK_ANNOUNCE:
        return `${cardName} declared an attack`
      default:
        return `${event.event}: ${cardName}`
    }
  }

  // ==========================================================================
  // DRAW PROCESSOR
  // ==========================================================================

  async draw(playerId: string, count: number = 1): Promise<{ success: boolean; drawnCards: DuelGameCard[] }> {
    this.addProcessor({
      type: ProcessorType.DRAW,
      playerId,
      params: { count },
    })
    
    await this.processQueue()
    
    // Return the drawn cards from the last processor result
    return { success: true, drawnCards: [] }
  }

  private async processDraw(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, params } = unit
    const count = (params?.count as number) || 1
    
    switch (unit.step) {
      case 0: {
        // Step 0: Check if player can draw
        const player = this.state.players[playerId]
        if (!player) {
          this.log(`Player ${playerId} not found`)
          unit.completed = true
          return true
        }
        
        // Get deck cards
        const { data: deckCards } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('room_id', this.roomId)
          .eq('player_id', playerId)
          .eq('location', 'deck')
          .order('order_index', { ascending: true })
          .limit(count)
        
        if (!deckCards || deckCards.length === 0) {
          this.log(`${playerId} has no cards to draw - deck out!`)
          // TODO: Handle deck out loss condition
          unit.completed = true
          return true
        }
        
        // Move cards to hand
        const cardIds = deckCards.map(c => c.id)
        await this.supabase
          .from('duel_game_cards')
          .update({ location: 'hand' })
          .in('id', cardIds)
        
        // Raise draw events for each card
        for (const card of deckCards) {
          this.raiseEvent({
            event: GameEvent.DRAW,
            triggerCard: card as DuelGameCard,
            reason: Reason.DRAW,
            reasonPlayer: playerId,
          })
          
          this.raiseEvent({
            event: GameEvent.TO_HAND,
            triggerCard: card as DuelGameCard,
            reason: Reason.DRAW,
            reasonPlayer: playerId,
          })
        }
        
        this.log(`${playerId} drew ${deckCards.length} card(s)`)
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Step 1: Complete
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  // ==========================================================================
  // SUMMON PROCESSORS
  // ==========================================================================

  async normalSummon(
    playerId: string,
    cardId: string,
    position: 'face_up_attack' | 'face_up_defense',
    zoneIndex: number
  ): Promise<{ success: boolean; error?: string }> {
    // Validate summon
    const player = this.state.players[playerId]
    if (!player) {
      return { success: false, error: 'Player not found' }
    }
    
    if (player.hasNormalSummoned) {
      return { success: false, error: 'Already performed a Normal Summon this turn' }
    }
    
    if (this.state.phase !== Phase.MAIN1 && this.state.phase !== Phase.MAIN2) {
      return { success: false, error: 'Can only Normal Summon during Main Phase' }
    }
    
    // Get the card
    const { data: card } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', cardId)
      .single()
    
    if (!card) {
      return { success: false, error: 'Card not found' }
    }
    
    // Check if card is in hand
    if (card.location !== 'hand') {
      return { success: false, error: 'Card is not in hand' }
    }
    
    // Check level for tribute requirements
    const level = card.level || 0
    if (level >= 5 && level <= 6) {
      // Requires 1 tribute
      return this.tributeSummon(playerId, cardId, position, zoneIndex, 1)
    } else if (level >= 7) {
      // Requires 2 tributes
      return this.tributeSummon(playerId, cardId, position, zoneIndex, 2)
    }
    
    // Level 4 or lower - can summon directly
    this.addProcessor({
      type: ProcessorType.SUMMON,
      playerId,
      cardId,
      params: { position, zoneIndex },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processSummon(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, params } = unit
    const position = params?.position as string
    const zoneIndex = params?.zoneIndex as number
    
    switch (unit.step) {
      case 0: {
        // Step 0: Announce summon (chain window for negation)
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!card) {
          unit.completed = true
          return true
        }
        
        this.raiseEvent({
          event: GameEvent.SUMMON,
          triggerCard: card as DuelGameCard,
          reason: Reason.SUMMON,
          reasonPlayer: playerId,
        })
        
        this.log(`${card.card_name} is being Normal Summoned`)
        
        // Open chain window for summon negation
        // TODO: Implement chain window for responses like Solemn Warning
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Step 1: Place on field
        await this.supabase
          .from('duel_game_cards')
          .update({
            location: 'monster_zone',
            zone_index: zoneIndex,
            position,
            turn_summoned: this.state.turnCount,
            has_changed_position: false,
          })
          .eq('id', cardId)
        
        // Mark player as having summoned
        if (this.state.players[playerId]) {
          this.state.players[playerId].hasNormalSummoned = true
        }
        
        // Update database
        await this.supabase
          .from('duel_room_participants')
          .update({ has_normal_summoned: true })
          .eq('room_id', this.roomId)
          .eq('player_id', playerId)
        
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        this.raiseEvent({
          event: GameEvent.SUMMON_SUCCESS,
          triggerCard: card as DuelGameCard,
          reason: Reason.SUMMON,
          reasonPlayer: playerId,
        })
        
        this.log(`${card?.card_name} was Normal Summoned in ${position}`)
        
        unit.step = 2
        return true
      }
      
      case 2: {
        // Step 2: Complete
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  async tributeSummon(
    playerId: string,
    cardId: string,
    position: 'face_up_attack' | 'face_up_defense',
    zoneIndex: number,
    tributeCount: number
  ): Promise<{ success: boolean; error?: string; requiresTributes?: number }> {
    // This will be called with selected tributes
    return { 
      success: false, 
      error: 'Please select tributes',
      requiresTributes: tributeCount 
    }
  }

  async executeTributeSummon(
    playerId: string,
    cardId: string,
    position: 'face_up_attack' | 'face_up_defense',
    zoneIndex: number,
    tributeIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    // Validate tributes
    const { data: tributes } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .in('id', tributeIds)
    
    if (!tributes || tributes.length === 0) {
      return { success: false, error: 'Invalid tributes' }
    }
    
    // Verify all tributes are on field and belong to player
    for (const tribute of tributes) {
      if (tribute.location !== 'monster_zone' || tribute.player_id !== playerId) {
        return { success: false, error: 'Invalid tribute selection' }
      }
    }
    
    this.addProcessor({
      type: ProcessorType.TRIBUTE_SUMMON,
      playerId,
      cardId,
      targetIds: tributeIds,
      params: { position, zoneIndex },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processTributeSummon(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, targetIds, params } = unit
    const position = params?.position as string
    const zoneIndex = params?.zoneIndex as number
    
    switch (unit.step) {
      case 0: {
        // Step 0: Send tributes to GY
        if (targetIds && targetIds.length > 0) {
          await this.supabase
            .from('duel_game_cards')
            .update({ location: 'graveyard', zone_index: null })
            .in('id', targetIds)
          
          // Raise release events
          for (const tributeId of targetIds) {
            const { data: tribute } = await this.supabase
              .from('duel_game_cards')
              .select('*')
              .eq('id', tributeId)
              .single()
            
            if (tribute) {
              this.raiseEvent({
                event: GameEvent.TO_GRAVE,
                triggerCard: tribute as DuelGameCard,
                reason: Reason.RELEASE | Reason.COST,
                reasonPlayer: playerId,
              })
            }
          }
          
          this.log(`Tributed ${targetIds.length} monster(s)`)
        }
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Step 1: Summon the monster (same as normal summon from here)
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!card) {
          unit.completed = true
          return true
        }
        
        this.raiseEvent({
          event: GameEvent.SUMMON,
          triggerCard: card as DuelGameCard,
          reason: Reason.SUMMON,
          reasonPlayer: playerId,
        })
        
        unit.step = 2
        return true
      }
      
      case 2: {
        // Step 2: Place on field
        await this.supabase
          .from('duel_game_cards')
          .update({
            location: 'monster_zone',
            zone_index: zoneIndex,
            position,
            turn_summoned: this.state.turnCount,
            has_changed_position: false,
          })
          .eq('id', cardId)
        
        // Mark player as having summoned
        if (this.state.players[playerId]) {
          this.state.players[playerId].hasNormalSummoned = true
        }
        
        await this.supabase
          .from('duel_room_participants')
          .update({ has_normal_summoned: true })
          .eq('room_id', this.roomId)
          .eq('player_id', playerId)
        
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        this.raiseEvent({
          event: GameEvent.SUMMON_SUCCESS,
          triggerCard: card as DuelGameCard,
          reason: Reason.SUMMON,
          reasonPlayer: playerId,
        })
        
        this.log(`${card?.card_name} was Tribute Summoned`)
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  // ==========================================================================
  // SPECIAL SUMMON PROCESSOR
  // ==========================================================================

  async specialSummon(
    playerId: string,
    cardId: string,
    position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense',
    zoneIndex: number,
    fromLocation: Location
  ): Promise<{ success: boolean; error?: string }> {
    this.addProcessor({
      type: ProcessorType.SPECIAL_SUMMON,
      playerId,
      cardId,
      params: { position, zoneIndex, fromLocation },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processSpecialSummon(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, params } = unit
    const position = params?.position as string
    const zoneIndex = params?.zoneIndex as number
    
    switch (unit.step) {
      case 0: {
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!card) {
          unit.completed = true
          return true
        }
        
        this.raiseEvent({
          event: GameEvent.SPECIAL_SUMMON,
          triggerCard: card as DuelGameCard,
          reason: Reason.SPECIAL_SUMMON | Reason.EFFECT,
          reasonPlayer: playerId,
        })
        
        unit.step = 1
        return true
      }
      
      case 1: {
        await this.supabase
          .from('duel_game_cards')
          .update({
            location: 'monster_zone',
            zone_index: zoneIndex,
            position,
            turn_summoned: this.state.turnCount,
            has_changed_position: false,
          })
          .eq('id', cardId)
        
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        this.raiseEvent({
          event: GameEvent.SPECIAL_SUMMON_SUCCESS,
          triggerCard: card as DuelGameCard,
          reason: Reason.SPECIAL_SUMMON | Reason.EFFECT,
          reasonPlayer: playerId,
        })
        
        this.log(`${card?.card_name} was Special Summoned`)
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  // ==========================================================================
  // SET MONSTER PROCESSOR
  // ==========================================================================

  async setMonster(
    playerId: string,
    cardId: string,
    zoneIndex: number
  ): Promise<{ success: boolean; error?: string }> {
    const player = this.state.players[playerId]
    if (player?.hasNormalSummoned) {
      return { success: false, error: 'Already performed a Normal Summon/Set this turn' }
    }
    
    this.addProcessor({
      type: ProcessorType.SET_MONSTER,
      playerId,
      cardId,
      params: { zoneIndex },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processSetMonster(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, params } = unit
    const zoneIndex = params?.zoneIndex as number
    
    await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'monster_zone',
        zone_index: zoneIndex,
        position: 'face_down_defense',
        turn_set: this.state.turnCount,
        turn_summoned: this.state.turnCount,
        has_changed_position: false,
      })
      .eq('id', cardId)
    
    if (this.state.players[playerId]) {
      this.state.players[playerId].hasNormalSummoned = true
    }
    
    await this.supabase
      .from('duel_room_participants')
      .update({ has_normal_summoned: true })
      .eq('room_id', this.roomId)
      .eq('player_id', playerId)
    
    this.log(`A monster was Set in face-down Defense Position`)
    
    unit.completed = true
    return true
  }

  // ==========================================================================
  // SPELL/TRAP PROCESSORS
  // ==========================================================================

  async activateSpellTrap(
    playerId: string,
    cardId: string,
    zoneIndex?: number
  ): Promise<{ success: boolean; error?: string }> {
    // Get the card
    const { data: card } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', cardId)
      .single()
    
    if (!card) {
      return { success: false, error: 'Card not found' }
    }
    
    // Check if trap and if it was set this turn
    if (card.card_type === 'trap' && card.turn_set === this.state.turnCount) {
      return { success: false, error: 'Cannot activate a Trap Card the turn it was Set' }
    }
    
    this.addProcessor({
      type: ProcessorType.ACTIVATE,
      playerId,
      cardId,
      params: { zoneIndex },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processActivate(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, params } = unit
    const zoneIndex = params?.zoneIndex as number
    
    switch (unit.step) {
      case 0: {
        const { data: card } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!card) {
          unit.completed = true
          return true
        }
        
        // If activating from hand, need to place on field first
        if (card.location === 'hand' && zoneIndex !== undefined) {
          await this.supabase
            .from('duel_game_cards')
            .update({
              location: 'spell_zone',
              zone_index: zoneIndex,
              position: 'face_up_attack',
            })
            .eq('id', cardId)
        } else if (card.location === 'spell_zone' && card.position === 'face_down_attack') {
          // Flip face-up if set
          await this.supabase
            .from('duel_game_cards')
            .update({ position: 'face_up_attack' })
            .eq('id', cardId)
        }
        
        // Add to chain
        const chainLink: ChainLink = {
          chainCount: this.state.chain.length + 1,
          triggeringPlayer: playerId,
          triggeringCard: card as DuelGameCard,
          triggeringEffect: card.effect_text || '',
          resolved: false,
          negated: false,
        }
        
        this.state.chain.push(chainLink)
        this.state.isChainBuilding = true
        
        this.raiseEvent({
          event: GameEvent.ACTIVATE,
          triggerCard: card as DuelGameCard,
          reason: Reason.EFFECT,
          reasonPlayer: playerId,
        })
        
        this.raiseEvent({
          event: GameEvent.CHAIN_ACTIVATED,
          triggerCard: card as DuelGameCard,
          reason: Reason.EFFECT,
          reasonPlayer: playerId,
          value: chainLink.chainCount,
        })
        
        this.log(`Chain Link ${chainLink.chainCount}: ${card.card_name} activated`)
        
        // Open chain window for responses
        // TODO: Ask opponent if they want to chain
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Step 1: Check for chains, then resolve
        // For now, auto-resolve if no chains
        if (!this.state.isChainBuilding || this.state.chain.length === 0) {
          unit.completed = true
          return true
        }
        
        // Add chain resolution processor
        this.addProcessor({
          type: ProcessorType.CHAIN_RESOLVE,
          playerId,
        })
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  async setSpellTrap(
    playerId: string,
    cardId: string,
    zoneIndex: number
  ): Promise<{ success: boolean; error?: string }> {
    this.addProcessor({
      type: ProcessorType.SET_SPTRAP,
      playerId,
      cardId,
      params: { zoneIndex },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processSetSpellTrap(unit: ProcessorUnit): Promise<boolean> {
    const { cardId, params } = unit
    const zoneIndex = params?.zoneIndex as number
    
    await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'spell_zone',
        zone_index: zoneIndex,
        position: 'face_down_attack',
        turn_set: this.state.turnCount,
      })
      .eq('id', cardId)
    
    this.log(`A Spell/Trap Card was Set`)
    
    unit.completed = true
    return true
  }

  // ==========================================================================
  // CHAIN RESOLUTION
  // ==========================================================================

  private async processChainResolve(unit: ProcessorUnit): Promise<boolean> {
    switch (unit.step) {
      case 0: {
        // Resolve chain in LIFO order (Last In, First Out)
        while (this.state.chain.length > 0) {
          const chainLink = this.state.chain[this.state.chain.length - 1]
          
          if (chainLink.negated) {
            this.log(`Chain Link ${chainLink.chainCount}: ${chainLink.triggeringCard.card_name} was negated`)
          } else {
            // Resolve the effect
            await this.resolveChainLink(chainLink)
          }
          
          this.state.chain.pop()
          
          this.raiseEvent({
            event: GameEvent.CHAIN_RESOLVED,
            triggerCard: chainLink.triggeringCard,
            reason: Reason.EFFECT,
            reasonPlayer: chainLink.triggeringPlayer,
            value: chainLink.chainCount,
          })
        }
        
        this.state.isChainBuilding = false
        
        this.raiseEvent({
          event: GameEvent.CHAIN_END,
          reason: 0,
          reasonPlayer: this.state.turnPlayer,
        })
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  private async resolveChainLink(chainLink: ChainLink): Promise<void> {
    const card = chainLink.triggeringCard
    const cardType = card.card_type
    
    this.log(`Resolving: ${card.card_name}`)
    
    // After resolution, handle card destination
    if (cardType === 'spell' || cardType === 'normal_spell') {
      // Normal Spells go to GY after resolving
      await this.supabase
        .from('duel_game_cards')
        .update({ location: 'graveyard', zone_index: null })
        .eq('id', card.id)
      
      this.raiseEvent({
        event: GameEvent.TO_GRAVE,
        triggerCard: card,
        reason: Reason.EFFECT,
        reasonPlayer: chainLink.triggeringPlayer,
      })
    } else if (cardType === 'quickplay_spell') {
      // Quick-Play Spells also go to GY
      await this.supabase
        .from('duel_game_cards')
        .update({ location: 'graveyard', zone_index: null })
        .eq('id', card.id)
      
      this.raiseEvent({
        event: GameEvent.TO_GRAVE,
        triggerCard: card,
        reason: Reason.EFFECT,
        reasonPlayer: chainLink.triggeringPlayer,
      })
    }
    // Continuous/Equip/Field Spells and Traps stay on field
    // Counter Traps go to GY after resolving
    else if (cardType === 'counter_trap') {
      await this.supabase
        .from('duel_game_cards')
        .update({ location: 'graveyard', zone_index: null })
        .eq('id', card.id)
    }
    // Normal Traps go to GY after resolving
    else if (cardType === 'trap' || cardType === 'normal_trap') {
      await this.supabase
        .from('duel_game_cards')
        .update({ location: 'graveyard', zone_index: null })
        .eq('id', card.id)
    }
  }

  // ==========================================================================
  // CARD MOVEMENT PROCESSORS
  // ==========================================================================

  async sendToGY(
    playerId: string,
    cardIds: string[],
    reason: number = Reason.EFFECT
  ): Promise<{ success: boolean }> {
    this.addProcessor({
      type: ProcessorType.SEND_TO_GY,
      playerId,
      targetIds: cardIds,
      params: { reason },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processSendToGY(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, targetIds, params } = unit
    const reason = (params?.reason as number) || Reason.EFFECT
    
    if (!targetIds || targetIds.length === 0) {
      unit.completed = true
      return true
    }
    
    // Get cards before moving
    const { data: cards } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .in('id', targetIds)
    
    // Move to GY
    await this.supabase
      .from('duel_game_cards')
      .update({ location: 'graveyard', zone_index: null })
      .in('id', targetIds)
    
    // Raise events
    for (const card of cards || []) {
      if (card.location === 'monster_zone' || card.location === 'spell_zone') {
        this.raiseEvent({
          event: GameEvent.LEAVE_FIELD,
          triggerCard: card as DuelGameCard,
          reason,
          reasonPlayer: playerId,
        })
      }
      
      if (reason & Reason.DESTROY) {
        this.raiseEvent({
          event: GameEvent.DESTROYED,
          triggerCard: card as DuelGameCard,
          reason,
          reasonPlayer: playerId,
        })
      }
      
      this.raiseEvent({
        event: GameEvent.TO_GRAVE,
        triggerCard: card as DuelGameCard,
        reason,
        reasonPlayer: playerId,
      })
      
      this.log(`${card.card_name} was sent to the Graveyard`)
    }
    
    unit.completed = true
    return true
  }

  async banish(
    playerId: string,
    cardIds: string[],
    facedown: boolean = false
  ): Promise<{ success: boolean }> {
    this.addProcessor({
      type: ProcessorType.BANISH,
      playerId,
      targetIds: cardIds,
      params: { facedown },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processBanish(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, targetIds, params } = unit
    const facedown = params?.facedown as boolean
    
    if (!targetIds || targetIds.length === 0) {
      unit.completed = true
      return true
    }
    
    const { data: cards } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .in('id', targetIds)
    
    await this.supabase
      .from('duel_game_cards')
      .update({ 
        location: 'banished', 
        zone_index: null,
        position: facedown ? 'face_down_attack' : 'face_up_attack'
      })
      .in('id', targetIds)
    
    for (const card of cards || []) {
      if (card.location === 'monster_zone' || card.location === 'spell_zone') {
        this.raiseEvent({
          event: GameEvent.LEAVE_FIELD,
          triggerCard: card as DuelGameCard,
          reason: Reason.EFFECT,
          reasonPlayer: playerId,
        })
      }
      
      this.raiseEvent({
        event: GameEvent.REMOVE,
        triggerCard: card as DuelGameCard,
        reason: Reason.EFFECT,
        reasonPlayer: playerId,
      })
      
      this.log(`${card.card_name} was banished`)
    }
    
    unit.completed = true
    return true
  }

  // ==========================================================================
  // LP PROCESSORS
  // ==========================================================================

  async inflictDamage(
    playerId: string,
    targetPlayerId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    this.addProcessor({
      type: ProcessorType.DAMAGE,
      playerId,
      params: { targetPlayerId, amount },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processDamage(unit: ProcessorUnit): Promise<boolean> {
    const { params } = unit
    const targetPlayerId = params?.targetPlayerId as string
    const amount = params?.amount as number
    
    const player = this.state.players[targetPlayerId]
    if (!player) {
      unit.completed = true
      return true
    }
    
    player.lp = Math.max(0, player.lp - amount)
    
    // Update database
    await this.supabase
      .from('duel_room_participants')
      .update({ life_points: player.lp })
      .eq('room_id', this.roomId)
      .eq('player_id', targetPlayerId)
    
    this.raiseEvent({
      event: GameEvent.DAMAGE,
      reason: Reason.EFFECT,
      reasonPlayer: unit.playerId,
      value: amount,
    })
    
    this.log(`${targetPlayerId} took ${amount} damage (LP: ${player.lp})`)
    
    // Check for win condition
    if (player.lp <= 0) {
      this.log(`${targetPlayerId} has been defeated!`)
      // TODO: Handle game end
    }
    
    unit.completed = true
    return true
  }

  async recoverLP(
    playerId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    this.addProcessor({
      type: ProcessorType.RECOVER,
      playerId,
      params: { amount },
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processRecover(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, params } = unit
    const amount = params?.amount as number
    
    const player = this.state.players[playerId]
    if (!player) {
      unit.completed = true
      return true
    }
    
    player.lp += amount
    
    await this.supabase
      .from('duel_room_participants')
      .update({ life_points: player.lp })
      .eq('room_id', this.roomId)
      .eq('player_id', playerId)
    
    this.raiseEvent({
      event: GameEvent.RECOVER,
      reason: Reason.EFFECT,
      reasonPlayer: playerId,
      value: amount,
    })
    
    this.log(`${playerId} recovered ${amount} LP (LP: ${player.lp})`)
    
    unit.completed = true
    return true
  }

  // ==========================================================================
  // BATTLE PROCESSORS
  // ==========================================================================

  async declareAttack(
    playerId: string,
    attackerId: string,
    targetId?: string // undefined = direct attack
  ): Promise<{ success: boolean; error?: string }> {
    if (this.state.phase !== Phase.BATTLE_STEP) {
      return { success: false, error: 'Can only attack during Battle Step' }
    }
    
    this.addProcessor({
      type: ProcessorType.ATTACK_DECLARE,
      playerId,
      cardId: attackerId,
      targetIds: targetId ? [targetId] : undefined,
    })
    
    await this.processQueue()
    
    return { success: true }
  }

  private async processAttackDeclare(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, targetIds } = unit
    
    switch (unit.step) {
      case 0: {
        const { data: attacker } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!attacker) {
          unit.completed = true
          return true
        }
        
        // Check if already attacked
        if (attacker.has_attacked) {
          this.log(`${attacker.card_name} has already attacked this turn`)
          unit.completed = true
          return true
        }
        
        this.raiseEvent({
          event: GameEvent.ATTACK_ANNOUNCE,
          triggerCard: attacker as DuelGameCard,
          reason: Reason.BATTLE,
          reasonPlayer: playerId,
        })
        
        // Open attack response window (Mirror Force, etc.)
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Proceed to damage step
        this.addProcessor({
          type: ProcessorType.DAMAGE_STEP,
          playerId,
          cardId,
          targetIds,
        })
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  private async processDamageStep(unit: ProcessorUnit): Promise<boolean> {
    const { playerId, cardId, targetIds } = unit
    
    switch (unit.step) {
      case 0: {
        this.updateState({ phase: Phase.DAMAGE_STEP })
        
        this.raiseEvent({
          event: GameEvent.DAMAGE_STEP_START,
          reason: Reason.BATTLE,
          reasonPlayer: playerId,
        })
        
        unit.step = 1
        return true
      }
      
      case 1: {
        // Calculate damage
        const { data: attacker } = await this.supabase
          .from('duel_game_cards')
          .select('*')
          .eq('id', cardId)
          .single()
        
        if (!attacker) {
          unit.completed = true
          return true
        }
        
        const attackerATK = attacker.attack || 0
        
        if (targetIds && targetIds.length > 0) {
          // Attacking a monster
          const { data: defender } = await this.supabase
            .from('duel_game_cards')
            .select('*')
            .eq('id', targetIds[0])
            .single()
          
          if (defender) {
            // Flip face-down monsters
            if (defender.position === 'face_down_defense') {
              await this.supabase
                .from('duel_game_cards')
                .update({ position: 'face_up_defense' })
                .eq('id', defender.id)
              
              this.raiseEvent({
                event: GameEvent.FLIP,
                triggerCard: defender as DuelGameCard,
                reason: Reason.BATTLE,
                reasonPlayer: playerId,
              })
            }
            
            const defenderIsAttack = defender.position === 'face_up_attack'
            const defenderValue = defenderIsAttack 
              ? (defender.attack || 0) 
              : (defender.defense || 0)
            
            if (defenderIsAttack) {
              // ATK vs ATK
              if (attackerATK > defenderValue) {
                // Attacker wins
                const damage = attackerATK - defenderValue
                await this.sendToGY(playerId, [defender.id], Reason.BATTLE | Reason.DESTROY)
                
                // Inflict damage to defender's controller
                const opponentId = Object.keys(this.state.players).find(p => p !== playerId)
                if (opponentId) {
                  await this.inflictDamage(playerId, opponentId, damage)
                }
              } else if (attackerATK < defenderValue) {
                // Defender wins
                const damage = defenderValue - attackerATK
                await this.sendToGY(playerId, [cardId], Reason.BATTLE | Reason.DESTROY)
                await this.inflictDamage(playerId, playerId, damage)
              } else {
                // Tie - both destroyed
                await this.sendToGY(playerId, [cardId, defender.id], Reason.BATTLE | Reason.DESTROY)
              }
            } else {
              // ATK vs DEF
              if (attackerATK > defenderValue) {
                // Attacker wins, no damage
                await this.sendToGY(playerId, [defender.id], Reason.BATTLE | Reason.DESTROY)
              } else if (attackerATK < defenderValue) {
                // Defender wins, attacker takes damage
                const damage = defenderValue - attackerATK
                await this.inflictDamage(playerId, playerId, damage)
              }
              // Tie - nothing happens
            }
          }
        } else {
          // Direct attack
          const opponentId = Object.keys(this.state.players).find(p => p !== playerId)
          if (opponentId) {
            await this.inflictDamage(playerId, opponentId, attackerATK)
          }
        }
        
        // Mark attacker as having attacked
        await this.supabase
          .from('duel_game_cards')
          .update({ has_attacked: true })
          .eq('id', cardId)
        
        unit.step = 2
        return true
      }
      
      case 2: {
        this.raiseEvent({
          event: GameEvent.DAMAGE_STEP_END,
          reason: Reason.BATTLE,
          reasonPlayer: playerId,
        })
        
        this.updateState({ phase: Phase.BATTLE_STEP })
        
        unit.completed = true
        return true
      }
    }
    
    return true
  }

  // ==========================================================================
  // PHASE/TURN PROCESSORS
  // ==========================================================================

  async advancePhase(): Promise<{ success: boolean; newPhase: Phase }> {
    const currentPhase = this.state.phase
    let newPhase: Phase
    
    switch (currentPhase) {
      case Phase.DRAW:
        newPhase = Phase.STANDBY
        break
      case Phase.STANDBY:
        newPhase = Phase.MAIN1
        break
      case Phase.MAIN1:
        // Can go to Battle or End
        if (this.state.turnCount > 1 || 
            this.state.turnPlayer !== Object.keys(this.state.players)[0]) {
          newPhase = Phase.BATTLE_START
        } else {
          newPhase = Phase.END // First turn player can't battle
        }
        break
      case Phase.BATTLE_START:
        newPhase = Phase.BATTLE_STEP
        break
      case Phase.BATTLE_STEP:
        newPhase = Phase.BATTLE_END
        break
      case Phase.DAMAGE_STEP:
        newPhase = Phase.BATTLE_STEP
        break
      case Phase.BATTLE_END:
        newPhase = Phase.MAIN2
        break
      case Phase.MAIN2:
        newPhase = Phase.END
        break
      case Phase.END:
        // End turn
        await this.endTurn()
        return { success: true, newPhase: Phase.DRAW }
      default:
        newPhase = Phase.MAIN1
    }
    
    this.addProcessor({
      type: ProcessorType.PHASE_END,
      playerId: this.state.turnPlayer,
      params: { oldPhase: currentPhase },
    })
    
    this.updateState({ phase: newPhase })
    
    this.addProcessor({
      type: ProcessorType.PHASE_START,
      playerId: this.state.turnPlayer,
      params: { newPhase },
    })
    
    await this.processQueue()
    
    return { success: true, newPhase }
  }

  private async processPhaseStart(unit: ProcessorUnit): Promise<boolean> {
    const { params } = unit
    const newPhase = params?.newPhase as Phase
    
    this.raiseEvent({
      event: GameEvent.PHASE_START,
      reason: Reason.RULE,
      reasonPlayer: this.state.turnPlayer,
    })
    
    // Phase-specific actions
    if (newPhase === Phase.DRAW) {
      // Draw 1 card
      await this.draw(this.state.turnPlayer, 1)
    }
    
    this.log(`Entered ${newPhase} Phase`)
    
    unit.completed = true
    return true
  }

  private async processPhaseEnd(unit: ProcessorUnit): Promise<boolean> {
    this.raiseEvent({
      event: GameEvent.PHASE_END,
      reason: Reason.RULE,
      reasonPlayer: this.state.turnPlayer,
    })
    
    unit.completed = true
    return true
  }

  async endTurn(): Promise<void> {
    this.addProcessor({
      type: ProcessorType.TURN_END,
      playerId: this.state.turnPlayer,
    })
    
    await this.processQueue()
  }

  private async processTurnStart(unit: ProcessorUnit): Promise<boolean> {
    const { playerId } = unit
    
    // Reset turn-based flags
    if (this.state.players[playerId]) {
      this.state.players[playerId].hasNormalSummoned = false
      this.state.players[playerId].hasDrawnForTurn = false
    }
    
    // Reset monster attack flags and position change flags
    await this.supabase
      .from('duel_game_cards')
      .update({ 
        has_attacked: false,
        has_changed_position: false,
      })
      .eq('room_id', this.roomId)
      .eq('player_id', playerId)
    
    await this.supabase
      .from('duel_room_participants')
      .update({ has_normal_summoned: false })
      .eq('room_id', this.roomId)
      .eq('player_id', playerId)
    
    this.raiseEvent({
      event: GameEvent.TURN_START,
      reason: Reason.RULE,
      reasonPlayer: playerId,
    })
    
    this.log(`Turn ${this.state.turnCount}: ${playerId}'s turn`)
    
    unit.completed = true
    return true
  }

  private async processTurnEnd(unit: ProcessorUnit): Promise<boolean> {
    this.raiseEvent({
      event: GameEvent.TURN_END,
      reason: Reason.RULE,
      reasonPlayer: this.state.turnPlayer,
    })
    
    // Switch turn player
    const playerIds = Object.keys(this.state.players)
    const currentIndex = playerIds.indexOf(this.state.turnPlayer)
    const nextIndex = (currentIndex + 1) % playerIds.length
    const nextPlayer = playerIds[nextIndex]
    
    const newTurnCount = nextIndex === 0 
      ? this.state.turnCount + 1 
      : this.state.turnCount
    
    this.updateState({
      turnPlayer: nextPlayer,
      turnCount: newTurnCount,
      phase: Phase.DRAW,
      priorityPlayer: nextPlayer,
    })
    
    // Update database
    await this.supabase
      .from('duel_rooms')
      .update({
        current_turn_player_id: nextPlayer,
        turn_count: newTurnCount,
        turn_phase: 'draw',
      })
      .eq('id', this.roomId)
    
    await this.supabase
      .from('duel_game_state')
      .update({
        turn_player: nextPlayer,
        turn_count: newTurnCount,
        phase: 'draw',
        priority_player: nextPlayer,
      })
      .eq('room_id', this.roomId)
    
    // Start new turn
    this.addProcessor({
      type: ProcessorType.TURN_START,
      playerId: nextPlayer,
    })
    
    unit.completed = true
    return true
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  async changePosition(
    playerId: string,
    cardId: string,
    newPosition: CardPosition
  ): Promise<{ success: boolean; error?: string }> {
    const { data: card } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', cardId)
      .single()
    
    if (!card) {
      return { success: false, error: 'Card not found' }
    }
    
    if (card.turn_summoned === this.state.turnCount) {
      return { success: false, error: 'Cannot change position of a monster summoned this turn' }
    }
    
    if (card.has_changed_position) {
      return { success: false, error: 'This monster already changed position this turn' }
    }
    
    await this.supabase
      .from('duel_game_cards')
      .update({ 
        position: newPosition,
        has_changed_position: true,
      })
      .eq('id', cardId)
    
    this.raiseEvent({
      event: GameEvent.CHANGE_POSITION,
      triggerCard: card as DuelGameCard,
      reason: Reason.RULE,
      reasonPlayer: playerId,
    })
    
    return { success: true }
  }

  async flipSummon(
    playerId: string,
    cardId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: card } = await this.supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', cardId)
      .single()
    
    if (!card) {
      return { success: false, error: 'Card not found' }
    }
    
    if (card.position !== 'face_down_defense') {
      return { success: false, error: 'Can only Flip Summon face-down Defense Position monsters' }
    }
    
    if (card.turn_set === this.state.turnCount) {
      return { success: false, error: 'Cannot Flip Summon a monster the turn it was Set' }
    }
    
    if (card.has_changed_position) {
      return { success: false, error: 'This monster already changed position this turn' }
    }
    
    await this.supabase
      .from('duel_game_cards')
      .update({ 
        position: 'face_up_attack',
        has_changed_position: true,
      })
      .eq('id', cardId)
    
    this.raiseEvent({
      event: GameEvent.FLIP_SUMMON,
      triggerCard: card as DuelGameCard,
      reason: Reason.FLIP,
      reasonPlayer: playerId,
    })
    
    this.raiseEvent({
      event: GameEvent.FLIP,
      triggerCard: card as DuelGameCard,
      reason: Reason.FLIP,
      reasonPlayer: playerId,
    })
    
    this.log(`${card.card_name} was Flip Summoned`)
    
    return { success: true }
  }
}

// ==========================================================================
// SINGLETON INSTANCE MANAGEMENT
// ==========================================================================

const gameProcessors = new Map<string, GameProcessor>()

export function getGameProcessor(
  roomId: string,
  initialState?: Partial<FieldState>,
  callbacks?: {
    onStateChange?: (state: FieldState) => void
    onEventLog?: (message: string) => void
  }
): GameProcessor {
  if (!gameProcessors.has(roomId)) {
    gameProcessors.set(roomId, new GameProcessor(roomId, initialState, callbacks))
  }
  return gameProcessors.get(roomId)!
}

export function clearGameProcessor(roomId: string): void {
  gameProcessors.delete(roomId)
}
