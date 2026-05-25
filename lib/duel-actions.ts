'use server'

import { createClient } from '@/lib/supabase/server'
import type { DuelGameCard, CardLocation, CardPosition, DuelCardType } from '@/lib/types'

// Initialize a player's deck for the duel
export async function initializeDuelDeck(
  roomId: string,
  playerId: string,
  deckId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get the deck's cards
  const { data: deckCards, error: deckError } = await supabase
    .from('deck_cards')
    .select('*')
    .eq('deck_id', deckId)

  if (deckError || !deckCards) {
    return { success: false, error: 'Failed to fetch deck cards' }
  }

  // Clear any existing cards for this player in this room
  await supabase
    .from('duel_game_cards')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId)

  // Separate main deck and extra deck cards
  const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link']
  const mainDeckCards: typeof deckCards = []
  const extraDeckCards: typeof deckCards = []

  for (const card of deckCards) {
    const cardTypeLower = (card.card_type || '').toLowerCase()
    if (extraDeckTypes.some(t => cardTypeLower.includes(t))) {
      extraDeckCards.push(card)
    } else {
      mainDeckCards.push(card)
    }
  }

  // Shuffle main deck
  const shuffledMainDeck = [...mainDeckCards].sort(() => Math.random() - 0.5)

  // Insert all cards into duel_game_cards
  const cardsToInsert = [
    ...shuffledMainDeck.map((card, index) => ({
      room_id: roomId,
      player_id: playerId,
      card_name: card.card_name,
      card_id: card.card_id,
      card_type: mapCardType(card.card_type),
      location: 'deck' as CardLocation,
      zone_index: null,
      position: 'face_down' as CardPosition,
      attack: card.attack,
      defense: card.defense,
      level: card.level,
      attribute: card.attribute,
      order_index: index,
    })),
    ...extraDeckCards.map((card, index) => ({
      room_id: roomId,
      player_id: playerId,
      card_name: card.card_name,
      card_id: card.card_id,
      card_type: mapCardType(card.card_type),
      location: 'extra_deck' as CardLocation,
      zone_index: null,
      position: 'face_down' as CardPosition,
      attack: card.attack,
      defense: card.defense,
      level: card.level,
      attribute: card.attribute,
      order_index: index,
    })),
  ]

  const { error: insertError } = await supabase
    .from('duel_game_cards')
    .insert(cardsToInsert)

  if (insertError) {
    return { success: false, error: 'Failed to initialize deck' }
  }

  return { success: true }
}

function mapCardType(type: string | null): DuelCardType {
  if (!type) return 'monster'
  const lower = type.toLowerCase()
  if (lower.includes('fusion')) return 'fusion'
  if (lower.includes('synchro')) return 'synchro'
  if (lower.includes('xyz')) return 'xyz'
  if (lower.includes('link')) return 'link'
  if (lower.includes('pendulum')) return 'pendulum'
  if (lower.includes('spell')) return 'spell'
  if (lower.includes('trap')) return 'trap'
  return 'monster'
}

// Draw cards from deck to hand
export async function drawCards(
  roomId: string,
  playerId: string,
  count: number = 1
): Promise<{ success: boolean; drawnCards?: DuelGameCard[]; error?: string }> {
  const supabase = await createClient()

  // Get top cards from deck
  const { data: deckCards, error: fetchError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .eq('location', 'deck')
    .order('order_index', { ascending: true })
    .limit(count)

  if (fetchError || !deckCards || deckCards.length === 0) {
    return { success: false, error: 'No cards to draw' }
  }

  // Move cards to hand
  const cardIds = deckCards.map(c => c.id)
  const { error: updateError } = await supabase
    .from('duel_game_cards')
    .update({ location: 'hand', position: 'face_up_attack' })
    .in('id', cardIds)

  if (updateError) {
    return { success: false, error: 'Failed to draw cards' }
  }

  // Update hand count in participant
  await supabase.rpc('increment_hand_count', { 
    p_room_id: roomId, 
    p_player_id: playerId, 
    p_amount: count 
  }).catch(() => {
    // Fallback if RPC doesn't exist
  })

  return { success: true, drawnCards: deckCards as DuelGameCard[] }
}

// Summon a monster from hand to field
export async function summonMonster(
  cardId: string,
  zoneIndex: number,
  position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'monster_zone', 
      zone_index: zoneIndex, 
      position 
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to summon monster' }
  }

  return { success: true }
}

// Set a spell/trap from hand
export async function setSpellTrap(
  cardId: string,
  zoneIndex: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'spell_zone', 
      zone_index: zoneIndex, 
      position: 'face_down' 
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to set card' }
  }

  return { success: true }
}

// Activate a spell/trap
export async function activateSpellTrap(
  cardId: string,
  zoneIndex: number | null = null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { 
    position: 'face_up_attack',
    is_revealed: true
  }
  
  if (zoneIndex !== null) {
    updateData.location = 'spell_zone'
    updateData.zone_index = zoneIndex
  }

  const { error } = await supabase
    .from('duel_game_cards')
    .update(updateData)
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to activate card' }
  }

  return { success: true }
}

// Activate field spell
export async function activateFieldSpell(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'field_zone', 
      zone_index: 0,
      position: 'face_up_attack',
      is_revealed: true
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to activate field spell' }
  }

  return { success: true }
}

// Flip a face-down card face-up
export async function flipCard(
  cardId: string,
  newPosition: 'face_up_attack' | 'face_up_defense' = 'face_up_attack'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ position: newPosition, is_revealed: true })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to flip card' }
  }

  return { success: true }
}

