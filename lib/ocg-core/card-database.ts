/**
 * Card Database Integration
 * 
 * Provides card data to the OCG Core from YGOProDeck API
 * and caches it for performance.
 */

import type { OcgCardData } from '@n1xx1/ocgcore-wasm'
import type { CardDatabaseEntry } from './types'

// In-memory cache for card data
const cardCache = new Map<number, OcgCardData>()
const cardInfoCache = new Map<number, CardDatabaseEntry>()

// YGOProDeck card type mappings to OCG types
const TYPE_MONSTER = 0x1
const TYPE_SPELL = 0x2
const TYPE_TRAP = 0x4
const TYPE_NORMAL = 0x10
const TYPE_EFFECT = 0x20
const TYPE_FUSION = 0x40
const TYPE_RITUAL = 0x80
const TYPE_SYNCHRO = 0x2000
const TYPE_XYZ = 0x800000
const TYPE_PENDULUM = 0x1000000
const TYPE_LINK = 0x4000000
const TYPE_QUICKPLAY = 0x10000
const TYPE_CONTINUOUS = 0x20000
const TYPE_EQUIP = 0x40000
const TYPE_FIELD = 0x80000
const TYPE_COUNTER = 0x100000
const TYPE_FLIP = 0x200000
const TYPE_TUNER = 0x1000
const TYPE_UNION = 0x400000
const TYPE_SPIRIT = 0x200
const TYPE_TOON = 0x400
const TYPE_GEMINI = 0x800

// Race/Type mappings
const RACE_MAP: Record<string, bigint> = {
  'Warrior': 0x1n,
  'Spellcaster': 0x2n,
  'Fairy': 0x4n,
  'Fiend': 0x8n,
  'Zombie': 0x10n,
  'Machine': 0x20n,
  'Aqua': 0x40n,
  'Pyro': 0x80n,
  'Rock': 0x100n,
  'Winged Beast': 0x200n,
  'Plant': 0x400n,
  'Insect': 0x800n,
  'Thunder': 0x1000n,
  'Dragon': 0x2000n,
  'Beast': 0x4000n,
  'Beast-Warrior': 0x8000n,
  'Dinosaur': 0x10000n,
  'Fish': 0x20000n,
  'Sea Serpent': 0x40000n,
  'Reptile': 0x80000n,
  'Psychic': 0x100000n,
  'Divine-Beast': 0x200000n,
  'Creator God': 0x400000n,
  'Wyrm': 0x800000n,
  'Cyberse': 0x1000000n,
  'Illusion': 0x2000000n,
}

// Attribute mappings
const ATTRIBUTE_MAP: Record<string, number> = {
  'EARTH': 1,
  'WATER': 2,
  'FIRE': 4,
  'WIND': 8,
  'LIGHT': 16,
  'DARK': 32,
  'DIVINE': 64,
}

// Link marker mappings
const LINK_MARKER_MAP: Record<string, number> = {
  'Bottom-Left': 0x001,
  'Bottom': 0x002,
  'Bottom-Right': 0x004,
  'Left': 0x008,
  'Right': 0x020,
  'Top-Left': 0x040,
  'Top': 0x080,
  'Top-Right': 0x100,
}

/**
 * Convert YGOProDeck card type string to OCG type flags
 */
function parseCardType(type: string): number {
  let result = 0
  const typeLower = type.toLowerCase()
  
  if (typeLower.includes('monster')) result |= TYPE_MONSTER
  if (typeLower.includes('spell')) result |= TYPE_SPELL
  if (typeLower.includes('trap')) result |= TYPE_TRAP
  if (typeLower.includes('normal') && !typeLower.includes('spell') && !typeLower.includes('trap')) result |= TYPE_NORMAL
  if (typeLower.includes('effect')) result |= TYPE_EFFECT
  if (typeLower.includes('fusion')) result |= TYPE_FUSION
  if (typeLower.includes('ritual')) result |= TYPE_RITUAL
  if (typeLower.includes('synchro')) result |= TYPE_SYNCHRO
  if (typeLower.includes('xyz')) result |= TYPE_XYZ
  if (typeLower.includes('pendulum')) result |= TYPE_PENDULUM
  if (typeLower.includes('link')) result |= TYPE_LINK
  if (typeLower.includes('quick-play')) result |= TYPE_QUICKPLAY
  if (typeLower.includes('continuous')) result |= TYPE_CONTINUOUS
  if (typeLower.includes('equip')) result |= TYPE_EQUIP
  if (typeLower.includes('field')) result |= TYPE_FIELD
  if (typeLower.includes('counter')) result |= TYPE_COUNTER
  if (typeLower.includes('flip')) result |= TYPE_FLIP
  if (typeLower.includes('tuner')) result |= TYPE_TUNER
  if (typeLower.includes('union')) result |= TYPE_UNION
  if (typeLower.includes('spirit')) result |= TYPE_SPIRIT
  if (typeLower.includes('toon')) result |= TYPE_TOON
  if (typeLower.includes('gemini')) result |= TYPE_GEMINI
  
  return result
}

/**
 * Convert link marker array to bitmask
 */
