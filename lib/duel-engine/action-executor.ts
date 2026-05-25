// Yu-Gi-Oh! Duel Engine - Action Executor
// Executes validated game actions and handles state transitions

import type {
  GameState,
  GameCard,
  SummonAttempt,
  ActivationAttempt,
  AttackDeclaration,
  ActionResult,
  Phase,
  MonsterPosition,
  ChainLink
} from './types'
import { RuleValidator } from './rule-validator'
import {
  GOES_TO_GY_AFTER_RESOLUTION,
  STAYS_ON_FIELD,
  SPELL_SPEED_BY_CATEGORY,
  isMonsterCategory
} from './constants'
import { createClient } from '@/lib/supabase/client'

export class ActionExecutor {
  private supabase = createClient()

  // =====================
  // SUMMON ACTIONS
  // =====================

  /**
   * Execute a Normal Summon
   */
  async executeNormalSummon(
    state: GameState,
    attempt: SummonAttempt
  ): Promise<ActionResult> {
    // Validate first
    const validation = RuleValidator.validateNormalSummon(state, attempt)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === attempt.cardId)!
    const zoneIndex = attempt.zoneIndex ?? RuleValidator.findEmptyMonsterZone(state, attempt.playerId)

    // Send tributes to graveyard if any
    if (attempt.tributeIds && attempt.tributeIds.length > 0) {
      for (const tributeId of attempt.tributeIds) {
        await this.sendToGraveyard(state, tributeId)
      }
    }

