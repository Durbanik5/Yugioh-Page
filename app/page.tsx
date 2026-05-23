import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { PlayerCard } from '@/components/player-card'
import { AddPlayerDialog } from '@/components/add-player-dialog'
import { Empty } from '@/components/ui/empty'
import { Users } from 'lucide-react'
import type { PlayerWithStats } from '@/lib/types'

export const revalidate = 0

async function getPlayers(): Promise<PlayerWithStats[]> {
  const supabase = await createClient()
  
  const { data: players, error } = await supabase
    .from('players')
    .select(`
      *,
      stats:player_stats(*),
      decks(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching players:', error)
    return []
  }

  // Transform the data to match our types
  return (players || []).map(player => ({
    ...player,
    stats: Array.isArray(player.stats) ? player.stats[0] || null : player.stats,
    decks: player.decks || [],
  }))
}

function sortPlayersByWins(players: PlayerWithStats[]): PlayerWithStats[] {
  return [...players].sort((a, b) => {
    const aWins = a.stats?.total_wins ?? 0
    const bWins = b.stats?.total_wins ?? 0
    return bWins - aWins
  })
}

export default async function HomePage() {
  const players = await getPlayers()
  const rankedPlayers = sortPlayersByWins(players)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative border-b border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-2xl">
            <h1 
              className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              <span className="text-primary">DUEL</span> TRACKER
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Track your Yu-Gi-Oh duels, monitor win/loss records, and see who reigns supreme 
              among your friends. Powered by KaibaCorp technology.
            </p>
          </div>
        </div>
      </section>

      {/* Players Section */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <h2 
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              DUELISTS
            </h2>
            <span className="text-sm text-muted-foreground font-mono">
              ({players.length})
            </span>
          </div>
          <AddPlayerDialog />
        </div>

        {players.length === 0 ? (
          <Empty
            title="No Duelists Registered"
            description="Add your first duelist to start tracking duels and stats."
            className="py-16"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rankedPlayers.map((player, index) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            <span style={{ fontFamily: 'var(--font-orbitron)' }}>KAIBACORP</span> Duel Tracking System v1.0
          </p>
        </div>
      </footer>
    </div>
  )
}
