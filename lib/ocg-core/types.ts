/**
 * Type definitions for the OCG Core integration
 */

// Re-export types from ocgcore-wasm
export type {
  OcgCardData,
  OcgDuelHandle,
  OcgMessage,
  OcgResponse,
  OcgCardQueryInfo,
  OcgFieldState,
} from '@n1xx1/ocgcore-wasm'

export {
  OcgAttribute,
  OcgRace,
  OcgType,
  OcgLocation,
  OcgPosition,
  OcgDuelMode,
  OcgProcessResult,
  OcgLinkMarker,
} from '@n1xx1/ocgcore-wasm'

// Card data from our database
export interface CardDatabaseEntry {
  id: number
  name: string
  desc: string
  type: number
  atk?: number
  def?: number
  level?: number
  race?: number
  attribute?: number
  archetype?: number
  setcodes?: number[]
  linkval?: number
  linkmarkers?: number
  scale?: number
}

// Deck configuration
export interface DeckConfig {
  main: number[]  // Card codes for main deck
  extra: number[] // Card codes for extra deck
  side?: number[] // Card codes for side deck
}

// Player configuration for duel creation
export interface PlayerConfig {
  deck: DeckConfig
  startingLP?: number
  startingDrawCount?: number
  drawCountPerTurn?: number
}

// Duel creation options
export interface CreateDuelOptions {
  player1: PlayerConfig
  player2: PlayerConfig
  seed?: [bigint, bigint, bigint, bigint]
  mode?: bigint
  firstPlayer?: 0 | 1
}

// Game action types that players can take
export type GameAction =
  | { type: 'summon'; cardIndex: number; position: 'attack' | 'defense' }
  | { type: 'set_monster'; cardIndex: number }
  | { type: 'set_spelltrap'; cardIndex: number }
  | { type: 'activate'; cardIndex: number; effectIndex?: number }
  | { type: 'attack'; attackerIndex: number; targetIndex?: number }
  | { type: 'change_position'; cardIndex: number }
  | { type: 'flip_summon'; cardIndex: number }
  | { type: 'special_summon'; cardIndex: number; position: 'attack' | 'defense' }
  | { type: 'tribute_summon'; cardIndex: number; tributes: number[] }
  | { type: 'select_card'; indices: number[] }
  | { type: 'select_chain'; chainIndex: number }
  | { type: 'select_position'; position: number }
  | { type: 'select_option'; optionIndex: number }
  | { type: 'select_yes_no'; answer: boolean }
  | { type: 'select_number'; number: number }
  | { type: 'select_battle_command'; command: 'attack' | 'main2' | 'end' }
  | { type: 'select_idle_command'; command: 'summon' | 'set' | 'activate' | 'battle' | 'main2' | 'end' }
  | { type: 'pass' }

// Parsed game state for UI
export interface ParsedGameState {
  turn: number
  phase: GamePhase
  currentPlayer: 0 | 1
  players: [ParsedPlayerState, ParsedPlayerState]
  chain: ChainInfo[]
  waitingFor: WaitingState | null
}

export type GamePhase = 
  | 'draw'
  | 'standby'
  | 'main1'
  | 'battle_start'
  | 'battle_step'
  | 'damage'
  | 'damage_calc'
  | 'battle_end'
  | 'main2'
  | 'end'

export interface ParsedPlayerState {
  lp: number
  deck: number
  hand: ParsedCard[]
  monsterZone: (ParsedCard | null)[]
  spellTrapZone: (ParsedCard | null)[]
  graveyard: ParsedCard[]
  banished: ParsedCard[]
  extraDeck: ParsedCard[]
  fieldSpell: ParsedCard | null
  pendulumZone: [ParsedCard | null, ParsedCard | null]
}