    // Move card to monster zone
    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'monster_zone',
        zone_index: zoneIndex,
        position: attempt.position,
        is_revealed: attempt.position !== 'face_down_defense'
      })
      .eq('id', attempt.cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    // Mark that player has Normal Summoned
    await this.supabase
      .from('duel_game_state')
      .update({ 
        players: {
          ...state.players,
          [attempt.playerId]: {
            ...state.players[attempt.playerId],
            hasNormalSummoned: true
          }
        }
      })
      .eq('room_id', state.roomId)

    // Log the summon
    await this.addDuelLog(state.roomId, 
      attempt.tributeIds?.length 
        ? `Tribute Summoned ${card.name} in ${attempt.position.replace(/_/g, ' ')}`
        : `Normal Summoned ${card.name} in ${attempt.position.replace(/_/g, ' ')}`
    )

    return { 
      success: true, 
      log: `Summoned ${card.name}` 
    }
  }

  /**
   * Execute Setting a monster
   */
  async executeSetMonster(
    state: GameState,
    attempt: SummonAttempt
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateSet(state, attempt)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === attempt.cardId)!
    const zoneIndex = attempt.zoneIndex ?? RuleValidator.findEmptyMonsterZone(state, attempt.playerId)

    // Send tributes to graveyard if any
    if (attempt.tributeIds && attempt.tributeIds.length > 0) {
      for (const tributeId of attempt.tributeIds) {
        await this.sendToGraveyard(state, tributeId)
      }
    }

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'monster_zone',
        zone_index: zoneIndex,
        position: 'face_down_defense',
        is_revealed: false
      })
      .eq('id', attempt.cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    // Mark Normal Summon used
    await this.supabase
      .from('duel_game_state')
      .update({
        players: {
          ...state.players,
          [attempt.playerId]: {
            ...state.players[attempt.playerId],
            hasNormalSummoned: true
          }
        }
      })
      .eq('room_id', state.roomId)

    await this.addDuelLog(state.roomId, `Set a monster in Defense Position`)

    return { success: true, log: 'Set a monster' }
  }

  /**
   * Execute a Special Summon
   */
  async executeSpecialSummon(
    state: GameState,
    cardId: string,
    playerId: string,
    position: MonsterPosition,
    zoneIndex?: number
  ): Promise<ActionResult> {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const zone = zoneIndex ?? RuleValidator.findEmptyMonsterZone(state, playerId)
    if (zone === -1) {
      return { success: false, error: 'No empty Monster Zones' }
    }

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'monster_zone',
        zone_index: zone,
        position,
        is_revealed: position !== 'face_down_defense'
      })
      .eq('id', cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    await this.addDuelLog(state.roomId, `Special Summoned ${card.name}`)

    return { success: true, log: `Special Summoned ${card.name}` }
  }

  /**
   * Execute a Flip Summon
   */
  async executeFlipSummon(
    state: GameState,
    cardId: string,
    playerId: string
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateFlipSummon(state, cardId, playerId)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === cardId)!

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        position: 'face_up_attack',
        is_revealed: true
      })
      .eq('id', cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    await this.addDuelLog(state.roomId, `Flip Summoned ${card.name}`)

    // TODO: Trigger Flip effects here

    return { success: true, log: `Flip Summoned ${card.name}` }
  }

  // =====================
  // POSITION CHANGES
  // =====================

  /**
   * Change a monster's battle position
   */
  async executePositionChange(
    state: GameState,
    cardId: string,
    playerId: string,
    newPosition: MonsterPosition
  ): Promise<ActionResult> {
    const validation = RuleValidator.validatePositionChange(state, cardId, playerId, newPosition)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === cardId)!

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        position: newPosition,
        is_revealed: true // Changing position reveals the card
      })
      .eq('id', cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    await this.addDuelLog(state.roomId, 
      `Changed ${card.name} to ${newPosition.replace(/_/g, ' ')}`
    )

    return { success: true }
  }

  // =====================
  // SPELL/TRAP ACTIONS
  // =====================

  /**
   * Set a Spell/Trap card
   */
  async executeSetSpellTrap(
    state: GameState,
    cardId: string,
    playerId: string
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateSpellTrapSet(state, cardId, playerId)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === cardId)!
    
    // Field Spells go to field zone
    if (card.category === 'field_spell') {
      // Check if there's already a field spell - send it to GY
      const existingFieldSpell = state.cards.find(c => 
        c.location === 'field_zone' && c.controllerId === playerId
      )
      if (existingFieldSpell) {
        await this.sendToGraveyard(state, existingFieldSpell.id)
      }

      const { error } = await this.supabase
        .from('duel_game_cards')
        .update({
          location: 'field_zone',
          zone_index: 0,
          position: 'face_down'
        })
        .eq('id', cardId)

      if (error) {
        return { success: false, error: 'Database error' }
      }
    } else {
      const zoneIndex = RuleValidator.findEmptySpellZone(state, playerId)

      const { error } = await this.supabase
        .from('duel_game_cards')
        .update({
          location: 'spell_zone',
          zone_index: zoneIndex,
          position: 'face_down'
        })
        .eq('id', cardId)

      if (error) {
        return { success: false, error: 'Database error' }
      }
    }

    await this.addDuelLog(state.roomId, `Set a card`)

    return { success: true, log: 'Set a Spell/Trap' }
  }

  /**
   * Activate a Spell card
   */
  async executeActivateSpell(
    state: GameState,
    attempt: ActivationAttempt
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateSpellActivation(state, attempt)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === attempt.cardId)!

    // If activating from hand, need to place it on field first (unless Normal Spell)
    if (card.location === 'hand') {
      if (card.category === 'field_spell') {
        // Check existing field spell
        const existingFieldSpell = state.cards.find(c => 
          c.location === 'field_zone' && c.controllerId === attempt.playerId
        )
        if (existingFieldSpell) {
          await this.sendToGraveyard(state, existingFieldSpell.id)
        }

        await this.supabase
          .from('duel_game_cards')
          .update({
            location: 'field_zone',
            zone_index: 0,
            position: 'face_up',
            is_revealed: true
          })
          .eq('id', attempt.cardId)
      } else if (RuleValidator.staysOnFieldAfterActivation(card)) {
        const zoneIndex = RuleValidator.findEmptySpellZone(state, attempt.playerId)
        await this.supabase
          .from('duel_game_cards')
          .update({
            location: 'spell_zone',
            zone_index: zoneIndex,
            position: 'face_up',
            is_revealed: true
          })
          .eq('id', attempt.cardId)
      }
    } else {
      // Flip face-up if it was Set
      await this.supabase
        .from('duel_game_cards')
        .update({
          position: 'face_up',
          is_revealed: true
        })
        .eq('id', attempt.cardId)
    }

    await this.addDuelLog(state.roomId, `Activated ${card.name}`)

    // Start chain or add to existing chain
    const chainLink: ChainLink = {
      cardId: attempt.cardId,
      effectIndex: attempt.effectIndex || 0,
      activatingPlayer: attempt.playerId,
      spellSpeed: SPELL_SPEED_BY_CATEGORY[card.category] || 1,
      targets: attempt.targets,
      resolve: async () => {
        // Effect resolution will be handled by effect definitions
        // For now, just send to GY if it should
        if (RuleValidator.shouldGoToGraveyardAfterResolve(card)) {
          await this.sendToGraveyard(state, attempt.cardId)
        }
      }
    }

    // Add to chain
    state.chain.push(chainLink)

    return { 
      success: true, 
      log: `Activated ${card.name}`,
      newState: { 
        chain: state.chain,
        isChainBuilding: true 
      }
    }
  }

  /**
   * Activate a Trap card
   */
  async executeActivateTrap(
    state: GameState,
    attempt: ActivationAttempt
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateTrapActivation(state, attempt)
    if (!validation.success) {
      return validation
    }

    const card = state.cards.find(c => c.id === attempt.cardId)!

    // Flip face-up
    await this.supabase
      .from('duel_game_cards')
      .update({
        position: 'face_up',
        is_revealed: true
      })
      .eq('id', attempt.cardId)

    await this.addDuelLog(state.roomId, `Activated ${card.name}`)

    // Add to chain
    const chainLink: ChainLink = {
      cardId: attempt.cardId,
      effectIndex: attempt.effectIndex || 0,
      activatingPlayer: attempt.playerId,
      spellSpeed: SPELL_SPEED_BY_CATEGORY[card.category] || 2,
      targets: attempt.targets,
      resolve: async () => {
        if (RuleValidator.shouldGoToGraveyardAfterResolve(card)) {
          await this.sendToGraveyard(state, attempt.cardId)
        }
      }
    }

    state.chain.push(chainLink)

    return {
      success: true,
      log: `Activated ${card.name}`,
      newState: {
        chain: state.chain,
        isChainBuilding: true
      }
    }
  }

  // =====================
  // BATTLE ACTIONS
  // =====================

  /**
   * Execute an attack declaration
   */
  async executeAttack(
    state: GameState,
    attack: AttackDeclaration
  ): Promise<ActionResult> {
    const validation = RuleValidator.validateAttack(state, attack)
    if (!validation.success) {
      return validation
    }

    const attacker = state.cards.find(c => c.id === attack.attackerId)!
    
    if (attack.targetId) {
      const target = state.cards.find(c => c.id === attack.targetId)!
      await this.addDuelLog(state.roomId, 
        `${attacker.name} attacks ${target.name}`
      )
    } else {
      await this.addDuelLog(state.roomId, 
        `${attacker.name} attacks directly!`
      )
    }

    // Mark attacker as having attacked
    await this.supabase
      .from('duel_game_cards')
      .update({ has_attacked: true })
      .eq('id', attack.attackerId)

    // This is where damage calculation would happen
    // For now, return success and let the UI handle the response window

    return {
      success: true,
      log: `Attack declared`,
      newState: {
        pendingAction: {
          type: 'attack',
          playerId: attack.playerId,
          cardId: attack.attackerId,
          data: { targetId: attack.targetId }
        }
      }
    }
  }

  /**
   * Calculate and apply battle damage
   */
  async executeBattleDamage(
    state: GameState,
    attackerId: string,
    targetId: string | null
  ): Promise<ActionResult> {
    const attacker = state.cards.find(c => c.id === attackerId)
    if (!attacker) {
      return { success: false, error: 'Attacker not found' }
    }

    const attackerAtk = attacker.attack || 0

    if (!targetId) {
      // Direct attack
      const opponentId = Object.keys(state.players).find(id => id !== attacker.controllerId)!
      const newLP = state.players[opponentId].lifePoints - attackerAtk

      await this.supabase
        .from('duel_participants')
        .update({ life_points: Math.max(0, newLP) })
        .eq('room_id', state.roomId)
        .eq('player_id', opponentId)

      await this.addDuelLog(state.roomId, 
        `Direct attack! ${opponentId} takes ${attackerAtk} damage`
      )

      if (newLP <= 0) {
        await this.addDuelLog(state.roomId, `${opponentId} loses!`)
      }

      return { success: true, log: `Dealt ${attackerAtk} direct damage` }
    }

    // Battle with monster
    const target = state.cards.find(c => c.id === targetId)
    if (!target) {
      return { success: false, error: 'Target not found' }
    }

    const isDefense = target.position === 'face_up_defense' || target.position === 'face_down_defense'
    const targetValue = isDefense ? (target.defense || 0) : (target.attack || 0)

    let damage = 0
    let destroyed: string[] = []

    if (isDefense) {
      // Attacking Defense Position
      if (attackerAtk > targetValue) {
        // Target destroyed, no damage
        destroyed.push(targetId)
        await this.addDuelLog(state.roomId, `${target.name} is destroyed`)
      } else if (attackerAtk < targetValue) {
        // Attacker takes damage
        damage = targetValue - attackerAtk
        await this.supabase
          .from('duel_participants')
          .update({ 
            life_points: state.players[attacker.controllerId].lifePoints - damage 
          })
          .eq('room_id', state.roomId)
          .eq('player_id', attacker.controllerId)
        await this.addDuelLog(state.roomId, 
          `${attacker.controllerId} takes ${damage} damage`
        )
      }
      // Equal = no effect
    } else {
      // Attacking Attack Position
      if (attackerAtk > targetValue) {
        // Target destroyed, opponent takes damage
        damage = attackerAtk - targetValue
        destroyed.push(targetId)
        const opponentId = target.controllerId
        await this.supabase
          .from('duel_participants')
          .update({ 
            life_points: state.players[opponentId].lifePoints - damage 
          })
          .eq('room_id', state.roomId)
          .eq('player_id', opponentId)
        await this.addDuelLog(state.roomId, 
          `${target.name} destroyed! ${opponentId} takes ${damage} damage`
        )
      } else if (attackerAtk < targetValue) {
        // Attacker destroyed, attacker's controller takes damage
        damage = targetValue - attackerAtk
        destroyed.push(attackerId)
        await this.supabase
          .from('duel_participants')
          .update({ 
            life_points: state.players[attacker.controllerId].lifePoints - damage 
          })
          .eq('room_id', state.roomId)
          .eq('player_id', attacker.controllerId)
        await this.addDuelLog(state.roomId, 
          `${attacker.name} destroyed! ${attacker.controllerId} takes ${damage} damage`
        )
      } else {
        // Equal ATK - both destroyed
        destroyed.push(attackerId, targetId)
        await this.addDuelLog(state.roomId, 
          `${attacker.name} and ${target.name} are both destroyed!`
        )
      }
    }

    // Send destroyed cards to graveyard
    for (const cardId of destroyed) {
      await this.sendToGraveyard(state, cardId)
    }

    return { success: true, log: 'Battle resolved' }
  }

  // =====================
  // UTILITY ACTIONS
  // =====================

  /**
   * Send a card to the graveyard
   */
  async sendToGraveyard(state: GameState, cardId: string): Promise<ActionResult> {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'graveyard',
        zone_index: null,
        position: 'face_up',
        is_revealed: true
      })
      .eq('id', cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    return { success: true, log: `${card.name} sent to Graveyard` }
  }

  /**
   * Banish a card
   */
  async banishCard(
    state: GameState, 
    cardId: string, 
    faceDown: boolean = false
  ): Promise<ActionResult> {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const { error } = await this.supabase
      .from('duel_game_cards')
      .update({
        location: 'banished',
        zone_index: null,
        position: faceDown ? 'face_down' : 'face_up',
        is_revealed: !faceDown
      })
      .eq('id', cardId)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    return { success: true, log: `${card.name} banished` }
  }

  /**
   * Draw cards
   */
  async drawCards(
    state: GameState,
    playerId: string,
    count: number
  ): Promise<ActionResult> {
    const deck = state.cards
      .filter(c => c.ownerId === playerId && c.location === 'deck')
      .sort((a, b) => (a.zoneIndex || 0) - (b.zoneIndex || 0))

    if (deck.length < count) {
      // Deck out!
      await this.addDuelLog(state.roomId, `${playerId} cannot draw - deck out!`)
      return { success: false, error: 'Cannot draw - not enough cards' }
    }

    const cardsToDraw = deck.slice(0, count)
    for (const card of cardsToDraw) {
      await this.supabase
        .from('duel_game_cards')
        .update({
          location: 'hand',
          zone_index: null,
          position: 'face_down'
        })
        .eq('id', card.id)
    }

    await this.addDuelLog(state.roomId, `${playerId} drew ${count} card(s)`)

    return { success: true, log: `Drew ${count} card(s)` }
  }

  /**
   * Add to duel log
   */
  private async addDuelLog(roomId: string, message: string): Promise<void> {
    await this.supabase
      .from('duel_logs')
      .insert({
        room_id: roomId,
        message,
        created_at: new Date().toISOString()
      })
  }
}

// Export singleton
export const actionExecutor = new ActionExecutor()
