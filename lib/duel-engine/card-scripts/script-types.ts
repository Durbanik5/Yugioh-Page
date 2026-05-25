// Card Effect Scripting System
// Based on EDOPro/Master Duel architecture - data-driven card effects

import type { GameCard, GameState, Location, SpellSpeed, DuelPhase } from './types'

// ============================================
// TRIGGER EVENTS - What causes effects to activate
// ============================================

export type TriggerEvent =
  // Summon triggers
  | 'SUMMON_SUCCESS' // When a monster is successfully summoned
  | 'NORMAL_SUMMON'
  | 'SPECIAL_SUMMON'
  | 'FLIP_SUMMON'
  | 'TRIBUTE_SUMMON'
  
  // Battle triggers
  | 'ATTACK_DECLARED'
  | 'ATTACK_TARGET_SELECTED'
  | 'BEFORE_DAMAGE_CALC'
  | 'DAMAGE_CALC'
  | 'AFTER_DAMAGE_CALC'
  | 'BATTLE_DESTROYED'
  | 'DIRECT_ATTACK'
  
  // Card movement triggers
  | 'SENT_TO_GRAVEYARD'
  | 'SENT_TO_GRAVEYARD_FROM_FIELD'
  | 'SENT_TO_GRAVEYARD_FROM_DECK'
  | 'SENT_TO_GRAVEYARD_FROM_HAND'
  | 'BANISHED'
  | 'RETURNED_TO_HAND'
  | 'RETURNED_TO_DECK'
  | 'ADDED_TO_HAND' // Search, draw, etc.
  
  // Spell/Trap triggers
  | 'SPELL_ACTIVATED'
  | 'TRAP_ACTIVATED'
  | 'SPELL_TRAP_SET'
  | 'CONTINUOUS_EFFECT_ACTIVE'
  
  // Phase triggers
  | 'DRAW_PHASE_START'
  | 'STANDBY_PHASE_START'
  | 'MAIN_PHASE_START'
  | 'BATTLE_PHASE_START'
  | 'BATTLE_PHASE_END'
  | 'END_PHASE_START'
  | 'TURN_END'
  
  // Chain triggers
  | 'CHAIN_RESOLVING'
  | 'CHAIN_RESOLVED'
  | 'EFFECT_NEGATED'
  
  // Damage triggers
  | 'DAMAGE_INFLICTED'
  | 'LIFEPOINTS_CHANGED'
  
  // Generic
  | 'CARD_DESTROYED'
  | 'CARD_TARGETED'
  | 'EFFECT_ACTIVATED'

// ============================================
// EFFECT ACTIONS - What effects can do
// ============================================

export type EffectActionType =
  | 'DRAW'
  | 'SEARCH_DECK'
  | 'ADD_TO_HAND'
  | 'SPECIAL_SUMMON'
  | 'DESTROY'
  | 'SEND_TO_GRAVEYARD'
  | 'BANISH'
  | 'RETURN_TO_HAND'
  | 'RETURN_TO_DECK'
  | 'CHANGE_POSITION'
  | 'CHANGE_ATK_DEF'
  | 'NEGATE_EFFECT'
  | 'NEGATE_ATTACK'
  | 'INFLICT_DAMAGE'
  | 'GAIN_LIFEPOINTS'
  | 'ADD_COUNTER'
  | 'REMOVE_COUNTER'
  | 'EQUIP'
  | 'DISCARD'
  | 'EXCAVATE' // Look at top cards of deck
  | 'SHUFFLE_DECK'
  | 'CHANGE_CONTROL'
  | 'TRIBUTE'
  | 'SET_SPELL_TRAP'
  | 'ACTIVATE_FROM_DECK'
  | 'SKIP_PHASE'
  | 'CUSTOM'

// ============================================
// CARD SCRIPT DEFINITION
// ============================================

export interface CardFilter {
  // Card properties
  cardId?: number | number[]
  name?: string | RegExp
  nameContains?: string
  cardType?: ('monster' | 'spell' | 'trap')[]
  monsterType?: string[] // Warrior, Dragon, Spellcaster, etc.
  attribute?: string[] // LIGHT, DARK, FIRE, WATER, EARTH, WIND, DIVINE
  level?: number | { min?: number; max?: number }
  attack?: number | { min?: number; max?: number }
  defense?: number | { min?: number; max?: number }
  
  // Location filters
  location?: Location[]
  controller?: 'self' | 'opponent' | 'any'
  owner?: 'self' | 'opponent' | 'any'
  
  // State filters
  position?: ('face_up' | 'face_down' | 'attack' | 'defense')[]
  canBeTargeted?: boolean
  canBeDestroyed?: boolean
  
  // Custom filter function for complex conditions
  custom?: (card: GameCard, state: GameState, activatingPlayer: string) => boolean
}

