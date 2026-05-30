import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/unity/decks?playerId=xxx - Get player's decks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 })
    }

    // Get all decks for this player
    const { data: decks, error } = await supabase
      .from('decks')
      .select(`
        id,
        name,
        description,
        format,
        is_public,
        created_at,
        updated_at
      `)
      .eq('player_id', playerId)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get card details for each deck
    const decksWithCards = await Promise.all(
      decks.map(async (deck) => {
        const { data: deckCards } = await supabase
          .from('deck_cards')
          .select('card_id, quantity, is_side_deck, is_extra_deck')
          .eq('deck_id', deck.id)

        return {
          ...deck,
          cards: deckCards || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      decks: decksWithCards
    })

  } catch (error) {
    console.error('Unity decks error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/unity/decks/[deckId] - Get specific deck with full card data
export async function POST(request: NextRequest) {
  try {
    const { deckId } = await request.json()

    if (!deckId) {
      return NextResponse.json({ error: 'deckId required' }, { status: 400 })
    }

    // Get deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single()

    if (deckError) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Get deck cards
    const { data: deckCards } = await supabase
      .from('deck_cards')
      .select('card_id, quantity, is_side_deck, is_extra_deck')
      .eq('deck_id', deckId)

    // Format for Unity - separate main, extra, and side deck
    const mainDeck: number[] = []
    const extraDeck: number[] = []
    const sideDeck: number[] = []

    deckCards?.forEach((card) => {
      for (let i = 0; i < card.quantity; i++) {
        if (card.is_side_deck) {
          sideDeck.push(card.card_id)
        } else if (card.is_extra_deck) {
          extraDeck.push(card.card_id)
        } else {
          mainDeck.push(card.card_id)
        }
      }
    })

    return NextResponse.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        format: deck.format,
        mainDeck,
        extraDeck,
        sideDeck,
        mainDeckCount: mainDeck.length,
        extraDeckCount: extraDeck.length,
        sideDeckCount: sideDeck.length,
      }
    })

  } catch (error) {
    console.error('Unity deck fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
