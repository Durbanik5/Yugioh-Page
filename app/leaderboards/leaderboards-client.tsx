'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Swords,
  Shield,
  Star,
  ChevronRight,
  History,
  Target,
  Flame,
  Award
} from 'lucide-react'

// Mock leaderboard data
const leaderboardData = [
  { rank: 1, name: 'DragonMaster', avatar: '/avatars/1.jpg', rating: 2847, wins: 342, losses: 89, winRate: 79.4, change: 2, streak: 12, tier: 'Legend' },
  { rank: 2, name: 'DarkMagician', avatar: '/avatars/2.jpg', rating: 2756, wins: 298, losses: 102, winRate: 74.5, change: 0, streak: 5, tier: 'Legend' },
  { rank: 3, name: 'BlueEyesKing', avatar: '/avatars/3.jpg', rating: 2698, wins: 276, losses: 95, winRate: 74.4, change: -1, streak: 3, tier: 'Legend' },
  { rank: 4, name: 'SynchroStorm', avatar: '/avatars/4.jpg', rating: 2645, wins: 312, losses: 134, winRate: 70.0, change: 3, streak: 8, tier: 'Diamond' },
  { rank: 5, name: 'XyzOverlord', avatar: '/avatars/5.jpg', rating: 2589, wins: 267, losses: 123, winRate: 68.5, change: 1, streak: 4, tier: 'Diamond' },
  { rank: 6, name: 'LinkClimber', avatar: '/avatars/6.jpg', rating: 2534, wins: 245, losses: 118, winRate: 67.5, change: -2, streak: 2, tier: 'Diamond' },
  { rank: 7, name: 'FusionFrenzy', avatar: '/avatars/7.jpg', rating: 2478, wins: 223, losses: 112, winRate: 66.6, change: 0, streak: 1, tier: 'Platinum' },
  { rank: 8, name: 'TrapMaster', avatar: '/avatars/8.jpg', rating: 2421, wins: 198, losses: 104, winRate: 65.6, change: 4, streak: 6, tier: 'Platinum' },
  { rank: 9, name: 'PendulumPro', avatar: '/avatars/9.jpg', rating: 2365, wins: 187, losses: 99, winRate: 65.4, change: -1, streak: 0, tier: 'Platinum' },
  { rank: 10, name: 'RitualRuler', avatar: '/avatars/10.jpg', rating: 2312, wins: 176, losses: 98, winRate: 64.2, change: 2, streak: 3, tier: 'Platinum' },
]

// Mock match history
const matchHistory = [
  { id: 1, opponent: 'XyzOverlord', opponentRating: 2589, result: 'win', ratingChange: +15, deck: 'Buster Blader', opponentDeck: 'Xyz Dragon', duration: '12:34', date: '2 hours ago' },
  { id: 2, opponent: 'SynchroStorm', opponentRating: 2645, result: 'win', ratingChange: +18, deck: 'Buster Blader', opponentDeck: 'Synchron', duration: '8:45', date: '5 hours ago' },
  { id: 3, opponent: 'DragonMaster', opponentRating: 2847, result: 'loss', ratingChange: -8, deck: 'Buster Blader', opponentDeck: 'Dragon Link', duration: '15:22', date: 'Yesterday' },
  { id: 4, opponent: 'TrapMaster', opponentRating: 2421, result: 'win', ratingChange: +12, deck: 'Blue-Eyes', opponentDeck: 'Trap Trick', duration: '10:15', date: 'Yesterday' },
  { id: 5, opponent: 'FusionFrenzy', opponentRating: 2478, result: 'win', ratingChange: +14, deck: 'Blue-Eyes', opponentDeck: 'HERO', duration: '7:30', date: '2 days ago' },
  { id: 6, opponent: 'DarkMagician', opponentRating: 2756, result: 'loss', ratingChange: -10, deck: 'Blue-Eyes', opponentDeck: 'Dark Magician', duration: '18:45', date: '2 days ago' },
  { id: 7, opponent: 'LinkClimber', opponentRating: 2534, result: 'win', ratingChange: +13, deck: 'Buster Blader', opponentDeck: 'Code Talker', duration: '11:20', date: '3 days ago' },
  { id: 8, opponent: 'PendulumPro', opponentRating: 2365, result: 'win', ratingChange: +10, deck: 'Buster Blader', opponentDeck: 'Pendulum Magician', duration: '9:50', date: '3 days ago' },
]

