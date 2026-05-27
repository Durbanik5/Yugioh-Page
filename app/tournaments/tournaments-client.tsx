'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Trophy,
  Users,
  Calendar,
  Clock,
  Swords,
  Crown,
  Medal,
  Gift,
  ChevronRight,
  Play,
  CheckCircle,
  Timer,
  Brackets,
  Star,
  Bell,
  Plus
} from 'lucide-react'

// Mock tournament data
const upcomingTournaments = [
  {
    id: 1,
    name: 'Weekly Championship',
    format: 'Single Elimination',
    players: 24,
    maxPlayers: 32,
    entryFee: 0,
    prizePool: 1000,
    startTime: 'Today, 8:00 PM',
    status: 'registration',
    registered: true,
  },
  {
    id: 2,
    name: 'Dragon Masters Cup',
    format: 'Double Elimination',
    players: 56,
    maxPlayers: 64,
    entryFee: 100,
    prizePool: 5000,
    startTime: 'Tomorrow, 3:00 PM',
    status: 'registration',
    registered: false,
  },
  {
    id: 3,
    name: 'Beginner\'s League',
    format: 'Swiss',
    players: 12,
    maxPlayers: 16,
    entryFee: 0,
    prizePool: 500,
    startTime: 'Dec 20, 6:00 PM',
    status: 'upcoming',
    registered: false,
  },
  {
    id: 4,
    name: 'Grand Championship',
    format: 'Double Elimination',
    players: 128,
    maxPlayers: 128,
    entryFee: 500,
    prizePool: 25000,
    startTime: 'Dec 25, 12:00 PM',
    status: 'upcoming',
    registered: false,
  },
]

const activeTournaments = [
  {
    id: 5,
    name: 'Evening Showdown',
    format: 'Single Elimination',
    players: 16,
    round: 'Quarterfinals',
    nextMatch: 'In 15 minutes',
    opponent: 'DragonMaster',
    status: 'your_turn',
  },
]

const pastTournaments = [
  { id: 101, name: 'Weekly Championship #47', placement: 1, participants: 32, prize: 500, date: '2 days ago' },
  { id: 102, name: 'Dragon Masters Cup #12', placement: 4, participants: 64, prize: 200, date: '1 week ago' },
  { id: 103, name: 'Beginner\'s League #8', placement: 2, participants: 16, prize: 150, date: '2 weeks ago' },
  { id: 104, name: 'Weekly Championship #46', placement: 8, participants: 32, prize: 50, date: '2 weeks ago' },
]

// Mock bracket data
const bracketData = {
  round1: [
    { player1: 'DragonMaster', player2: 'BlueEyesKing', winner: 'DragonMaster', score: '2-1' },
    { player1: 'SynchroStorm', player2: 'XyzOverlord', winner: 'SynchroStorm', score: '2-0' },
    { player1: 'You', player2: 'TrapMaster', winner: 'You', score: '2-1' },
    { player1: 'FusionFrenzy', player2: 'LinkClimber', winner: 'FusionFrenzy', score: '2-0' },
  ],
  round2: [
    { player1: 'DragonMaster', player2: 'SynchroStorm', winner: null, score: null },
    { player1: 'You', player2: 'FusionFrenzy', winner: null, score: null },
  ],
  finals: [
    { player1: 'TBD', player2: 'TBD', winner: null, score: null },
  ],
}

// Notifications
const notifications = [
  { id: 1, type: 'match', message: 'Your match against DragonMaster starts in 15 minutes!', time: '15 min ago', unread: true },
  { id: 2, type: 'tournament', message: 'Weekly Championship #48 registration is now open!', time: '1 hour ago', unread: true },
  { id: 3, type: 'result', message: 'You placed 1st in Weekly Championship #47!', time: '2 days ago', unread: false },
  { id: 4, type: 'challenge', message: 'BlueEyesKing challenged you to a duel!', time: '3 days ago', unread: false },
  { id: 5, type: 'reward', message: 'You received 500 coins for winning Weekly Championship #47', time: '2 days ago', unread: false },
]

