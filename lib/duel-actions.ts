'use server'

import { createClient } from '@/lib/supabase/server'
import type { DuelGameCard, CardLocation, CardPosition, DuelCardType } from '@/lib/types'

// Cache for card lookups to avoid repeated API calls
const cardCache = new Map<string, { id: number; type: string; atk?: number; def?: number; level?: number; attribute?: string }>()

// Lookup card details from YGOProDeck API
async function lookupCardDetails(cardName: string): Promise<{ id: number; type: string; atk?: number; def?: number; level?: number; attribute?: string } | null> {
  // Check cache first
  if (cardCache.has(cardName)) {
    return cardCache.get(cardName)!
  }

  try {
    const response = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )
    
    if (!response.ok) {
      console.error(`[v0] Failed to lookup card: ${cardName}`)
      return null
    }
    
    const data = await response.json()
    if (data.data && data.data.length > 0) {
      const card = data.data[0]
      const result = {
        id: card.id,
        type: card.type,
        atk: card.atk,
        def: card.def,
        level: card.level || card.linkval,
        attribute: card.attribute
      }
      cardCache.set(cardName, result)
      return result
    }
  } catch (error) {
    console.error(`[v0] Error looking up card ${cardName}:`, error)
  }
  
  return null
}

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

  // Expand cards based on quantity and lookup their IDs
  const expandedCards: Array<{
    card_name: string
    card_type: string
    card_id: number | null
    attack: number | null
    defense: number | null
    level: number | null
    attribute: string | null
    deck_category: string | null
  }> = []

  for (const card of deckCards) {
    // Lookup card details from API
    const cardDetails = await lookupCardDetails(card.card_name)
    
    // Expand based on quantity (each copy is a separate card in the duel)
    const qty = card.quantity || 1
    for (let i = 0; i < qty; i++) {
      expandedCards.push({
        card_name: card.card_name,
        card_type: cardDetails?.type || card.card_type || 'Monster',
        card_id: cardDetails?.id || null,
        attack: cardDetails?.atk ?? null,
        defense: cardDetails?.def ?? null,
        level: cardDetails?.level ?? null,
        attribute: cardDetails?.attribute ?? null,
        deck_category: card.deck_category
      })
    }
  }

  // Separate main deck and extra deck cards
  const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link']
  const mainDeckCards: typeof expandedCards = []
  const extraDeckCards: typeof expandedCards = []

  for (const card of expandedCards) {
    const cardTypeLower = (card.card_type || '').toLowerCase()
    const isExtraDeck = extraDeckTypes.some(t => cardTypeLower.includes(t)) || card.deck_category === 'extra'
    
    if (isExtraDeck) {
      extraDeckCards.push(card)
    } else {
      mainDeckCards.push(card)
    }
  }

  // Shuffle main deck (Fisher-Yates shuffle for better randomization)
  const shuffledMainDeck = [...mainDeckCards]
  for (let i = shuffledMainDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledMainDeck[i], shuffledMainDeck[j]] = [shuffledMainDeck[j], shuffledMainDeck[i]]
  }

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
    console.error('[v0] Failed to insert cards:', insertError)
    return { success: false, error: 'Failed to initialize deck' }
  }

  console.log(`[v0] Initialized deck for player ${playerId}: ${shuffledMainDeck.length} main deck, ${extraDeckCards.length} extra deck`)
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

  // Update hand count in participant (ignore errors - RPC may not exist)
  try {
    await supabase
      .from('duel_room_participants')
      .update({ hand_count: count })
      .eq('room_id', roomId)
      .eq('player_id', playerId)
  } catch {
    // Ignore update errors
  }

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

// ==========================================
// TURN STRUCTURE & PHASE MANAGEMENT
// Based on Official Yu-Gi-Oh! Rulebook v10
// ==========================================

const PHASE_ORDER: CardLocation[] = ['draw', 'standby', 'main', 'battle', 'main2', 'end'] as unknown as CardLocation[]

