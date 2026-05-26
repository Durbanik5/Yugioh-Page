'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Sword, Shield, Sparkles, Flame, Eye, EyeOff, 
  RotateCcw, Layers, Ban, Heart, Zap, Target,
  ChevronRight, Plus, Minus, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { useDuelEngine } from '@/hooks/use-duel-engine'
import type { DuelGameCard, CardPosition, Player, DuelRoom } from '@/lib/types'

interface MasterDuelFieldProps {
  room: DuelRoom
  myPlayerId: string
  opponentPlayerId: string | null
  myPlayer: Player
  opponentPlayer: Player | null
  allCards: DuelGameCard[]
  myLifePoints: number
  opponentLifePoints: number
  isMyTurn: boolean
  onCardsChanged: () => void
}

// Master Duel style card component with hover effect text
function MasterDuelCard({
  card,
  isOwner,
  isFaceDown = false,
  isDefense = false,
  size = 'md',
  onAction,
  actions = [],
  isHighlighted = false,
  isAttackTarget = false,
}: {
  card: DuelGameCard
  isOwner: boolean
  isFaceDown?: boolean
  isDefense?: boolean
  size?: 'sm' | 'md' | 'lg'
  onAction?: (action: string) => void
  actions?: { id: string; label: string; icon?: React.ReactNode }[]
  isHighlighted?: boolean
  isAttackTarget?: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  
  const sizeClasses = {
    sm: 'w-12 h-[70px]',
    md: 'w-16 h-[94px]',
    lg: 'w-20 h-[117px]',
  }
  
  const imageUrl = card.card_id && !isFaceDown
    ? `https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`
    : '/images/card-back.jpg'

  const isMonster = card.card_type?.toLowerCase().includes('monster')
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative rounded overflow-hidden cursor-pointer transition-all duration-200',
              sizeClasses[size],
              isDefense && 'rotate-90',
              isHighlighted && 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-black',
              isAttackTarget && 'ring-2 ring-red-500 animate-pulse',
              'hover:scale-110 hover:z-20 hover:shadow-lg hover:shadow-yellow-500/20'
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
          >
            <Image
              src={imageUrl}
              alt={isFaceDown ? 'Face-down card' : card.card_name}
              fill
              className="object-cover"
              unoptimized
            />
            
            {/* ATK/DEF overlay for face-up monsters */}
            {!isFaceDown && isMonster && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-0.5">
                <div className="flex justify-between text-[8px] font-bold">
                  <span className="text-red-400">{card.attack ?? '?'}</span>
                  <span className="text-blue-400">{card.defense ?? '?'}</span>
                </div>
              </div>
            )}
            
            {/* Action buttons overlay */}
            {showActions && actions.length > 0 && onAction && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 p-1">
                {actions.slice(0, 3).map(action => (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAction(action.id)
                    }}
                    className="w-full px-1 py-0.5 text-[8px] bg-slate-700 hover:bg-slate-600 rounded text-white truncate flex items-center gap-0.5 justify-center"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-xs p-3 bg-slate-900 border-slate-700"
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-16 h-[94px] relative rounded overflow-hidden flex-shrink-0">
                <Image
                  src={card.card_id ? `https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg` : '/images/card-back.jpg'}
                  alt={card.card_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-yellow-400 truncate">{card.card_name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{card.card_type?.replace(/_/g, ' ')}</p>
                {isMonster && (
                  <div className="flex gap-2 mt-1 text-xs">
                    {card.level && <span className="text-yellow-500">Lv {card.level}</span>}
                    <span className="text-red-400">ATK {card.attack ?? '?'}</span>
                    <span className="text-blue-400">DEF {card.defense ?? '?'}</span>
                  </div>
                )}
              </div>
            </div>
            {card.effect_text && (
              <div className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
                {card.effect_text}
              </div>
            )}
            {!card.effect_text && card.card_type === 'normal_monster' && (
              <p className="text-xs text-slate-400 italic">Normal Monster - No effect</p>
            )}
            {!card.effect_text && card.card_type !== 'normal_monster' && (
              <p className="text-xs text-slate-500">Effect text not available</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Empty zone placeholder
function EmptyZone({ 
  type, 
  onClick 
}: { 
  type: 'monster' | 'spell' | 'field' | 'extra' | 'pendulum'
  onClick?: () => void 
}) {
  const colors = {
    monster: 'border-orange-900/30 bg-orange-950/10',
    spell: 'border-cyan-900/30 bg-cyan-950/10',
    field: 'border-green-900/30 bg-green-950/10',
    extra: 'border-purple-900/30 bg-purple-950/10',
    pendulum: 'border-blue-900/30 bg-blue-950/10',
  }
  
  return (
    <div 
      className={cn(
        'w-16 h-[94px] rounded border-2 border-dashed',
        colors[type],
        onClick && 'cursor-pointer hover:border-opacity-60'
      )}
      onClick={onClick}
    />
  )
}

// Life point display
function LifePointsDisplay({ 
  lp, 
  maxLp = 8000, 
  isOpponent = false 
}: { 
  lp: number
  maxLp?: number
  isOpponent?: boolean 
}) {
  const percentage = Math.max(0, Math.min(100, (lp / maxLp) * 100))
  const color = percentage > 50 ? 'bg-green-500' : percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700',
      isOpponent && 'flex-row-reverse'
    )}>
      <Heart className={cn('h-5 w-5', percentage > 50 ? 'text-green-500' : percentage > 25 ? 'text-yellow-500' : 'text-red-500')} />
      <div className="flex flex-col gap-1">
        <span className="text-lg font-bold tabular-nums">{lp.toLocaleString()}</span>
        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-500', color)} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  )
}

// Phase indicator
function PhaseIndicator({ 
  phase, 
  isMyTurn, 
  turnCount,
  onPhaseChange 
}: { 
  phase: string
  isMyTurn: boolean
  turnCount: number
  onPhaseChange?: (phase: string) => void 
}) {
  const phases = [
    { id: 'draw', label: 'DP', full: 'Draw Phase' },
    { id: 'standby', label: 'SP', full: 'Standby Phase' },
    { id: 'main1', label: 'M1', full: 'Main Phase 1' },
    { id: 'battle', label: 'BP', full: 'Battle Phase' },
    { id: 'main2', label: 'M2', full: 'Main Phase 2' },
    { id: 'end', label: 'EP', full: 'End Phase' },
  ]
  
  return (
    <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700">
      <Badge variant={isMyTurn ? 'default' : 'secondary'} className="text-xs">
        Turn {turnCount}
      </Badge>
      <div className="flex gap-0.5">
        {phases.map(p => (
          <TooltipProvider key={p.id} delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => isMyTurn && onPhaseChange?.(p.id)}
                  disabled={!isMyTurn}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors',
                    phase === p.id 
                      ? 'bg-yellow-500 text-black' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                    !isMyTurn && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {p.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {p.full}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

export function MasterDuelField({
  room,
  myPlayerId,
  opponentPlayerId,
  myPlayer,
  opponentPlayer,
  allCards,
  myLifePoints,
  opponentLifePoints,
  isMyTurn,
  onCardsChanged,
}: MasterDuelFieldProps) {
  const [hoveredCard, setHoveredCard] = useState<DuelGameCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<DuelGameCard | null>(null)
  const [attackingCard, setAttackingCard] = useState<DuelGameCard | null>(null)
  const [showDeckViewer, setShowDeckViewer] = useState(false)
  const [showGraveyardViewer, setShowGraveyardViewer] = useState<'my' | 'opp' | null>(null)
  
  // Use the duel engine
  const {
    gameState,
    isMyTurn: engineIsMyTurn,
    hasNormalSummoned,
    validateNormalSummon,
    executeNormalSummon,
    executeSpellTrapActivation,
    setSpellTrap: engineSetSpellTrap,
    changePhase,
    myFieldMonsters,
    opponentFieldMonsters,
    validateAttack,
    executeAttack,
    enterBattlePhase,
    enterMain2,
    flipSummon: engineFlipSummon,
    changeMonsterPosition,
    drawCardsEffect,
    destroyCardsEffect,
    searchDeckEffect,
    specialSummonEffect,
    getSearchableDeck,
    getGraveyard,
    getOpponentId,
  } = useDuelEngine({ room, myPlayerId, allCards, onCardsChanged })
  
  // Organize cards by location
  const organizedCards = useMemo(() => {
    const my = {
      hand: [] as DuelGameCard[],
      monsters: Array(5).fill(null) as (DuelGameCard | null)[],
      spells: Array(5).fill(null) as (DuelGameCard | null)[],
      field: null as DuelGameCard | null,
      graveyard: [] as DuelGameCard[],
      banished: [] as DuelGameCard[],
      deck: [] as DuelGameCard[],
      extra: [] as DuelGameCard[],
    }
    const opp = { ...my, hand: [] as DuelGameCard[], monsters: Array(5).fill(null), spells: Array(5).fill(null) }
    
    for (const card of allCards) {
      const isMyCard = card.player_id === myPlayerId
      const target = isMyCard ? my : opp
      
      switch (card.location) {
        case 'hand':
          target.hand.push(card)
          break
        case 'monster_zone':
          if (card.zone_index !== null && card.zone_index >= 0 && card.zone_index < 5) {
            target.monsters[card.zone_index] = card
          }
          break
        case 'spell_trap_zone':
          if (card.zone_index !== null && card.zone_index >= 0 && card.zone_index < 5) {
            target.spells[card.zone_index] = card
          }
          break
        case 'field_zone':
          target.field = card
          break
        case 'graveyard':
          target.graveyard.push(card)
          break
        case 'banished':
          target.banished.push(card)
          break
        case 'deck':
          target.deck.push(card)
          break
        case 'extra_deck':
          target.extra.push(card)
          break
      }
    }
    
    // Sort hands by order index
    my.hand.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    opp.hand.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    
    return { my, opp }
  }, [allCards, myPlayerId])
  
  // Handle card actions
  const handleCardAction = useCallback(async (card: DuelGameCard, action: string) => {
    switch (action) {
      case 'summon_atk':
        await executeNormalSummon(card, 'face_up_attack')
        break
      case 'summon_def':
        await executeNormalSummon(card, 'face_up_defense')
        break
      case 'set':
        if (card.card_type?.toLowerCase().includes('monster')) {
          await executeNormalSummon(card, 'face_down_defense')
        } else {
          await engineSetSpellTrap(card)
        }
        break
      case 'activate':
        await executeSpellTrapActivation(card)
        break
      case 'attack':
        if (opponentFieldMonsters.length === 0) {
          // Direct attack
          await executeAttack(card)
        } else {
          // Select target
          setAttackingCard(card)
          toast.info('Select an opponent monster to attack')
        }
        break
      case 'flip':
        await engineFlipSummon(card)
        break
      case 'change_atk':
        await changeMonsterPosition(card, 'face_up_attack')
        break
      case 'change_def':
        await changeMonsterPosition(card, 'face_up_defense')
        break
    }
  }, [executeNormalSummon, engineSetSpellTrap, executeSpellTrapActivation, executeAttack, engineFlipSummon, changeMonsterPosition, opponentFieldMonsters])
  
  // Get available actions for a card
  const getCardActions = useCallback((card: DuelGameCard, location: string): { id: string; label: string; icon?: React.ReactNode }[] => {
    const actions: { id: string; label: string; icon?: React.ReactNode }[] = []
    
    if (!engineIsMyTurn) return actions
    
    const isMonster = card.card_type?.toLowerCase().includes('monster')
    const isSpellTrap = card.card_type?.toLowerCase().includes('spell') || card.card_type?.toLowerCase().includes('trap')
    const phase = gameState?.phase
    
    if (location === 'hand') {
      if (isMonster) {
        const validation = validateNormalSummon(card)
        if (validation.valid || validation.requiresTributes) {
          actions.push({ id: 'summon_atk', label: 'Summon', icon: <Sword className="h-2 w-2" /> })
          actions.push({ id: 'summon_def', label: 'Def', icon: <Shield className="h-2 w-2" /> })
          actions.push({ id: 'set', label: 'Set', icon: <EyeOff className="h-2 w-2" /> })
        }
      }
      if (isSpellTrap && (phase === 'main1' || phase === 'main2')) {
        if (card.card_type === 'spell' || card.card_type === 'quick_play_spell') {
          actions.push({ id: 'activate', label: 'Activate', icon: <Sparkles className="h-2 w-2" /> })
        }
        actions.push({ id: 'set', label: 'Set', icon: <EyeOff className="h-2 w-2" /> })
      }
    }
    
    if (location === 'monster') {
      if (phase === 'battle' && card.position === 'face_up_attack' && !card.has_attacked) {
        actions.push({ id: 'attack', label: 'Attack', icon: <Sword className="h-2 w-2" /> })
      }
      if (card.position === 'face_down_defense' && (phase === 'main1' || phase === 'main2')) {
        actions.push({ id: 'flip', label: 'Flip', icon: <Eye className="h-2 w-2" /> })
      }
      if (card.position === 'face_up_attack' && !card.has_changed_position && (phase === 'main1' || phase === 'main2')) {
        actions.push({ id: 'change_def', label: 'To DEF', icon: <Shield className="h-2 w-2" /> })
      }
      if (card.position === 'face_up_defense' && !card.has_changed_position && (phase === 'main1' || phase === 'main2')) {
        actions.push({ id: 'change_atk', label: 'To ATK', icon: <Sword className="h-2 w-2" /> })
      }
      // Effect monster activation
      if (card.card_type === 'effect_monster' && card.position?.includes('face_up')) {
        actions.push({ id: 'activate', label: 'Effect', icon: <Sparkles className="h-2 w-2" /> })
      }
    }
    
    if (location === 'spell') {
      if (card.position === 'face_down' && (phase === 'main1' || phase === 'main2' || card.card_type?.includes('trap'))) {
        actions.push({ id: 'activate', label: 'Activate', icon: <Sparkles className="h-2 w-2" /> })
      }
    }
    
    return actions
  }, [engineIsMyTurn, gameState?.phase, validateNormalSummon])
  
  // Handle attack target selection
  const handleAttackTarget = useCallback(async (target: DuelGameCard) => {
    if (attackingCard) {
      await executeAttack(attackingCard, target)
      setAttackingCard(null)
    }
  }, [attackingCard, executeAttack])
  
  // Render a field zone row
  const renderZoneRow = (zones: (DuelGameCard | null)[], type: 'monster' | 'spell', isOpponent: boolean) => {
    return (
      <div className="flex justify-center gap-1">
        {zones.map((card, idx) => {
          if (card) {
            const isFaceDown = card.position?.includes('face_down')
            const isDefense = card.position?.includes('defense')
            const isTarget = attackingCard && isOpponent && type === 'monster'
            
            return (
              <div 
                key={card.id} 
                onClick={() => isTarget && handleAttackTarget(card)}
                className={isTarget ? 'cursor-crosshair' : ''}
              >
                <MasterDuelCard
                  card={card}
                  isOwner={!isOpponent}
                  isFaceDown={isFaceDown}
                  isDefense={isDefense}
                  actions={!isOpponent ? getCardActions(card, type) : []}
                  onAction={(action) => handleCardAction(card, action)}
                  isAttackTarget={isTarget}
                />
              </div>
            )
          }
          return <EmptyZone key={idx} type={type} />
        })}
      </div>
    )
  }
  
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Field background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-blue-950/20 to-slate-900/50 opacity-50" />
      
      {/* Main field container */}
      <div className="relative z-10 flex flex-col h-full p-2 gap-2">
        
        {/* Opponent info bar */}
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-red-500 overflow-hidden">
              {opponentPlayer?.avatar_url && (
                <Image src={opponentPlayer.avatar_url} alt="" width={40} height={40} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{opponentPlayer?.nickname || 'Opponent'}</p>
              <p className="text-xs text-slate-400">Deck: {organizedCards.opp.deck.length}</p>
            </div>
          </div>
          <LifePointsDisplay lp={opponentLifePoints} isOpponent />
        </div>
        
        {/* Opponent hand (face-down) */}
        <div className="flex justify-center gap-1">
          {organizedCards.opp.hand.map((card) => (
            <MasterDuelCard
              key={card.id}
              card={card}
              isOwner={false}
              isFaceDown
              size="sm"
            />
          ))}
          {organizedCards.opp.hand.length === 0 && (
            <p className="text-xs text-slate-500">No cards in hand</p>
          )}
        </div>
        
        {/* Opponent field */}
        <div className="space-y-1">
          {renderZoneRow(organizedCards.opp.spells, 'spell', true)}
          {renderZoneRow(organizedCards.opp.monsters, 'monster', true)}
        </div>
        
        {/* Center area - Phase indicator */}
        <div className="flex justify-center py-2">
          {gameState && (
            <PhaseIndicator
              phase={gameState.phase}
              isMyTurn={engineIsMyTurn}
              turnCount={gameState.turnCount}
              onPhaseChange={changePhase}
            />
          )}
        </div>
        
        {/* My field */}
        <div className="space-y-1">
          {renderZoneRow(organizedCards.my.monsters, 'monster', false)}
          {renderZoneRow(organizedCards.my.spells, 'spell', false)}
        </div>
        
        {/* My info bar */}
        <div className="flex justify-between items-center px-4">
          <LifePointsDisplay lp={myLifePoints} />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-bold text-white">{myPlayer?.nickname || 'You'}</p>
              <p className="text-xs text-slate-400">Deck: {organizedCards.my.deck.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-blue-500 overflow-hidden">
              {myPlayer?.avatar_url && (
                <Image src={myPlayer.avatar_url} alt="" width={40} height={40} />
              )}
            </div>
          </div>
        </div>
        
        {/* My hand */}
        <div className="flex justify-center gap-1 pb-2">
          {organizedCards.my.hand.map((card) => (
            <MasterDuelCard
              key={card.id}
              card={card}
              isOwner={true}
              actions={getCardActions(card, 'hand')}
              onAction={(action) => handleCardAction(card, action)}
            />
          ))}
        </div>
        
        {/* Side panels - Deck/GY/Banished */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {/* Opponent GY */}
          <button 
            onClick={() => setShowGraveyardViewer('opp')}
            className="w-12 h-16 bg-slate-800/80 rounded border border-slate-700 flex flex-col items-center justify-center hover:bg-slate-700/80"
          >
            <Flame className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.opp.graveyard.length}</span>
          </button>
          
          {/* My GY */}
          <button 
            onClick={() => setShowGraveyardViewer('my')}
            className="w-12 h-16 bg-slate-800/80 rounded border border-slate-700 flex flex-col items-center justify-center hover:bg-slate-700/80"
          >
            <Flame className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.my.graveyard.length}</span>
          </button>
        </div>
        
        {/* Right side - Extra deck, banished */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {/* Extra deck */}
          <div className="w-12 h-16 bg-slate-800/80 rounded border border-purple-700 flex flex-col items-center justify-center">
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.my.extra.length}</span>
          </div>
          
          {/* Banished */}
          <div className="w-12 h-16 bg-slate-800/80 rounded border border-slate-700 flex flex-col items-center justify-center">
            <Ban className="h-4 w-4 text-red-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.my.banished.length}</span>
          </div>
        </div>
        
        {/* Battle phase controls */}
        {attackingCard && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 p-4 rounded-lg border border-red-500">
            <p className="text-sm font-bold text-red-400 mb-2">
              {attackingCard.card_name} is attacking!
            </p>
            {opponentFieldMonsters.length === 0 ? (
              <Button size="sm" variant="destructive" onClick={() => executeAttack(attackingCard)}>
                Direct Attack!
              </Button>
            ) : (
              <p className="text-xs text-slate-400">Select a target monster</p>
            )}
            <Button size="sm" variant="outline" className="ml-2" onClick={() => setAttackingCard(null)}>
              Cancel
            </Button>
          </div>
        )}
        
        {/* Turn actions */}
        {engineIsMyTurn && (
          <div className="absolute bottom-20 right-4 flex gap-2">
            {gameState?.phase === 'main1' && gameState.turnCount > 1 && (
              <Button size="sm" onClick={enterBattlePhase}>
                Battle Phase
              </Button>
            )}
            {gameState?.phase === 'battle' && (
              <Button size="sm" onClick={enterMain2}>
                Main Phase 2
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => changePhase('end')}>
              End Turn
            </Button>
          </div>
        )}
      </div>
      
      {/* Graveyard Viewer Dialog */}
      <Dialog open={!!showGraveyardViewer} onOpenChange={() => setShowGraveyardViewer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showGraveyardViewer === 'my' ? 'Your' : "Opponent's"} Graveyard
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-4 gap-2 p-2">
              {(showGraveyardViewer === 'my' ? organizedCards.my.graveyard : organizedCards.opp.graveyard).map(card => (
                <MasterDuelCard
                  key={card.id}
                  card={card}
                  isOwner={showGraveyardViewer === 'my'}
                  size="sm"
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
