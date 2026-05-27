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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Sword, Shield, Sparkles, Flame, Eye, EyeOff, 
  RotateCcw, Layers, Ban, Heart, Zap, Target,
  ChevronRight, Plus, Minus, Search, Maximize2, Minimize2
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
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
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
  onHover,
}: {
  card: DuelGameCard
  isOwner: boolean
  isFaceDown?: boolean
  isDefense?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  onAction?: (action: string) => void
  actions?: { id: string; label: string; icon?: React.ReactNode }[]
  isHighlighted?: boolean
  isAttackTarget?: boolean
  onHover?: (card: DuelGameCard | null) => void
}) {
  const [showActions, setShowActions] = useState(false)
  
  const sizeClasses = {
    xs: 'w-8 h-[46px]',
    sm: 'w-10 h-[58px]',
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
            onMouseEnter={() => {
              setShowActions(true)
              if (onHover && !isFaceDown) onHover(card)
            }}
            onMouseLeave={() => {
              setShowActions(false)
              if (onHover) onHover(null)
            }}
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
  onClick,
  size = 'md'
}: { 
  type: 'monster' | 'spell' | 'field' | 'extra' | 'pendulum'
  onClick?: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const colors = {
    monster: 'border-orange-900/30 bg-orange-950/10',
    spell: 'border-cyan-900/30 bg-cyan-950/10',
    field: 'border-green-900/30 bg-green-950/10',
    extra: 'border-purple-900/30 bg-purple-950/10',
    pendulum: 'border-blue-900/30 bg-blue-950/10',
  }
  
  const sizeClasses = {
    xs: 'w-8 h-[46px]',
    sm: 'w-10 h-[58px]',
    md: 'w-16 h-[94px]',
    lg: 'w-20 h-[117px]',
  }
  
  return (
    <div 
      className={cn(
        'rounded border-2 border-dashed',
        sizeClasses[size],
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
  isFullscreen = false,
  onToggleFullscreen,
}: MasterDuelFieldProps) {
  const [hoveredCard, setHoveredCard] = useState<DuelGameCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<DuelGameCard | null>(null)
  const [attackingCard, setAttackingCard] = useState<DuelGameCard | null>(null)
  const [showDeckViewer, setShowDeckViewer] = useState(false)
  const [showGraveyardViewer, setShowGraveyardViewer] = useState<'my' | 'opp' | null>(null)
  const [showBanishedViewer, setShowBanishedViewer] = useState<'my' | 'opp' | null>(null)
  const [showExtraDeckViewer, setShowExtraDeckViewer] = useState<boolean>(false)
  
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
        case 'spell_zone':
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
    
    const isMonster = card.card_type?.toLowerCase().includes('monster') || 
                      ['monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type || '')
    const isSpellTrap = card.card_type?.toLowerCase().includes('spell') || card.card_type?.toLowerCase().includes('trap') ||
                        ['spell', 'trap'].includes(card.card_type || '')
    const hasEffect = !!card.effect_text && card.effect_text.length > 0
    const phase = gameState?.phase
    
    if (location === 'hand') {
      if (isMonster) {
        const validation = validateNormalSummon(card)
        if (validation.valid || validation.requiresTributes) {
          actions.push({ id: 'summon_atk', label: 'Summon', icon: <Sword className="h-2 w-2" /> })
          actions.push({ id: 'summon_def', label: 'Def', icon: <Shield className="h-2 w-2" /> })
          actions.push({ id: 'set', label: 'Set', icon: <EyeOff className="h-2 w-2" /> })
        }
        // Hand-activated monster effects (like hand traps, quick effects from hand)
        if (hasEffect && (phase === 'main1' || phase === 'main2')) {
          actions.push({ id: 'activate', label: 'Effect', icon: <Sparkles className="h-2 w-2" /> })
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
      // Effect monster activation - check if card has effect text and is face-up
      if (hasEffect && card.position?.includes('face_up') && (phase === 'main1' || phase === 'main2')) {
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
  
  // Card size based on fullscreen mode
  const cardSize = isFullscreen ? 'sm' : 'md'
  const handCardSize = isFullscreen ? 'xs' : 'sm'
  
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
                  size={cardSize}
                  actions={!isOpponent ? getCardActions(card, type) : []}
                  onAction={(action) => handleCardAction(card, action)}
                  isAttackTarget={isTarget}
                  onHover={!isFaceDown ? setHoveredCard : undefined}
                />
              </div>
            )
          }
          return <EmptyZone key={idx} type={type} size={cardSize} />
        })}
      </div>
    )
  }
  
  return (
    <div className={cn(
      "relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50 w-screen h-screen" : "w-full h-full"
    )}>
      {/* Field background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-blue-950/20 to-slate-900/50 opacity-50" />
      
      {/* Fullscreen toggle button */}
      {onToggleFullscreen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 bg-slate-800/80 hover:bg-slate-700 text-white"
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      )}
      
      {/* Main field container */}
      <div className="relative z-10 flex flex-col h-full p-2 gap-1">
        
        {/* Opponent info bar */}
        <div className={cn(
          "flex justify-between items-center px-4 flex-shrink-0",
          isFullscreen && "py-0"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-full bg-slate-800 border-2 border-red-500 overflow-hidden",
              isFullscreen ? "w-8 h-8" : "w-10 h-10"
            )}>
              {opponentPlayer?.avatar_url && (
                <Image src={opponentPlayer.avatar_url} alt="" width={40} height={40} />
              )}
            </div>
            <div>
              <p className={cn("font-bold text-white", isFullscreen ? "text-xs" : "text-sm")}>{opponentPlayer?.nickname || 'Opponent'}</p>
              <p className="text-[10px] text-slate-400">Deck: {organizedCards.opp.deck.length}</p>
            </div>
          </div>
          <LifePointsDisplay lp={opponentLifePoints} isOpponent />
        </div>
        
        {/* Opponent hand (face-down) */}
        <div className="flex justify-center gap-1 flex-shrink-0 overflow-x-auto px-4">
          {organizedCards.opp.hand.map((card) => (
            <MasterDuelCard
              key={card.id}
              card={card}
              isOwner={false}
              isFaceDown
              size={handCardSize}
            />
          ))}
          {organizedCards.opp.hand.length === 0 && (
            <p className="text-xs text-slate-500">No cards in hand</p>
          )}
        </div>
        
        {/* Opponent field */}
        <div className="space-y-1 flex-shrink-0">
          {renderZoneRow(organizedCards.opp.spells, 'spell', true)}
          {renderZoneRow(organizedCards.opp.monsters, 'monster', true)}
        </div>
        
        {/* Center area - Phase indicator */}
        <div className="flex justify-center py-1 flex-shrink-0">
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
        <div className="space-y-1 flex-shrink-0">
          {renderZoneRow(organizedCards.my.monsters, 'monster', false)}
          {renderZoneRow(organizedCards.my.spells, 'spell', false)}
        </div>
        
        {/* My info bar */}
        <div className="flex justify-between items-center px-4 flex-shrink-0">
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
        <div className="flex justify-center gap-1 pb-2 flex-shrink-0 overflow-x-auto px-4">
          {organizedCards.my.hand.map((card) => (
            <MasterDuelCard
              key={card.id}
              card={card}
              isOwner={true}
              size={handCardSize}
              actions={getCardActions(card, 'hand')}
              onAction={(action) => handleCardAction(card, action)}
              onHover={setHoveredCard}
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
          <button 
            onClick={() => setShowExtraDeckViewer(true)}
            className="w-12 h-16 bg-slate-800/80 rounded border border-purple-700 flex flex-col items-center justify-center hover:bg-slate-700/80"
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.my.extra.length}</span>
          </button>
          
          {/* Banished */}
          <button 
            onClick={() => setShowBanishedViewer('my')}
            className="w-12 h-16 bg-slate-800/80 rounded border border-slate-700 flex flex-col items-center justify-center hover:bg-slate-700/80"
          >
            <Ban className="h-4 w-4 text-red-400" />
            <span className="text-[10px] text-slate-400">{organizedCards.my.banished.length}</span>
          </button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-purple-400" />
              {showGraveyardViewer === 'my' ? 'Your' : "Opponent's"} Graveyard
              <Badge variant="secondary" className="ml-2">
                {(showGraveyardViewer === 'my' ? organizedCards.my.graveyard : organizedCards.opp.graveyard).length} cards
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <ScrollArea className="h-80 flex-1">
              <div className="grid grid-cols-4 gap-2 p-2">
                {(showGraveyardViewer === 'my' ? organizedCards.my.graveyard : organizedCards.opp.graveyard).length === 0 ? (
                  <p className="col-span-4 text-center text-muted-foreground py-8">Graveyard is empty</p>
                ) : (
                  (showGraveyardViewer === 'my' ? organizedCards.my.graveyard : organizedCards.opp.graveyard).map(card => (
                    <MasterDuelCard
                      key={card.id}
                      card={card}
                      isOwner={showGraveyardViewer === 'my'}
                      size="sm"
                      onHover={setHoveredCard}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
            {/* Card Preview Panel */}
            {hoveredCard && (
              <div className="w-48 flex-shrink-0 border-l border-border pl-4">
                <div className="w-full aspect-[421/614] relative rounded overflow-hidden mb-2">
                  <Image
                    src={`https://images.ygoprodeck.com/images/cards/${hoveredCard.card_id}.jpg`}
                    alt={hoveredCard.card_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <h4 className="font-bold text-sm text-yellow-400">{hoveredCard.card_name}</h4>
                <p className="text-xs text-muted-foreground capitalize mb-1">{hoveredCard.card_type?.replace(/_/g, ' ')}</p>
                {hoveredCard.card_type?.includes('monster') && (
                  <div className="flex gap-2 text-xs mb-2">
                    <span className="text-yellow-500">Lv {hoveredCard.level}</span>
                    <span className="text-red-400">ATK {hoveredCard.attack}</span>
                    <span className="text-blue-400">DEF {hoveredCard.defense}</span>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{hoveredCard.effect_text}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Banished Viewer Dialog */}
      <Dialog open={!!showBanishedViewer} onOpenChange={() => setShowBanishedViewer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              {showBanishedViewer === 'my' ? 'Your' : "Opponent's"} Banished Zone
              <Badge variant="secondary" className="ml-2">
                {(showBanishedViewer === 'my' ? organizedCards.my.banished : organizedCards.opp.banished).length} cards
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <ScrollArea className="h-80 flex-1">
              <div className="grid grid-cols-4 gap-2 p-2">
                {(showBanishedViewer === 'my' ? organizedCards.my.banished : organizedCards.opp.banished).length === 0 ? (
                  <p className="col-span-4 text-center text-muted-foreground py-8">Banished zone is empty</p>
                ) : (
                  (showBanishedViewer === 'my' ? organizedCards.my.banished : organizedCards.opp.banished).map(card => (
                    <MasterDuelCard
                      key={card.id}
                      card={card}
                      isOwner={showBanishedViewer === 'my'}
                      size="sm"
                      onHover={setHoveredCard}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
            {/* Card Preview Panel */}
            {hoveredCard && (
              <div className="w-48 flex-shrink-0 border-l border-border pl-4">
                <div className="w-full aspect-[421/614] relative rounded overflow-hidden mb-2">
                  <Image
                    src={`https://images.ygoprodeck.com/images/cards/${hoveredCard.card_id}.jpg`}
                    alt={hoveredCard.card_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <h4 className="font-bold text-sm text-yellow-400">{hoveredCard.card_name}</h4>
                <p className="text-xs text-muted-foreground capitalize mb-1">{hoveredCard.card_type?.replace(/_/g, ' ')}</p>
                {hoveredCard.card_type?.includes('monster') && (
                  <div className="flex gap-2 text-xs mb-2">
                    <span className="text-yellow-500">Lv {hoveredCard.level}</span>
                    <span className="text-red-400">ATK {hoveredCard.attack}</span>
                    <span className="text-blue-400">DEF {hoveredCard.defense}</span>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{hoveredCard.effect_text}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Extra Deck Viewer Dialog */}
      <Dialog open={showExtraDeckViewer} onOpenChange={setShowExtraDeckViewer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Your Extra Deck
              <Badge variant="secondary" className="ml-2">
                {organizedCards.my.extra.length} cards
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <ScrollArea className="h-80 flex-1">
              <div className="grid grid-cols-4 gap-2 p-2">
                {organizedCards.my.extra.length === 0 ? (
                  <p className="col-span-4 text-center text-muted-foreground py-8">Extra deck is empty</p>
                ) : (
                  organizedCards.my.extra.map(card => (
                    <MasterDuelCard
                      key={card.id}
                      card={card}
                      isOwner={true}
                      size="sm"
                      onHover={setHoveredCard}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
            {/* Card Preview Panel */}
            {hoveredCard && (
              <div className="w-48 flex-shrink-0 border-l border-border pl-4">
                <div className="w-full aspect-[421/614] relative rounded overflow-hidden mb-2">
                  <Image
                    src={`https://images.ygoprodeck.com/images/cards/${hoveredCard.card_id}.jpg`}
                    alt={hoveredCard.card_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <h4 className="font-bold text-sm text-yellow-400">{hoveredCard.card_name}</h4>
                <p className="text-xs text-muted-foreground capitalize mb-1">{hoveredCard.card_type?.replace(/_/g, ' ')}</p>
                {hoveredCard.card_type?.includes('monster') && (
                  <div className="flex gap-2 text-xs mb-2">
                    <span className="text-yellow-500">Lv {hoveredCard.level}</span>
                    <span className="text-red-400">ATK {hoveredCard.attack}</span>
                    <span className="text-blue-400">DEF {hoveredCard.defense}</span>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{hoveredCard.effect_text}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Floating Card Preview Panel - shows on field hover */}
      {hoveredCard && !showGraveyardViewer && !showBanishedViewer && !showExtraDeckViewer && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl z-50 pointer-events-none">
          <div className="w-full aspect-[421/614] relative rounded overflow-hidden mb-3">
            <Image
              src={`https://images.ygoprodeck.com/images/cards/${hoveredCard.card_id}.jpg`}
              alt={hoveredCard.card_name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <h4 className="font-bold text-base text-yellow-400 mb-1">{hoveredCard.card_name}</h4>
          <p className="text-xs text-muted-foreground capitalize mb-2">{hoveredCard.card_type?.replace(/_/g, ' ')}</p>
          {hoveredCard.card_type?.includes('monster') && (
            <div className="flex gap-3 text-sm mb-2">
              {hoveredCard.level && <span className="text-yellow-500">Level {hoveredCard.level}</span>}
              <span className="text-red-400">ATK {hoveredCard.attack}</span>
              <span className="text-blue-400">DEF {hoveredCard.defense}</span>
            </div>
          )}
          {hoveredCard.effect_text && (
            <ScrollArea className="h-32">
              <p className="text-xs text-slate-300 leading-relaxed pr-2">{hoveredCard.effect_text}</p>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  )
}