// Advance to the next phase
export async function advancePhase(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; newPhase?: string; drawnCard?: DuelGameCard; error?: string }> {
  const supabase = await createClient()
  
  // Get current room state
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*, participants:duel_room_participants(*)')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Only current turn player can advance phase
  if (room.current_turn !== playerId) {
    return { success: false, error: 'Not your turn' }
  }
  
  const currentPhase = room.turn_phase || 'draw'
  const currentIndex = (PHASE_ORDER as unknown as string[]).indexOf(currentPhase)
  
  // Determine next phase
  let nextPhase: string
  let drawnCard: DuelGameCard | undefined
  
  if (currentIndex >= PHASE_ORDER.length - 1 || currentPhase === 'end') {
    // End Phase -> Next turn's Draw Phase
    nextPhase = 'draw'
  } else {
    nextPhase = (PHASE_ORDER as unknown as string[])[currentIndex + 1]
  }
  
  // Skip Battle Phase on turn 1 (official rule)
  if (nextPhase === 'battle' && room.turn_count === 1) {
    nextPhase = 'main2'
  }
  
  // Auto-draw card when entering Draw Phase (except turn 1 for first player if first_turn_draw is false)
  if (nextPhase === 'draw') {
    const shouldDraw = room.turn_count > 1 || room.first_turn_draw
    if (shouldDraw) {
      const drawResult = await drawCards(roomId, playerId, 1)
      if (drawResult.success && drawResult.drawnCards?.[0]) {
        drawnCard = drawResult.drawnCards[0]
      }
    }
  }
  
  // Update room phase
  const { error: updateError } = await supabase
    .from('duel_rooms')
    .update({ turn_phase: nextPhase })
    .eq('id', roomId)
  
  if (updateError) {
    return { success: false, error: 'Failed to advance phase' }
  }
  
  return { success: true, newPhase: nextPhase, drawnCard }
}

// End turn and pass to opponent
export async function endTurn(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; nextPlayer?: string; error?: string }> {
  const supabase = await createClient()
  
  // Get current room state
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*, participants:duel_room_participants(player_id, is_spectator)')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Only current turn player can end turn
  if (room.current_turn !== playerId) {
    return { success: false, error: 'Not your turn' }
  }
  
  // Find the duelists (non-spectators)
  const duelists = room.participants.filter((p: { is_spectator: boolean }) => !p.is_spectator)
  if (duelists.length < 2) {
    return { success: false, error: 'Not enough duelists' }
  }
  
  // Find next player
  const nextPlayer = duelists.find((p: { player_id: string }) => p.player_id !== playerId)?.player_id
  if (!nextPlayer) {
    return { success: false, error: 'Could not find next player' }
  }
  
  // Reset all monsters' attack status for the ending player (they can attack again next turn)
  await supabase
    .from('duel_game_cards')
    .update({ has_attacked: false })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .in('location', ['monster_zone', 'extra_monster_zone'])
  
  // Update room: increment turn, set next player, reset to draw phase
  const { error: updateError } = await supabase
    .from('duel_rooms')
    .update({
      current_turn: nextPlayer,
      turn_count: (room.turn_count || 1) + 1,
      turn_phase: 'draw',
      normal_summon_used: false, // Reset normal summon for new turn
    })
    .eq('id', roomId)
  
  if (updateError) {
    return { success: false, error: 'Failed to end turn' }
  }
  
  // Auto-draw for the next player (Draw Phase rule)
  const shouldDraw = (room.turn_count || 1) >= 1 || room.first_turn_draw
  if (shouldDraw) {
    await drawCards(roomId, nextPlayer, 1)
  }
  
  return { success: true, nextPlayer }
}

