// Yu-Gi-Oh! Duel Engine Constants
// Official game rules and constants

export const STARTING_LIFE_POINTS = 8000
export const STARTING_HAND_SIZE = 5
export const MAX_HAND_SIZE = 6 // For end phase discard
export const MAX_CARDS_IN_DECK = 60
export const MIN_CARDS_IN_DECK = 40
export const MAX_EXTRA_DECK = 15
export const MAX_SIDE_DECK = 15

// Zone counts
export const MONSTER_ZONES = 5
export const SPELL_ZONES = 5
export const PENDULUM_ZONES = 2
export const EXTRA_MONSTER_ZONES = 2

// Tribute requirements by level
export const TRIBUTE_REQUIREMENTS: Record<number, number> = {
  1: 0, 2: 0, 3: 0, 4: 0,  // Level 1-4: No tribute
  5: 1, 6: 1,              // Level 5-6: 1 tribute
  7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2 // Level 7+: 2 tributes
}

// Phase order
export const PHASE_ORDER: readonly string[] = [
  'draw',
  'standby',
  'main1',
  'battle_start',
  'battle_step',
  'damage_step',
  'battle_end',
  'main2',
  'end'
] as const

// Phases that can be skipped
export const SKIPPABLE_PHASES = ['battle_start', 'main2'] as const

// Card categories that are monsters
export const MONSTER_CATEGORIES = [
  'normal_monster',
  'effect_monster',
  'ritual_monster',
  'fusion_monster',
  'synchro_monster',
  'xyz_monster',
  'pendulum_monster',
  'link_monster'
] as const

// Card categories that go in the Extra Deck
export const EXTRA_DECK_CATEGORIES = [
  'fusion_monster',
  'synchro_monster',
  'xyz_monster',
  'link_monster',
  'pendulum_monster' // Only when sent from field
] as const

// Spell categories
export const SPELL_CATEGORIES = [
  'normal_spell',
  'quickplay_spell',
  'continuous_spell',
  'equip_spell',
  'field_spell',
  'ritual_spell'
] as const

// Trap categories
export const TRAP_CATEGORIES = [
  'normal_trap',
  'continuous_trap',
  'counter_trap'
] as const

// Spell Speed by card type
export const SPELL_SPEED_BY_CATEGORY: Record<string, number> = {
  // Spell Speed 1
  'normal_spell': 1,
  'continuous_spell': 1,
  'equip_spell': 1,
  'field_spell': 1,
  'ritual_spell': 1,
  'normal_monster': 1, // Ignition effects
  'effect_monster': 1, // Ignition effects
  
  // Spell Speed 2
  'quickplay_spell': 2,
  'normal_trap': 2,
  'continuous_trap': 2,
  
  // Spell Speed 3
  'counter_trap': 3
}

// Cards that stay on field after activation
export const STAYS_ON_FIELD = [
  'continuous_spell',
  'continuous_trap',
  'equip_spell',
  'field_spell'
] as const

// Cards that go to GY after resolution
export const GOES_TO_GY_AFTER_RESOLUTION = [
  'normal_spell',
  'quickplay_spell',
  'ritual_spell',
  'normal_trap'
] as const

// Response window timeout (milliseconds)
export const RESPONSE_WINDOW_TIMEOUT = 30000 // 30 seconds

// Animation delays (milliseconds)
export const ANIMATION_DELAYS = {
  cardDraw: 500,
  summon: 800,
  attack: 1000,
  effect: 600,
  chainLink: 400,
  damageCalculation: 1200
} as const

// Log message types
export const LOG_TYPES = {
  DRAW: 'draw',
  SUMMON: 'summon',
  SET: 'set',
  ACTIVATE: 'activate',
  ATTACK: 'attack',
  BATTLE: 'battle',
  EFFECT: 'effect',
  CHAIN: 'chain',
  PHASE: 'phase',
  TURN: 'turn',
  WIN: 'win',
  LOSE: 'lose'
} as const

// Map YGOProDeck type strings to our categories
export function mapApiTypeToCategory(apiType: string): string {
  const type = apiType.toLowerCase()
  
  // Monsters
  if (type.includes('normal monster')) return 'normal_monster'
  if (type.includes('effect monster')) return 'effect_monster'
  if (type.includes('ritual monster')) return 'ritual_monster'
  if (type.includes('fusion monster')) return 'fusion_monster'
  if (type.includes('synchro monster')) return 'synchro_monster'
  if (type.includes('xyz monster')) return 'xyz_monster'
  if (type.includes('pendulum')) return 'pendulum_monster'
  if (type.includes('link monster')) return 'link_monster'
  
  // Spells
  if (type === 'spell card' || type.includes('normal spell')) return 'normal_spell'
  if (type.includes('quick-play')) return 'quickplay_spell'
  if (type.includes('continuous spell')) return 'continuous_spell'
  if (type.includes('equip spell')) return 'equip_spell'
  if (type.includes('field spell')) return 'field_spell'
  if (type.includes('ritual spell')) return 'ritual_spell'
  
  // Traps
  if (type === 'trap card' || type.includes('normal trap')) return 'normal_trap'
  if (type.includes('continuous trap')) return 'continuous_trap'
  if (type.includes('counter trap')) return 'counter_trap'
  
  // Default fallback
  if (type.includes('monster')) return 'effect_monster'
  if (type.includes('spell')) return 'normal_spell'
  if (type.includes('trap')) return 'normal_trap'
  
  return 'effect_monster'
}

// Check if a card category is a monster
export function isMonsterCategory(category: string): boolean {
  return MONSTER_CATEGORIES.includes(category as typeof MONSTER_CATEGORIES[number])
}

// Check if a card category is a spell
export function isSpellCategory(category: string): boolean {
  return SPELL_CATEGORIES.includes(category as typeof SPELL_CATEGORIES[number])
}

// Check if a card category is a trap
export function isTrapCategory(category: string): boolean {
  return TRAP_CATEGORIES.includes(category as typeof TRAP_CATEGORIES[number])
}

// Check if a card category goes in the Extra Deck
export function isExtraDeckCategory(category: string): boolean {
  return EXTRA_DECK_CATEGORIES.includes(category as typeof EXTRA_DECK_CATEGORIES[number])
}
