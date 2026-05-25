'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ChevronLeft, Trash2, Plus, Layers, Medal,
  TrendingUp, TrendingDown, Minus, Star, Flame, Crown, Zap, Award, Bookmark, Heart, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AddDeckDialog } from '@/components/add-deck-dialog'
import { DeckBuildViewer } from '@/components/deck-build-viewer'
import { MatchCard } from '@/components/match-card'
import { PlayerCollection } from '@/components/player-collection'
import { MVPCardDisplay } from '@/components/mvp-card-display'
import { ProfileEditor } from '@/components/profile-editor'
import { PROFILE_THEMES, YUGIOH_SERIES, CARD_MECHANICS, CARD_TYPES } from '@/lib/profile-themes'
import type { PlayerWithStats, MatchWithParticipants, Player, Deck, DeckFormat, SavedMatch, PlayerProfile as PlayerProfileType } from '@/lib/types'

interface PlayerProfileProps {
  player: PlayerWithStats
  matches: MatchWithParticipants[]
  allPlayers: Player[]
  savedMatches: SavedMatch[]
  profile: PlayerProfileType | null
}

// Helper to get ordinal suffix
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Calculate deck records from matches
function calculateDeckRecords(matches: MatchWithParticipants[], playerId: string, decks: Deck[]) {
  const deckStats: Record<string, { wins: number; losses: number }> = {}
  
  decks.forEach(deck => {
    deckStats[deck.id] = { wins: 0, losses: 0 }
  })
  
  matches.forEach(match => {
    const playerParticipant = match.participants.find(p => p.player_id === playerId)
    if (!playerParticipant || !playerParticipant.deck_id) return
    
    const deckId = playerParticipant.deck_id
    if (!deckStats[deckId]) {
      deckStats[deckId] = { wins: 0, losses: 0 }
    }
    
    if (playerParticipant.is_winner) {
      deckStats[deckId].wins++
    } else {
      deckStats[deckId].losses++
    }
  })
  
  return deckStats
}

// Calculate 1v1 records against each opponent
function calculate1v1Records(matches: MatchWithParticipants[], playerId: string, allPlayers: Player[]) {
  const records: Record<string, {
    opponent: Player
    wins: number
    losses: number
    matchups: Array<{
      playerDeck: string | null
      opponentDeck: string | null
      playerWon: boolean
      date: string
    }>
  }> = {}
  
  const oneVOneMatches = matches.filter(m => m.match_type === '1v1')
  
  oneVOneMatches.forEach(match => {
    const playerParticipant = match.participants.find(p => p.player_id === playerId)
    const opponentParticipant = match.participants.find(p => p.player_id !== playerId)
    
    if (!playerParticipant || !opponentParticipant) return
    
    const opponentId = opponentParticipant.player_id
    const opponent = allPlayers.find(p => p.id === opponentId)
    if (!opponent) return
    
    if (!records[opponentId]) {
      records[opponentId] = {
        opponent,
        wins: 0,
        losses: 0,
        matchups: []
      }
    }
    
    if (playerParticipant.is_winner) {
      records[opponentId].wins++
    } else {
      records[opponentId].losses++
    }
    
    records[opponentId].matchups.push({
      playerDeck: playerParticipant.deck?.name || null,
      opponentDeck: opponentParticipant.deck?.name || null,
      playerWon: playerParticipant.is_winner,
      date: match.played_at
    })
  })
  
  return Object.values(records).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
}

