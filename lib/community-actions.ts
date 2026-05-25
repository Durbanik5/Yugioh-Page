'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PublishedDeck, Player, DeckCard } from '@/lib/types'

export async function getPublishedDecks(currentPlayerId?: string): Promise<PublishedDeck[]> {
  const supabase = await createClient()
  
  // Get all published decks with their players and cards
  const { data: decks, error } = await supabase
    .from('decks')
    .select(`
      *,
      player:players(*),
      cards:deck_cards(*)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching published decks:', error)
    return []
  }

  // Get ratings and favorites aggregates
  const deckIds = decks?.map(d => d.id) || []
  
  const [ratingsResult, favoritesResult, userRatingsResult, userFavoritesResult] = await Promise.all([
    // Get average ratings
    supabase
      .from('community_deck_ratings')
      .select('deck_id, rating')
      .in('deck_id', deckIds),
    // Get favorite counts
    supabase
      .from('community_deck_favorites')
      .select('deck_id')
      .in('deck_id', deckIds),
    // Get current user's ratings
    currentPlayerId 
      ? supabase
          .from('community_deck_ratings')
          .select('deck_id, rating')
          .eq('player_id', currentPlayerId)
          .in('deck_id', deckIds)
      : Promise.resolve({ data: [] }),
    // Get current user's favorites
    currentPlayerId
      ? supabase
          .from('community_deck_favorites')
          .select('deck_id')
          .eq('player_id', currentPlayerId)
          .in('deck_id', deckIds)
      : Promise.resolve({ data: [] })
  ])

  // Calculate aggregates
  const ratingsByDeck = new Map<string, { sum: number; count: number }>()
  ratingsResult.data?.forEach(r => {
    const existing = ratingsByDeck.get(r.deck_id) || { sum: 0, count: 0 }
    existing.sum += r.rating
    existing.count += 1
    ratingsByDeck.set(r.deck_id, existing)
  })

  const favoriteCountByDeck = new Map<string, number>()
  favoritesResult.data?.forEach(f => {
    favoriteCountByDeck.set(f.deck_id, (favoriteCountByDeck.get(f.deck_id) || 0) + 1)
  })

  const userRatingsByDeck = new Map<string, number>()
  userRatingsResult.data?.forEach(r => {
    userRatingsByDeck.set(r.deck_id, r.rating)
  })

  const userFavoriteSet = new Set(userFavoritesResult.data?.map(f => f.deck_id) || [])

  return (decks || []).map(deck => {
    const ratings = ratingsByDeck.get(deck.id)
    return {
      ...deck,
      is_published: true,
      player: deck.player as Player,
      cards: (deck.cards || []) as DeckCard[],
      average_rating: ratings ? ratings.sum / ratings.count : null,
      rating_count: ratings?.count || 0,
      favorite_count: favoriteCountByDeck.get(deck.id) || 0,
      user_rating: userRatingsByDeck.get(deck.id) || null,
      is_favorited: userFavoriteSet.has(deck.id)
    }
  })
}

export async function publishDeck(deckId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('decks')
    .update({ is_published: true })
    .eq('id', deckId)

  if (error) {
    console.error('Error publishing deck:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function unpublishDeck(deckId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('decks')
    .update({ is_published: false })
    .eq('id', deckId)

  if (error) {
    console.error('Error unpublishing deck:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function rateDeck(deckId: string, playerId: string, rating: number) {
  const supabase = await createClient()
  
  // Upsert the rating
  const { error } = await supabase
    .from('community_deck_ratings')
    .upsert({
      deck_id: deckId,
      player_id: playerId,
      rating,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'deck_id,player_id'
    })

  if (error) {
    console.error('Error rating deck:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function toggleFavorite(deckId: string, playerId: string) {
  const supabase = await createClient()
  
  // Check if already favorited
  const { data: existing } = await supabase
    .from('community_deck_favorites')
    .select('id')
    .eq('deck_id', deckId)
    .eq('player_id', playerId)
    .single()

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('community_deck_favorites')
      .delete()
      .eq('id', existing.id)

    if (error) {
      console.error('Error removing favorite:', error)
      return { success: false, error: error.message }
    }
  } else {
    // Add favorite
    const { error } = await supabase
      .from('community_deck_favorites')
      .insert({
        deck_id: deckId,
        player_id: playerId
      })

    if (error) {
      console.error('Error adding favorite:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function copyDeckToPlayer(sourceDeckId: string, targetPlayerId: string) {
  const supabase = await createClient()
  
  // Get the source deck with all its cards
  const { data: sourceDeck, error: fetchError } = await supabase
    .from('decks')
    .select(`
      *,
      cards:deck_cards(*)
    `)
    .eq('id', sourceDeckId)
    .single()

  if (fetchError || !sourceDeck) {
    console.error('Error fetching source deck:', fetchError)
    return { success: false, error: 'Deck not found' }
  }

  // Create the new deck for the target player
  const { data: newDeck, error: createError } = await supabase
    .from('decks')
    .insert({
      player_id: targetPlayerId,
      name: `${sourceDeck.name} (Copy)`,
      archetype: sourceDeck.archetype,
      description: sourceDeck.description,
      banner_url: sourceDeck.banner_url,
      format: sourceDeck.format,
      mvp_card_name: sourceDeck.mvp_card_name,
      is_published: false
    })
    .select()
    .single()

  if (createError || !newDeck) {
    console.error('Error creating new deck:', createError)
    return { success: false, error: createError?.message || 'Failed to create deck' }
  }

  // Copy all cards to the new deck
  if (sourceDeck.cards && sourceDeck.cards.length > 0) {
    const newCards = sourceDeck.cards.map((card: DeckCard) => ({
      deck_id: newDeck.id,
      card_name: card.card_name,
      card_type: card.card_type,
      deck_category: card.deck_category,
      quantity: card.quantity
    }))

    const { error: cardsError } = await supabase
      .from('deck_cards')
      .insert(newCards)

    if (cardsError) {
      console.error('Error copying cards:', cardsError)
      // Don't fail - the deck was created, just cards failed
    }
  }

  revalidatePath(`/player/${targetPlayerId}`)
  return { success: true, deckId: newDeck.id }
}

export async function getAllPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('nickname', { ascending: true })

  if (error) {
    console.error('Error fetching players:', error)
    return []
  }

  return data || []
}

export async function generateDeckCode(deckId: string): Promise<string> {
  const supabase = await createClient()
  
  const { data: deck, error } = await supabase
    .from('decks')
    .select(`
      *,
      cards:deck_cards(*)
    `)
    .eq('id', deckId)
    .single()

  if (error || !deck) {
    return ''
  }

  // Generate a simple deck code format: name + cards
  const mainDeck = deck.cards?.filter((c: DeckCard) => c.deck_category === 'main') || []
  const extraDeck = deck.cards?.filter((c: DeckCard) => c.deck_category === 'extra') || []
  const sideDeck = deck.cards?.filter((c: DeckCard) => c.deck_category === 'side') || []

  const formatCards = (cards: DeckCard[]) => 
    cards.map(c => `${c.quantity}x ${c.card_name}`).join('\n')

  let code = `=== ${deck.name} ===\n`
  if (deck.archetype) code += `Archetype: ${deck.archetype}\n`
  code += `Format: ${deck.format.toUpperCase()}\n\n`
  
  if (mainDeck.length > 0) {
    code += `-- Main Deck (${mainDeck.reduce((sum: number, c: DeckCard) => sum + c.quantity, 0)}) --\n`
    code += formatCards(mainDeck) + '\n\n'
  }
  
  if (extraDeck.length > 0) {
    code += `-- Extra Deck (${extraDeck.reduce((sum: number, c: DeckCard) => sum + c.quantity, 0)}) --\n`
    code += formatCards(extraDeck) + '\n\n'
  }
  
  if (sideDeck.length > 0) {
    code += `-- Side Deck (${sideDeck.reduce((sum: number, c: DeckCard) => sum + c.quantity, 0)}) --\n`
    code += formatCards(sideDeck) + '\n'
  }

  return code
}