export interface EffectCost {
  type: 'discard' | 'tribute' | 'banish' | 'pay_lp' | 'send_to_gy' | 'return_to_deck' | 'remove_counter' | 'reveal'
  amount?: number
  filter?: CardFilter
  from?: Location[]
  exact?: boolean // Must pay exactly this amount
}

export interface EffectTarget {
  count: number | 'all' | 'up_to'
  upTo?: number
  filter: CardFilter
  canTargetSelf?: boolean
  optional?: boolean
}

export interface EffectAction {
  type: EffectActionType
  
  // For DRAW
  count?: number
  
  // For SEARCH_DECK, ADD_TO_HAND, SPECIAL_SUMMON, etc.
  filter?: CardFilter
  from?: Location | Location[]
  to?: Location
  position?: 'face_up_attack' | 'face_up_defense' | 'face_down_defense' | 'face_up' | 'face_down'
  
  // For CHANGE_ATK_DEF
  atkChange?: number | 'double' | 'halve' | 'original'
  defChange?: number | 'double' | 'halve' | 'original'
  duration?: 'permanent' | 'end_of_turn' | 'end_of_battle'
  
  // For INFLICT_DAMAGE, GAIN_LIFEPOINTS
  amount?: number | 'battle_damage' | 'atk' | 'def'
  target?: 'self' | 'opponent' | 'both'
  
  // For ADD_COUNTER, REMOVE_COUNTER
  counterType?: string
  counterAmount?: number
  
  // For targeting-based actions
  useTargets?: boolean // Use the targets selected during activation
  
  // For SHUFFLE_DECK
  shuffleAfter?: boolean
  
  // Player affected
  player?: 'self' | 'opponent' | 'both' | 'turn_player'
  
  // Conditions for this specific action
  condition?: (state: GameState, card: GameCard, targets?: GameCard[]) => boolean
  
  // Custom execution
  custom?: (state: GameState, card: GameCard, targets?: GameCard[]) => Promise<GameState>
}

export interface CardEffect {
  id: string
  name: string
  description: string
  
  // Effect classification
  effectType: 'ignition' | 'trigger' | 'quick' | 'continuous' | 'field' | 'equip' | 'flip' | 'unclassified'
  spellSpeed: SpellSpeed
  
  // When can this effect be activated?
  trigger?: TriggerEvent | TriggerEvent[]
  triggerCondition?: (state: GameState, card: GameCard, eventData?: unknown) => boolean
  
  // Where can this effect be activated from?
  activationLocations: Location[]
  
  // Restrictions
  oncePerTurn?: boolean
  oncePerTurnId?: string // Shared ID for "You can only use this effect of X once per turn"
  oncePerDuel?: boolean
  hardOncePerTurn?: boolean // "You can only use each effect of X once per turn"
  turnPlayerOnly?: boolean // Only activatable during your turn
  
  // Phase restrictions
  activationPhases?: DuelPhase[]
  
  // Cost to activate
  cost?: EffectCost | EffectCost[]
  
  // Targeting
  target?: EffectTarget
  
  // Activation condition (beyond trigger)
  condition?: (state: GameState, card: GameCard) => boolean
  
  // Actions to perform on resolution
  actions: EffectAction[]
  
  // For continuous effects that modify game state
  continuousModifiers?: {
    type: 'atk_boost' | 'def_boost' | 'cannot_attack' | 'cannot_target' | 'cannot_destroy' | 'negate_effects'
    value?: number
    filter?: CardFilter
    condition?: (state: GameState, card: GameCard) => boolean
  }[]
}

export interface CardScript {
  cardId: number
  cardName: string
  cardType: 'monster' | 'spell' | 'trap'
  subType?: string // normal, effect, ritual, fusion, etc. for monsters | normal, quick-play, continuous, etc. for spells/traps
  
  // Card effects
  effects: CardEffect[]
  
  // For monsters - summoning procedures
  summoningCondition?: (state: GameState, card: GameCard) => boolean
  cannotBeNormalSummoned?: boolean
  specialSummonCondition?: (state: GameState, card: GameCard) => boolean
  
  // For continuous spells/traps - while face-up on field effects
  whileFaceUp?: {
    modifiers: CardEffect['continuousModifiers']
    condition?: (state: GameState, card: GameCard) => boolean
  }
}

// ============================================
// CARD SCRIPT REGISTRY
// ============================================

const cardScriptRegistry = new Map<number, CardScript>()

export function registerCardScript(script: CardScript): void {
  cardScriptRegistry.set(script.cardId, script)
}

export function getCardScript(cardId: number): CardScript | undefined {
  return cardScriptRegistry.get(cardId)
}

export function hasCardScript(cardId: number): boolean {
  return cardScriptRegistry.has(cardId)
}

