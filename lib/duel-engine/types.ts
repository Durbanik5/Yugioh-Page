// Yu-Gi-Oh! Duel Engine Types
// Based on official OCG/TCG rulings and YGOPro/EDOPro engine patterns

export type Phase = 
  | 'draw'
  | 'standby'
  | 'main1'
  | 'battle_start'
  | 'battle_step'
  | 'damage_step'
  | 'battle_end'
  | 'main2'
  | 'end'

export type SpellSpeed = 1 | 2 | 3

export type CardCategory = 
  | 'normal_monster'
  | 'effect_monster'
  | 'ritual_monster'
  | 'fusion_monster'
  | 'synchro_monster'
  | 'xyz_monster'
  | 'pendulum_monster'
  | 'link_monster'
  | 'normal_spell'
  | 'quickplay_spell'
  | 'continuous_spell'
  | 'equip_spell'
  | 'field_spell'
  | 'ritual_spell'
  | 'normal_trap'
  | 'continuous_trap'
  | 'counter_trap'

export type MonsterPosition = 
  | 'face_up_attack'
  | 'face_up_defense'
  | 'face_down_defense'

export type SpellTrapPosition = 
  | 'face_up'
  | 'face_down'

export type SummonType = 
  | 'normal'
  | 'tribute'
  | 'set'
  | 'special'
  | 'flip'
  | 'ritual'
  | 'fusion'
  | 'synchro'
  | 'xyz'
  | 'pendulum'
  | 'link'

export type Location = 
  | 'deck'
  | 'hand'
  | 'monster_zone'
  | 'spell_zone'
  | 'field_zone'
  | 'graveyard'
  | 'banished'
  | 'extra_deck'
  | 'pendulum_zone'

export interface GameCard {
  id: string
  cardId: number // YGOProDeck API ID
  name: string
  category: CardCategory
  level?: number
  rank?: number
  linkRating?: number
  attack?: number
  defense?: number
  attribute?: string
  race?: string // Monster type (Warrior, Dragon, etc.)
  effectText: string
  
  // Runtime state
  location: Location
  zoneIndex: number | null
  position: MonsterPosition | SpellTrapPosition | 'face_down'
  ownerId: string
  controllerId: string // Can differ from owner (e.g., Change of Heart)
  counters: Record<string, number>
  equipCards: string[] // IDs of cards equipped to this
  equippedTo?: string // ID of card this is equipped to
  materials?: string[] // XYZ materials, Fusion materials stored
  isRevealed: boolean
  turnSet?: number // Turn this card was set
  turnSummoned?: number // Turn this card was summoned
  hasAttacked: boolean
  hasChangedPosition: boolean
  attacksDeclared: number
}

export interface PlayerState {
  id: string
  lifePoints: number
  hasNormalSummoned: boolean
  hasDrawnForTurn: boolean
  cannotDrawNextTurn: boolean
  skipPhases: Phase[]
}

export interface ChainLink {
  cardId: string
  effectIndex: number
  activatingPlayer: string
  spellSpeed: SpellSpeed
  targets?: string[]
  cost?: () => Promise<boolean>
  resolve: () => Promise<void>
}

export interface GameState {
  roomId: string
  turnPlayer: string
  turnCount: number
  phase: Phase
  players: Record<string, PlayerState>
  cards: GameCard[]
  chain: ChainLink[]
  isChainBuilding: boolean
  priorityPlayer: string | null
  
  // Flags for the current turn/phase
  canNormalSummon: boolean
  battlePhaseEnabled: boolean // First turn player cannot battle
  
  // Pending actions waiting for response
  pendingAction?: {
    type: 'summon' | 'activate' | 'attack' | 'effect'
    playerId: string
    cardId: string
    data?: Record<string, unknown>
  }
  
  // Response window state
  responseWindow?: {
    askingPlayer: string
    timeoutAt: number
    reason: string
  }
}

export interface ActionResult {
  success: boolean
  error?: string
  newState?: Partial<GameState>
  log?: string
}

export interface SummonAttempt {
  cardId: string
  playerId: string
  summonType: SummonType
  position: MonsterPosition
  zoneIndex?: number
  tributeIds?: string[]
  materials?: string[] // For Fusion/Synchro/XYZ/Link
}

export interface ActivationAttempt {
  cardId: string
  playerId: string
  effectIndex?: number // For cards with multiple effects
  targets?: string[]
  chainLink?: number // Position in chain (1, 2, 3...)
}

export interface AttackDeclaration {
  attackerId: string
  targetId?: string // undefined = direct attack
  playerId: string
}

// Effect definition for card scripting
export interface EffectDefinition {
  id: string
  cardId: number // YGOProDeck card ID
  name: string
  type: 'ignition' | 'trigger' | 'quick' | 'continuous' | 'field' | 'equip'
  spellSpeed: SpellSpeed
  
  // Conditions
  canActivate?: (state: GameState, card: GameCard) => boolean
  activationLocation?: Location[]
  oncePerTurn?: boolean
  oncePerDuel?: boolean
  
  // Cost
  cost?: {
    type: 'discard' | 'tribute' | 'banish' | 'lifepoints' | 'send_to_gy' | 'custom'
    amount?: number
    filter?: (card: GameCard) => boolean
    execute: (state: GameState, selected: string[]) => Promise<boolean>
  }
  
  // Targeting
  targeting?: {
    required: boolean
    count: number | 'any'
    filter: (card: GameCard, state: GameState) => boolean
    location: Location[]
  }
  
  // Resolution
  resolve: (state: GameState, card: GameCard, targets?: string[]) => Promise<GameState>
}