// Change monster position
export async function changePosition(
  cardId: string,
  newPosition: CardPosition
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ position: newPosition })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to change position' }
  }

  return { success: true }
}

// Send card to graveyard
export async function sendToGraveyard(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get max order_index in graveyard for this player
  const { data: card } = await supabase
    .from('duel_game_cards')
    .select('room_id, player_id')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { success: false, error: 'Card not found' }
  }

  const { data: graveyardCards } = await supabase
    .from('duel_game_cards')
    .select('order_index')
    .eq('room_id', card.room_id)
    .eq('player_id', card.player_id)
    .eq('location', 'graveyard')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (graveyardCards?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'graveyard', 
      zone_index: null, 
      position: 'face_up_attack',
      is_revealed: true,
      order_index: nextIndex
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to send to graveyard' }
  }

  return { success: true }
}

// Banish a card
export async function banishCard(
  cardId: string,
  faceDown: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: card } = await supabase
    .from('duel_game_cards')
    .select('room_id, player_id')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { success: false, error: 'Card not found' }
  }

  const { data: banishedCards } = await supabase
    .from('duel_game_cards')
    .select('order_index')
    .eq('room_id', card.room_id)
    .eq('player_id', card.player_id)
    .eq('location', 'banished')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (banishedCards?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'banished', 
      zone_index: null, 
      position: faceDown ? 'face_down' : 'face_up_attack',
      is_revealed: !faceDown,
      order_index: nextIndex
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to banish card' }
  }

  return { success: true }
}

// Return card to hand
export async function returnToHand(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'hand', 
      zone_index: null, 
      position: 'face_up_attack'
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to return to hand' }
  }

  return { success: true }
}

// Return card to deck (top or shuffle)
export async function returnToDeck(
  cardId: string,
  toTop: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: card } = await supabase
    .from('duel_game_cards')
    .select('room_id, player_id')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { success: false, error: 'Card not found' }
  }

  let orderIndex = 0
  if (toTop) {
    // Get minimum order_index and go below it
    const { data: deckCards } = await supabase
      .from('duel_game_cards')
      .select('order_index')
      .eq('room_id', card.room_id)
      .eq('player_id', card.player_id)
      .eq('location', 'deck')
      .order('order_index', { ascending: true })
      .limit(1)
    
    orderIndex = (deckCards?.[0]?.order_index ?? 1) - 1
  } else {
    // Get max order_index for random position
    const { data: deckCards } = await supabase
      .from('duel_game_cards')
      .select('order_index')
      .eq('room_id', card.room_id)
      .eq('player_id', card.player_id)
      .eq('location', 'deck')
      .order('order_index', { ascending: false })
      .limit(1)
    
    const maxIndex = deckCards?.[0]?.order_index ?? 0
    orderIndex = Math.floor(Math.random() * (maxIndex + 1))
  }

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'deck', 
      zone_index: null, 
      position: 'face_down',
      is_revealed: false,
      order_index: orderIndex
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to return to deck' }
  }

  return { success: true }
}

// Special summon from extra deck
export async function specialSummonFromExtra(
  cardId: string,
  zoneIndex: number,
  position: 'face_up_attack' | 'face_up_defense' = 'face_up_attack'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ 
      location: 'monster_zone', 
      zone_index: zoneIndex, 
      position,
      is_revealed: true
    })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to special summon' }
  }

  return { success: true }
}

// Add/remove counters
export async function updateCounters(
  cardId: string,
  counterChange: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: card } = await supabase
    .from('duel_game_cards')
    .select('counters')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { success: false, error: 'Card not found' }
  }

  const newCounters = Math.max(0, (card.counters || 0) + counterChange)

  const { error } = await supabase
    .from('duel_game_cards')
    .update({ counters: newCounters })
    .eq('id', cardId)

  if (error) {
    return { success: false, error: 'Failed to update counters' }
  }

  return { success: true }
}

// Get all cards for a duel room
export async function getDuelCards(
  roomId: string
): Promise<{ cards: DuelGameCard[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('room_id', roomId)
    .order('order_index', { ascending: true })

  if (error) {
    return { cards: [], error: 'Failed to fetch cards' }
  }

  return { cards: data as DuelGameCard[] }
}

// Shuffle deck
export async function shuffleDeck(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: deckCards, error: fetchError } = await supabase
    .from('duel_game_cards')
    .select('id')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .eq('location', 'deck')

  if (fetchError || !deckCards) {
    return { success: false, error: 'Failed to fetch deck' }
  }

  // Shuffle and update order indices
  const shuffled = [...deckCards].sort(() => Math.random() - 0.5)
  
  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from('duel_game_cards')
      .update({ order_index: i })
      .eq('id', shuffled[i].id)
  }

  return { success: true }
}

// Mill cards (send from deck to graveyard)
export async function millCards(
  roomId: string,
  playerId: string,
  count: number = 1
): Promise<{ success: boolean; milledCards?: DuelGameCard[]; error?: string }> {
  const supabase = await createClient()

  const { data: deckCards, error: fetchError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .eq('location', 'deck')
    .order('order_index', { ascending: true })
    .limit(count)

  if (fetchError || !deckCards || deckCards.length === 0) {
    return { success: false, error: 'No cards to mill' }
  }

  // Send each card to graveyard
  for (const card of deckCards) {
    await sendToGraveyard(card.id)
  }

  return { success: true, milledCards: deckCards as DuelGameCard[] }
}
