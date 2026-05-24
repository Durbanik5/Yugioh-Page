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

// Dark Side of Dimensions Style LP Display Component
function DSoDLifePointDisplay({ 
  participant, 
  isCurrentTurn,
  position,
  totalDuelists
}: { 
  participant: DuelRoomParticipant & { player: Player; deck: Deck | null }
  isCurrentTurn: boolean
  position?: { angle: number; radius: number }
  totalDuelists: number
}) {
  const lpPercentage = (participant.life_points / 8000) * 100
  const isLowLp = participant.life_points <= 2000
  const isCriticalLp = participant.life_points <= 1000
  const isMidLp = participant.life_points <= 4000 && participant.life_points > 2000

  // Calculate position for circular layout (FFA)
  const style = position ? {
    position: 'absolute' as const,
    left: `calc(50% + ${Math.cos(position.angle) * position.radius}px)`,
    top: `calc(50% + ${Math.sin(position.angle) * position.radius}px)`,
    transform: 'translate(-50%, -50%)',
  } : {}

  return (
    <div 
      className={`flex flex-col items-center transition-all duration-500 ${
        isCurrentTurn ? 'scale-105 z-20' : 'scale-100 opacity-90'
      } ${totalDuelists > 2 ? 'max-w-[140px]' : ''}`}
      style={style}
    >
      {/* Player Avatar - DSoD Style hexagonal glow */}
      <div className={`relative mb-3 ${isCurrentTurn ? '' : ''}`}>
        <div className={`absolute inset-0 ${isCurrentTurn ? 'animate-pulse' : ''}`}>
          <div className={`absolute -inset-2 rounded-full blur-lg ${
            isCurrentTurn ? 'bg-cyan-500/50' : 'bg-transparent'
          }`} />
        </div>
        <div className={`relative w-16 h-16 ${totalDuelists > 3 ? 'w-12 h-12' : 'w-16 h-16'} rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
          isCurrentTurn 
            ? 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 border-2 border-cyan-300' 
            : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 border-2 border-slate-600'
        }`}>
          {participant.player.nickname.charAt(0).toUpperCase()}
        </div>
        {isCurrentTurn && (
          <div className="absolute -top-1 -right-1">
            <div className="relative">
              <Zap className="h-5 w-5 text-yellow-400 animate-bounce" />
              <div className="absolute inset-0 blur-sm bg-yellow-400/50 rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Player Name */}
      <h3 className={`font-bold mb-1 text-center ${totalDuelists > 3 ? 'text-sm' : 'text-lg'} ${
        isCurrentTurn ? 'text-cyan-400' : 'text-white'
      }`} style={{ fontFamily: 'var(--font-orbitron)' }}>
        {participant.player.nickname}
      </h3>

      {/* Deck Name */}
      {participant.deck && (
        <p className={`text-muted-foreground mb-2 text-center truncate max-w-full ${totalDuelists > 3 ? 'text-[10px]' : 'text-xs'}`}>
          {participant.deck.name}
        </p>
      )}

      {/* DSoD Style Life Points Display */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className={`absolute -inset-3 rounded-2xl blur-xl transition-all duration-500 ${
          isCriticalLp 
            ? 'bg-red-600/60 animate-pulse' 
            : isLowLp 
            ? 'bg-red-500/40' 
            : isMidLp 
            ? 'bg-yellow-500/30' 
            : 'bg-cyan-500/30'
        }`} />
        
        {/* Inner LP container - DSoD holographic style */}
        <div className={`relative overflow-hidden rounded-xl border-2 backdrop-blur-md transition-all duration-300 ${
          totalDuelists > 3 ? 'px-4 py-2' : 'px-6 py-3'
        } ${
          isCriticalLp 
            ? 'border-red-500 bg-gradient-to-b from-red-950/90 to-red-900/80' 
            : isLowLp 
            ? 'border-red-400 bg-gradient-to-b from-red-950/80 to-slate-900/90' 
            : isMidLp 
            ? 'border-yellow-400 bg-gradient-to-b from-yellow-950/60 to-slate-900/90' 
            : 'border-cyan-400 bg-gradient-to-b from-cyan-950/60 to-slate-900/90'
        }`}>
          {/* Holographic scan line effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" 
                 style={{ animationDuration: '2s' }} />
          </div>
          
          {/* Digital circuit pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%),
              linear-gradient(transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%)`,
            backgroundSize: '20px 20px',
          }} />

          {/* LP Number */}
          <div className={`relative font-mono font-black tracking-tight text-center ${
            totalDuelists > 3 ? 'text-2xl' : 'text-4xl'
          } ${
            isCriticalLp 
              ? 'text-red-400' 
              : isLowLp 
              ? 'text-red-400' 
              : isMidLp 
              ? 'text-yellow-400' 
              : 'text-cyan-400'
          }`} style={{ 
            textShadow: isCriticalLp 
              ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)' 
              : isLowLp 
              ? '0 0 15px rgba(239, 68, 68, 0.6)' 
              : isMidLp 
              ? '0 0 15px rgba(234, 179, 8, 0.6)' 
              : '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
          }}>
            {participant.life_points.toLocaleString()}
          </div>
          
          {/* LP Label */}
          <div className={`text-center text-muted-foreground uppercase tracking-widest ${
            totalDuelists > 3 ? 'text-[8px] mt-0.5' : 'text-[10px] mt-1'
          }`}>
            LP
          </div>
        </div>
      </div>

      {/* LP Bar - DSoD style segmented */}
      <div className={`bg-slate-800/50 rounded-full mt-3 overflow-hidden border border-slate-700 ${
        totalDuelists > 3 ? 'w-24 h-1.5' : 'w-36 h-2'
      }`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
            isCriticalLp 
              ? 'bg-gradient-to-r from-red-600 to-red-500' 
              : isLowLp 
              ? 'bg-gradient-to-r from-red-500 to-red-400' 
              : isMidLp 
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' 
              : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
          }`}
          style={{ width: `${lpPercentage}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
               style={{ animationDuration: '2s' }} />
        </div>
      </div>
    </div>
  )
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
  const phases: { key: TurnPhase; label: string }[] = [
    { key: 'draw', label: 'DP' },
    { key: 'standby', label: 'SP' },
    { key: 'main', label: 'MP1' },
    { key: 'battle', label: 'BP' },
    { key: 'main2', label: 'MP2' },
    { key: 'end', label: 'EP' },
  ]
  
  if (room.status === 'waiting') {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border-2 border-cyan-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative">
              <Monitor className="h-20 w-20 mx-auto text-cyan-500/50 animate-pulse" />
              <div className="absolute inset-0 blur-xl bg-cyan-500/20" />
            </div>
            <h2 className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'var(--font-orbitron)' }}>
              WAITING FOR DUELISTS
            </h2>
            <p className="text-muted-foreground">
              {duelists.length}/2 duelists joined
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-muted-foreground">Room Code:</span>
              <span className="font-mono text-2xl text-cyan-400 font-bold tracking-wider">{room.room_code}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (room.status === 'finished') {
    const winner = duelists.find(d => d.player_id === room.winner_id)
    return (
      <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border-2 border-yellow-500/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Trophy className="h-24 w-24 text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            DUEL FINISHED
          </h2>
          {winner ? (
            <p className="text-2xl text-yellow-400 font-bold" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {winner.player.nickname} WINS!
            </p>
          ) : (
            <p className="text-xl text-muted-foreground">No winner declared</p>
          )}
        </div>
      </div>
    )
  }

  // Active duel display - Check if FFA with many participants
  const isFFA = room.match_type === 'free_for_all' && duelists.length > 2

  return (
    <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950 rounded-xl border-2 border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-500/10">
      {/* DSoD Background - Dark blue with digital effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Animated particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Turn and Phase Info - Top Center - DSoD Style */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-lg border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
          <span className="text-cyan-400 font-bold text-lg tracking-wider" style={{ fontFamily: 'var(--font-orbitron)' }}>
            TURN {room.turn_count}
          </span>
        </div>
        <div className="flex gap-1 bg-slate-900/60 backdrop-blur-sm p-1 rounded-lg border border-slate-700">
          {phases.map((phase) => (
            <div
              key={phase.key}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                room.turn_phase === phase.key 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-transparent text-slate-500 hover:text-slate-400'
              }`}
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              {phase.label}
            </div>
          ))}
        </div>
      </div>

      {/* Current Turn Player Indicator */}
      {currentTurnPlayer && (
        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-yellow-500/50 z-10">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400 animate-pulse" />
            <span className="text-yellow-400 font-medium text-sm" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {currentTurnPlayer.player.nickname}&apos;s Turn
            </span>
          </div>
        </div>
      )}

      {/* Duelists Display */}
      {isFFA ? (
        // Circular layout for FFA with many participants
        <div className="absolute inset-0 flex items-center justify-center">
          {/* VS in center */}
          <div className="absolute text-5xl font-black text-cyan-500/10 pointer-events-none" style={{ fontFamily: 'var(--font-orbitron)' }}>
            FFA
          </div>
          
          {/* Circular arrangement */}
          <div className="relative w-full h-full">
            {duelists.map((participant, index) => {
              const angle = (index * (2 * Math.PI / duelists.length)) - (Math.PI / 2)
              const radius = Math.min(280, Math.max(150, 350 - (duelists.length * 20)))
              
              return (
                <DSoDLifePointDisplay
                  key={participant.id}
                  participant={participant}
                  isCurrentTurn={room.current_turn_player_id === participant.player_id}
                  position={{ angle, radius }}
                  totalDuelists={duelists.length}
                />
              )
            })}
          </div>
        </div>
      ) : (
        // Standard 1v1 or small FFA layout
        <div className="absolute inset-0 flex items-center justify-around px-8">
          {/* VS Display for 1v1 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-7xl font-black text-cyan-500/10" style={{ fontFamily: 'var(--font-orbitron)' }}>
              VS
            </div>
          </div>
          
          {duelists.map((participant) => (
            <DSoDLifePointDisplay
              key={participant.id}
              participant={participant}
              isCurrentTurn={room.current_turn_player_id === participant.player_id}
              totalDuelists={duelists.length}
            />
          ))}
        </div>
      )}

      {/* Live Indicator - DSoD Style */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/50">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-orbitron)' }}>
          LIVE
        </span>
      </div>

      {/* Match Type Badge */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700">
        <span className="text-xs text-cyan-400 font-medium" style={{ fontFamily: 'var(--font-orbitron)' }}>
          {room.match_type === '1v1' ? '1v1 DUEL' : room.match_type === 'free_for_all' ? 'FREE-FOR-ALL' : 'TAG TEAM'}
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

  const isHost = room?.created_by === selectedPlayer
  const duelists = room?.participants.filter(p => !p.is_spectator) || []
  const spectators = room?.participants.filter(p => p.is_spectator) || []
  const currentTurnPlayer = duelists.find(p => p.player_id === room?.current_turn_player_id)

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

    const phaseLabels: Record<TurnPhase, string> = {
      draw: 'Draw Phase',
      standby: 'Standby Phase',
      main: 'Main Phase 1',
      battle: 'Battle Phase',
      main2: 'Main Phase 2',
      end: 'End Phase'
    }

    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'phase_change',
      description: `Phase: ${phaseLabels[phase]}`,
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading duel room...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Room Not Found</h1>
            <Button asChild>
              <Link href="/live">Back to Live Rooms</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Room Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/live">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'var(--font-orbitron)' }}>
                {room.name}
                <Badge variant={room.status === 'active' ? 'default' : room.status === 'finished' ? 'secondary' : 'outline'}>
                  {room.status}
                </Badge>
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-foreground" onClick={copyRoomCode}>
                  Code: <span className="font-mono text-cyan-400">{room.room_code}</span>
                  <Copy className="h-3.5 w-3.5" />
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {duelists.length} duelists, {spectators.length} spectators
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Player Selection */}
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

            {/* Join Room */}
            {selectedPlayer && !isParticipant && (
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Join Room</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Duel Room</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Join as</Label>
                      <Select value={joinAsDuelist ? 'duelist' : 'spectator'} onValueChange={(v) => setJoinAsDuelist(v === 'duelist')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="duelist">Duelist</SelectItem>
                          <SelectItem value="spectator">Spectator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {joinAsDuelist && (
                      <div className="space-y-2">
                        <Label>Select Deck (Optional)</Label>
                        <Select value={selectedDeck} onValueChange={setSelectedDeck}>
                          <SelectTrigger>
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
                      Join Room
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Start Duel */}
            {room.status === 'waiting' && isHost && duelists.length >= 2 && (
              <Button onClick={handleStartDuel} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Duel
              </Button>
            )}

            {/* End Duel button for host during active duel */}
            {room.status === 'active' && isHost && (
              <Button onClick={handleEndDuelNoWinner} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Duel
              </Button>
            )}

            {/* Leave Room button for participants (not host) */}
            {isParticipant && !isHost && room.status !== 'active' && (
              <Button onClick={handleLeaveRoom} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Leave Room
              </Button>
            )}

            {/* Delete Room button for host when not active */}
            {isHost && room.status !== 'active' && (
              <Button onClick={handleDeleteRoom} variant="destructive" size="sm">
                <X className="h-4 w-4 mr-2" />
                Delete Room
              </Button>
            )}
          </div>
        </div>

        {/* Main Spectator Screen */}
        <div className="mb-6">
          <SpectatorScreen room={room} duelists={duelists} currentTurnPlayer={currentTurnPlayer} />
        </div>

        {/* Stream Embed (if available) */}
        {room.stream_url && (
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={room.stream_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Duelist Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Phase & Turn Controls */}
            {room.status === 'active' && (isDuelist || isHost) && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-cyan-400" />
                    Turn Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Phase Buttons */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Phase</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'draw' as TurnPhase, label: 'Draw' },
                        { key: 'standby' as TurnPhase, label: 'Standby' },
                        { key: 'main' as TurnPhase, label: 'Main 1' },
                        { key: 'battle' as TurnPhase, label: 'Battle' },
                        { key: 'main2' as TurnPhase, label: 'Main 2' },
                        { key: 'end' as TurnPhase, label: 'End' },
                      ].map((phase) => (
                        <Button
                          key={phase.key}
                          size="sm"
                          variant={room.turn_phase === phase.key ? 'default' : 'outline'}
                          onClick={() => handlePhaseChange(phase.key)}
                          className={room.turn_phase === phase.key ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                        >
                          {phase.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Next Turn */}
                  <Button onClick={handleNextTurn} className="w-full">
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Turn
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Life Point Controls */}
            {room.status === 'active' && (isDuelist || isHost) && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-400" />
                    Life Point Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* LP Change Amount */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Change Amount</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[100, 500, 1000, 2000, 4000].map((amount) => (
                        <Button
                          key={amount}
                          size="sm"
                          variant={lpChangeAmount === amount ? 'default' : 'outline'}
                          onClick={() => setLpChangeAmount(amount)}
                        >
                          {amount}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        value={lpChangeAmount}
                        onChange={(e) => setLpChangeAmount(Number(e.target.value))}
                        className="w-24 bg-input border-border"
                      />
                    </div>
                  </div>

                  {/* Per-Duelist Controls */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {duelists.map((participant) => (
                      <div key={participant.id} className="p-3 rounded-lg bg-background border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{participant.player.nickname}</span>
                          <span className="font-mono text-cyan-400">{participant.life_points} LP</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-400 border-red-400/50 hover:bg-red-400/10"
                            onClick={() => handleLifePointChange(participant.id, participant.player_id, participant.life_points, -lpChangeAmount)}
                          >
                            <Minus className="h-4 w-4 mr-1" />
                            {lpChangeAmount}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-green-400 border-green-400/50 hover:bg-green-400/10"
                            onClick={() => handleLifePointChange(participant.id, participant.player_id, participant.life_points, lpChangeAmount)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {lpChangeAmount}
                          </Button>
                        </div>
                        {isHost && room.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2 text-yellow-400 hover:bg-yellow-400/10"
                            onClick={() => handleEndDuel(participant.player_id)}
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            Declare Winner
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Event */}
            {room.status === 'active' && (isDuelist || isHost) && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    Log Event
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Card activated, effect resolved..."
                      value={customEventText}
                      onChange={(e) => setCustomEventText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomEvent()}
                      className="bg-input border-border"
                    />
                    <Button onClick={handleCustomEvent}>Log</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Log */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5 text-cyan-400" />
                  Duel Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
                    ) : (
                      events.map((event) => (
                        <div key={event.id} className="flex items-start gap-2 text-sm">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                          <span className={`${
                            event.event_type === 'game_start' ? 'text-green-400' :
                            event.event_type === 'game_end' ? 'text-yellow-400' :
                            event.event_type === 'life_change' ? 'text-red-400' :
                            event.event_type === 'turn_change' ? 'text-cyan-400' :
                            'text-foreground'
                          }`}>
                            {event.description}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Participants & Chat */}
          <div className="space-y-6">
            {/* Participants */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Duelists</p>
                    {duelists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No duelists yet</p>
                    ) : (
                      <div className="space-y-2">
                        {duelists.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                                {p.player.nickname.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{p.player.nickname}</p>
                                {p.deck && <p className="text-xs text-muted-foreground">{p.deck.name}</p>}
                              </div>
                            </div>
                            <span className="font-mono text-sm text-cyan-400">{p.life_points} LP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {spectators.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Spectators</p>
                      <div className="flex flex-wrap gap-2">
                        {spectators.map((p) => (
                          <Badge key={p.id} variant="secondary" className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {p.player.nickname}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-cyan-400" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 mb-3">
                  <div className="space-y-2">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium text-cyan-400">{msg.player.nickname}: </span>
                          <span className="text-foreground">{msg.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                {selectedPlayer && isParticipant && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="bg-input border-border"
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

      {/* Add custom animation styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