// Player stats
const playerStats = {
  name: 'Damon',
  rating: 2423,
  rank: 8,
  tier: 'Platinum',
  wins: 198,
  losses: 104,
  winRate: 65.6,
  currentStreak: 6,
  bestStreak: 15,
  totalDuels: 302,
  avgDuration: '11:23',
  favoriteDecks: ['Buster Blader', 'Blue-Eyes', 'Dark Magician'],
}

export function LeaderboardsClient() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [timeFilter, setTimeFilter] = useState('season')

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legend': return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white'
      case 'Diamond': return 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
      case 'Platinum': return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900'
      case 'Gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900'
      case 'Silver': return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
      case 'Bronze': return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      default: return 'bg-muted'
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Leaderboards
            </h1>
            <p className="text-muted-foreground mt-1">
              Compete with the best duelists and track your progress
            </p>
          </div>
          
          {/* Season Info */}
          <Card className="w-full md:w-auto">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Season 3</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">14 days remaining</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Stats Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src="/avatars/player.jpg" />
                  <AvatarFallback>DA</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{playerStats.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getTierColor(playerStats.tier)}>{playerStats.tier}</Badge>
                    <span className="text-sm text-muted-foreground">Rank #{playerStats.rank}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{playerStats.rating}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{playerStats.wins}</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{playerStats.losses}</div>
                  <div className="text-xs text-muted-foreground">Losses</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold">{playerStats.winRate}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">{playerStats.currentStreak}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Win Streak</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Match History
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Statistics
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button 
                variant={timeFilter === 'season' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimeFilter('season')}
              >
                Season
              </Button>
              <Button 
                variant={timeFilter === 'alltime' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimeFilter('alltime')}
              >
                All Time
              </Button>
            </div>
          </div>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Top Duelists</CardTitle>
                <CardDescription>Rankings based on {timeFilter === 'season' ? 'current season' : 'all-time'} performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {leaderboardData.map((player) => (
                      <div 
                        key={player.rank}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                          player.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : ''
                        }`}
                      >
                        <div className="w-10 flex justify-center">
                          {getRankIcon(player.rank)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{player.name}</span>
                            <Badge className={`${getTierColor(player.tier)} text-xs`}>{player.tier}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {player.wins}W - {player.losses}L ({player.winRate}%)
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {player.streak > 0 && (
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flame className="h-4 w-4" />
                              <span className="text-sm font-medium">{player.streak}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {getChangeIcon(player.change)}
                            {player.change !== 0 && (
                              <span className={`text-sm ${player.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {Math.abs(player.change)}
                              </span>
                            )}
                          </div>
                          <div className="text-right min-w-[80px]">
                            <div className="font-bold">{player.rating}</div>
                            <div className="text-xs text-muted-foreground">Rating</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>Your duel history and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {matchHistory.map((match) => (
                      <div 
                        key={match.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                          match.result === 'win' 
                            ? 'border-l-4 border-l-green-500' 
                            : 'border-l-4 border-l-red-500'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                          match.result === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {match.result === 'win' ? (
                            <Trophy className="h-8 w-8 text-green-500" />
                          ) : (
                            <Shield className="h-8 w-8 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">vs {match.opponent}</span>
                            <Badge variant="outline" className="text-xs">{match.opponentRating}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {match.deck} vs {match.opponentDeck}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {match.duration}
                            </span>
                            <span>{match.date}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            match.ratingChange > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {match.ratingChange > 0 ? '+' : ''}{match.ratingChange}
                          </div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Stats</CardTitle>
                  <CardDescription>Detailed breakdown of your dueling performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <span>Total Duels</span>
                    <span className="font-bold">{playerStats.totalDuels}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <span>Average Duration</span>
                    <span className="font-bold">{playerStats.avgDuration}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <span>Best Win Streak</span>
                    <span className="font-bold flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {playerStats.bestStreak}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <span>Current Streak</span>
                    <span className="font-bold flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {playerStats.currentStreak}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Favorite Decks</CardTitle>
                  <CardDescription>Your most played decks this season</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {playerStats.favoriteDecks.map((deck, index) => (
                    <div key={deck} className="flex items-center gap-4 p-3 bg-accent/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-slate-400/20 text-slate-400' :
                        'bg-orange-500/20 text-orange-500'
                      }`}>
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{deck}</div>
                        <div className="text-xs text-muted-foreground">
                          {100 - index * 25} matches played
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-500">{70 - index * 5}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
