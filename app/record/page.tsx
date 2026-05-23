import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { RecordMatchForm } from './record-match-form'
import type { Player, Deck } from '@/lib/types'

export const revalidate = 0

interface PlayerWithDecks extends Player {
  decks: Deck[]
}

async function getPlayersWithDecks(): Promise<PlayerWithDecks[]> {
  const supabase = await createClient()
  
  const { data: players, error } = await supabase
    .from('players')
    .select(`
      *,
      decks(*)
    `)
    .order('nickname', { ascending: true })

  if (error) {
    console.error('Error fetching players:', error)
    return []
  }

  return (players || []) as PlayerWithDecks[]
}

export default async function RecordMatchPage() {
  const players = await getPlayersWithDecks()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 
            className="text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            RECORD <span className="text-primary">DUEL</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Log a new match and update duelist statistics.
          </p>
          
          <RecordMatchForm players={players} />
        </div>
      </main>
    </div>
  )
}