// Declare an attack
export async function declareAttack(
  roomId: string,
  attackerId: string,
  targetId: string | null // null for direct attack
): Promise<{ 
  success: boolean; 
  battleResult?: {
    damage: number;
    damageTarget: 'attacker' | 'defender' | 'both' | 'none';
    attackerDestroyed: boolean;
    defenderDestroyed: boolean;
    directAttack: boolean;
  };
  error?: string 
}> {
  const supabase = await createClient()
  
  // Get the attacker card
  const { data: attacker, error: attackerError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('id', attackerId)
    .single()
  
  if (attackerError || !attacker) {
    return { success: false, error: 'Attacker not found' }
  }
  
  // Get room to check phase and turn
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Can only attack during Battle Phase
  if (room.turn_phase !== 'battle') {
    return { success: false, error: 'Can only attack during Battle Phase' }
  }
  
  // Only current turn player can attack
  if (room.current_turn !== attacker.player_id) {
    return { success: false, error: 'Not your turn' }
  }
  
  // Check if monster already attacked this turn
  if (attacker.has_attacked) {
    return { success: false, error: 'This monster already attacked this turn' }
  }
  
  // Monster must be in Attack Position to attack
  if (attacker.position !== 'face_up_attack') {
    return { success: false, error: 'Monster must be in Attack Position to attack' }
  }
  
  let battleResult: {
    damage: number;
    damageTarget: 'attacker' | 'defender' | 'both' | 'none';
    attackerDestroyed: boolean;
    defenderDestroyed: boolean;
    directAttack: boolean;
  }
  
  if (targetId) {
    // Attack a monster
    const { data: defender, error: defenderError } = await supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', targetId)
      .single()
    
    if (defenderError || !defender) {
      return { success: false, error: 'Target not found' }
    }
    
    // Calculate battle damage based on position
    const attackerAtk = attacker.attack || 0
    const defenderAtk = defender.attack || 0
    const defenderDef = defender.defense || 0
    
    if (defender.position === 'face_up_attack') {
      // Attack vs Attack Position
      const damage = attackerAtk - defenderAtk
      
      if (damage > 0) {
        // Attacker wins - defender destroyed, defender's owner takes damage
        battleResult = {
          damage,
          damageTarget: 'defender',
          attackerDestroyed: false,
          defenderDestroyed: true,
          directAttack: false,
        }
        await sendToGraveyard(targetId)
        await updateLifePoints(roomId, defender.player_id, -damage)
      } else if (damage < 0) {
        // Defender wins - attacker destroyed, attacker's owner takes damage
        battleResult = {
          damage: Math.abs(damage),
          damageTarget: 'attacker',
          attackerDestroyed: true,
          defenderDestroyed: false,
          directAttack: false,
        }
        await sendToGraveyard(attackerId)
        await updateLifePoints(roomId, attacker.player_id, damage) // damage is negative
      } else {
        // Tie - both destroyed, no damage
        battleResult = {
          damage: 0,
          damageTarget: 'both',
          attackerDestroyed: true,
          defenderDestroyed: true,
          directAttack: false,
        }
        await sendToGraveyard(attackerId)
        await sendToGraveyard(targetId)
      }
    } else {
      // Attack vs Defense Position
      const damage = attackerAtk - defenderDef
      
      if (damage > 0) {
        // Attacker wins - defender destroyed, no battle damage
        battleResult = {
          damage: 0,
          damageTarget: 'none',
          attackerDestroyed: false,
          defenderDestroyed: true,
          directAttack: false,
        }
        await sendToGraveyard(targetId)
      } else if (damage < 0) {
        // Defender wins - attacker takes damage, neither destroyed
        battleResult = {
          damage: Math.abs(damage),
          damageTarget: 'attacker',
          attackerDestroyed: false,
          defenderDestroyed: false,
          directAttack: false,
        }
        await updateLifePoints(roomId, attacker.player_id, damage)
      } else {
        // Tie - nothing happens
        battleResult = {
          damage: 0,
          damageTarget: 'none',
          attackerDestroyed: false,
          defenderDestroyed: false,
          directAttack: false,
        }
      }
      
      // Flip face-down defender face-up
      if (defender.position === 'face_down_defense') {
        await supabase
          .from('duel_game_cards')
          .update({ position: 'face_up_defense' })
          .eq('id', targetId)
      }
    }
  } else {
    // Direct attack - only allowed if opponent has no monsters
    const { data: opponentMonsters } = await supabase
      .from('duel_game_cards')
      .select('id')
      .eq('room_id', roomId)
      .neq('player_id', attacker.player_id)
      .in('location', ['monster_zone', 'extra_monster_zone'])
    
    if (opponentMonsters && opponentMonsters.length > 0) {
      return { success: false, error: 'Cannot attack directly while opponent has monsters' }
    }
    
    // Find opponent player ID
    const { data: participants } = await supabase
      .from('duel_room_participants')
      .select('player_id')
      .eq('room_id', roomId)
      .eq('is_spectator', false)
      .neq('player_id', attacker.player_id)
    
    if (!participants || participants.length === 0) {
      return { success: false, error: 'Opponent not found' }
    }
    
    const opponentId = participants[0].player_id
    const damage = attacker.attack || 0
    
    battleResult = {
      damage,
      damageTarget: 'defender',
      attackerDestroyed: false,
      defenderDestroyed: false,
      directAttack: true,
    }
    
    await updateLifePoints(roomId, opponentId, -damage)
  }
  
  // Mark attacker as having attacked this turn
  await supabase
    .from('duel_game_cards')
    .update({ has_attacked: true })
    .eq('id', attackerId)
  
  return { success: true, battleResult }
}

// Update life points
export async function updateLifePoints(
  roomId: string,
  playerId: string,
  change: number // positive = gain, negative = lose
): Promise<{ success: boolean; newLp?: number; error?: string }> {
  const supabase = await createClient()
  
  // Get current LP
  const { data: participant, error: fetchError } = await supabase
    .from('duel_room_participants')
    .select('life_points')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .single()
  
  if (fetchError || !participant) {
    return { success: false, error: 'Participant not found' }
  }
  
  const newLp = Math.max(0, (participant.life_points || 8000) + change)
  
  const { error: updateError } = await supabase
    .from('duel_room_participants')
    .update({ life_points: newLp })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
  
  if (updateError) {
    return { success: false, error: 'Failed to update LP' }
  }
  
  // Check for win condition
  if (newLp <= 0) {
    // This player lost - update room status
    await supabase
      .from('duel_rooms')
      .update({ status: 'completed' })
      .eq('id', roomId)
  }
  
  return { success: true, newLp }
}

// Normal Summon a monster (with tribute rules)
export async function normalSummon(
  roomId: string,
  playerId: string,
  cardId: string,
  zoneIndex: number,
  tributeIds: string[] = [],
  inDefensePosition: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get room to check phase and normal summon status
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Can only Normal Summon during Main Phase 1 or 2
  if (room.turn_phase !== 'main' && room.turn_phase !== 'main2') {
    return { success: false, error: 'Can only Normal Summon during Main Phase' }
  }
  
  // Only current turn player can summon
  if (room.current_turn !== playerId) {
    return { success: false, error: 'Not your turn' }
  }
  
  // Check if normal summon already used this turn
  if (room.normal_summon_used) {
    return { success: false, error: 'You can only Normal Summon once per turn' }
  }
  
  // Get the card to summon
  const { data: card, error: cardError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('id', cardId)
    .single()
  
  if (cardError || !card) {
    return { success: false, error: 'Card not found' }
  }
  
  // Card must be in hand
  if (card.location !== 'hand') {
    return { success: false, error: 'Card must be in hand to Normal Summon' }
  }
  
  // Card must be a monster
  if (!['normal_monster', 'effect_monster'].includes(card.card_type || '')) {
    return { success: false, error: 'Can only Normal Summon monster cards' }
  }
  
  const level = card.level || 0
  
  // Check tribute requirements (Official rules)
  // Level 1-4: No tribute required
  // Level 5-6: 1 tribute required
  // Level 7+: 2 tributes required
  let requiredTributes = 0
  if (level >= 7) {
    requiredTributes = 2
  } else if (level >= 5) {
    requiredTributes = 1
  }
  
  if (tributeIds.length < requiredTributes) {
    return { success: false, error: `Level ${level} monsters require ${requiredTributes} tribute(s)` }
  }
  
  // Tribute the required monsters
  for (const tributeId of tributeIds) {
    const { data: tribute } = await supabase
      .from('duel_game_cards')
      .select('*')
      .eq('id', tributeId)
      .single()
    
    if (!tribute || tribute.player_id !== playerId) {
      return { success: false, error: 'Invalid tribute target' }
    }
    
    if (!['monster_zone', 'extra_monster_zone'].includes(tribute.location || '')) {
      return { success: false, error: 'Can only tribute monsters on the field' }
    }
    
    await sendToGraveyard(tributeId)
  }
  
  // Summon the monster
  const position = inDefensePosition ? 'face_up_defense' : 'face_up_attack'
  
  const { error: summonError } = await supabase
    .from('duel_game_cards')
    .update({
      location: 'monster_zone',
      zone_index: zoneIndex,
      position,
      has_attacked: false,
    })
    .eq('id', cardId)
  
  if (summonError) {
    return { success: false, error: 'Failed to summon monster' }
  }
  
  // Mark normal summon as used this turn
  await supabase
    .from('duel_rooms')
    .update({ normal_summon_used: true })
    .eq('id', roomId)
  
  return { success: true }
}

// Set a monster face-down (counts as Normal Summon)
export async function setMonster(
  roomId: string,
  playerId: string,
  cardId: string,
  zoneIndex: number,
  tributeIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get room to check phase and normal summon status
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Can only Set during Main Phase 1 or 2
  if (room.turn_phase !== 'main' && room.turn_phase !== 'main2') {
    return { success: false, error: 'Can only Set during Main Phase' }
  }
  
  // Only current turn player can set
  if (room.current_turn !== playerId) {
    return { success: false, error: 'Not your turn' }
  }
  
  // Check if normal summon already used this turn (Setting counts as normal summon)
  if (room.normal_summon_used) {
    return { success: false, error: 'You can only Normal Summon/Set once per turn' }
  }
  
  // Get the card
  const { data: card, error: cardError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('id', cardId)
    .single()
  
  if (cardError || !card) {
    return { success: false, error: 'Card not found' }
  }
  
  // Card must be in hand
  if (card.location !== 'hand') {
    return { success: false, error: 'Card must be in hand to Set' }
  }
  
  const level = card.level || 0
  
  // Check tribute requirements
  let requiredTributes = 0
  if (level >= 7) {
    requiredTributes = 2
  } else if (level >= 5) {
    requiredTributes = 1
  }
  
  if (tributeIds.length < requiredTributes) {
    return { success: false, error: `Level ${level} monsters require ${requiredTributes} tribute(s)` }
  }
  
  // Tribute the required monsters
  for (const tributeId of tributeIds) {
    await sendToGraveyard(tributeId)
  }
  
  // Set the monster face-down
  const { error: setError } = await supabase
    .from('duel_game_cards')
    .update({
      location: 'monster_zone',
      zone_index: zoneIndex,
      position: 'face_down_defense',
      has_attacked: false,
    })
    .eq('id', cardId)
  
  if (setError) {
    return { success: false, error: 'Failed to set monster' }
  }
  
  // Mark normal summon as used
  await supabase
    .from('duel_rooms')
    .update({ normal_summon_used: true })
    .eq('id', roomId)
  
  return { success: true }
}

// Flip Summon a face-down monster
export async function flipSummon(
  roomId: string,
  playerId: string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get room
  const { data: room, error: roomError } = await supabase
    .from('duel_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    return { success: false, error: 'Room not found' }
  }
  
  // Can only Flip Summon during Main Phase
  if (room.turn_phase !== 'main' && room.turn_phase !== 'main2') {
    return { success: false, error: 'Can only Flip Summon during Main Phase' }
  }
  
  // Only current turn player can flip summon
  if (room.current_turn !== playerId) {
    return { success: false, error: 'Not your turn' }
  }
  
  // Get the card
  const { data: card, error: cardError } = await supabase
    .from('duel_game_cards')
    .select('*')
    .eq('id', cardId)
    .single()
  
  if (cardError || !card) {
    return { success: false, error: 'Card not found' }
  }
  
  // Card must be face-down defense position
  if (card.position !== 'face_down_defense') {
    return { success: false, error: 'Can only Flip Summon face-down Defense Position monsters' }
  }
  
  // Cannot Flip Summon a monster that was just Set this turn
  // (would need turn_set_on tracking for this - simplified for now)
  
  // Flip to Attack Position
  const { error: flipError } = await supabase
    .from('duel_game_cards')
    .update({ position: 'face_up_attack' })
    .eq('id', cardId)
  
  if (flipError) {
    return { success: false, error: 'Failed to flip summon' }
  }
  
  return { success: true }
}
