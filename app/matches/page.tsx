import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { Swords, Users, Layers, Plus, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { MatchWithParticipants } from '@/lib/types'

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
    .limit(50)

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }

  return (matches || []) as MatchWithParticipants[]
}

function getMatchTypeIcon(type: string) {
  switch (type) {
    case '1v1': return <Swords className="h-4 w-4" />
    case 'free_for_all': return <Users className="h-4 w-4" />
    case 'tag_team': return <Layers className="h-4 w-4" />
    default: return <Swords className="h-4 w-4" />
  }
}

function getMatchTypeLabel(type: string) {
  switch (type) {
    case '1v1': return '1v1 Duel'
    case 'free_for_all': return 'Free-For-All'
    case 'tag_team': return 'Tag Team'
    default: return type
  }
}

export default async function MatchesPage() {
  const matches = await getMatches()

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
          <div className="space-y-4">
            {matches.map((match) => {
              const winners = match.participants.filter(p => p.is_winner)
              const losers = match.participants.filter(p => !p.is_winner)
              
              return (
                <Card key={match.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1.5 border-primary/50">
                          {getMatchTypeIcon(match.match_type)}
                          {getMatchTypeLabel(match.match_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(match.played_at).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {/* Winners */}
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                          <Trophy className="h-4 w-4" />
                          <span className="font-medium">
                            {match.match_type === 'tag_team' ? 'Winning Team' : 'Winner'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {winners.map((p) => (
                            <Link 
                              key={p.id} 
                              href={`/player/${p.player_id}`}
                              className="block hover:text-primary transition-colors"
                            >
                              <span className="font-medium">{p.player.nickname}</span>
                              {p.deck && (
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({p.deck.name})
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Losers */}
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                          <span className="font-medium">
                            {match.match_type === 'tag_team' ? 'Losing Team' : 'Defeated'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {losers.map((p) => (
                            <Link 
                              key={p.id} 
                              href={`/player/${p.player_id}`}
                              className="block hover:text-primary transition-colors"
                            >
                              <span className="font-medium">{p.player.nickname}</span>
                              {p.deck && (
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({p.deck.name})
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    {match.notes && (
                      <p className="mt-3 text-sm text-muted-foreground italic">
                        {match.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