// ============================================
// HELPER FUNCTIONS FOR WRITING CARD SCRIPTS
// ============================================

export const Filters = {
  // Common monster filters
  monster: (): CardFilter => ({ cardType: ['monster'] }),
  spell: (): CardFilter => ({ cardType: ['spell'] }),
  trap: (): CardFilter => ({ cardType: ['trap'] }),
  
  level: (level: number): CardFilter => ({ level, cardType: ['monster'] }),
  levelOrLower: (max: number): CardFilter => ({ level: { max }, cardType: ['monster'] }),
  levelOrHigher: (min: number): CardFilter => ({ level: { min }, cardType: ['monster'] }),
  
  attribute: (attr: string): CardFilter => ({ attribute: [attr], cardType: ['monster'] }),
  type: (type: string): CardFilter => ({ monsterType: [type], cardType: ['monster'] }),
  
  nameContains: (text: string): CardFilter => ({ nameContains: text }),
  
  inLocation: (location: Location | Location[]): CardFilter => ({ 
    location: Array.isArray(location) ? location : [location] 
  }),
  
  controlledBy: (controller: 'self' | 'opponent' | 'any'): CardFilter => ({ controller }),
  
  faceUp: (): CardFilter => ({ position: ['face_up', 'attack'] }),
  faceDown: (): CardFilter => ({ position: ['face_down'] }),
  
  // Combine filters
  and: (...filters: CardFilter[]): CardFilter => {
    const combined: CardFilter = {}
    for (const filter of filters) {
      Object.assign(combined, filter)
    }
    return combined
  }
}

export const Actions = {
  draw: (count: number): EffectAction => ({ type: 'DRAW', count }),
  
  searchDeck: (filter: CardFilter): EffectAction => ({ 
    type: 'SEARCH_DECK', 
    filter, 
    from: 'deck',
    shuffleAfter: true 
  }),
  
  specialSummon: (filter: CardFilter, from: Location, position?: EffectAction['position']): EffectAction => ({
    type: 'SPECIAL_SUMMON',
    filter,
    from,
    position: position || 'face_up_attack'
  }),
  
  destroy: (useTargets = true): EffectAction => ({
    type: 'DESTROY',
    useTargets
  }),
  
  sendToGraveyard: (filter: CardFilter, from: Location): EffectAction => ({
    type: 'SEND_TO_GRAVEYARD',
    filter,
    from
  }),
  
  banish: (useTargets = true): EffectAction => ({
    type: 'BANISH',
    useTargets
  }),
  
  returnToHand: (useTargets = true): EffectAction => ({
    type: 'RETURN_TO_HAND',
    useTargets
  }),
  
  inflictDamage: (amount: number, target: 'opponent' | 'self' = 'opponent'): EffectAction => ({
    type: 'INFLICT_DAMAGE',
    amount,
    target
  }),
  
  gainLP: (amount: number): EffectAction => ({
    type: 'GAIN_LIFEPOINTS',
    amount,
    target: 'self'
  }),
  
  negateEffect: (): EffectAction => ({
    type: 'NEGATE_EFFECT',
    useTargets: true
  }),
  
  changeATK: (change: number, duration: EffectAction['duration'] = 'permanent'): EffectAction => ({
    type: 'CHANGE_ATK_DEF',
    atkChange: change,
    duration
  }),
  
  changeDEF: (change: number, duration: EffectAction['duration'] = 'permanent'): EffectAction => ({
    type: 'CHANGE_ATK_DEF',
    defChange: change,
    duration
  })
}

export const Costs = {
  discard: (amount: number, filter?: CardFilter): EffectCost => ({
    type: 'discard',
    amount,
    filter,
    from: ['hand']
  }),
  
  tribute: (amount: number, filter?: CardFilter): EffectCost => ({
    type: 'tribute',
    amount,
    filter,
    from: ['monster_zone']
  }),
  
  payLP: (amount: number): EffectCost => ({
    type: 'pay_lp',
    amount
  }),
  
  banishFromGY: (amount: number, filter?: CardFilter): EffectCost => ({
    type: 'banish',
    amount,
    filter,
    from: ['graveyard']
  }),
  
  sendToGY: (amount: number, filter?: CardFilter, from?: Location[]): EffectCost => ({
    type: 'send_to_gy',
    amount,
    filter,
    from: from || ['deck']
  })
}

export const Targets = {
  one: (filter: CardFilter, optional = false): EffectTarget => ({
    count: 1,
    filter,
    optional
  }),
  
  upTo: (max: number, filter: CardFilter): EffectTarget => ({
    count: 'up_to',
    upTo: max,
    filter,
    optional: true
  }),
  
  all: (filter: CardFilter): EffectTarget => ({
    count: 'all',
    filter
  })
}
