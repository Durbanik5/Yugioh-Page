import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { PlayerProfile } from './player-profile'
import type { PlayerWithStats, MatchWithParticipants } from '@/lib/types'

export const revalidate = 0

interface PlayerPageProps {
  params: Promise<{ id: string }>
}

async function getPlayer(id: string): Promise<PlayerWithStats | null> {
  const supabase = await createClient()
  
  const { data: player, error } = await supabase
    .from('players')
    .select(`
      *,
      stats:player_stats(*),
      decks(
        *,
        cards:deck_cards(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !player) {
    return null
  }

  return {
    ...player,
    stats: Array.isArray(player.stats) ? player.stats[0] || null : player.stats,
    decks: (player.decks || []).map((deck: any) => ({
      ...deck,
      cards: deck.cards || [],
    })),
  }
}

async function getPlayerMatches(playerId: string): Promise<MatchWithParticipants[]> {
  const supabase = await createClient()
  
  // Get match IDs where this player participated
  const { data: participations, error: partError } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('player_id', playerId)

  if (partError || !participations?.length) {
    return []
  }

  const matchIds = participations.map(p => p.match_id)

  // Get full match data
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      participants:match_participants(
        *,
        player:players(*),
        deck:decks(*)
      )
    `)
    .in('id', matchIds)
    .order('played_at', { ascending: false })
    .limit(10)

  if (matchError) {
    console.error('Error fetching matches:', matchError)
    return []
  }

  return (matches || []) as MatchWithParticipants[]
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params
  const player = await getPlayer(id)

  if (!player) {
    notFound()
  }

  const matches = await getPlayerMatches(id)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PlayerProfile player={player} matches={matches} />
    </div>
  )
}
