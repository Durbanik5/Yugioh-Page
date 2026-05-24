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
  SkipForward, Zap, Shield, Sparkles, Target, Heart, LogOut, X,
  Maximize2, Monitor
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Deck, DuelRoom, DuelRoomParticipant, DuelRoomEvent, DuelRoomMessage, TurnPhase } from '@/lib/types'

interface RoomData extends DuelRoom {
  participants: (DuelRoomParticipant & { player: Player; deck: Deck | null })[]
  creator: Player | null
}

// Spectator Screen Component - The main visual display for the duel
function SpectatorScreen({ 
  room, 
  duelists, 
  currentTurnPlayer 
}: { 
  room: RoomData
  duelists: (DuelRoomParticipant & { player: Player; deck: Deck | null })[]
  currentTurnPlayer: (DuelRoomParticipant & { player: Player; deck: Deck | null }) | undefined
}) {
  const phases: TurnPhase[] = ['draw', 'standby', 'main', 'battle', 'end']
  
  if (room.status === 'waiting') {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-background via-card to-background rounded-xl border-2 border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative">
              <Monitor className="h-20 w-20 mx-auto text-primary/50 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-orbitron)' }}>
              WAITING FOR DUELISTS
            </h2>
            <p className="text-muted-foreground">
              {duelists.length}/2 duelists joined
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-muted-foreground">Room Code:</span>
              <span className="font-mono text-2xl text-primary font-bold tracking-wider">{room.room_code}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (room.status === 'finished') {
    const winner = duelists.find(d => d.player_id === room.winner_id)
    return (
      <div className="relative aspect-video bg-gradient-to-br from-background via-card to-background rounded-xl border-2 border-primary/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Trophy className="h-24 w-24 text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            DUEL FINISHED
          </h2>
          {winner ? (
            <p className="text-2xl text-yellow-500 font-bold">
              {winner.player.nickname} WINS!
            </p>
          ) : (
            <p className="text-xl text-muted-foreground">No winner declared</p>
          )}
        </div>
      </div>
    )
  }

  // Active duel display
  return (
    <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border-2 border-primary/30 overflow-hidden shadow-2xl shadow-primary/10">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2306b6d4' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Turn and Phase Info - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <div className="bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-primary/50">
          <span className="text-primary font-bold text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
            TURN {room.turn_count}
          </span>
        </div>
        <div className="flex gap-1">
          {phases.map((phase) => (
            <div
              key={phase}
              className={`px-3 py-1 rounded text-xs font-medium uppercase transition-all ${
                room.turn_phase === phase 
                  ? 'bg-primary text-primary-foreground scale-110' 
                  : 'bg-black/40 text-muted-foreground'
              }`}
            >
              {phase}
            </div>
          ))}
        </div>
      </div>

      {/* Current Turn Player Indicator */}
      {currentTurnPlayer && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/50 z-10">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
            <span className="text-yellow-500 font-medium text-sm">
              {currentTurnPlayer.player.nickname}&apos;s Turn
            </span>
          </div>
        </div>
      )}

      {/* VS Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-6xl font-black text-primary/20" style={{ fontFamily: 'var(--font-orbitron)' }}>
          VS
        </div>
      </div>

      {/* Duelists Display */}
      <div className="absolute inset-0 flex items-center justify-around px-8">
        {duelists.map((participant, index) => {
          const isCurrentTurn = room.current_turn_player_id === participant.player_id
          const lpPercentage = (participant.life_points / 8000) * 100
          const isLowLp = participant.life_points <= 2000
          const isMidLp = participant.life_points <= 4000 && participant.life_points > 2000
          
          return (
            <div 
              key={participant.id} 
              className={`flex flex-col items-center transition-all duration-500 ${
                isCurrentTurn ? 'scale-105' : 'scale-100 opacity-90'
              }`}
            >
              {/* Player Avatar/Icon */}
              <div className={`relative mb-4 ${isCurrentTurn ? 'animate-pulse' : ''}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 transition-all ${
                  isCurrentTurn 
                    ? 'border-primary bg-primary/20 text-primary shadow-lg shadow-primary/50' 
                    : 'border-muted bg-muted/20 text-muted-foreground'
                }`}>
                  {participant.player.nickname.charAt(0).toUpperCase()}
                </div>
                {isCurrentTurn && (
                  <div className="absolute -top-1 -right-1">
                    <Zap className="h-6 w-6 text-yellow-500 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Player Name */}
              <h3 className={`text-xl font-bold mb-1 ${
                isCurrentTurn ? 'text-primary' : 'text-foreground'
              }`} style={{ fontFamily: 'var(--font-orbitron)' }}>
                {participant.player.nickname}
              </h3>

              {/* Deck Name */}
              {participant.deck && (
                <p className="text-xs text-muted-foreground mb-3">
                  {participant.deck.name}
                </p>
              )}

              {/* Life Points Display */}
              <div className="relative">
                {/* LP Background glow effect */}
                <div className={`absolute inset-0 blur-xl rounded-full ${
                  isLowLp ? 'bg-red-500/30' : isMidLp ? 'bg-yellow-500/20' : 'bg-primary/20'
                }`} />
                
                <div className={`relative px-8 py-4 rounded-xl border-2 backdrop-blur-sm ${
                  isLowLp 
                    ? 'border-red-500 bg-red-950/50' 
                    : isMidLp 
                    ? 'border-yellow-500 bg-yellow-950/50' 
                    : 'border-primary bg-primary/10'
                }`}>
                  <div className={`text-5xl font-mono font-black tracking-tight ${
                    isLowLp ? 'text-red-500' : isMidLp ? 'text-yellow-500' : 'text-primary'
                  }`}>
                    {participant.life_points.toLocaleString()}
                  </div>
                  <div className="text-xs text-center text-muted-foreground mt-1 uppercase tracking-widest">
                    Life Points
                  </div>
                </div>
              </div>

              {/* LP Bar */}
              <div className="w-48 h-2 bg-muted/30 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLowLp ? 'bg-red-500' : isMidLp ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${lpPercentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live</span>
      </div>

      {/* Match Type Badge */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-xs text-muted-foreground">
          {room.match_type === '1v1' ? '1v1 Duel' : room.match_type === 'free_for_all' ? 'Free-For-All' : 'Tag Team'}
        </span>
      </div>
    </div>
  )
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_room_events', filter: `room_id=eq.${id}` }, () => {
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

  const handleLeaveRoom = async () => {
    if (!selectedPlayer) return

    const { error } = await supabase
      .from('duel_room_participants')
      .delete()
      .eq('room_id', id)
      .eq('player_id', selectedPlayer)

    if (error) {
      toast.error('Failed to leave room')
      return
    }

    toast.success('Left the room')
    setIsParticipant(false)
    setIsDuelist(false)
  }

  const handleEndDuelNoWinner = async () => {
    if (!room) return

    await supabase
      .from('duel_rooms')
      .update({ 
        status: 'finished', 
        ended_at: new Date().toISOString(),
        winner_id: null,
      })
      .eq('id', id)

    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'game_end',
      description: 'Duel ended (no winner declared)',
    })

    toast.success('Duel ended')
  }

  const handleDeleteRoom = async () => {
    if (!room || !isHost) return

    const { error } = await supabase
      .from('duel_rooms')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete room')
      return
    }

    toast.success('Room deleted')
    router.push('/live')
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
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

            {room.status === 'active' && isHost && (
              <Button onClick={handleEndDuelNoWinner} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Duel
              </Button>
            )}

            {isParticipant && !isHost && room.status !== 'active' && (
              <Button onClick={handleLeaveRoom} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Leave Room
              </Button>
            )}

            {isHost && room.status !== 'active' && (
              <Button onClick={handleDeleteRoom} variant="destructive" size="sm">
                <X className="h-4 w-4 mr-2" />
                Delete Room
              </Button>
            )}
          </div>
        </div>

        {/* MAIN SPECTATOR SCREEN */}
        <div className="mb-6">
          <SpectatorScreen room={room} duelists={duelists} currentTurnPlayer={currentTurnPlayer} />
        </div>

        {/* Stream Embed (if available) */}
        {room.stream_url && (
          <Card className="bg-card border-border overflow-hidden mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Live Stream
              </CardTitle>
            </CardHeader>
            <div className="aspect-video bg-black">
              {room.stream_url.includes('youtube') || room.stream_url.includes('youtu.be') ? (
                <iframe
                  src={room.stream_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : room.stream_url.includes('twitch') ? (
                <iframe
                  src={`https://player.twitch.tv/?channel=${room.stream_url.split('/').pop()}&parent=${typeof window !== 'undefined' ? window.location.hostname : ''}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <a href={room.stream_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Open Stream Link
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Controls and Info Grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Life Point Controls (for duelists/host) */}
            {room.status === 'active' && canControl && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Life Point Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {duelists.map((participant) => (
                      <div key={participant.id} className="p-4 rounded-lg bg-background/50 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-foreground">{participant.player.nickname}</span>
                          <span className={`text-2xl font-mono font-bold ${
                            participant.life_points <= 2000 ? 'text-red-500' : 
                            participant.life_points <= 4000 ? 'text-yellow-500' : 'text-primary'
                          }`}>
                            {participant.life_points}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
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
                            className="h-8 text-center bg-input border-border"
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-2 text-xs"
                          onClick={() => handleEndDuel(participant.player_id)}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          Declare Winner
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

          {/* Right Sidebar */}
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