export interface ParsedCard {
  code: number
  name: string
  desc: string
  position: 'face_up_attack' | 'face_up_defense' | 'face_down_attack' | 'face_down_defense'
  controller: 0 | 1
  owner: 0 | 1
  location: string
  sequence: number
  atk?: number
  def?: number
  level?: number
  type: number
  attribute?: number
  race?: number
  counters?: Record<number, number>
  isPublic: boolean
  canActivate?: boolean
  canSummon?: boolean
  canSet?: boolean
  canAttack?: boolean
  canChangePosition?: boolean
}

export interface ChainInfo {
  chainIndex: number
  card: ParsedCard
  description: string
  triggeringPlayer: 0 | 1
}

export type WaitingState =
  | { type: 'select_idle_command'; options: IdleCommandOption[] }
  | { type: 'select_battle_command'; options: BattleCommandOption[] }
  | { type: 'select_card'; cards: SelectableCard[]; min: number; max: number; cancelable: boolean; hint: string }
  | { type: 'select_chain'; chains: SelectableChain[]; forced: boolean }
  | { type: 'select_position'; positions: number[] }
  | { type: 'select_option'; options: SelectableOption[] }
  | { type: 'select_yes_no'; description: string }
  | { type: 'select_number'; min: number; max: number }
  | { type: 'select_effectyn'; card: ParsedCard; description: string }
  | { type: 'select_tribute'; cards: SelectableCard[]; min: number; max: number }
  | { type: 'select_sum'; cards: SelectableCard[]; target: number }
  | { type: 'select_unselect'; cards: SelectableCard[]; min: number; max: number; finishable: boolean }
  | { type: 'announce_card' }
  | { type: 'announce_number' }
  | { type: 'announce_race' }
  | { type: 'announce_attribute' }
  | { type: 'rock_paper_scissors' }

export interface IdleCommandOption {
  type: 'summon' | 'special_summon' | 'set_monster' | 'position_change' | 'set_spelltrap' | 'activate' | 'to_battle' | 'to_end' | 'shuffle'
  card?: ParsedCard
  effectIndex?: number
}

export interface BattleCommandOption {
  type: 'attack' | 'to_main2' | 'to_end'
  attacker?: ParsedCard
  directAttack?: boolean
}

export interface SelectableCard {
  card: ParsedCard
  selectable: boolean
  selected: boolean
}

export interface SelectableChain {
  card: ParsedCard
  description: string
  chainIndex: number
}

export interface SelectableOption {
  index: number
  description: string
}

// Duel events for UI updates
export type DuelEvent =
  | { type: 'game_start' }
  | { type: 'new_turn'; player: 0 | 1 }
  | { type: 'new_phase'; phase: GamePhase }
  | { type: 'draw'; player: 0 | 1; cards: ParsedCard[] }
  | { type: 'move'; card: ParsedCard; from: string; to: string }
  | { type: 'summon'; card: ParsedCard; position: string }
  | { type: 'special_summon'; card: ParsedCard; position: string }
  | { type: 'flip'; card: ParsedCard }
  | { type: 'attack'; attacker: ParsedCard; target?: ParsedCard; direct?: boolean }
  | { type: 'battle'; attacker: ParsedCard; defender?: ParsedCard; attackerDestroyed: boolean; defenderDestroyed: boolean }
  | { type: 'damage'; player: 0 | 1; amount: number; battle: boolean }
  | { type: 'recover'; player: 0 | 1; amount: number }
  | { type: 'chain_start'; card: ParsedCard; chainIndex: number }
  | { type: 'chain_end' }
  | { type: 'effect_result'; card: ParsedCard; description: string }
  | { type: 'destroy'; cards: ParsedCard[] }
  | { type: 'banish'; cards: ParsedCard[] }
  | { type: 'to_graveyard'; cards: ParsedCard[] }
  | { type: 'to_hand'; cards: ParsedCard[] }
  | { type: 'to_deck'; cards: ParsedCard[] }
  | { type: 'equip'; equipCard: ParsedCard; target: ParsedCard }
  | { type: 'counter'; card: ParsedCard; counterType: number; count: number }
  | { type: 'game_end'; winner: 0 | 1 | 'draw'; reason: string }
