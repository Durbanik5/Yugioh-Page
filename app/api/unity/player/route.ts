import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/unity/player?playerId=xxx - Get player profile and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 })
    }

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Get player profile
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('player_id', playerId)
      .single()

    // Get deck count
    const { count: deckCount } = await supabase
      .from('decks')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)

    // Get recent match count
    const { count: matchCount } = await supabase
      .from('match_participants')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)

    // Calculate win rate
    const totalGames = (player.wins || 0) + (player.losses || 0)
    const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        nickname: player.nickname,
        email: player.email,
        elo_rating: player.elo_rating || 1000,
        wins: player.wins || 0,
        losses: player.losses || 0,
        winRate,
        tier: player.tier || 'Bronze',
        created_at: player.created_at,
      },
      profile: profile ? {
        bio: profile.bio,
        team: profile.team,
        theme: profile.theme,
        favorite_series: profile.favorite_series,
        favorite_mechanic: profile.favorite_mechanic,
      } : null,
      stats: {
        totalDecks: deckCount || 0,
        totalMatches: matchCount || 0,
      }
    })

  } catch (error) {
    console.error('Unity player error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/unity/player - Update player profile from Unity
export async function POST(request: NextRequest) {
  try {
    const { playerId, updates } = await request.json()

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 })
    }

    const allowedUpdates = ['nickname', 'bio', 'team', 'theme']
    const filteredUpdates: Record<string, unknown> = {}
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    // Update player table (nickname)
    if (filteredUpdates.nickname) {
      await supabase
        .from('players')
        .update({ nickname: filteredUpdates.nickname })
        .eq('id', playerId)
    }

    // Update player_profiles table (bio, team, theme)
    const profileUpdates: Record<string, unknown> = {}
    if (filteredUpdates.bio !== undefined) profileUpdates.bio = filteredUpdates.bio
    if (filteredUpdates.team !== undefined) profileUpdates.team = filteredUpdates.team
    if (filteredUpdates.theme !== undefined) profileUpdates.theme = filteredUpdates.theme

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString()
      
      await supabase
        .from('player_profiles')
        .update(profileUpdates)
        .eq('player_id', playerId)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unity player update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
