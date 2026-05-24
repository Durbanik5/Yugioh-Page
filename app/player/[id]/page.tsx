import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { PlayerProfile } from './player-profile'
import type { PlayerWithStats, MatchWithParticipants, Player, SavedMatch, PlayerProfile as PlayerProfileType } from '@/lib/types'

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
        cards:deck_cards(*),
        changes:deck_changes(*)
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
      changes: (deck.changes || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
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

  // Get full match data (no limit - we need all for stats)
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

  if (matchError) {
    console.error('Error fetching matches:', matchError)
    return []
  }

  return (matches || []) as MatchWithParticipants[]
}

async function getAllPlayers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
  
  if (error) {
    console.error('Error fetching players:', error)
    return []
  }
  
  return data || []
}

async function getSavedMatches(playerId: string): Promise<SavedMatch[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('saved_matches')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching saved matches:', error)
    return []
  }

  return data || []
}

async function getPlayerProfile(playerId: string): Promise<PlayerProfileType | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('player_id', playerId)
    .single()

  if (error) {
    // No profile yet is okay
    return null
  }

  return data
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params
  const player = await getPlayer(id)

  if (!player) {
    notFound()
  }

  const [matches, allPlayers, savedMatches, playerProfile] = await Promise.all([
    getPlayerMatches(id),
    getAllPlayers(),
    getSavedMatches(id),
    getPlayerProfile(id)
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PlayerProfile 
        player={player} 
        matches={matches} 
        allPlayers={allPlayers}
        savedMatches={savedMatches}
        profile={playerProfile}
      />
    </div>
  )
}
