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
  Maximize2, Monitor, Hand, Layers, EyeOff, RotateCcw, ArrowLeftRight, UserCheck
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Deck, DuelRoom, DuelRoomParticipant, DuelRoomEvent, DuelRoomMessage, TurnPhase } from '@/lib/types'

// Field Zone Card Types
interface MonsterCard {
  name: string
  faceUp: boolean
  position: 'attack' | 'defense'
}

interface SpellTrapCard {
  name: string
  faceUp: boolean
}

type MonsterZone = MonsterCard | null
type SpellTrapZone = SpellTrapCard | null

interface RoomData extends DuelRoom {
  participants: (DuelRoomParticipant & { player: Player; deck: Deck | null })[]
  creator: Player | null
}

// Dark Side of Dimensions Style LP Display Component with Field Zones
function DSoDLifePointDisplay({ 
  participant, 
  isCurrentTurn,
  position,
  totalDuelists,
  matchType
}: { 
  participant: DuelRoomParticipant & { player: Player; deck: Deck | null }
  isCurrentTurn: boolean
  position?: { angle: number; radius: number }
  totalDuelists: number
  matchType?: string
}) {
  const lpPercentage = (participant.life_points / 8000) * 100
  const segments = 8
  const filledSegments = Math.ceil((participant.life_points / 8000) * segments)
  const isLowLp = participant.life_points <= 2000
  const isCriticalLp = participant.life_points <= 1000

  // Parse field zone data - new format with card details
  const monsterZones: MonsterZone[] = (() => {
    try {
      const parsed = JSON.parse(participant.monster_zones || '[]')
      // Handle old format (string array) and new format (object array)
      return parsed.map((z: string | MonsterCard | null) => {
        if (!z || z === '') return null
        if (typeof z === 'string') return { name: z, faceUp: true, position: 'attack' as const }
        return z
      })
    } catch { return [null, null, null, null, null] }
  })()
  
  const spellTrapZones: SpellTrapZone[] = (() => {
    try {
      const parsed = JSON.parse(participant.spell_trap_zones || '[]')
      return parsed.map((z: string | SpellTrapCard | null) => {
        if (!z || z === '') return null
        if (typeof z === 'string') return { name: z, faceUp: true }
        return z
      })
    } catch { return [null, null, null, null, null] }
  })()
  const handCount = participant.hand_count || 0

  // Calculate position for circular layout (FFA)
  const style = position ? {
    position: 'absolute' as const,
    left: `calc(50% + ${Math.cos(position.angle) * position.radius}px)`,
    top: `calc(50% + ${Math.sin(position.angle) * position.radius}px)`,
    transform: 'translate(-50%, -50%)',
  } : {}

  const isCompact = totalDuelists > 2

  return (
    <div 
      className={`flex flex-col transition-all duration-500 ${
        isCurrentTurn ? 'scale-105 z-20' : 'scale-100 opacity-90'
      }`}
      style={style}
    >
      {/* DSoD Name Plate - Blue translucent panel */}
      <div className={`relative mb-1 ${!isCompact ? 'min-w-[280px]' : 'max-w-[180px]'}`}>
        <div className={`
          relative overflow-hidden rounded-md border backdrop-blur-sm
          ${isCurrentTurn 
            ? 'bg-gradient-to-r from-blue-600/90 via-blue-700/90 to-blue-800/90 border-cyan-400/60' 
            : 'bg-gradient-to-r from-slate-700/80 via-slate-800/80 to-slate-900/80 border-slate-600/50'}
          ${isCompact ? 'px-3 py-1.5' : 'px-4 py-2'}
        `}>
          {/* Holographic shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite]" />
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Player Avatar Circle */}
              <div className={`
                rounded-full flex items-center justify-center font-bold text-white flex-shrink-0
                ${isCurrentTurn 
                  ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30' 
                  : 'bg-gradient-to-br from-slate-500 to-slate-700'}
                ${isCompact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}
              `}>
                {participant.player.nickname.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span 
                    className={`font-bold uppercase tracking-wide text-white truncate ${isCompact ? 'text-xs' : 'text-sm'}`}
                    style={{ fontFamily: 'var(--font-orbitron)' }}
                  >
                    {participant.player.nickname}
                  </span>
                  {matchType === 'tag_team' && (
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                      (participant.team_number || 1) === 1 
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' 
                        : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    }`}>
                      T{participant.team_number || 1}
                    </span>
                  )}
                </div>
                {participant.deck && (
                  <span className={`text-cyan-300/70 truncate ${isCompact ? 'text-[9px] max-w-[80px]' : 'text-[10px] max-w-[140px]'}`}>
                    {participant.deck.name}
                  </span>
                )}
              </div>
            </div>
            
            {/* Hand Count Display */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-2 py-0.5 border border-slate-600/50">
              <Hand className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-amber-400`} />
              <span className={`font-bold text-amber-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                {handCount}
              </span>
            </div>
          </div>
          
          {isCurrentTurn && (
            <div className="absolute -top-1 -right-1 flex-shrink-0">
              <Zap className="h-4 w-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
            </div>
          )}
        </div>
      </div>

      {/* DSoD Life Point Display - Main Panel */}
      <div className={`relative ${!isCompact ? 'min-w-[280px]' : 'max-w-[180px]'}`}>
        {/* Outer glow for critical LP */}
        {isCriticalLp && (
          <div className="absolute -inset-2 bg-red-500/30 rounded-lg blur-xl animate-pulse" />
        )}
        
        <div className={`
          relative flex items-center gap-2 rounded-md border backdrop-blur-sm overflow-hidden
          ${isCriticalLp 
            ? 'bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-red-500/70' 
            : isLowLp 
            ? 'bg-gradient-to-r from-red-900/80 via-slate-900/90 to-slate-900/90 border-red-400/50' 
            : 'bg-gradient-to-r from-blue-900/80 via-slate-900/90 to-slate-900/90 border-cyan-500/50'}
          ${isCompact ? 'px-2 py-1.5' : 'px-3 py-2'}
        `}>
          {/* Holographic scan line */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 animate-pulse" style={{ animationDuration: '2s' }} />
          
          {/* LifePoint Label Panel - DSoD Style */}
          <div className={`
            relative flex flex-col items-start px-1.5 py-0.5 rounded border flex-shrink-0
            ${isCriticalLp 
              ? 'bg-gradient-to-b from-red-700/60 to-red-800/60 border-red-500/50' 
              : 'bg-gradient-to-b from-cyan-700/40 to-blue-800/40 border-cyan-500/40'}
          `}>
            {/* Cyan accent circle like in the movie */}
            <div className={`
              absolute -left-1 top-1/2 -translate-y-1/2 rounded-full border-2 flex-shrink-0
              ${isCriticalLp ? 'bg-red-500 border-red-400' : 'bg-cyan-500 border-cyan-400'}
              w-2 h-2
            `}>
              <div className={`absolute inset-0 rounded-full ${isCriticalLp ? 'bg-red-400' : 'bg-cyan-400'} animate-ping opacity-50`} />
            </div>
            
            <span 
              className="text-white font-medium tracking-wider text-[7px]"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              LP
            </span>
            
            {/* Segmented LP Bar - DSoD Style */}
            <div className="flex gap-0.5 mt-0.5">
              {[...Array(segments)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-1 h-0.5 rounded-sm transition-all duration-300
                    ${i < filledSegments 
                      ? isCriticalLp 
                        ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]' 
                        : isLowLp 
                        ? 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.5)]' 
                        : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                      : 'bg-slate-700/50'}
                  `}
                />
              ))}
            </div>
          </div>
          
          {/* Large LP Number - DSoD Style (white, bold, slight italic look) */}
          <div 
            className={`
              font-black text-white tracking-tight relative min-w-0
              ${!isCompact ? 'text-4xl' : 'text-2xl'}
            `}
            style={{ 
              fontFamily: 'var(--font-orbitron)',
              textShadow: isCriticalLp 
                ? '0 0 20px rgba(239, 68, 68, 0.8), 2px 2px 0px rgba(0,0,0,0.5)' 
                : '0 0 15px rgba(6, 182, 212, 0.4), 2px 2px 0px rgba(0,0,0,0.5)',
              WebkitTextStroke: '1px rgba(0,0,0,0.3)',
            }}
          >
            {participant.life_points.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Yu-Gi-Oh Field Display - Traditional Layout */}
      <div className={`mt-2 ${!isCompact ? 'min-w-[280px]' : 'max-w-[180px]'}`}>
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-2">
          {/* Monster Zones - 5 slots */}
          <div className="flex justify-center gap-1 mb-1">
            {[0, 1, 2, 3, 4].map((index) => {
              const card = monsterZones[index]
              const hasCard = card !== null && card !== undefined
              return (
                <div
                  key={`monster-${index}`}
                  className={`
                    ${isCompact ? 'w-5 h-6' : 'w-8 h-10'} rounded border-2 transition-all relative group
                    ${hasCard 
                      ? card.faceUp
                        ? 'bg-amber-900/60 border-amber-500/60 shadow-[0_0_6px_rgba(217,119,6,0.4)]' 
                        : 'bg-slate-700/80 border-slate-500/60 shadow-[0_0_4px_rgba(100,116,139,0.4)]'
                      : 'bg-slate-800/40 border-slate-600/30'}
                    ${hasCard && card.position === 'defense' ? 'rotate-90' : ''}
                  `}
                  title={hasCard ? `${card.name} (${card.faceUp ? 'Face-up' : 'Face-down'} ${card.position})` : `Monster Zone ${index + 1}`}
                >
                  {hasCard && (
                    <div className="w-full h-full flex items-center justify-center">
                      {card.faceUp ? (
                        <Sparkles className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-amber-400`} />
                      ) : (
                        <EyeOff className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-slate-400`} />
                      )}
                    </div>
                  )}
                  {/* Tooltip on hover */}
                  {hasCard && !isCompact && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                      {card.name}
                      <br />
                      <span className="text-slate-400">{card.faceUp ? 'Face-up' : 'Face-down'} {card.position}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Spell/Trap Zones - 5 slots */}
          <div className="flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map((index) => {
              const card = spellTrapZones[index]
              const hasCard = card !== null && card !== undefined
              return (
                <div
                  key={`spelltrap-${index}`}
                  className={`
                    ${isCompact ? 'w-5 h-6' : 'w-8 h-10'} rounded border-2 transition-all relative group
                    ${hasCard 
                      ? card.faceUp
                        ? 'bg-cyan-900/60 border-cyan-500/60 shadow-[0_0_6px_rgba(6,182,212,0.4)]' 
                        : 'bg-purple-900/60 border-purple-500/60 shadow-[0_0_4px_rgba(168,85,247,0.4)]'
                      : 'bg-slate-800/40 border-slate-600/30'}
                  `}
                  title={hasCard ? `${card.name} (${card.faceUp ? 'Face-up' : 'Set'})` : `Spell/Trap Zone ${index + 1}`}
                >
                  {hasCard && (
                    <div className="w-full h-full flex items-center justify-center">
                      {card.faceUp ? (
                        <Shield className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-cyan-400`} />
                      ) : (
                        <EyeOff className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-purple-400`} />
                      )}
                    </div>
                  )}
                  {/* Tooltip on hover */}
                  {hasCard && !isCompact && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                      {card.name}
                      <br />
                      <span className="text-slate-400">{card.faceUp ? 'Face-up' : 'Set'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Zone labels */}
          <div className="flex justify-between mt-1 px-1">
            <span className={`text-amber-400/70 ${isCompact ? 'text-[6px]' : 'text-[8px]'}`}>M: {monsterZones.filter(z => z !== null).length}/5</span>
            <span className={`text-cyan-400/70 ${isCompact ? 'text-[6px]' : 'text-[8px]'}`}>S/T: {spellTrapZones.filter(z => z !== null).length}/5</span>
          </div>
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
      
      {/* Turn and Phase Info - Top Left - DSoD Style */}
      <div className="absolute top-4 left-4 flex flex-col items-start gap-2 z-10">
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
              const radius = Math.min(420, Math.max(200, 450 - (duelists.length * 15)))
              
              return (
                <DSoDLifePointDisplay
                  key={participant.id}
                  participant={participant}
                  isCurrentTurn={room.current_turn_player_id === participant.player_id}
                  position={{ angle, radius }}
                  totalDuelists={duelists.length}
                  matchType={room.match_type}
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
              matchType={room.match_type}
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
  const [cardActivationName, setCardActivationName] = useState('')
  const [cardActivationPlayer, setCardActivationPlayer] = useState<string | null>(null)
  
  // Field zone card placement state
  const [placingCard, setPlacingCard] = useState<{
    participantId: string
    playerId: string
    zoneType: 'monster' | 'spelltrap'
    zoneIndex: number
  } | null>(null)
  const [placingCardName, setPlacingCardName] = useState('')
  const [placingCardFaceUp, setPlacingCardFaceUp] = useState(true)
  const [placingCardPosition, setPlacingCardPosition] = useState<'attack' | 'defense'>('attack')
  
  // Quick add card state (for easier card placement)
  const [quickAddCard, setQuickAddCard] = useState<{
    participantId: string
    playerId: string
  } | null>(null)
  const [quickAddCardName, setQuickAddCardName] = useState('')
  const [quickAddZoneType, setQuickAddZoneType] = useState<'monster' | 'spelltrap'>('monster')
  const [quickAddFaceUp, setQuickAddFaceUp] = useState(true)
  const [quickAddPosition, setQuickAddPosition] = useState<'attack' | 'defense'>('attack')
  
  // Team management state (for tag team)
  const [teamManagementOpen, setTeamManagementOpen] = useState(false)
  
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

    // For 1v1 rooms, auto-convert to spectator if already 2 duelists
    let actualJoinAsDuelist = joinAsDuelist
    if (room?.match_type === '1v1' && joinAsDuelist && duelists.length >= 2) {
      actualJoinAsDuelist = false
      toast.info('This 1v1 room already has 2 duelists. Joining as spectator.')
    }

    const { error } = await supabase.from('duel_room_participants').insert({
      room_id: id,
      player_id: selectedPlayer,
      deck_id: selectedDeck || null,
      is_spectator: !actualJoinAsDuelist,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('You are already in this room')
      } else {
        toast.error('Failed to join room')
      }
      return
    }

    toast.success(actualJoinAsDuelist ? 'Joined as duelist!' : 'Joined as spectator!')
    setJoinDialogOpen(false)
  }

  const handleStartDuel = async () => {
    if (!room) return
    
    if (duelists.length < 2) {
      toast.error('Need at least 2 duelists to start')
      return
    }

    // For 1v1, ensure only 2 duelists - convert extras to spectators
    if (room.match_type === '1v1' && duelists.length > 2) {
      const toConvert = duelists.slice(2)
      for (const participant of toConvert) {
        await supabase
          .from('duel_room_participants')
          .update({ is_spectator: true })
          .eq('id', participant.id)
      }
      toast.info(`${toConvert.length} extra player(s) moved to spectators for 1v1`)
    }

    // Set starting hand count to 5 for all duelists
    const actualDuelists = room.match_type === '1v1' ? duelists.slice(0, 2) : duelists
    for (const participant of actualDuelists) {
      await supabase
        .from('duel_room_participants')
        .update({ hand_count: 5 })
        .eq('id', participant.id)
    }

    await supabase
      .from('duel_rooms')
      .update({ 
        status: 'active', 
        started_at: new Date().toISOString(),
        turn_count: 1,
        current_turn_player_id: actualDuelists[0].player_id,
        turn_phase: 'draw'
      })
      .eq('id', id)

    await supabase.from('duel_room_events').insert({
      room_id: id,
      event_type: 'game_start',
      description: 'Duel started! Each player draws 5 cards.',
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

  const handleCardActivation = async () => {
    if (!cardActivationName.trim() || !cardActivationPlayer) return

    const player = duelists.find(p => p.player_id === cardActivationPlayer)?.player
    
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: cardActivationPlayer,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} activated: ${cardActivationName.trim()}`,
    })

    setCardActivationName('')
    setCardActivationPlayer(null)
    toast.success('Card activation logged')
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

  const handleHandCountChange = async (participantId: string, playerId: string, currentCount: number, change: number) => {
    const newCount = Math.max(0, currentCount + change)
    
    await supabase
      .from('duel_room_participants')
      .update({ hand_count: newCount })
      .eq('id', participantId)

    const player = duelists.find(d => d.player_id === playerId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: playerId,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} hand: ${currentCount} → ${newCount}`,
    })
  }

  const handleFieldZoneChange = async (participantId: string, playerId: string, zoneType: 'monster' | 'spelltrap', zoneIndex: number, hasCard: boolean) => {
    if (hasCard) {
      // Remove card from zone
      const participant = duelists.find(d => d.id === participantId)
      if (!participant) return

      const zones = zoneType === 'monster' 
        ? JSON.parse(participant.monster_zones || '[]')
        : JSON.parse(participant.spell_trap_zones || '[]')
      
      while (zones.length < 5) zones.push(null)
      zones[zoneIndex] = null
      
      const updateField = zoneType === 'monster' ? 'monster_zones' : 'spell_trap_zones'
      await supabase
        .from('duel_room_participants')
        .update({ [updateField]: JSON.stringify(zones) })
        .eq('id', participantId)
    } else {
      // Open dialog to place card
      setPlacingCard({ participantId, playerId, zoneType, zoneIndex })
      setPlacingCardName('')
      setPlacingCardFaceUp(true)
      setPlacingCardPosition('attack')
    }
  }

  const handlePlaceCard = async () => {
    if (!placingCard || !placingCardName.trim()) return

    const participant = duelists.find(d => d.id === placingCard.participantId)
    if (!participant) return

    const zones = placingCard.zoneType === 'monster' 
      ? JSON.parse(participant.monster_zones || '[]')
      : JSON.parse(participant.spell_trap_zones || '[]')
    
    while (zones.length < 5) zones.push(null)
    
    if (placingCard.zoneType === 'monster') {
      zones[placingCard.zoneIndex] = {
        name: placingCardName.trim(),
        faceUp: placingCardFaceUp,
        position: placingCardPosition
      }
    } else {
      zones[placingCard.zoneIndex] = {
        name: placingCardName.trim(),
        faceUp: placingCardFaceUp
      }
    }
    
    const updateField = placingCard.zoneType === 'monster' ? 'monster_zones' : 'spell_trap_zones'
    await supabase
      .from('duel_room_participants')
      .update({ [updateField]: JSON.stringify(zones) })
      .eq('id', placingCard.participantId)

    // Log the placement
    const player = duelists.find(p => p.player_id === placingCard.playerId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: placingCard.playerId,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} ${placingCardFaceUp ? 'summoned' : 'set'}: ${placingCardName.trim()}${placingCard.zoneType === 'monster' ? ` (${placingCardPosition})` : ''}`,
    })

    setPlacingCard(null)
    toast.success('Card placed')
  }

  const handleToggleCardState = async (participantId: string, playerId: string, zoneType: 'monster' | 'spelltrap', zoneIndex: number) => {
    const participant = duelists.find(d => d.id === participantId)
    if (!participant) return

    const zones = zoneType === 'monster' 
      ? JSON.parse(participant.monster_zones || '[]')
      : JSON.parse(participant.spell_trap_zones || '[]')
    
    const card = zones[zoneIndex]
    if (!card) return

    // Toggle face up/down
    card.faceUp = !card.faceUp
    
    const updateField = zoneType === 'monster' ? 'monster_zones' : 'spell_trap_zones'
    await supabase
      .from('duel_room_participants')
      .update({ [updateField]: JSON.stringify(zones) })
      .eq('id', participantId)

    const player = duelists.find(p => p.player_id === playerId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: playerId,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} flipped ${card.name} ${card.faceUp ? 'face-up' : 'face-down'}`,
    })
  }

  const handleToggleMonsterPosition = async (participantId: string, playerId: string, zoneIndex: number) => {
    const participant = duelists.find(d => d.id === participantId)
    if (!participant) return

    const zones = JSON.parse(participant.monster_zones || '[]')
    const card = zones[zoneIndex]
    if (!card) return

    card.position = card.position === 'attack' ? 'defense' : 'attack'
    
    await supabase
      .from('duel_room_participants')
      .update({ monster_zones: JSON.stringify(zones) })
      .eq('id', participantId)

    const player = duelists.find(p => p.player_id === playerId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: playerId,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} changed ${card.name} to ${card.position} position`,
    })
  }

  // Quick add card to first available zone
  const handleQuickAddCard = async () => {
    if (!quickAddCard || !quickAddCardName.trim()) return

    const participant = duelists.find(d => d.id === quickAddCard.participantId)
    if (!participant) return

    const zones = quickAddZoneType === 'monster' 
      ? JSON.parse(participant.monster_zones || '[]')
      : JSON.parse(participant.spell_trap_zones || '[]')
    
    while (zones.length < 5) zones.push(null)
    
    // Find first empty zone
    const emptyIndex = zones.findIndex((z: MonsterCard | SpellTrapCard | null) => z === null || z === '')
    if (emptyIndex === -1) {
      toast.error('No empty zones available')
      return
    }
    
    if (quickAddZoneType === 'monster') {
      zones[emptyIndex] = {
        name: quickAddCardName.trim(),
        faceUp: quickAddFaceUp,
        position: quickAddPosition
      }
    } else {
      zones[emptyIndex] = {
        name: quickAddCardName.trim(),
        faceUp: quickAddFaceUp
      }
    }
    
    const updateField = quickAddZoneType === 'monster' ? 'monster_zones' : 'spell_trap_zones'
    await supabase
      .from('duel_room_participants')
      .update({ [updateField]: JSON.stringify(zones) })
      .eq('id', quickAddCard.participantId)

    // Log the placement
    const player = duelists.find(p => p.player_id === quickAddCard.playerId)?.player
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: quickAddCard.playerId,
      event_type: 'custom',
      description: `${player?.nickname || 'Player'} ${quickAddFaceUp ? 'summoned' : 'set'}: ${quickAddCardName.trim()}${quickAddZoneType === 'monster' ? ` (${quickAddPosition})` : ''}`,
    })

    setQuickAddCardName('')
    toast.success('Card added to field')
  }

  // Team management for tag team duels
  const handleSwapTeam = async (participantId: string, playerId: string) => {
    const participant = duelists.find(d => d.id === participantId)
    if (!participant) return

    const currentTeam = participant.team_number || 1
    const newTeam = currentTeam === 1 ? 2 : 1

    await supabase
      .from('duel_room_participants')
      .update({ team_number: newTeam })
      .eq('id', participantId)

    const player = participant.player
    toast.success(`${player.nickname} moved to Team ${newTeam}`)
    
    await supabase.from('duel_room_events').insert({
      room_id: id,
      player_id: playerId,
      event_type: 'custom',
      description: `${player.nickname} switched to Team ${newTeam}`,
    })
  }

  // Check if current selected player can control a specific participant's board
  const canControlBoard = (participantPlayerId: string) => {
    // Host can control all boards
    if (isHost) return true
    // Players can only control their own board
    return selectedPlayer === participantPlayerId
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
                      <Select 
                        value={joinAsDuelist ? 'duelist' : 'spectator'} 
                        onValueChange={(v) => setJoinAsDuelist(v === 'duelist')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="duelist" disabled={room?.match_type === '1v1' && duelists.length >= 2}>
                            Duelist {room?.match_type === '1v1' && duelists.length >= 2 && '(Full)'}
                          </SelectItem>
                          <SelectItem value="spectator">Spectator</SelectItem>
                        </SelectContent>
                      </Select>
                      {room?.match_type === '1v1' && duelists.length >= 2 && joinAsDuelist && (
                        <p className="text-xs text-amber-400">
                          This 1v1 room already has 2 duelists. You will join as a spectator.
                        </p>
                      )}
                    </div>
                    {joinAsDuelist && !(room?.match_type === '1v1' && duelists.length >= 2) && (
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

            {/* Card Placement Dialog */}
            <Dialog open={placingCard !== null} onOpenChange={(open) => !open && setPlacingCard(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {placingCard?.zoneType === 'monster' ? 'Place Monster' : 'Place Spell/Trap'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Card Name</Label>
                    <Input
                      placeholder="e.g., Blue-Eyes White Dragon"
                      value={placingCardName}
                      onChange={(e) => setPlacingCardName(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Face Position</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={placingCardFaceUp ? 'default' : 'outline'}
                        onClick={() => setPlacingCardFaceUp(true)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Face-up
                      </Button>
                      <Button
                        type="button"
                        variant={!placingCardFaceUp ? 'default' : 'outline'}
                        onClick={() => setPlacingCardFaceUp(false)}
                        className="flex-1"
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Face-down
                      </Button>
                    </div>
                  </div>

                  {placingCard?.zoneType === 'monster' && (
                    <div className="space-y-2">
                      <Label>Battle Position</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={placingCardPosition === 'attack' ? 'default' : 'outline'}
                          onClick={() => setPlacingCardPosition('attack')}
                          className="flex-1"
                        >
                          <Swords className="h-4 w-4 mr-2" />
                          Attack
                        </Button>
                        <Button
                          type="button"
                          variant={placingCardPosition === 'defense' ? 'default' : 'outline'}
                          onClick={() => setPlacingCardPosition('defense')}
                          className="flex-1"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Defense
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handlePlaceCard} 
                    className="w-full"
                    disabled={!placingCardName.trim()}
                  >
                    Place Card
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Start Duel */}
            {room.status === 'waiting' && isHost && duelists.length >= 2 && (
              <Button onClick={handleStartDuel} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Duel
              </Button>
            )}

            {/* Team Management for Tag Team */}
            {room.status === 'waiting' && room.match_type === 'tag_team' && isHost && (
              <Dialog open={teamManagementOpen} onOpenChange={setTeamManagementOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Manage Teams
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Team Management</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Team 1 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                          <Users className="h-4 w-4" />
                          Team 1
                        </div>
                        <div className="space-y-2">
                          {duelists.filter(d => (d.team_number || 1) === 1).map((participant) => (
                            <div key={participant.id} className="flex items-center justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                              <span className="text-sm">{participant.player.nickname}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSwapTeam(participant.id, participant.player_id)}
                                className="h-6 px-2 text-xs"
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {duelists.filter(d => (d.team_number || 1) === 1).length === 0 && (
                            <p className="text-xs text-muted-foreground">No players</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Team 2 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Users className="h-4 w-4" />
                          Team 2
                        </div>
                        <div className="space-y-2">
                          {duelists.filter(d => d.team_number === 2).map((participant) => (
                            <div key={participant.id} className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/30">
                              <span className="text-sm">{participant.player.nickname}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSwapTeam(participant.id, participant.player_id)}
                                className="h-6 px-2 text-xs"
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {duelists.filter(d => d.team_number === 2).length === 0 && (
                            <p className="text-xs text-muted-foreground">No players</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Click the arrow to swap a player to the other team
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Quick Add Card Dialog */}
            <Dialog open={quickAddCard !== null} onOpenChange={(open) => !open && setQuickAddCard(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Add Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Card Name</Label>
                    <Input
                      placeholder="e.g., Blue-Eyes White Dragon"
                      value={quickAddCardName}
                      onChange={(e) => setQuickAddCardName(e.target.value)}
                      className="bg-input border-border"
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickAddCard()}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Zone Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={quickAddZoneType === 'monster' ? 'default' : 'outline'}
                        onClick={() => setQuickAddZoneType('monster')}
                        className="flex-1"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Monster
                      </Button>
                      <Button
                        type="button"
                        variant={quickAddZoneType === 'spelltrap' ? 'default' : 'outline'}
                        onClick={() => setQuickAddZoneType('spelltrap')}
                        className="flex-1"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Spell/Trap
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Face Position</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={quickAddFaceUp ? 'default' : 'outline'}
                        onClick={() => setQuickAddFaceUp(true)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Face-up
                      </Button>
                      <Button
                        type="button"
                        variant={!quickAddFaceUp ? 'default' : 'outline'}
                        onClick={() => setQuickAddFaceUp(false)}
                        className="flex-1"
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Face-down
                      </Button>
                    </div>
                  </div>

                  {quickAddZoneType === 'monster' && (
                    <div className="space-y-2">
                      <Label>Battle Position</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={quickAddPosition === 'attack' ? 'default' : 'outline'}
                          onClick={() => setQuickAddPosition('attack')}
                          className="flex-1"
                        >
                          <Swords className="h-4 w-4 mr-2" />
                          Attack
                        </Button>
                        <Button
                          type="button"
                          variant={quickAddPosition === 'defense' ? 'default' : 'outline'}
                          onClick={() => setQuickAddPosition('defense')}
                          className="flex-1"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Defense
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleQuickAddCard} 
                    className="w-full"
                    disabled={!quickAddCardName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Field
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                  <div className="grid gap-3">
                    {duelists.map((participant) => {
                      const monsterZones = JSON.parse(participant.monster_zones || '[]')
                      const spellTrapZones = JSON.parse(participant.spell_trap_zones || '[]')
                      const canControl = canControlBoard(participant.player_id)
                      const isOwnBoard = selectedPlayer === participant.player_id
                      
                      return (
                        <div key={participant.id} className={`p-3 rounded-lg bg-background border ${isOwnBoard ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-border'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{participant.player.nickname}</span>
                              {isOwnBoard && (
                                <Badge variant="outline" className="text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Your Board
                                </Badge>
                              )}
                              {room.match_type === 'tag_team' && (
                                <Badge variant="outline" className={`text-xs ${(participant.team_number || 1) === 1 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                  Team {participant.team_number || 1}
                                </Badge>
                              )}
                            </div>
                            <span className="font-mono text-cyan-400">{participant.life_points} LP</span>
                          </div>
                          
                          {/* LP Controls - Anyone can adjust LP */}
                          <div className="flex gap-2 mb-3">
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

                          {/* Board Controls - Only if can control */}
                          {canControl && (
                            <>
                              {/* Quick Add Card Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mb-3 text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/10"
                                onClick={() => {
                                  setQuickAddCard({ participantId: participant.id, playerId: participant.player_id })
                                  setQuickAddCardName('')
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Quick Add Card to Field
                              </Button>

                              {/* Hand Count Control */}
                              <div className="flex items-center justify-between mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                                <div className="flex items-center gap-2">
                                  <Hand className="h-4 w-4 text-amber-400" />
                                  <span className="text-sm text-amber-400">Hand</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-amber-400 hover:bg-amber-400/20"
                                    onClick={() => handleHandCountChange(participant.id, participant.player_id, participant.hand_count || 0, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-mono text-amber-400 w-6 text-center">{participant.hand_count || 0}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-amber-400 hover:bg-amber-400/20"
                                    onClick={() => handleHandCountChange(participant.id, participant.player_id, participant.hand_count || 0, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Field Zones Control */}
                              <div className="space-y-3">
                                {/* Monster Zones */}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="h-3 w-3 text-amber-400 flex-shrink-0" />
                                    <span className="text-[10px] text-muted-foreground">MONSTER ZONES</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4].map((i) => {
                                      const card = monsterZones[i]
                                      const hasCard = card && card !== '' && typeof card === 'object'
                                      return (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                          <button
                                            onClick={() => handleFieldZoneChange(participant.id, participant.player_id, 'monster', i, hasCard)}
                                            className={`w-8 h-10 rounded border-2 transition-all relative group ${
                                              hasCard 
                                                ? card.faceUp
                                                  ? 'bg-amber-600/60 border-amber-500 shadow-[0_0_4px_rgba(217,119,6,0.5)]' 
                                                  : 'bg-slate-600/60 border-slate-500'
                                                : 'bg-slate-800/40 border-slate-600/50 hover:border-amber-500/50'
                                            } ${hasCard && card.position === 'defense' ? 'rotate-90' : ''}`}
                                            title={hasCard ? `${card.name} - Click to remove` : 'Click to add card'}
                                          >
                                            {hasCard && (
                                              <span className="text-[6px] text-white truncate px-0.5 leading-tight">
                                                {card.faceUp ? card.name.substring(0, 4) : '?'}
                                              </span>
                                            )}
                                          </button>
                                          {hasCard && (
                                            <div className="flex gap-0.5">
                                              <button
                                                onClick={() => handleToggleCardState(participant.id, participant.player_id, 'monster', i)}
                                                className="text-[8px] px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                                                title={card.faceUp ? 'Flip face-down' : 'Flip face-up'}
                                              >
                                                {card.faceUp ? <Eye className="h-2 w-2" /> : <EyeOff className="h-2 w-2" />}
                                              </button>
                                              <button
                                                onClick={() => handleToggleMonsterPosition(participant.id, participant.player_id, i)}
                                                className="text-[8px] px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                                                title={card.position === 'attack' ? 'Change to Defense' : 'Change to Attack'}
                                              >
                                                <RotateCcw className="h-2 w-2" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                                
                                {/* Spell/Trap Zones */}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Shield className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                                    <span className="text-[10px] text-muted-foreground">SPELL/TRAP ZONES</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4].map((i) => {
                                      const card = spellTrapZones[i]
                                      const hasCard = card && card !== '' && typeof card === 'object'
                                      return (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                          <button
                                            onClick={() => handleFieldZoneChange(participant.id, participant.player_id, 'spelltrap', i, hasCard)}
                                            className={`w-8 h-10 rounded border-2 transition-all ${
                                              hasCard 
                                                ? card.faceUp
                                                  ? 'bg-cyan-600/60 border-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.5)]' 
                                                  : 'bg-purple-600/60 border-purple-500'
                                                : 'bg-slate-800/40 border-slate-600/50 hover:border-cyan-500/50'
                                            }`}
                                            title={hasCard ? `${card.name} - Click to remove` : 'Click to add card'}
                                          >
                                            {hasCard && (
                                              <span className="text-[6px] text-white truncate px-0.5 leading-tight">
                                                {card.faceUp ? card.name.substring(0, 4) : '?'}
                                              </span>
                                            )}
                                          </button>
                                          {hasCard && (
                                            <button
                                              onClick={() => handleToggleCardState(participant.id, participant.player_id, 'spelltrap', i)}
                                              className="text-[8px] px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                                              title={card.faceUp ? 'Set face-down' : 'Activate (face-up)'}
                                            >
                                              {card.faceUp ? <Eye className="h-2 w-2" /> : <EyeOff className="h-2 w-2" />}
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {/* Non-controllable: Show read-only field state */}
                          {!canControl && (
                            <div className="mt-3 p-2 rounded bg-slate-800/50 border border-slate-700">
                              <p className="text-xs text-muted-foreground text-center">
                                <Eye className="h-3 w-3 inline-block mr-1" />
                                Viewing {participant.player.nickname}&apos;s board
                              </p>
                              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3 text-amber-400" />
                                  M: {monsterZones.filter((z: MonsterCard | null) => z !== null && z !== '').length}/5
                                </span>
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3 text-cyan-400" />
                                  S/T: {spellTrapZones.filter((z: SpellTrapCard | null) => z !== null && z !== '').length}/5
                                </span>
                                <span className="flex items-center gap-1">
                                  <Hand className="h-3 w-3 text-amber-400" />
                                  Hand: {participant.hand_count || 0}
                                </span>
                              </div>
                            </div>
                          )}

                          {isHost && room.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full mt-3 text-yellow-400 hover:bg-yellow-400/10"
                              onClick={() => handleEndDuel(participant.player_id)}
                            >
                              <Trophy className="h-4 w-4 mr-1" />
                              Declare Winner
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Event */}
            {room.status === 'active' && (isDuelist || isHost) && (
              <>
                {/* Card Activation */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="h-5 w-5 text-amber-400" />
                      Card Activation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <select
                        value={cardActivationPlayer || ''}
                        onChange={(e) => setCardActivationPlayer(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm"
                      >
                        <option value="">Select Player...</option>
                        {duelists.map((duelist) => (
                          <option key={duelist.player_id} value={duelist.player_id}>
                            {duelist.player.nickname}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Card name (e.g., Blue-Eyes White Dragon)"
                          value={cardActivationName}
                          onChange={(e) => setCardActivationName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCardActivation()}
                          className="bg-input border-border"
                        />
                        <Button onClick={handleCardActivation} disabled={!cardActivationPlayer || !cardActivationName.trim()}>
                          Activate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Event */}
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
              </>
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
