'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Radio, ArrowLeft, Users, Eye, Swords, Clock, Copy, 
  Play, Square, Plus, Minus, ChevronRight, Send, Trophy,
  SkipForward, Zap, Shield, Sparkles, Target, Heart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Deck, DuelRoom, DuelRoomParticipant, DuelRoomEvent, DuelRoomMessage, TurnPhase } from '@/lib/types'

interface RoomData extends DuelRoom {
  participants: (DuelRoomParticipant & { player: Player; deck: Deck | null })[]
  creator: Player | null
}

export default function DuelRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [events, setEvents] = useState<(DuelRoomEvent & { player: Player | null })[]>([])
  const [messages, setMessages] = useState<(DuelRoomMessage & { player: Player })[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [playerDecks, setPlayerDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  
  // User state
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [isParticipant, setIsParticipant] = useState(false)
  const [isDuelist, setIsDuelist] = useState(false)
  
  // UI state
  const [chatMessage, setChatMessage] = useState('')
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [joinAsDuelist, setJoinAsDuelist] = useState(true)
  const [selectedDeck, setSelectedDeck] = useState('')
  const [lpChangeAmount, setLpChangeAmount] = useState(1000)
  const [customEventText, setCustomEventText] = useState('')
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
    // Subscribe to real-time updates
    const roomChannel = supabase
      .channel(`room-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_rooms', filter: `id=eq.${id}` }, () => {
        fetchRoom()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_room_participants', filter: `room_id=eq.${id}` }, () => {
        fetchRoom()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_room_events', filter: `room_id=eq.${id}` }, (payload) => {
        fetchEvents()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_room_messages', filter: `room_id=eq.${id}` }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(roomChannel)
    }
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedPlayer && room) {
      const participant = room.participants.find(p => p.player_id === selectedPlayer)
      setIsParticipant(!!participant)
      setIsDuelist(participant ? !participant.is_spectator : false)
    }
  }, [selectedPlayer, room])

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerDecks(selectedPlayer)
    }
  }, [selectedPlayer])

  const fetchData = async () => {
    await Promise.all([fetchRoom(), fetchEvents(), fetchMessages(), fetchPlayers()])
    setLoading(false)
  }

  const fetchRoom = async () => {
    const { data, error } = await supabase
      .from('duel_rooms')
      .select(`
        *,
        participants:duel_room_participants(
          *,
          player:players(*),
          deck:decks(*)
        ),
        creator:players!duel_rooms_created_by_fkey(*)
      `)
      .eq('id', id)
      .single()
    
    if (!error && data) {
      setRoom(data as RoomData)
    }
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('duel_room_events')
      .select(`*, player:players(*)`)
      .eq('room_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (!error && data) {
      setEvents(data as any)
    }
  }

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('duel_room_messages')
      .select(`*, player:players(*)`)
      .eq('room_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (!error && data) {
      setMessages(data as any)
    }
  }

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('players').select('*').order('nickname')
    if (!error && data) setPlayers(data)
  }

  const fetchPlayerDecks = async (playerId: string) => {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('player_id', playerId)
    if (!error && data) setPlayerDecks(data)
  }

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.room_code)
      toast.success('Room code copied!')
    }
  }

  const handleJoinRoom = async () => {
    if (!selectedPlayer) {
      toast.error('Please select yourself')
      return
    }

    const { error } = await supabase.from('duel_room_participants').insert({
      room_id: id,
      player_id: selectedPlayer,
      deck_id: selectedDeck || null,
      is_spectator: !joinAsDuelist,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('You are already in this room')
      } else {
        toast.error('Failed to join room')
      }
      return
    }

    toast.success(joinAsDuelist ? 'Joined as duelist!' : 'Joined as spectator!')
    setJoinDialogOpen(false)
  }

  const handleStartDuel = async () => {
    if (!room) return
    
    const duelists = room.participants.filter(p => !p.is_spectator)
    if (duelists.length < 2) {
      toast.error('Need at least 2 duelists to start')
      return
    }

    await supabase
      .from('duel_rooms')
      .update({ 
        status: 'active', 
        started_at: new Date().toISOString(),
        turn_count: 1,
        current_turn_player_id: duelists[0].player_id,
        turn_phase: 'draw'
      })
      .eq('id', id)

    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'game_start',
      description: 'Duel started!',
    })

    toast.success('Duel started!')
  }

  const handleEndDuel = async (winnerId?: string) => {
    if (!room) return

    await supabase
      .from('duel_rooms')
      .update({ 
        status: 'finished', 
        ended_at: new Date().toISOString(),
        winner_id: winnerId || null,
      })
      .eq('id', id)

    const winner = room.participants.find(p => p.player_id === winnerId)
    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'game_end',
      description: winner ? `${winner.player.nickname} wins the duel!` : 'Duel ended',
      player_id: winnerId,
    })

    toast.success('Duel ended!')
  }

  const handleLifePointChange = async (participantId: string, playerId: string, currentLp: number, change: number) => {
    const newLp = Math.max(0, currentLp + change)
    
    await supabase
      .from('duel_room_participants')
      .update({ life_points: newLp })
      .eq('id', participantId)

    const player = room?.participants.find(p => p.id === participantId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: playerId,
      event_type: 'life_change',
      description: `${player?.nickname}: ${currentLp} → ${newLp} (${change > 0 ? '+' : ''}${change})`,
      old_value: String(currentLp),
      new_value: String(newLp),
    })

    if (newLp === 0) {
      toast.info(`${player?.nickname}'s life points hit 0!`)
    }
  }

  const handleNextTurn = async () => {
    if (!room) return
    
    const duelists = room.participants.filter(p => !p.is_spectator)
    const currentIndex = duelists.findIndex(p => p.player_id === room.current_turn_player_id)
    const nextIndex = (currentIndex + 1) % duelists.length
    const nextPlayer = duelists[nextIndex]

    await supabase
      .from('duel_rooms')
      .update({ 
        turn_count: room.turn_count + 1,
        current_turn_player_id: nextPlayer.player_id,
        turn_phase: 'draw'
      })
      .eq('id', id)

    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: nextPlayer.player_id,
      event_type: 'turn_change',
      description: `Turn ${room.turn_count + 1}: ${nextPlayer.player.nickname}'s turn`,
    })
  }

  const handlePhaseChange = async (phase: TurnPhase) => {
    if (!room) return

    await supabase
      .from('duel_rooms')
      .update({ turn_phase: phase })
      .eq('id', id)

    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'phase_change',
      description: `Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
    })
  }

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedPlayer) return

    await supabase.from('duel_room_messages').insert({
      room_id: id,
      player_id: selectedPlayer,
      message: chatMessage.trim(),
    })

    setChatMessage('')
  }

  const handleCustomEvent = async () => {
    if (!customEventText.trim()) return

    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: selectedPlayer || null,
      event_type: 'custom',
      description: customEventText.trim(),
    })

    setCustomEventText('')
    toast.success('Event logged')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">Loading duel room...</div>
        </main>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Room not found</p>
            <Button asChild variant="outline">
              <Link href="/live">Back to Live Duels</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const duelists = room.participants.filter(p => !p.is_spectator)
  const spectators = room.participants.filter(p => p.is_spectator)
  const currentTurnPlayer = duelists.find(p => p.player_id === room.current_turn_player_id)
  const isHost = selectedPlayer === room.created_by
  const canControl = isDuelist || isHost

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/live" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                {room.name}
                <Badge 
                  variant={room.status === 'active' ? 'default' : room.status === 'finished' ? 'secondary' : 'outline'}
                  className={room.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                >
                  {room.status === 'active' && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-1" />}
                  {room.status.toUpperCase()}
                </Badge>
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button 
                  onClick={copyRoomCode} 
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <span className="font-mono">{room.room_code}</span>
                  <Copy className="h-3 w-3" />
                </button>
                <span>•</span>
                <span>{room.match_type === '1v1' ? '1v1' : room.match_type === 'free_for_all' ? 'FFA' : 'Tag Team'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Player selector */}
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-[160px] bg-input border-border">
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

            {!isParticipant && selectedPlayer && (
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/80">
                    Join Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Join Duel Room</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <Button
                        variant={joinAsDuelist ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setJoinAsDuelist(true)}
                      >
                        <Swords className="h-4 w-4 mr-2" />
                        Duelist
                      </Button>
                      <Button
                        variant={!joinAsDuelist ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setJoinAsDuelist(false)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Spectator
                      </Button>
                    </div>

                    {joinAsDuelist && (
                      <div>
                        <Label className="text-muted-foreground">Select Deck (optional)</Label>
                        <Select value={selectedDeck} onValueChange={setSelectedDeck}>
                          <SelectTrigger className="bg-input border-border mt-1">
                            <SelectValue placeholder="Choose a deck..." />
                          </SelectTrigger>
                          <SelectContent>
                            {playerDecks.map((deck) => (
                              <SelectItem key={deck.id} value={deck.id}>
                                {deck.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button onClick={handleJoinRoom} className="w-full">
                      Join as {joinAsDuelist ? 'Duelist' : 'Spectator'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {room.status === 'waiting' && isHost && duelists.length >= 2 && (
              <Button onClick={handleStartDuel} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Duel
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Duel Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stream Embed */}
            {room.stream_url && (
              <Card className="bg-card border-border overflow-hidden">
                <div className="aspect-video bg-black flex items-center justify-center">
                  {room.stream_url.includes('youtube') || room.stream_url.includes('youtu.be') ? (
                    <iframe
                      src={room.stream_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : room.stream_url.includes('twitch') ? (
                    <iframe
                      src={`https://player.twitch.tv/?channel=${room.stream_url.split('/').pop()}&parent=${window.location.hostname}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : (
                    <a href={room.stream_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Open Stream Link
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* Life Points Display */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                {room.status === 'active' && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                    <Badge variant="outline" className="border-primary text-primary">
                      Turn {room.turn_count}
                    </Badge>
                    <Badge variant="outline">
                      {currentTurnPlayer?.player.nickname}&apos;s turn
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {room.turn_phase} Phase
                    </Badge>
                  </div>
                )}

                <div className={`grid gap-4 ${duelists.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-' + Math.min(duelists.length, 4)}`}>
                  {duelists.map((participant) => (
                    <div 
                      key={participant.id} 
                      className={`p-4 rounded-lg border-2 transition-all ${
                        room.current_turn_player_id === participant.player_id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-background/50'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-foreground mb-1 flex items-center justify-center gap-2">
                          {participant.player.nickname}
                          {room.current_turn_player_id === participant.player_id && (
                            <Zap className="h-4 w-4 text-primary" />
                          )}
                        </p>
                        {participant.deck && (
                          <p className="text-xs text-muted-foreground mb-2">{participant.deck.name}</p>
                        )}
                        <p className={`text-4xl font-mono font-bold ${
                          participant.life_points <= 2000 ? 'text-red-500' : 
                          participant.life_points <= 4000 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {participant.life_points}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">LP</p>
                      </div>

                      {room.status === 'active' && canControl && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleLifePointChange(participant.id, participant.player_id, participant.life_points, -lpChangeAmount)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={lpChangeAmount}
                            onChange={(e) => setLpChangeAmount(parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-center bg-input border-border"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleLifePointChange(participant.id, participant.player_id, participant.life_points, lpChangeAmount)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {room.status === 'active' && canControl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-2 text-xs"
                          onClick={() => handleEndDuel(participant.player_id)}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          Declare Winner
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {room.status === 'waiting' && duelists.length < 2 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Waiting for duelists to join...</p>
                    <p className="text-sm mt-1">Share the room code: <span className="font-mono text-foreground">{room.room_code}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Turn Controls */}
            {room.status === 'active' && canControl && (
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Phase:</span>
                      {(['draw', 'standby', 'main', 'battle', 'end'] as TurnPhase[]).map((phase) => (
                        <Button
                          key={phase}
                          size="sm"
                          variant={room.turn_phase === phase ? 'default' : 'outline'}
                          onClick={() => handlePhaseChange(phase)}
                          className="capitalize"
                        >
                          {phase}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={handleNextTurn} className="bg-primary hover:bg-primary/80">
                      <SkipForward className="h-4 w-4 mr-2" />
                      Next Turn
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Event */}
            {room.status === 'active' && canControl && (
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={customEventText}
                      onChange={(e) => setCustomEventText(e.target.value)}
                      placeholder="Log a custom event (e.g., 'Blue-Eyes summoned')"
                      className="bg-input border-border"
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomEvent()}
                    />
                    <Button onClick={handleCustomEvent} variant="outline">
                      Log Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Log */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Event Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event.id} className="flex items-start gap-2 text-sm">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                          <span className={`
                            ${event.event_type === 'life_change' ? 'text-yellow-500' : ''}
                            ${event.event_type === 'turn_change' ? 'text-primary' : ''}
                            ${event.event_type === 'game_start' ? 'text-green-500' : ''}
                            ${event.event_type === 'game_end' ? 'text-red-500' : ''}
                            ${event.event_type === 'custom' ? 'text-cyan-400' : ''}
                          `}>
                            {event.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({room.participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Duelists ({duelists.length})</p>
                    {duelists.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground flex items-center gap-2">
                          <Swords className="h-3 w-3 text-primary" />
                          {p.player.nickname}
                          {p.player_id === room.created_by && (
                            <Badge variant="outline" className="text-xs">Host</Badge>
                          )}
                        </span>
                        {room.status === 'active' && (
                          <span className="text-sm font-mono">{p.life_points}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {spectators.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Spectators ({spectators.length})</p>
                        {spectators.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 py-1">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{p.player.nickname}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 mb-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium text-primary">{msg.player.nickname}: </span>
                          <span className="text-foreground">{msg.message}</span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </ScrollArea>
                {selectedPlayer && isParticipant && (
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-input border-border"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
