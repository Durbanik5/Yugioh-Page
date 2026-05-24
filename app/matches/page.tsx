import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Empty } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { Swords, Plus } from 'lucide-react'
import Link from 'next/link'
import type { MatchWithParticipants, Player, SavedMatch } from '@/lib/types'
import { MatchesClient } from './matches-client'

export const revalidate = 0

async function getMatches(): Promise<MatchWithParticipants[]> {
  const supabase = await createClient()
  
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      participants:match_participants(
        *,
        player:players(*),
        deck:decks(*)
      )
    `)
    .order('played_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }

  return (matches || []) as MatchWithParticipants[]
}

async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('nickname')

  if (error) {
    console.error('Error fetching players:', error)
    return []
  }

  return data || []
}

async function getSavedMatches(): Promise<SavedMatch[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('saved_matches')
    .select('*')

  if (error) {
    console.error('Error fetching saved matches:', error)
    return []
  }

  return data || []
}

export default async function MatchesPage() {
  const [matches, players, savedMatches] = await Promise.all([
    getMatches(),
    getPlayers(),
    getSavedMatches()
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 text-primary" />
            <h1 
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              MATCH HISTORY
            </h1>
            <span className="text-sm text-muted-foreground font-mono">
              ({matches.length})
            </span>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/80 kaiba-glow">
            <Link href="/record">
              <Plus className="h-4 w-4 mr-2" />
              Record Duel
            </Link>
          </Button>
        </div>

        {matches.length === 0 ? (
          <Empty
            title="No Matches Recorded"
            description="Record your first duel to start tracking match history."
            className="py-16"
          />
        ) : (
          <MatchesClient 
            matches={matches} 
            players={players}
            savedMatches={savedMatches}
          />
        )}
      </main>
    </div>
  )
}
