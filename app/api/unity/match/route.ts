import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ELO calculation constants
const K_FACTOR = 32

function calculateEloChange(winnerElo: number, loserElo: number): { winnerGain: number; loserLoss: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400))
  
  const winnerGain = Math.round(K_FACTOR * (1 - expectedWinner))
  const loserLoss = Math.round(K_FACTOR * (0 - expectedLoser))
  
  return { winnerGain, loserLoss: Math.abs(loserLoss) }
}

// POST /api/unity/match - Submit match results from Unity
export async function POST(request: NextRequest) {
  try {
    const { 
      winnerId, 
      loserId, 
      winnerDeckId,
      loserDeckId,
      format,
      turns,
      duration, // in seconds
      endCondition, // 'lp_zero', 'deck_out', 'surrender', 'timeout'
      cardsPlayed, // { playerId: [{ cardId, attribute, type }] }
    } = await request.json()

    if (!winnerId || !loserId) {
      return NextResponse.json({ error: 'winnerId and loserId required' }, { status: 400 })
    }

    // Get both players' current stats
    const { data: winner } = await supabase
      .from('players')
      .select('id, nickname, elo_rating, wins, losses')
      .eq('id', winnerId)
      .single()

    const { data: loser } = await supabase
      .from('players')
      .select('id, nickname, elo_rating, wins, losses')
      .eq('id', loserId)
      .single()

    if (!winner || !loser) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 })
    }

    // Calculate ELO changes
    const { winnerGain, loserLoss } = calculateEloChange(
      winner.elo_rating || 1000,
      loser.elo_rating || 1000
    )

    const newWinnerElo = (winner.elo_rating || 1000) + winnerGain
    const newLoserElo = Math.max(100, (loser.elo_rating || 1000) - loserLoss)

    // Create match record
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        format: format || 'casual',
        status: 'completed',
        winner_id: winnerId,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (matchError) {
      console.error('Match creation error:', matchError)
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
    }

    // Create match participants
    await supabase.from('match_participants').insert([
      {
        match_id: match.id,
        player_id: winnerId,
        deck_id: winnerDeckId || null,
        result: 'win',
        elo_before: winner.elo_rating || 1000,
        elo_after: newWinnerElo,
        elo_change: winnerGain,
      },
      {
        match_id: match.id,
        player_id: loserId,
        deck_id: loserDeckId || null,
        result: 'loss',
        elo_before: loser.elo_rating || 1000,
        elo_after: newLoserElo,
        elo_change: -loserLoss,
      }
    ])

    // Update winner stats
    await supabase
      .from('players')
      .update({
        elo_rating: newWinnerElo,
        wins: (winner.wins || 0) + 1,
      })
      .eq('id', winnerId)

    // Update loser stats
    await supabase
      .from('players')
      .update({
        elo_rating: newLoserElo,
        losses: (loser.losses || 0) + 1,
      })
      .eq('id', loserId)

    // Track achievements for cards played
    if (cardsPlayed) {
      for (const [playerId, cards] of Object.entries(cardsPlayed)) {
        const cardList = cards as Array<{ cardId: number; attribute: string; type: string }>
        
        for (const card of cardList) {
          // Track attribute achievement
          if (card.attribute) {
            await supabase.rpc('increment_achievement', {
              p_player_id: playerId,
              p_achievement_type: 'attribute',
              p_achievement_key: card.attribute,
              p_increment: 1
            })
          }
          
          // Track monster type achievement
          if (card.type) {
            await supabase.rpc('increment_achievement', {
              p_player_id: playerId,
              p_achievement_type: 'monster_type',
              p_achievement_key: card.type,
              p_increment: 1
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        winnerId,
        loserId,
        format: format || 'casual',
      },
      eloChanges: {
        winner: {
          playerId: winnerId,
          previousElo: winner.elo_rating || 1000,
          newElo: newWinnerElo,
          change: winnerGain,
        },
        loser: {
          playerId: loserId,
          previousElo: loser.elo_rating || 1000,
          newElo: newLoserElo,
          change: -loserLoss,
        }
      }
    })

  } catch (error) {
    console.error('Unity match error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