export function TournamentsClient() {
  const [activeTab, setActiveTab] = useState('browse')
  const [showNotifications, setShowNotifications] = useState(false)

  const getPlacementIcon = (placement: number) => {
    if (placement === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (placement === 2) return <Medal className="h-5 w-5 text-slate-400" />
    if (placement === 3) return <Medal className="h-5 w-5 text-orange-500" />
    return <span className="text-sm font-bold">#{placement}</span>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-green-500/20 text-green-400">Registration Open</Badge>
      case 'upcoming':
        return <Badge className="bg-blue-500/20 text-blue-400">Upcoming</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-500/20 text-yellow-400">In Progress</Badge>
      case 'your_turn':
        return <Badge className="bg-red-500/20 text-red-400 animate-pulse">Your Turn!</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Tournaments
            </h1>
            <p className="text-muted-foreground mt-1">
              Compete in tournaments and prove your skills
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notifications Bell */}
            <Button 
              variant="outline" 
              size="icon" 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          </div>
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        notif.unread ? 'bg-primary/5 border border-primary/20' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${notif.unread ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <p className="text-sm">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Active Tournament Alert */}
        {activeTournaments.length > 0 && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Swords className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{activeTournaments[0].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTournaments[0].round} - Next match: {activeTournaments[0].nextMatch}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">vs</p>
                  <p className="font-semibold">{activeTournaments[0].opponent}</p>
                </div>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  <Play className="h-4 w-4 mr-2" />
                  Enter Match
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="bracket" className="flex items-center gap-2">
              <Brackets className="h-4 w-4" />
              Bracket
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-4">
              {upcomingTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{tournament.name}</CardTitle>
                        <CardDescription>{tournament.format}</CardDescription>
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{tournament.players}/{tournament.maxPlayers} players</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{tournament.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span>Entry: {tournament.entryFee === 0 ? 'Free' : `${tournament.entryFee} coins`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Gift className="h-4 w-4 text-yellow-500" />
                        <span className="text-yellow-500 font-semibold">{tournament.prizePool} coins</span>
                      </div>
                    </div>
                    <Progress value={(tournament.players / tournament.maxPlayers) * 100} className="h-2" />
                  </CardContent>
                  <CardFooter className="bg-accent/30">
                    {tournament.registered ? (
                      <Button variant="outline" className="w-full" disabled>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Registered
                      </Button>
                    ) : (
                      <Button className="w-full">
                        Register Now
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Bracket Tab */}
          <TabsContent value="bracket">
            <Card>
              <CardHeader>
                <CardTitle>Evening Showdown - Bracket</CardTitle>
                <CardDescription>Single Elimination - 16 Players</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8 overflow-x-auto pb-4">
                  {/* Round 1 */}
                  <div className="space-y-4 min-w-[200px]">
                    <h4 className="font-semibold text-sm text-muted-foreground">Round 1</h4>
                    {bracketData.round1.map((match, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className={`p-2 text-sm flex items-center justify-between ${
                          match.winner === match.player1 ? 'bg-green-500/10' : ''
                        }`}>
                          <span className={match.winner === match.player1 ? 'font-semibold' : ''}>{match.player1}</span>
                          {match.winner === match.player1 && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        <div className="border-t" />
                        <div className={`p-2 text-sm flex items-center justify-between ${
                          match.winner === match.player2 ? 'bg-green-500/10' : ''
                        }`}>
                          <span className={match.winner === match.player2 ? 'font-semibold' : ''}>{match.player2}</span>
                          {match.winner === match.player2 && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        {match.score && (
                          <div className="bg-accent/50 text-center text-xs py-1">{match.score}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Connector Lines */}
                  <div className="flex items-center">
                    <div className="w-8 border-t-2 border-dashed border-muted-foreground/30" />
                  </div>

                  {/* Round 2 (Semifinals) */}
                  <div className="space-y-4 min-w-[200px] flex flex-col justify-center">
                    <h4 className="font-semibold text-sm text-muted-foreground">Semifinals</h4>
                    {bracketData.round2.map((match, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className={`p-2 text-sm flex items-center justify-between ${
                          match.winner === match.player1 ? 'bg-green-500/10' : ''
                        }`}>
                          <span className={match.player1 === 'You' ? 'text-primary font-semibold' : ''}>
                            {match.player1}
                          </span>
                        </div>
                        <div className="border-t" />
                        <div className={`p-2 text-sm flex items-center justify-between ${
                          match.winner === match.player2 ? 'bg-green-500/10' : ''
                        }`}>
                          <span className={match.player2 === 'You' ? 'text-primary font-semibold' : ''}>
                            {match.player2}
                          </span>
                        </div>
                        {!match.winner && (
                          <div className="bg-yellow-500/20 text-center text-xs py-1 text-yellow-500">
                            <Timer className="h-3 w-3 inline mr-1" />
                            Pending
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Connector Lines */}
                  <div className="flex items-center">
                    <div className="w-8 border-t-2 border-dashed border-muted-foreground/30" />
                  </div>

                  {/* Finals */}
                  <div className="space-y-4 min-w-[200px] flex flex-col justify-center">
                    <h4 className="font-semibold text-sm text-muted-foreground">Finals</h4>
                    {bracketData.finals.map((match, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden border-yellow-500/30">
                        <div className="p-2 text-sm flex items-center justify-between">
                          <span>{match.player1}</span>
                        </div>
                        <div className="border-t" />
                        <div className="p-2 text-sm flex items-center justify-between">
                          <span>{match.player2}</span>
                        </div>
                        <div className="bg-yellow-500/20 text-center text-xs py-1 text-yellow-500">
                          <Crown className="h-3 w-3 inline mr-1" />
                          Finals
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Tournament History</CardTitle>
                <CardDescription>Your past tournament results and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {pastTournaments.map((tournament) => (
                      <div 
                        key={tournament.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                          tournament.placement <= 3 ? 'border-l-4 border-l-yellow-500' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          {getPlacementIcon(tournament.placement)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{tournament.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {tournament.participants} participants - {tournament.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Gift className="h-4 w-4" />
                            <span className="font-bold">{tournament.prize}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">coins won</p>
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
        </Tabs>
      </main>
    </div>
  )
}
