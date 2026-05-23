'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  Trophy, Target, Percent, Swords, Users, 
  ChevronLeft, Trash2, Plus, Layers
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AddDeckDialog } from '@/components/add-deck-dialog'
import type { PlayerWithStats, MatchWithParticipants } from '@/lib/types'

interface PlayerProfileProps {
  player: PlayerWithStats
  matches: MatchWithParticipants[]
}

export function PlayerProfile({ player, matches }: PlayerProfileProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  
  const stats = player.stats
  const totalGames = (stats?.total_wins ?? 0) + (stats?.total_losses ?? 0)
  const winRate = totalGames > 0 ? ((stats?.total_wins ?? 0) / totalGames) * 100 : 0

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id)

      if (error) throw error

      toast.success(`${player.nickname} has been removed`)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error deleting player:', error)
      toast.error('Failed to delete player')
    } finally {
      setDeleting(false)
    }
  }

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case '1v1': return <Swords className="h-4 w-4" />
      case 'free_for_all': return <Users className="h-4 w-4" />
      case 'tag_team': return <Layers className="h-4 w-4" />
      default: return <Swords className="h-4 w-4" />
    }
  }

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1'
      case 'free_for_all': return 'FFA'
      case 'tag_team': return 'Tag'
      default: return type
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Duelists
      </Link>

      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 kaiba-border mb-6">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary/50">
              <AvatarImage src={player.avatar_url || undefined} alt={player.nickname} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                {player.nickname.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 
                    className="text-3xl font-bold text-foreground mb-1"
                    style={{ fontFamily: 'var(--font-orbitron)' }}
                  >
                    {player.nickname}
                  </h1>
                  <p className="text-muted-foreground">
                    Registered {new Date(player.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-primary/30">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {player.nickname}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this duelist and all their match history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-destructive hover:bg-destructive/80"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                    <Trophy className="h-5 w-5" />
                    <span className="text-2xl font-bold font-mono">{stats?.total_wins ?? 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Wins</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
                    <Target className="h-5 w-5" />
                    <span className="text-2xl font-bold font-mono">{stats?.total_losses ?? 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Losses</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-2 text-primary mb-1">
                    <Percent className="h-5 w-5" />
                    <span className="text-2xl font-bold font-mono">{winRate.toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="decks">Decks ({player.decks.length})</TabsTrigger>
          <TabsTrigger value="matches">Recent Matches</TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* 1v1 Stats */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  1v1 Duels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">{stats?.wins_1v1 ?? 0}W</span>
                  <span className="text-red-400">{stats?.losses_1v1 ?? 0}L</span>
                </div>
                <Progress 
                  value={(stats?.wins_1v1 ?? 0) + (stats?.losses_1v1 ?? 0) > 0 
                    ? ((stats?.wins_1v1 ?? 0) / ((stats?.wins_1v1 ?? 0) + (stats?.losses_1v1 ?? 0))) * 100 
                    : 0
                  } 
                  className="h-2"
                />
              </CardContent>
            </Card>

            {/* FFA Stats */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  Free-For-All
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">{stats?.wins_ffa ?? 0}W</span>
                  <span className="text-red-400">{stats?.losses_ffa ?? 0}L</span>
                </div>
                <Progress 
                  value={(stats?.wins_ffa ?? 0) + (stats?.losses_ffa ?? 0) > 0 
                    ? ((stats?.wins_ffa ?? 0) / ((stats?.wins_ffa ?? 0) + (stats?.losses_ffa ?? 0))) * 100 
                    : 0
                  } 
                  className="h-2"
                />
              </CardContent>
            </Card>

            {/* Tag Stats */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-chart-3" />
                  Tag Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">{stats?.wins_tag ?? 0}W</span>
                  <span className="text-red-400">{stats?.losses_tag ?? 0}L</span>
                </div>
                <Progress 
                  value={(stats?.wins_tag ?? 0) + (stats?.losses_tag ?? 0) > 0 
                    ? ((stats?.wins_tag ?? 0) / ((stats?.wins_tag ?? 0) + (stats?.losses_tag ?? 0))) * 100 
                    : 0
                  } 
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Decks Tab */}
        <TabsContent value="decks" className="space-y-4">
          <div className="flex justify-end">
            <AddDeckDialog playerId={player.id} />
          </div>
          
          {player.decks.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No decks registered yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {player.decks.map((deck) => (
                <Card key={deck.id} className={`bg-card border-border ${deck.is_active ? 'ring-1 ring-primary/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {deck.name}
                          {deck.is_active && (
                            <Badge variant="outline" className="text-xs border-primary text-primary">Active</Badge>
                          )}
                        </h3>
                        {deck.archetype && (
                          <p className="text-sm text-muted-foreground">{deck.archetype}</p>
                        )}
                      </div>
                    </div>
                    {deck.description && (
                      <p className="text-sm text-muted-foreground mt-2">{deck.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-4">
          {matches.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No matches recorded yet.</p>
                <Button asChild className="mt-4 bg-primary hover:bg-primary/80">
                  <Link href="/record">
                    <Plus className="h-4 w-4 mr-2" />
                    Record First Match
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const playerParticipant = match.participants.find(p => p.player_id === player.id)
                const isWinner = playerParticipant?.is_winner ?? false
                
                return (
                  <Card key={match.id} className={`bg-card border-border ${isWinner ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getMatchTypeIcon(match.match_type)}
                            {getMatchTypeLabel(match.match_type)}
                          </Badge>
                          <Badge variant={isWinner ? 'default' : 'secondary'} className={isWinner ? 'bg-green-600' : 'bg-red-600'}>
                            {isWinner ? 'Victory' : 'Defeat'}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(match.played_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">
                        <span>vs </span>
                        {match.participants
                          .filter(p => p.player_id !== player.id)
                          .map(p => p.player.nickname)
                          .join(', ') || 'Unknown'}
                      </div>
                      {playerParticipant?.deck && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deck: {playerParticipant.deck.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