function parseLinkMarkers(markers?: string[]): number {
  if (!markers) return 0
  let result = 0
  for (const marker of markers) {
    if (LINK_MARKER_MAP[marker]) {
      result |= LINK_MARKER_MAP[marker]
    }
  }
  return result
}

/**
 * Fetch card data from YGOProDeck API
 */
export async function fetchCardFromAPI(code: number): Promise<CardDatabaseEntry | null> {
  // Check cache first
  if (cardInfoCache.has(code)) {
    return cardInfoCache.get(code)!
  }
  
  try {
    const response = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${code}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.data || data.data.length === 0) return null
    
    const card = data.data[0]
    const entry: CardDatabaseEntry = {
      id: card.id,
      name: card.name,
      desc: card.desc,
      type: parseCardType(card.type),
      atk: card.atk,
      def: card.def,
      level: card.level || card.linkval,
      race: card.race ? Number(RACE_MAP[card.race] || 0n) : 0,
      attribute: card.attribute ? ATTRIBUTE_MAP[card.attribute] || 0 : 0,
      linkval: card.linkval,
      linkmarkers: parseLinkMarkers(card.linkmarkers),
      scale: card.scale,
    }
    
    cardInfoCache.set(code, entry)
    return entry
  } catch (error) {
    console.error(`[v0] Error fetching card ${code}:`, error)
    return null
  }
}

/**
 * Batch fetch multiple cards
 */
export async function fetchCardsFromAPI(codes: number[]): Promise<Map<number, CardDatabaseEntry>> {
  const result = new Map<number, CardDatabaseEntry>()
  const uncached: number[] = []
  
  // Check cache first
  for (const code of codes) {
    if (cardInfoCache.has(code)) {
      result.set(code, cardInfoCache.get(code)!)
    } else {
      uncached.push(code)
    }
  }
  
  if (uncached.length === 0) return result
  
  // Batch fetch uncached cards (YGOProDeck supports multiple IDs)
  try {
    const idsParam = uncached.join(',')
    const response = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${idsParam}`,
      { next: { revalidate: 86400 } }
    )
    
    if (response.ok) {
      const data = await response.json()
      if (data.data) {
        for (const card of data.data) {
          const entry: CardDatabaseEntry = {
            id: card.id,
            name: card.name,
            desc: card.desc,
            type: parseCardType(card.type),
            atk: card.atk,
            def: card.def,
            level: card.level || card.linkval,
            race: card.race ? Number(RACE_MAP[card.race] || 0n) : 0,
            attribute: card.attribute ? ATTRIBUTE_MAP[card.attribute] || 0 : 0,
            linkval: card.linkval,
            linkmarkers: parseLinkMarkers(card.linkmarkers),
            scale: card.scale,
          }
          cardInfoCache.set(card.id, entry)
          result.set(card.id, entry)
        }
      }
    }
  } catch (error) {
    console.error('[v0] Error batch fetching cards:', error)
  }
  
  return result
}

/**
 * Convert CardDatabaseEntry to OcgCardData format
 */
export function toOcgCardData(entry: CardDatabaseEntry): OcgCardData {
  return {
    code: entry.id,
    alias: 0, // Could be fetched from DB if needed
    setcodes: entry.setcodes || [],
    type: entry.type,
    level: entry.level || 0,
    attribute: entry.attribute || 0,
    race: BigInt(entry.race || 0),
    attack: entry.atk ?? 0,
    defense: entry.def ?? 0,
    lscale: entry.scale || 0,
    rscale: entry.scale || 0,
    link_marker: entry.linkmarkers || 0,
  }
}

/**
 * Create a card reader function for the OCG core
 */
export function createCardReader() {
  return async (code: number): Promise<OcgCardData | null> => {
    // Check cache
    if (cardCache.has(code)) {
      return cardCache.get(code)!
    }
    
    // Fetch from API
    const entry = await fetchCardFromAPI(code)
    if (!entry) return null
    
    const ocgData = toOcgCardData(entry)
    cardCache.set(code, ocgData)
    return ocgData
  }
}

/**
 * Synchronous card reader using pre-loaded cache
 */
export function createSyncCardReader(preloadedCards: Map<number, OcgCardData>) {
  return (code: number): OcgCardData | null => {
    return preloadedCards.get(code) || cardCache.get(code) || null
  }
}

/**
 * Preload cards for a deck
 */
export async function preloadDeck(codes: number[]): Promise<Map<number, OcgCardData>> {
  const uniqueCodes = [...new Set(codes)]
  const entries = await fetchCardsFromAPI(uniqueCodes)
  
  const result = new Map<number, OcgCardData>()
  for (const [code, entry] of entries) {
    const ocgData = toOcgCardData(entry)
    cardCache.set(code, ocgData)
    result.set(code, ocgData)
  }
  
  return result
}

/**
 * Get card info (name, description) for UI display
 */
export function getCardInfo(code: number): CardDatabaseEntry | null {
  return cardInfoCache.get(code) || null
}

/**
 * Clear all caches
 */
export function clearCardCaches() {
  cardCache.clear()
  cardInfoCache.clear()
}
