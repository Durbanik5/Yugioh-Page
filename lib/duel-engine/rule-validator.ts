// Yu-Gi-Oh! Duel Engine - Rule Validator
// Validates all game actions according to official TCG/OCG rules

import type {
  GameState,
  GameCard,
  SummonAttempt,
  ActivationAttempt,
  AttackDeclaration,
  ActionResult,
  Phase,
  MonsterPosition
} from './types'
import {
  TRIBUTE_REQUIREMENTS,
  MONSTER_ZONES,
  SPELL_ZONES,
  MONSTER_CATEGORIES,
  SPELL_CATEGORIES,
  TRAP_CATEGORIES,
  STAYS_ON_FIELD,
  GOES_TO_GY_AFTER_RESOLUTION,
  SPELL_SPEED_BY_CATEGORY,
  isMonsterCategory,
  isSpellCategory,
  isTrapCategory,
  isExtraDeckCategory
} from './constants'

export class RuleValidator {
  
  // =====================
  // SUMMON VALIDATION
  // =====================

  /**
   * Validate a Normal Summon attempt
   */
  static validateNormalSummon(
    state: GameState,
    attempt: SummonAttempt
  ): ActionResult {
    const card = state.cards.find(c => c.id === attempt.cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const player = state.players[attempt.playerId]
    if (!player) {
      return { success: false, error: 'Player not found' }
    }

    // Must be the turn player
    if (state.turnPlayer !== attempt.playerId) {
      return { success: false, error: 'Not your turn' }
    }

    // Must be in Main Phase 1 or Main Phase 2
    if (state.phase !== 'main1' && state.phase !== 'main2') {
      return { success: false, error: 'Can only Normal Summon during Main Phase' }
    }

    // Check if player already Normal Summoned this turn
    if (player.hasNormalSummoned) {
      return { success: false, error: 'Already Normal Summoned this turn (limit 1 per turn)' }
    }

    // Card must be in hand
    if (card.location !== 'hand') {
      return { success: false, error: 'Card must be in hand to Normal Summon' }
    }

    // Card must be a main deck monster
    if (!isMonsterCategory(card.category)) {
      return { success: false, error: 'Can only Normal Summon monsters' }
    }

    if (isExtraDeckCategory(card.category)) {
      return { success: false, error: 'Extra Deck monsters cannot be Normal Summoned' }
    }

    // Check tribute requirements
    const level = card.level || 0
    const tributesRequired = TRIBUTE_REQUIREMENTS[level] || 0

    if (tributesRequired > 0) {
      // Must be a tribute summon
      if (attempt.summonType !== 'tribute') {
        return { 
          success: false, 
          error: `Level ${level} monsters require ${tributesRequired} tribute(s)` 
        }
      }

      // Validate tributes
      const tributeResult = this.validateTributes(
        state, 
        attempt.playerId, 
        attempt.tributeIds || [],
        tributesRequired
      )
      if (!tributeResult.success) {
        return tributeResult
      }
    }

    // Check for empty monster zone
    const emptyZone = this.findEmptyMonsterZone(state, attempt.playerId)
    if (emptyZone === -1 && attempt.zoneIndex === undefined) {
      return { success: false, error: 'No empty Monster Zones' }
    }

    return { success: true }
  }

  /**
   * Validate tributes for a Tribute Summon
   */
  static validateTributes(
    state: GameState,
    playerId: string,
    tributeIds: string[],
    required: number
  ): ActionResult {
    if (tributeIds.length !== required) {
      return { 
        success: false, 
        error: `Must tribute exactly ${required} monster(s), got ${tributeIds.length}` 
      }
    }

    for (const tributeId of tributeIds) {
      const tribute = state.cards.find(c => c.id === tributeId)
      if (!tribute) {
        return { success: false, error: 'Tribute card not found' }
      }

      // Must be a monster on your field
      if (tribute.location !== 'monster_zone') {
        return { success: false, error: 'Tribute must be a monster on the field' }
      }

      if (tribute.controllerId !== playerId) {
        return { success: false, error: 'Can only tribute monsters you control' }
      }
    }

    return { success: true }
  }

  /**
   * Validate a Set (face-down) monster
   */
  static validateSet(
    state: GameState,
    attempt: SummonAttempt
  ): ActionResult {
    const card = state.cards.find(c => c.id === attempt.cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const player = state.players[attempt.playerId]

    // Same basic checks as Normal Summon
    if (state.turnPlayer !== attempt.playerId) {
      return { success: false, error: 'Not your turn' }
    }

    if (state.phase !== 'main1' && state.phase !== 'main2') {
      return { success: false, error: 'Can only Set during Main Phase' }
    }

    if (player.hasNormalSummoned) {
      return { success: false, error: 'Already Normal Summoned/Set this turn' }
    }

    if (card.location !== 'hand') {
      return { success: false, error: 'Card must be in hand' }
    }

    if (!isMonsterCategory(card.category)) {
      return { success: false, error: 'Can only Set monsters' }
    }

    // Level 5+ still requires tributes to Set
    const level = card.level || 0
    const tributesRequired = TRIBUTE_REQUIREMENTS[level] || 0

    if (tributesRequired > 0) {
      const tributeResult = this.validateTributes(
        state,
        attempt.playerId,
        attempt.tributeIds || [],
        tributesRequired
      )
      if (!tributeResult.success) {
        return tributeResult
      }
    }

    const emptyZone = this.findEmptyMonsterZone(state, attempt.playerId)
    if (emptyZone === -1) {
      return { success: false, error: 'No empty Monster Zones' }
    }

    return { success: true }
  }

  /**
   * Validate a Special Summon
   */
  static validateSpecialSummon(
    state: GameState,
    attempt: SummonAttempt
  ): ActionResult {
    const card = state.cards.find(c => c.id === attempt.cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    // Special Summons don't use Normal Summon limit
    // They can happen any time a card effect allows

    if (!isMonsterCategory(card.category)) {
      return { success: false, error: 'Can only Special Summon monsters' }
    }

    // Check for empty monster zone (or Extra Monster Zone for Extra Deck monsters)
    const emptyZone = this.findEmptyMonsterZone(state, attempt.playerId)
    if (emptyZone === -1) {
      return { success: false, error: 'No empty Monster Zones' }
    }

    return { success: true }
  }

  /**
   * Validate a Flip Summon
   */
  static validateFlipSummon(
    state: GameState,
    cardId: string,
    playerId: string
  ): ActionResult {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    if (state.turnPlayer !== playerId) {
      return { success: false, error: 'Not your turn' }
    }

    if (state.phase !== 'main1' && state.phase !== 'main2') {
      return { success: false, error: 'Can only Flip Summon during Main Phase' }
    }

    if (card.location !== 'monster_zone') {
      return { success: false, error: 'Card must be on the field' }
    }

    if (card.position !== 'face_down_defense') {
      return { success: false, error: 'Card must be face-down Defense Position' }
    }

    if (card.controllerId !== playerId) {
      return { success: false, error: 'You do not control this card' }
    }

    // Cannot Flip Summon the same turn you Set
    if (card.turnSet === state.turnCount) {
      return { success: false, error: 'Cannot Flip Summon a monster the turn it was Set' }
    }

    return { success: true }
  }

  // =====================
  // POSITION CHANGE
  // =====================

  /**
   * Validate changing a monster's battle position
   */
  static validatePositionChange(
    state: GameState,
    cardId: string,
    playerId: string,
    newPosition: MonsterPosition
  ): ActionResult {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    if (state.turnPlayer !== playerId) {
      return { success: false, error: 'Not your turn' }
    }

    if (state.phase !== 'main1' && state.phase !== 'main2') {
      return { success: false, error: 'Can only change position during Main Phase' }
    }

    if (card.location !== 'monster_zone') {
      return { success: false, error: 'Card must be on the field' }
    }

    if (card.controllerId !== playerId) {
      return { success: false, error: 'You do not control this card' }
    }

    // Cannot change position of a monster that was summoned this turn
    if (card.turnSummoned === state.turnCount) {
      return { success: false, error: 'Cannot change position the turn a monster was summoned' }
    }

    // Cannot change position more than once per turn
    if (card.hasChangedPosition) {
      return { success: false, error: 'Already changed position this turn' }
    }

    // Cannot change to the same position
    if (card.position === newPosition) {
      return { success: false, error: 'Monster is already in that position' }
    }

    // Cannot manually change face-down to another face-down position
    if (card.position === 'face_down_defense' && newPosition === 'face_down_defense') {
      return { success: false, error: 'Invalid position change' }
    }

    return { success: true }
  }

  // =====================
  // SPELL/TRAP VALIDATION
  // =====================

  /**
   * Validate activating a Spell card
   */
  static validateSpellActivation(
    state: GameState,
    attempt: ActivationAttempt
  ): ActionResult {
    const card = state.cards.find(c => c.id === attempt.cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    if (!isSpellCategory(card.category)) {
      return { success: false, error: 'Not a Spell card' }
    }

    const isQuickPlay = card.category === 'quickplay_spell'

    // Quick-Play Spells can be activated from hand only during your turn
    // Or from being Set (either player's turn)
    if (card.location === 'hand') {
      if (!isQuickPlay && card.category !== 'normal_spell' && 
          card.category !== 'equip_spell' && card.category !== 'field_spell' &&
          card.category !== 'continuous_spell' && card.category !== 'ritual_spell') {
        return { success: false, error: 'This Spell cannot be activated from hand' }
      }

      // Non-Quick-Play Spells can only activate from hand during your Main Phase
      if (!isQuickPlay) {
        if (state.turnPlayer !== attempt.playerId) {
          return { success: false, error: 'Can only activate this Spell during your turn' }
        }
        if (state.phase !== 'main1' && state.phase !== 'main2') {
          return { success: false, error: 'Can only activate Spells during Main Phase' }
        }
      } else {
        // Quick-Play from hand only during your turn
        if (state.turnPlayer !== attempt.playerId) {
          return { success: false, error: 'Quick-Play Spells can only be activated from hand during your turn' }
        }
      }
    }

    // Set Spell cards
    if (card.location === 'spell_zone' && card.position === 'face_down') {
      // Cannot activate a Spell/Trap the turn it was Set
      if (card.turnSet === state.turnCount && !isQuickPlay) {
        // Quick-Play Spells CAN be activated the turn they are Set
        // But other Spells can be activated immediately from being played (not Set)
      }
    }

    // Chain validation
    if (state.isChainBuilding) {
      const spellSpeed = SPELL_SPEED_BY_CATEGORY[card.category] || 1
      const lastChainLink = state.chain[state.chain.length - 1]
      
      if (lastChainLink && spellSpeed < lastChainLink.spellSpeed) {
        return { 
          success: false, 
          error: `Spell Speed ${spellSpeed} cannot chain to Spell Speed ${lastChainLink.spellSpeed}` 
        }
      }
    }

    return { success: true }
  }

  /**
   * Validate activating a Trap card
   */
  static validateTrapActivation(
    state: GameState,
    attempt: ActivationAttempt
  ): ActionResult {
    const card = state.cards.find(c => c.id === attempt.cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    if (!isTrapCategory(card.category)) {
      return { success: false, error: 'Not a Trap card' }
    }

    // Traps must be Set first (cannot activate from hand normally)
    if (card.location === 'hand') {
      return { success: false, error: 'Trap cards must be Set before activation' }
    }

    if (card.location !== 'spell_zone') {
      return { success: false, error: 'Trap must be Set in Spell/Trap Zone' }
    }

    // Cannot activate a Trap the turn it was Set
    if (card.turnSet === state.turnCount) {
      return { success: false, error: 'Cannot activate a Trap the turn it was Set' }
    }

    // Chain validation
    if (state.isChainBuilding) {
      const spellSpeed = SPELL_SPEED_BY_CATEGORY[card.category] || 2
      const lastChainLink = state.chain[state.chain.length - 1]
      
      if (lastChainLink && spellSpeed < lastChainLink.spellSpeed) {
        return { 
          success: false, 
          error: `Spell Speed ${spellSpeed} cannot chain to Spell Speed ${lastChainLink.spellSpeed}` 
        }
      }

      // Counter Traps can only be chained to by Counter Traps
      if (lastChainLink && lastChainLink.spellSpeed === 3 && card.category !== 'counter_trap') {
        return { success: false, error: 'Only Counter Traps can chain to Counter Traps' }
      }
    }

    return { success: true }
  }

  /**
   * Validate Setting a Spell/Trap card
   */
  static validateSpellTrapSet(
    state: GameState,
    cardId: string,
    playerId: string
  ): ActionResult {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    if (state.turnPlayer !== playerId) {
      return { success: false, error: 'Not your turn' }
    }

    if (state.phase !== 'main1' && state.phase !== 'main2') {
      return { success: false, error: 'Can only Set during Main Phase' }
    }

    if (card.location !== 'hand') {
      return { success: false, error: 'Card must be in hand' }
    }

    if (!isSpellCategory(card.category) && !isTrapCategory(card.category)) {
      return { success: false, error: 'Can only Set Spell/Trap cards' }
    }

    // Field Spells go to Field Zone, not Spell/Trap Zone
    if (card.category === 'field_spell') {
      // Field Zone is always available (replaces existing)
      return { success: true }
    }

    // Check for empty Spell/Trap zone
    const emptyZone = this.findEmptySpellZone(state, playerId)
    if (emptyZone === -1) {
      return { success: false, error: 'No empty Spell/Trap Zones' }
    }

    return { success: true }
  }

  // =====================
  // BATTLE VALIDATION
  // =====================

  /**
   * Validate an attack declaration
   */
  static validateAttack(
    state: GameState,
    attack: AttackDeclaration
  ): ActionResult {
    const attacker = state.cards.find(c => c.id === attack.attackerId)
    if (!attacker) {
      return { success: false, error: 'Attacking monster not found' }
    }

    if (state.turnPlayer !== attack.playerId) {
      return { success: false, error: 'Not your turn' }
    }

    // Must be in Battle Step
    if (state.phase !== 'battle_step') {
      return { success: false, error: 'Can only attack during Battle Step' }
    }

    // First turn player cannot attack
    if (!state.battlePhaseEnabled) {
      return { success: false, error: 'Cannot attack on the first turn' }
    }

    if (attacker.location !== 'monster_zone') {
      return { success: false, error: 'Attacker must be on the field' }
    }

    if (attacker.controllerId !== attack.playerId) {
      return { success: false, error: 'You do not control this monster' }
    }

    if (attacker.position !== 'face_up_attack') {
      return { success: false, error: 'Monster must be in Attack Position to attack' }
    }

    if (attacker.hasAttacked) {
      return { success: false, error: 'Monster already attacked this turn' }
    }

    // Monsters cannot attack the turn they are summoned (unless they have an effect)
    // This is actually NOT a core rule - monsters CAN attack the turn summoned
    // Only changing position is restricted

    // Validate target
    if (attack.targetId) {
      const target = state.cards.find(c => c.id === attack.targetId)
      if (!target) {
        return { success: false, error: 'Target not found' }
      }

      if (target.location !== 'monster_zone') {
        return { success: false, error: 'Target must be on the field' }
      }

      if (target.controllerId === attack.playerId) {
        return { success: false, error: 'Cannot attack your own monster' }
      }
    } else {
      // Direct attack - check if opponent has monsters
      const opponentMonsters = state.cards.filter(c => 
        c.location === 'monster_zone' && 
        c.controllerId !== attack.playerId
      )
      
      if (opponentMonsters.length > 0) {
        return { success: false, error: 'Cannot attack directly while opponent has monsters' }
      }
    }

    return { success: true }
  }

  // =====================
  // UTILITY FUNCTIONS
  // =====================

  /**
   * Find an empty Monster Zone for a player
   */
  static findEmptyMonsterZone(state: GameState, playerId: string): number {
    const occupied = state.cards
      .filter(c => c.location === 'monster_zone' && c.controllerId === playerId)
      .map(c => c.zoneIndex)

    for (let i = 0; i < MONSTER_ZONES; i++) {
      if (!occupied.includes(i)) {
        return i
      }
    }
    return -1
  }

  /**
   * Find an empty Spell/Trap Zone for a player
   */
  static findEmptySpellZone(state: GameState, playerId: string): number {
    const occupied = state.cards
      .filter(c => c.location === 'spell_zone' && c.controllerId === playerId)
      .map(c => c.zoneIndex)

    for (let i = 0; i < SPELL_ZONES; i++) {
      if (!occupied.includes(i)) {
        return i
      }
    }
    return -1
  }

  /**
   * Check if a card should go to GY after resolving
   */
  static shouldGoToGraveyardAfterResolve(card: GameCard): boolean {
    return GOES_TO_GY_AFTER_RESOLUTION.includes(
      card.category as typeof GOES_TO_GY_AFTER_RESOLUTION[number]
    )
  }

  /**
   * Check if a card stays on field after activation
   */
  static staysOnFieldAfterActivation(card: GameCard): boolean {
    return STAYS_ON_FIELD.includes(
      card.category as typeof STAYS_ON_FIELD[number]
    )
  }

  /**
   * Get the number of tributes required for a monster
   */
  static getTributesRequired(level: number): number {
    return TRIBUTE_REQUIREMENTS[level] || (level >= 7 ? 2 : level >= 5 ? 1 : 0)
  }

  /**
   * Check if player can respond in current game state
   */
  static canPlayerRespond(state: GameState, playerId: string): boolean {
    // During chain building, check if player has valid responses
    if (state.isChainBuilding) {
      const respondableCards = state.cards.filter(c => {
        if (c.controllerId !== playerId) return false
        
        // Quick-Play Spells in hand (only during own turn)
        if (c.location === 'hand' && c.category === 'quickplay_spell') {
          return state.turnPlayer === playerId
        }
        
        // Set Traps (not Set this turn)
        if (c.location === 'spell_zone' && c.position === 'face_down' && isTrapCategory(c.category)) {
          return c.turnSet !== state.turnCount
        }
        
        // Set Quick-Play Spells
        if (c.location === 'spell_zone' && c.position === 'face_down' && c.category === 'quickplay_spell') {
          return true
        }
        
        return false
      })
      
      return respondableCards.length > 0
    }
    
    return false
  }
}