// Calculate FFA placement history
function calculateFFAStats(matches: MatchWithParticipants[], playerId: string) {
  const ffaMatches = matches.filter(m => m.match_type === 'free_for_all')
  const placements: Record<number, number> = {}
  let totalMatches = 0
  
  const matchHistory: Array<{
    placement: number
    totalPlayers: number
    deck: string | null
    date: string
  }> = []
  
  ffaMatches.forEach(match => {
    const playerParticipant = match.participants.find(p => p.player_id === playerId)
    if (!playerParticipant) return
    
    const placement = playerParticipant.placement
    if (placement) {
      placements[placement] = (placements[placement] || 0) + 1
      totalMatches++
      
      matchHistory.push({
        placement,
        totalPlayers: match.participants.length,
        deck: playerParticipant.deck?.name || null,
        date: match.played_at
      })
    }
  })
  
  // Calculate average placement
  let totalPlacements = 0
  Object.entries(placements).forEach(([place, count]) => {
    totalPlacements += parseInt(place) * count
  })
  const avgPlacement = totalMatches > 0 ? totalPlacements / totalMatches : 0
  
  return {
    placements,
    totalMatches,
    avgPlacement,
    matchHistory: matchHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
}

// Calculate tag team records with partners
function calculateTagTeamRecords(matches: MatchWithParticipants[], playerId: string, allPlayers: Player[]) {
  const records: Record<string, {
    partner: Player
    wins: number
    losses: number
    matchHistory: Array<{
      opponents: string[]
      won: boolean
      date: string
    }>
  }> = {}
  
  const tagMatches = matches.filter(m => m.match_type === 'tag_team')
  
  tagMatches.forEach(match => {
    const playerParticipant = match.participants.find(p => p.player_id === playerId)
    if (!playerParticipant) return
    
    const playerTeam = playerParticipant.team_number
    const partners = match.participants.filter(
      p => p.team_number === playerTeam && p.player_id !== playerId
    )
    const opponents = match.participants.filter(p => p.team_number !== playerTeam)
    
    partners.forEach(partnerParticipant => {
      const partnerId = partnerParticipant.player_id
      const partner = allPlayers.find(p => p.id === partnerId)
      if (!partner) return
      
      if (!records[partnerId]) {
        records[partnerId] = {
          partner,
          wins: 0,
          losses: 0,
          matchHistory: []
        }
      }
      
      if (playerParticipant.is_winner) {
        records[partnerId].wins++
      } else {
        records[partnerId].losses++
      }
      
      records[partnerId].matchHistory.push({
        opponents: opponents.map(o => {
          const player = allPlayers.find(p => p.id === o.player_id)
          return player?.nickname || 'Unknown'
        }),
        won: playerParticipant.is_winner,
        date: match.played_at
      })
    })
  })
  
  return Object.values(records).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
}

export function PlayerProfile({ player, matches, allPlayers, savedMatches, profile }: PlayerProfileProps) {
  const [deleting, setDeleting] = useState(false)
  const [formatFilter, setFormatFilter] = useState<DeckFormat | 'all'>('all')
  const router = useRouter()
  const supabase = createClient()
  
  // Get theme config
  const theme = profile?.theme || 'kaiba'
  const themeConfig = PROFILE_THEMES[theme]
  
  // Get rival info
  const rival = profile?.rival_id ? allPlayers.find(p => p.id === profile.rival_id) : null
  
  // Get featured deck
  const featuredDeck = profile?.featured_deck_id 
    ? player.decks.find(d => d.id === profile.featured_deck_id) 
    : null
  
  // Calculate head-to-head record with rival
  const rivalRecord = useMemo(() => {
    if (!rival) return null
    let wins = 0
    let losses = 0
    
    matches.forEach(match => {
      const playerPart = match.participants.find(p => p.player_id === player.id)
      const rivalPart = match.participants.find(p => p.player_id === rival.id)
      
      if (playerPart && rivalPart) {
        if (playerPart.is_winner) wins++
        else if (rivalPart.is_winner) losses++
      }
    })
    
    return { wins, losses }
  }, [matches, player.id, rival])
  
  const stats = player.stats
  const totalGames = (stats?.total_wins ?? 0) + (stats?.total_losses ?? 0)
  const winRate = totalGames > 0 ? ((stats?.total_wins ?? 0) / totalGames) * 100 : 0

  // Calculate detailed records
  const deckRecords = useMemo(() => calculateDeckRecords(matches, player.id, player.decks), [matches, player.id, player.decks])
  const oneVOneRecords = useMemo(() => calculate1v1Records(matches, player.id, allPlayers), [matches, player.id, allPlayers])
  const ffaStats = useMemo(() => calculateFFAStats(matches, player.id), [matches, player.id])
  const tagTeamRecords = useMemo(() => calculateTagTeamRecords(matches, player.id, allPlayers), [matches, player.id, allPlayers])

  // Filter decks by format
  const filteredDecks = useMemo(() => {
    if (formatFilter === 'all') return player.decks
    return player.decks.filter(deck => (deck.format || 'casual') === formatFilter)
  }, [player.decks, formatFilter])

  // Get showcase matches (saved with showcase flag)
  const showcaseMatches = useMemo(() => {
    const showcaseIds = savedMatches.filter(sm => sm.showcase).map(sm => sm.match_id)
    return matches.filter(m => showcaseIds.includes(m.id))
  }, [matches, savedMatches])

  // Get saved match data for a specific match
  const getSavedMatch = (matchId: string): SavedMatch | null => {
    return savedMatches.find(sm => sm.match_id === matchId) || null
  }

  const handleSaveChange = () => {
    router.refresh()
  }

  // Calculate achievements
  const achievements = useMemo(() => {
    const achievementList: Array<{ id: string; name: string; description: string; icon: typeof Trophy; color: string; earned: boolean }> = []
    
    // Win-based achievements
    achievementList.push({
      id: 'first_win',
      name: 'First Victory',
      description: 'Win your first duel',
      icon: Trophy,
      color: 'text-yellow-500',
      earned: (stats?.total_wins ?? 0) >= 1
    })
    achievementList.push({
      id: 'veteran',
      name: 'Veteran Duelist',
      description: 'Win 10 duels',
      icon: Medal,
      color: 'text-amber-500',
      earned: (stats?.total_wins ?? 0) >= 10
    })
    achievementList.push({
      id: 'champion',
      name: 'Champion',
      description: 'Win 25 duels',
      icon: Crown,
      color: 'text-purple-500',
      earned: (stats?.total_wins ?? 0) >= 25
    })
    achievementList.push({
      id: 'legend',
      name: 'Living Legend',
      description: 'Win 50 duels',
      icon: Star,
      color: 'text-cyan-400',
      earned: (stats?.total_wins ?? 0) >= 50
    })
    
    // Streak achievements
    achievementList.push({
      id: 'hot_streak',
      name: 'Hot Streak',
      description: 'Win 5 duels in a row',
      icon: Flame,
      color: 'text-orange-500',
      earned: (() => {
        let streak = 0
        let maxStreak = 0
        const sortedMatches = [...matches].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
        for (const match of sortedMatches) {
          const participant = match.participants.find(p => p.player_id === player.id)
          if (participant?.is_winner) {
            streak++
            maxStreak = Math.max(maxStreak, streak)
          } else {
            streak = 0
          }
        }
        return maxStreak >= 5
      })()
    })
    
    // Format-specific achievements
    achievementList.push({
      id: '1v1_master',
      name: '1v1 Master',
      description: 'Win 10 1v1 duels',
      icon: Swords,
      color: 'text-blue-500',
      earned: (stats?.wins_1v1 ?? 0) >= 10
    })
    achievementList.push({
      id: 'ffa_survivor',
      name: 'FFA Survivor',
      description: 'Win 5 Free-For-All matches',
      icon: Users,
      color: 'text-green-500',
      earned: (stats?.wins_ffa ?? 0) >= 5
    })
    achievementList.push({
      id: 'team_player',
      name: 'Team Player',
      description: 'Win 5 Tag Team matches',
      icon: Layers,
      color: 'text-pink-500',
      earned: (stats?.wins_tag ?? 0) >= 5
    })
    
    // Win rate achievements
    achievementList.push({
      id: 'elite',
      name: 'Elite Duelist',
      description: 'Maintain 60%+ win rate (min 10 games)',
      icon: Zap,
      color: 'text-yellow-400',
      earned: totalGames >= 10 && winRate >= 60
    })
    achievementList.push({
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Maintain 75%+ win rate (min 20 games)',
      icon: Award,
      color: 'text-emerald-400',
      earned: totalGames >= 20 && winRate >= 75
    })
    
    return achievementList
  }, [stats, matches, player.id, totalGames, winRate])

  const earnedAchievements = achievements.filter(a => a.earned)
  const lockedAchievements = achievements.filter(a => !a.earned)

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
  
  return (
    <main 
      className="container mx-auto px-4 py-8"
      style={{
        '--theme-primary': themeConfig.colors.primary,
        '--theme-secondary': themeConfig.colors.secondary,
        '--theme-accent': themeConfig.colors.accent,
      } as React.CSSProperties}
    >
      {/* Back Button */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Duelists
      </Link>

      {/* Profile Header with Theme */}
      <Card 
        className="border-2 mb-6 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${themeConfig.gradientFrom}, ${themeConfig.gradientTo})`,
          borderColor: themeConfig.colors.border,
        }}
      >
        {/* Banner */}
        {profile?.banner_url && (
          <div className="h-32 w-full overflow-hidden relative">
            <img 
              src={profile.banner_url} 
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${themeConfig.colors.card}, transparent)`,
              }}
            />
          </div>
        )}
        
        <CardContent className={`p-6 sm:p-8 ${profile?.banner_url ? '-mt-16 relative z-10' : ''}`}>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar 
              className="h-24 w-24 border-4"
              style={{ borderColor: themeConfig.colors.primary }}
            >
              <AvatarImage src={player.avatar_url || undefined} alt={player.nickname} />
              <AvatarFallback 
                className="text-2xl font-bold" 
                style={{ 
                  backgroundColor: themeConfig.colors.secondary,
                  color: themeConfig.colors.text,
                  fontFamily: 'var(--font-orbitron)' 
                }}
              >
                {player.nickname.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 
                      className="text-2xl font-bold"
                      style={{ fontFamily: 'var(--font-orbitron)', color: themeConfig.colors.text }}
                    >
                      {player.nickname}
                    </h1>
                    <Badge 
                      className="text-xs"
                      style={{ backgroundColor: themeConfig.colors.primary, color: '#fff' }}
                    >
                      {themeConfig.name}
                    </Badge>
                  </div>
                  
                  {/* Bio */}
                  {profile?.bio && (
                    <p className="text-sm mb-2" style={{ color: themeConfig.colors.muted }}>
                      {profile.bio}
                    </p>
                  )}
                  
                  <p className="text-sm" style={{ color: themeConfig.colors.muted }}>
                    Registered {new Date(player.created_at).toLocaleDateString()}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-2">
                    <ProfileEditor 
                        playerId={player.id}
                        profile={profile}
                        decks={player.decks}
                        allPlayers={allPlayers}
                        iconOnly={true}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            title="Delete player"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  
                  {/* Favorites Row */}
                  {(profile?.favorite_series || profile?.favorite_mechanic || profile?.favorite_card_type) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.favorite_series && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.accent }}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          {YUGIOH_SERIES[profile.favorite_series].label}
                        </Badge>
                      )}
                      {profile.favorite_mechanic && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: CARD_MECHANICS[profile.favorite_mechanic].color, 
                            color: CARD_MECHANICS[profile.favorite_mechanic].color 
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {CARD_MECHANICS[profile.favorite_mechanic].label}
                        </Badge>
                      )}
                      {profile.favorite_card_type && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.accent }}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {CARD_TYPES[profile.favorite_card_type].label}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Favorite Card */}
                  {profile?.favorite_card_name && (
                    <p className="text-xs mt-2" style={{ color: themeConfig.colors.muted }}>
                      Favorite Card: <span style={{ color: themeConfig.colors.accent }}>{profile.favorite_card_name}</span>
                    </p>
                  )}
                </div>
                
                {/* Right Column: Featured Deck */}
                {featuredDeck && (
                  <div 
                    className="border rounded-lg overflow-hidden flex flex-col w-56"
                    style={{ 
                      backgroundColor: `${themeConfig.colors.card}80`,
                      borderColor: themeConfig.colors.border,
                      minHeight: '280px'
                    }}
                  >
                    <div className="p-3 flex flex-col items-center text-center flex-1">
                      <Star className="h-4 w-4 text-yellow-500 mb-1" />
                      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: themeConfig.colors.muted }}>
                        Featured Deck
                      </p>
                      <p className="font-semibold text-xs mb-2" style={{ color: themeConfig.colors.text }}>
                        {featuredDeck.name}
                      </p>
                      {featuredDeck.mvp_card_name && (
                        <MVPCardDisplay mvpCardName={featuredDeck.mvp_card_name} themeConfig={themeConfig} />
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Achievement Showcase - Centralized */}
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: themeConfig.colors.muted }}>
                  Achievement Showcase
                </p>
                {earnedAchievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No achievements earned yet. Start dueling!</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {earnedAchievements.slice(0, 6).map((achievement) => (
                      <div 
                        key={achievement.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-primary/20 hover:border-primary/50 transition-colors group"
                        title={achievement.description}
                      >
                        <achievement.icon className={`h-5 w-5 ${achievement.color}`} />
                        <span className="text-sm font-medium text-foreground">{achievement.name}</span>
                      </div>
                    ))}
                    {earnedAchievements.length > 6 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border">
                        <span className="text-sm text-muted-foreground">+{earnedAchievements.length - 6} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rival Section */}
              {rival && rivalRecord && (
                <Card 
                  className="mt-4 border"
                  style={{ 
                    backgroundColor: `${themeConfig.colors.card}80`,
                    borderColor: themeConfig.colors.border 
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Swords className="h-5 w-5" style={{ color: themeConfig.colors.primary }} />
                        <div>
                          <p className="text-xs uppercase tracking-wide" style={{ color: themeConfig.colors.muted }}>
                            Rival
                          </p>
                          <p className="font-semibold" style={{ color: themeConfig.colors.text }}>
                            {rival.nickname}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide" style={{ color: themeConfig.colors.muted }}>
                          Head-to-Head
                        </p>
                        <p className="font-bold">
                          <span className="text-green-500">{rivalRecord.wins}W</span>
                          <span style={{ color: themeConfig.colors.muted }}> - </span>
                          <span className="text-red-500">{rivalRecord.losses}L</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats Bar */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{stats?.total_wins ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Wins</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{stats?.total_losses ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Losses</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <Percent className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <Swords className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{totalGames}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Duels</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{player.community_points ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Community</p>
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
          <TabsTrigger value="matches">Match History</TabsTrigger>
          <TabsTrigger value="saved">
            Saved {savedMatches.length > 0 && `(${savedMatches.length})`}
          </TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          {/* Overview Cards */}
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

          {/* 1v1 Detailed Records */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" />
                1v1 Record vs Opponents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oneVOneRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No 1v1 matches recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {oneVOneRecords.map((record) => (
                    <div key={record.opponent.id} className="border border-border rounded-lg p-4 bg-background/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-primary/30">
                            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                              {record.opponent.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{record.opponent.nickname}</p>
                            <p className="text-sm text-muted-foreground">{record.matchups.length} matches</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={record.wins > record.losses ? 'default' : record.wins < record.losses ? 'destructive' : 'secondary'} 
                            className={`text-base px-3 py-1 ${record.wins > record.losses ? 'bg-green-600' : record.wins < record.losses ? 'bg-red-600' : ''}`}
                          >
                            {record.wins}-{record.losses}
                          </Badge>
                          {record.wins > record.losses && <TrendingUp className="h-5 w-5 text-green-500" />}
                          {record.wins < record.losses && <TrendingDown className="h-5 w-5 text-red-500" />}
                          {record.wins === record.losses && <Minus className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </div>
                      
                      {/* Deck matchups */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Deck Matchup History:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {record.matchups.slice(0, 5).map((matchup, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {matchup.playerWon ? (
                                  <Trophy className="h-3 w-3 text-yellow-500" />
                                ) : (
                                  <Swords className="h-3 w-3 text-red-500" />
                                )}
                                <span className={matchup.playerWon ? 'text-green-400' : 'text-red-400'}>
                                  {matchup.playerDeck || 'No deck'}
                                </span>
                                <span className="text-muted-foreground">vs</span>
                                <span className="text-muted-foreground">
                                  {matchup.opponentDeck || 'No deck'}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(matchup.date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* FFA Placement History */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Free-For-All Placements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ffaStats.totalMatches === 0 ? (
                <p className="text-muted-foreground text-center py-4">No FFA matches recorded yet.</p>
              ) : (
                <div className="space-y-6">
                  {/* Placement Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3].map((place) => (
                      <div key={place} className={`p-3 rounded-lg border ${
                        place === 1 ? 'border-yellow-500/50 bg-yellow-500/10' :
                        place === 2 ? 'border-gray-400/50 bg-gray-400/10' :
                        'border-amber-700/50 bg-amber-700/10'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Medal className={`h-4 w-4 ${
                            place === 1 ? 'text-yellow-500' :
                            place === 2 ? 'text-gray-400' :
                            'text-amber-700'
                          }`} />
                          <span className="text-sm font-medium text-foreground">{getOrdinal(place)}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{ffaStats.placements[place] || 0}</p>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Avg</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{ffaStats.avgPlacement.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Placement History */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Recent FFA Results:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ffaStats.matchHistory.slice(0, 10).map((match, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={match.placement === 1 ? 'default' : 'secondary'} 
                              className={`${
                                match.placement === 1 ? 'bg-yellow-500 text-yellow-950' :
                                match.placement === 2 ? 'bg-gray-400 text-gray-950' :
                                match.placement === 3 ? 'bg-amber-700 text-amber-50' : ''
                              }`}
                            >
                              {getOrdinal(match.placement)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              / {match.totalPlayers} players
                            </span>
                            {match.deck && (
                              <span className="text-sm text-foreground">
                                with <span className="text-primary">{match.deck}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tag Team Partner Records */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-chart-3" />
                Tag Team Partner Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tagTeamRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tag team matches recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {tagTeamRecords.map((record) => (
                    <div key={record.partner.id} className="border border-border rounded-lg p-4 bg-background/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-green-500/30">
                            <AvatarFallback className="bg-green-500/20 text-green-400 text-sm font-bold">
                              {record.partner.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{record.partner.nickname}</p>
                            <p className="text-sm text-muted-foreground">{record.matchHistory.length} matches together</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={record.wins > record.losses ? 'default' : record.wins < record.losses ? 'destructive' : 'secondary'} 
                            className={`text-base px-3 py-1 ${record.wins > record.losses ? 'bg-green-600' : record.wins < record.losses ? 'bg-red-600' : ''}`}
                          >
                            {record.wins}-{record.losses}
                          </Badge>
                          {record.wins > record.losses && <TrendingUp className="h-5 w-5 text-green-500" />}
                          {record.wins < record.losses && <TrendingDown className="h-5 w-5 text-red-500" />}
                          {record.wins === record.losses && <Minus className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </div>
                      
                      {/* Match history */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Recent Matches:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {record.matchHistory.slice(0, 5).map((match, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {match.won ? (
                                  <Trophy className="h-3 w-3 text-yellow-500" />
                                ) : (
                                  <Swords className="h-3 w-3 text-red-500" />
                                )}
                                <span className={match.won ? 'text-green-400' : 'text-red-400'}>
                                  {match.won ? 'Victory' : 'Defeat'}
                                </span>
                                <span className="text-muted-foreground">vs</span>
                                <span className="text-muted-foreground">
                                  {match.opponents.join(' & ')}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(match.date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decks Tab */}
        <TabsContent value="decks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* Format Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Format:</span>
              <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as DeckFormat | 'all')}>
                <SelectTrigger className="w-32 h-8 text-sm bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="tcg">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      TCG
                    </span>
                  </SelectItem>
                  <SelectItem value="ocg">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      OCG
                    </span>
                  </SelectItem>
                  <SelectItem value="casual">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Casual
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <AddDeckDialog playerId={player.id} />
          </div>
          
          {filteredDecks.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {player.decks.length === 0 
                    ? 'No decks registered yet.' 
                    : `No ${formatFilter} decks found.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredDecks.map((deck) => (
                <DeckBuildViewer 
                  key={deck.id} 
                  deck={deck} 
                  record={deckRecords[deck.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-4">
          {/* Showcase Section */}
          {showcaseMatches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-foreground">Featured Matches</h3>
              </div>
              <div className="space-y-3">
                {showcaseMatches.map((match) => (
                  <MatchCard
                    key={`showcase-${match.id}`}
                    match={match}
                    currentPlayerId={player.id}
                    savedMatch={getSavedMatch(match.id)}
                    onSaveChange={handleSaveChange}
                    showSaveButton={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Matches */}
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Match History</h3>
            <Badge variant="outline" className="text-xs">{matches.length} total</Badge>
          </div>
          
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
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  currentPlayerId={player.id}
                  savedMatch={getSavedMatch(match.id)}
                  onSaveChange={handleSaveChange}
                  showSaveButton={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Saved Matches Tab */}
        <TabsContent value="saved" className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Saved Matches</h3>
          </div>
          
          {savedMatches.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No saved matches yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save matches from your match history to find them easily later.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedMatches.map((savedMatch) => {
                const match = matches.find(m => m.id === savedMatch.match_id)
                if (!match) return null
                return (
                  <MatchCard
                    key={savedMatch.id}
                    match={match}
                    currentPlayerId={player.id}
                    savedMatch={savedMatch}
                    onSaveChange={handleSaveChange}
                    showSaveButton={true}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Collection Tab */}
        <TabsContent value="collection">
          <PlayerCollection playerId={player.id} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
