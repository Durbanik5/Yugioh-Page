'use server'

import { Card } from '@/lib/types'

// YDK file format parser
// YDK files have sections: #main, #extra, !side
// Each section contains card IDs, one per line

interface ParsedYDK {
  main: number[]
  extra: number[]
  side: number[]
}

export async function parseYDKFile(content: string): Promise<ParsedYDK> {
  const lines = content.split('\n').map(line => line.trim())
  
  const result: ParsedYDK = {
    main: [],
    extra: [],
    side: [],
  }
  
  let currentSection: 'main' | 'extra' | 'side' | null = null
  
  for (const line of lines) {
    // Skip empty lines and comments
    if (!line || line.startsWith('#created') || line.startsWith('#')) {
      if (line === '#main') {
        currentSection = 'main'
      }
      continue
    }
    
    // Check for section markers
    if (line === '#extra') {
      currentSection = 'extra'
      continue
    }
    if (line === '!side') {
      currentSection = 'side'
      continue
    }
    
    // Parse card ID
    const cardId = parseInt(line, 10)
    if (!isNaN(cardId) && currentSection) {
      result[currentSection].push(cardId)
    }
  }
  
  return result
}

// Generate YDK file content from deck
export async function generateYDKContent(deck: {
  mainDeck: { card_id: number }[]
  extraDeck: { card_id: number }[]
  sideDeck?: { card_id: number }[]
}): Promise<string> {
  const lines: string[] = []
  
  lines.push('#created by YuGiOh Page')
  lines.push('#main')
  deck.mainDeck.forEach(card => lines.push(String(card.card_id)))
  
  lines.push('#extra')
  deck.extraDeck.forEach(card => lines.push(String(card.card_id)))
  
  lines.push('!side')
  if (deck.sideDeck) {
    deck.sideDeck.forEach(card => lines.push(String(card.card_id)))
  }
  
  return lines.join('\n')
}

// Deck validation rules
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface DeckToValidate {
  mainDeck: Card[]
  extraDeck: Card[]
  sideDeck?: Card[]
}

interface BanlistEntry {
  card_id: number
  status: 'forbidden' | 'limited' | 'semi-limited'
}

export async function validateDeck(
  deck: DeckToValidate,
  banlist?: BanlistEntry[]
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Main deck size validation (40-60 cards)
  if (deck.mainDeck.length < 40) {
    errors.push(`Main deck must have at least 40 cards (currently ${deck.mainDeck.length})`)
  }
  if (deck.mainDeck.length > 60) {
    errors.push(`Main deck cannot exceed 60 cards (currently ${deck.mainDeck.length})`)
  }
  
  // Extra deck size validation (0-15 cards)
  if (deck.extraDeck.length > 15) {
    errors.push(`Extra deck cannot exceed 15 cards (currently ${deck.extraDeck.length})`)
  }
  
  // Side deck size validation (0 or 15 cards)
  if (deck.sideDeck && deck.sideDeck.length > 0 && deck.sideDeck.length !== 15) {
    warnings.push(`Side deck should have exactly 15 cards (currently ${deck.sideDeck.length})`)
  }
  
  // Count copies of each card
  const cardCounts = new Map<number, number>()
  const allCards = [
    ...deck.mainDeck,
    ...deck.extraDeck,
    ...(deck.sideDeck || []),
  ]
  
  allCards.forEach(card => {
    const id = card.id
    cardCounts.set(id, (cardCounts.get(id) || 0) + 1)
  })
  
  // Check for more than 3 copies
  cardCounts.forEach((count, cardId) => {
    if (count > 3) {
      const card = allCards.find(c => c.id === cardId)
      errors.push(`${card?.name || `Card ${cardId}`} has more than 3 copies (${count})`)
    }
  })
  
  // Check banlist if provided
  if (banlist) {
    const banlistMap = new Map(banlist.map(b => [b.card_id, b.status]))
    
    cardCounts.forEach((count, cardId) => {
      const status = banlistMap.get(cardId)
      const card = allCards.find(c => c.id === cardId)
      const cardName = card?.name || `Card ${cardId}`
      
      if (status === 'forbidden' && count > 0) {
        errors.push(`${cardName} is Forbidden`)
      } else if (status === 'limited' && count > 1) {
        errors.push(`${cardName} is Limited (max 1 copy, found ${count})`)
      } else if (status === 'semi-limited' && count > 2) {
        errors.push(`${cardName} is Semi-Limited (max 2 copies, found ${count})`)
      }
    })
  }
  
  // Check for Extra Deck monsters in Main Deck
  const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link']
  deck.mainDeck.forEach(card => {
    const cardType = (card.type || '').toLowerCase()
    if (extraDeckTypes.some(t => cardType.includes(t))) {
      errors.push(`${card.name} is an Extra Deck monster and cannot be in the Main Deck`)
    }
  })
  
  // Check for Main Deck monsters in Extra Deck
  deck.extraDeck.forEach(card => {
    const cardType = (card.type || '').toLowerCase()
    if (!extraDeckTypes.some(t => cardType.includes(t))) {
      errors.push(`${card.name} is not an Extra Deck monster and cannot be in the Extra Deck`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Fetch card data from YGOProDeck API for imported IDs
export async function fetchCardsFromIds(cardIds: number[]): Promise<Card[]> {
  const uniqueIds = [...new Set(cardIds)]
  const cards: Card[] = []
  
  // Fetch in batches to avoid API limits
  const batchSize = 50
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize)
    const idsParam = batch.join(',')
    
    try {
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${idsParam}`
      )
      
      if (!response.ok) {
        console.error(`Failed to fetch cards: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.data) {
        cards.push(...data.data.map((card: Record<string, unknown>) => ({
          id: card.id as number,
          name: card.name as string,
          type: card.type as string,
          desc: card.desc as string,
          atk: card.atk as number | undefined,
          def: card.def as number | undefined,
          level: card.level as number | undefined,
          race: card.race as string,
          attribute: card.attribute as string | undefined,
          card_images: card.card_images as Array<{ image_url: string }>,
        })))
      }
    } catch (error) {
      console.error('Error fetching cards:', error)
    }
  }
  
  // Return cards in the order of the original IDs (with duplicates)
  return cardIds.map(id => cards.find(c => c.id === id)).filter((c): c is Card => c !== undefined)
}
