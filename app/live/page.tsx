'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { 
  Radio, Plus, Users, Eye, Swords, Clock, 
  ArrowRight, Zap, UserPlus, Settings2, Heart, Timer
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, DuelRoom, MatchType, DuelFormat } from '@/lib/types'

export default function LiveDuelsPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [rooms, setRooms] = useState<(DuelRoom & { participants: any[]; creator: Player | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  
  // Create room form
  const [roomName, setRoomName] = useState('')
  const [matchType, setMatchType] = useState<MatchType>('1v1')
  const [format, setFormat] = useState<DuelFormat>('casual')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [creating, setCreating] = useState(false)
  
  // YGOPro-style duel settings
  const [startingLp, setStartingLp] = useState(8000)
  const [startingHandSize, setStartingHandSize] = useState(5)
  const [masterRule, setMasterRule] = useState('MR5')
  const [firstTurnDraw, setFirstTurnDraw] = useState(false)
  const [shuffleDeck, setShuffleDeck] = useState(true)
  const [timePerTurn, setTimePerTurn] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
    // Subscribe to room updates
    const channel = supabase
      .channel('live-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_rooms' }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchPlayers(), fetchRooms()])
    setLoading(false)
  }

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('nickname')
    
    if (!error && data) {
      setPlayers(data)
    }
  }

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('duel_rooms')
      .select(`
        *,
        participants:duel_room_participants(
          *,
          player:players(*)
        ),
        creator:players!duel_rooms_created_by_fkey(*)
      `)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setRooms(data as any)
    }
  }

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name')
      return
    }
    if (!selectedPlayer) {
      toast.error('Please select yourself')
      return
    }

    setCreating(true)
    const roomCode = generateRoomCode()

    const { data: room, error: roomError } = await supabase
      .from('duel_rooms')
      .insert({
        room_code: roomCode,
        name: roomName.trim(),
        match_type: matchType,
        format: format,
        stream_url: streamUrl.trim() || null,
        created_by: selectedPlayer,
        starting_lp: startingLp,
        starting_hand_size: startingHandSize,
        master_rule: masterRule,
        first_turn_draw: firstTurnDraw,
        shuffle_deck: shuffleDeck,
        time_per_turn: timePerTurn,
      })
      .select()
      .single()

    if (roomError) {
      toast.error('Failed to create room')
      setCreating(false)
      return
    }

    // Add creator as participant with room's starting LP
    await supabase.from('duel_room_participants').insert({
      room_id: room.id,
      player_id: selectedPlayer,
      is_spectator: false,
      life_points: startingLp,
      hand_count: startingHandSize,
    })

    toast.success(`Room created! Code: ${roomCode}`)
    setCreating(false)
    setCreateDialogOpen(false)
    router.push(`/live/${room.id}`)
  }

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a room code')
      return
    }

    const { data: room, error } = await supabase
      .from('duel_rooms')
      .select('id')
      .eq('room_code', joinCode.toUpperCase().trim())
      .single()

    if (error || !room) {
      toast.error('Room not found')
      return
    }

    router.push(`/live/${room.id}`)
  }

  const activeRooms = rooms.filter(r => r.status === 'active')
  const waitingRooms = rooms.filter(r => r.status === 'waiting')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold text-foreground flex items-center gap-3"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              <Radio className="h-8 w-8 text-primary animate-pulse" />
              LIVE DUELS
            </h1>
            <p className="text-muted-foreground mt-1">
              Watch or host live duels with real-time tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-32 bg-input border-border uppercase"
                maxLength={6}
              />
              <Button onClick={handleJoinByCode} variant="outline">
                Join
              </Button>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/80 kaiba-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create Duel Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground">Your Name</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="bg-input border-border mt-1">
                        <SelectValue placeholder="Select yourself..." />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.nickname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Room Name</Label>
                    <Input
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g., Friday Night Duels"
                      className="bg-input border-border mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Match Type</Label>
                    <Select value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
                      <SelectTrigger className="bg-input border-border mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1v1">1v1</SelectItem>
                        <SelectItem value="free_for_all">Free For All</SelectItem>
                        <SelectItem value="tag_team">Tag Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Duel Format</Label>
                    <Select value={format} onValueChange={(v) => setFormat(v as DuelFormat)}>
                      <SelectTrigger className="bg-input border-border mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Casual (No banlist)
                          </div>
                        </SelectItem>
                        <SelectItem value="tcg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            TCG Format
                          </div>
                        </SelectItem>
                        <SelectItem value="ocg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            OCG Format
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Stream URL (optional)</Label>
                    <Input
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="YouTube or Twitch link..."
                      className="bg-input border-border mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a stream link for spectators to watch the camera feed
                    </p>
                  </div>

                  {/* YGOPro-style Duel Settings */}
                  <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Settings2 className="h-4 w-4 text-primary" />
                      Duel Settings
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Starting LP</Label>
                        <Select value={startingLp.toString()} onValueChange={(v) => setStartingLp(parseInt(v))}>
                          <SelectTrigger className="bg-input border-border mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8000">
                              <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-red-500" />
                                8000 LP
                              </div>
                            </SelectItem>
                            <SelectItem value="4000">
                              <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-orange-500" />
                                4000 LP
                              </div>
                            </SelectItem>
                            <SelectItem value="2000">
                              <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-yellow-500" />
                                2000 LP
                              </div>
                            </SelectItem>
                            <SelectItem value="1000">
                              <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-purple-500" />
                                1000 LP
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-muted-foreground text-xs">Starting Hand</Label>
                        <Select value={startingHandSize.toString()} onValueChange={(v) => setStartingHandSize(parseInt(v))}>
                          <SelectTrigger className="bg-input border-border mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Cards</SelectItem>
                            <SelectItem value="6">6 Cards</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Master Rule</Label>
                        <Select value={masterRule} onValueChange={setMasterRule}>
                          <SelectTrigger className="bg-input border-border mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MR5">MR5 (2020)</SelectItem>
                            <SelectItem value="MR4">MR4 (Link)</SelectItem>
                            <SelectItem value="MR3">MR3 (Pendulum)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-muted-foreground text-xs">Time per Turn</Label>
                        <Select value={timePerTurn?.toString() || 'none'} onValueChange={(v) => setTimePerTurn(v === 'none' ? null : parseInt(v))}>
                          <SelectTrigger className="bg-input border-border mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <Timer className="h-3 w-3 text-muted-foreground" />
                                No Limit
                              </div>
                            </SelectItem>
                            <SelectItem value="180">3 Minutes</SelectItem>
                            <SelectItem value="300">5 Minutes</SelectItem>
                            <SelectItem value="480">8 Minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm text-foreground">Draw on First Turn</Label>
                          <p className="text-xs text-muted-foreground">First player draws during their Draw Phase</p>
                        </div>
                        <Switch
                          checked={firstTurnDraw}
                          onCheckedChange={setFirstTurnDraw}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm text-foreground">Shuffle Deck</Label>
                          <p className="text-xs text-muted-foreground">Automatically shuffle before duel starts</p>
                        </div>
                        <Switch
                          checked={shuffleDeck}
                          onCheckedChange={setShuffleDeck}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateRoom}
                    disabled={creating}
                    className="w-full bg-primary hover:bg-primary/80"
                  >
                    {creating ? 'Creating...' : 'Create Room'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-muted/50 border border-border mb-6">
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4 mr-2" />
              Live Now ({activeRooms.length})
            </TabsTrigger>
            <TabsTrigger value="waiting" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Waiting ({waitingRooms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : activeRooms.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No live duels right now</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a room to start dueling!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waiting">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : waitingRooms.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rooms waiting</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a room and invite friends!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {waitingRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function RoomCard({ room }: { room: DuelRoom & { participants: any[]; creator: Player | null } }) {
  const duelists = room.participants.filter((p: any) => !p.is_spectator)
  const spectators = room.participants.filter((p: any) => p.is_spectator)

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">{room.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Hosted by {room.creator?.nickname || 'Unknown'}
            </p>
          </div>
          <Badge 
            variant={room.status === 'active' ? 'default' : 'secondary'}
            className={room.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
          >
            {room.status === 'active' ? (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              'Waiting'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Swords className="h-4 w-4" />
            {room.match_type === '1v1' ? '1v1' : room.match_type === 'free_for_all' ? 'FFA' : 'Tag'}
          </span>
          <Badge className={
            room.format === 'tcg' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
            room.format === 'ocg' ? 'bg-red-500 hover:bg-red-600 text-white' :
            'bg-green-500 hover:bg-green-600 text-white'
          }>
            {room.format === 'tcg' ? 'TCG' : room.format === 'ocg' ? 'OCG' : 'Casual'}
          </Badge>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {duelists.length} duelist{duelists.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {spectators.length} watching
          </span>
        </div>
        
        {/* YGOPro-style Duel Settings Display */}
        <div className="flex flex-wrap gap-1.5 mb-4 text-xs">
          <span className="bg-muted/50 px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1">
            <Heart className="h-3 w-3 text-red-500" />
            {room.starting_lp || 8000} LP
          </span>
          <span className="bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
            {room.starting_hand_size || 5} cards
          </span>
          <span className="bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
            {room.master_rule || 'MR5'}
          </span>
          {room.first_turn_draw && (
            <span className="bg-primary/20 px-2 py-0.5 rounded text-primary text-[10px]">
              1st Draw
            </span>
          )}
          {room.time_per_turn && (
            <span className="bg-muted/50 px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {room.time_per_turn / 60}m
            </span>
          )}
        </div>

        {room.status === 'active' && duelists.length >= 2 && (
          <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-lg bg-background/50">
            {duelists.slice(0, 2).map((p: any, i: number) => (
              <div key={p.id} className="flex-1 text-center">
                <p className="font-semibold text-foreground text-sm">{p.player?.nickname}</p>
                <p className={`text-2xl font-mono font-bold ${p.life_points <= 2000 ? 'text-red-500' : 'text-primary'}`}>
                  {p.life_points}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <span className="font-mono bg-muted/50 px-2 py-1 rounded">{room.room_code}</span>
          {room.turn_count > 0 && (
            <span>Turn {room.turn_count}</span>
          )}
        </div>

        <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
          <Link href={`/live/${room.id}`}>
            {room.status === 'active' ? 'Watch Duel' : 'Join Room'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
