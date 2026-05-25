'use client'

import { useState, useMemo, useCallback } from 'react'
import { DuelCard, EmptyZone } from './duel-card'
import { CardInfoPanel } from './card-info-panel'
import { ChainPrompt } from './chain-prompt'
import { PhaseBar } from './phase-bar'
import { TributeSelectionModal } from './tribute-selection-modal'
import { EffectActivationModal } from './effect-activation-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { 
  Layers, Flame, Ban, RotateCcw, Eye, Sparkles, Heart, Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { useDuelEngine } from '@/hooks/use-duel-engine'
import {
  flipCard,
  changePosition,
  sendToGraveyard,
  banishCard,
  returnToDeck,
  updateCounters,
  activateFieldSpell,
} from '@/lib/duel-actions'
import type { DuelGameCard, CardPosition, Player, DuelRoom } from '@/lib/types'

interface DuelFieldProps {
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

export function DuelField({
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
}: DuelFieldProps) {
  // Use the duel engine for rule enforcement
  const {
    gameState,
    isLoading: engineLoading,
    isMyTurn: engineIsMyTurn,
    hasNormalSummoned,
    pendingTributeAction,
    selectedTributes,
    selectTribute,
    confirmTributeSummon,
    cancelTributeSummon,
    validateNormalSummon,
    executeNormalSummon,
    validateSpellTrapActivation,
    executeSpellTrapActivation,
    setSpellTrap: engineSetSpellTrap,
    changePhase,
    // New battle actions
    myFieldMonsters,
    opponentFieldMonsters,
    validateAttack,
    executeAttack,
    enterBattlePhase,
    enterMain2,
    flipSummon: engineFlipSummon,
    changeMonsterPosition,
  } = useDuelEngine({ room, myPlayerId, allCards, onCardsChanged })

  const [selectedCard, setSelectedCard] = useState<DuelGameCard | null>(null)
  const [selectingZone, setSelectingZone] = useState<'monster' | 'spell' | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    type: 'summon' | 'set_spell' | 'activate'
    card: DuelGameCard
    position?: 'face_up_attack' | 'face_up_defense' | 'face_down_defense'
  } | null>(null)
  const [graveyardOpen, setGraveyardOpen] = useState<'mine' | 'opponent' | null>(null)
  const [banishedOpen, setBanishedOpen] = useState<'mine' | 'opponent' | null>(null)
  const [extraDeckOpen, setExtraDeckOpen] = useState(false)
  
  // New state for card info and chain system
  const [hoveredCard, setHoveredCard] = useState<DuelGameCard | null>(null)
  const [chainPrompt, setChainPrompt] = useState<{
    activatingCard: DuelGameCard
    activatingPlayerId: string
  } | null>(null)
  const [activatingCard, setActivatingCard] = useState<DuelGameCard | null>(null)
  
  // Attack state
  const [attackingCard, setAttackingCard] = useState<DuelGameCard | null>(null)
  const [isSelectingAttackTarget, setIsSelectingAttackTarget] = useState(false)

  // Organize cards by location and player
  const organizedCards = useMemo(() => {
    const myCards = allCards.filter(c => c.player_id === myPlayerId)
    const opponentCards = allCards.filter(c => c.player_id === opponentPlayerId)

    return {
      my: {
        deck: myCards.filter(c => c.location === 'deck'),
        hand: myCards.filter(c => c.location === 'hand'),
        monsterZones: Array(5).fill(null).map((_, i) => 
          myCards.find(c => c.location === 'monster_zone' && c.zone_index === i) || null
        ),
        spellZones: Array(5).fill(null).map((_, i) => 
          myCards.find(c => c.location === 'spell_zone' && c.zone_index === i) || null
        ),
        fieldZone: myCards.find(c => c.location === 'field_zone') || null,
        graveyard: myCards.filter(c => c.location === 'graveyard').sort((a, b) => b.order_index - a.order_index),
        banished: myCards.filter(c => c.location === 'banished').sort((a, b) => b.order_index - a.order_index),
        extraDeck: myCards.filter(c => c.location === 'extra_deck'),
      },
      opponent: {
        deck: opponentCards.filter(c => c.location === 'deck'),
        hand: opponentCards.filter(c => c.location === 'hand'),
        monsterZones: Array(5).fill(null).map((_, i) => 
          opponentCards.find(c => c.location === 'monster_zone' && c.zone_index === i) || null
        ),
        spellZones: Array(5).fill(null).map((_, i) => 
          opponentCards.find(c => c.location === 'spell_zone' && c.zone_index === i) || null
        ),
        fieldZone: opponentCards.find(c => c.location === 'field_zone') || null,
        graveyard: opponentCards.filter(c => c.location === 'graveyard').sort((a, b) => b.order_index - a.order_index),
        banished: opponentCards.filter(c => c.location === 'banished').sort((a, b) => b.order_index - a.order_index),
        extraDeck: opponentCards.filter(c => c.location === 'extra_deck'),
      },
    }
  }, [allCards, myPlayerId, opponentPlayerId])

  // Card action handlers - using the duel engine for rule enforcement
  const handleSummon = useCallback(async (card: DuelGameCard, position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense') => {
    // Validate the summon first
    const validation = validateNormalSummon(card)
    
    if (!validation.valid) {
      toast.error(validation.reason)
      return
    }
    
    // Execute the summon (engine handles tribute requirements)
    await executeNormalSummon(card, position)
  }, [validateNormalSummon, executeNormalSummon])

  const handleZoneSelect = useCallback(async (zoneIndex: number) => {
    if (!pendingAction) return

    let result
    if (pendingAction.type === 'summon' && pendingAction.position) {
      result = await summonMonster(pendingAction.card.id, zoneIndex, pendingAction.position)
      if (result.success) {
        toast.success(`Summoned ${pendingAction.card.card_name}`)
      }
    } else if (pendingAction.type === 'set_spell') {
      result = await setSpellTrap(pendingAction.card.id, zoneIndex)
      if (result.success) {
        toast.success('Set a card')
      }
    } else if (pendingAction.type === 'activate') {
      result = await activateSpellTrap(pendingAction.card.id, zoneIndex)
      if (result.success) {
        toast.success(`Activated ${pendingAction.card.card_name}`)
      }
    }

    if (result && !result.success) {
      toast.error(result.error || 'Action failed')
    }

    setPendingAction(null)
    setSelectingZone(null)
    onCardsChanged()
  }, [pendingAction, onCardsChanged])

  const handleSetSpell = useCallback(async (card: DuelGameCard) => {
    await engineSetSpellTrap(card)
  }, [engineSetSpellTrap])

  const handleActivate = useCallback(async (card: DuelGameCard) => {
    // Validate first
    const validation = validateSpellTrapActivation(card)
    if (!validation.valid) {
      toast.error(validation.reason)
      return
    }
    
    // Show the effect activation modal
    setActivatingCard(card)
  }, [validateSpellTrapActivation])

  const handleEffectResolve = useCallback(async () => {
    if (!activatingCard) return
    
    await executeSpellTrapActivation(activatingCard)
    setActivatingCard(null)
  }, [activatingCard, executeSpellTrapActivation])

  const handleActivateField = useCallback(async (card: DuelGameCard) => {
    const result = await activateFieldSpell(card.id)
    if (result.success) {
      toast.success(`Activated ${card.card_name}`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to activate')
    }
  }, [onCardsChanged])

  const handleFlip = useCallback(async (card: DuelGameCard) => {
    const result = await flipCard(card.id)
    if (result.success) {
      toast.success(`Flipped ${card.card_name}`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to flip')
    }
  }, [onCardsChanged])

  const handleChangePosition = useCallback(async (card: DuelGameCard, newPosition: CardPosition) => {
    // Rule: Cannot change position of a monster that was summoned/set this turn
    if (card.turn_summoned && card.turn_summoned === gameState?.turnCount) {
      toast.error('Cannot change position of a monster summoned this turn')
      return
    }
    
    // Rule: Cannot change position of a monster that already changed position this turn
    if (card.has_changed_position) {
      toast.error('This monster already changed position this turn')
      return
    }
    
    const result = await changePosition(card.id, newPosition)
    if (result.success) {
      toast.success('Changed position')
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to change position')
    }
  }, [onCardsChanged, gameState?.turnCount])

  const handleSendToGraveyard = useCallback(async (card: DuelGameCard) => {
    const result = await sendToGraveyard(card.id)
    if (result.success) {
      toast.success(`Sent ${card.card_name} to graveyard`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  const handleBanish = useCallback(async (card: DuelGameCard) => {
    const result = await banishCard(card.id)
    if (result.success) {
      toast.success(`Banished ${card.card_name}`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  // Handle special summon from various locations
  const handleSpecialSummon = useCallback(async (card: DuelGameCard, position: CardPosition) => {
    // Find an empty monster zone
    const myMonsters = allCards.filter(c => c.player_id === myPlayerId && c.location === 'monster_zone')
    const occupiedZones = myMonsters.map(c => c.zone_index)
    let emptyZone = -1
    for (let i = 0; i < 5; i++) {
      if (!occupiedZones.includes(i)) {
        emptyZone = i
        break
      }
    }
    
    if (emptyZone === -1) {
      toast.error('No empty monster zones')
      return
    }

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { error } = await supabase
      .from('duel_game_cards')
      .update({ 
        location: 'monster_zone',
        zone_index: emptyZone,
        position 
      })
      .eq('id', card.id)
    
    if (error) {
      toast.error('Failed to special summon')
    } else {
      toast.success(`Special Summoned ${card.card_name}!`)
      onCardsChanged()
    }
  }, [allCards, myPlayerId, onCardsChanged])

  // Handle chain response
  const handleChainResponse = useCallback((response: 'chain' | 'pass') => {
    if (response === 'chain') {
      toast.info('Chain building not yet implemented - resolve effects manually')
    }
    setChainPrompt(null)
  }, [])

  // Handle attack initiation
  const handleAttack = useCallback((attacker: DuelGameCard) => {
    // Validate attack first
    const validation = validateAttack(attacker)
    if (!validation.valid) {
      toast.error(validation.reason)
      return
    }
    
    // If opponent has no monsters, do direct attack
    if (opponentFieldMonsters.length === 0) {
      executeAttack(attacker)
      return
    }
    
    // Otherwise, select attack target
    setAttackingCard(attacker)
    setIsSelectingAttackTarget(true)
    toast.info('Select a monster to attack')
  }, [validateAttack, executeAttack, opponentFieldMonsters])

  // Handle attack target selection
  const handleSelectAttackTarget = useCallback((target: DuelGameCard) => {
    if (!attackingCard) return
    
    executeAttack(attackingCard, target)
    setAttackingCard(null)
    setIsSelectingAttackTarget(false)
  }, [attackingCard, executeAttack])

  // Cancel attack
  const cancelAttack = useCallback(() => {
    setAttackingCard(null)
    setIsSelectingAttackTarget(false)
  }, [])

  // Card zone dimensions
  const cardWidth = 'w-16'
  const cardHeight = 'h-24'

  // Render a single zone
  const renderZone = (
    card: DuelGameCard | null, 
    type: 'monster' | 'spell', 
    index: number, 
    isOwner: boolean,
    isSelecting: boolean = false
  ) => {
    const zoneColors = {
      monster: 'bg-amber-900/20 border-amber-600/40 hover:border-amber-500/60',
      spell: 'bg-teal-900/20 border-teal-600/40 hover:border-teal-500/60',
    }

    if (isSelecting && !card) {
      return (
        <button
          key={`${type}-${index}`}
          onClick={() => handleZoneSelect(index)}
          className={cn(
            cardWidth, cardHeight,
            'rounded-md border-2 border-dashed transition-all',
            'bg-green-500/30 border-green-400 animate-pulse cursor-pointer hover:bg-green-500/50'
          )}
        >
          <span className="text-xs text-green-300">Select</span>
        </button>
      )
    }

    if (card) {
      // Check if this card is a valid attack target
      const isAttackTarget = isSelectingAttackTarget && !isOwner && type === 'monster'
      // Check if this card can attack (is my monster in attack position during battle phase)
      const canAttack = isOwner && type === 'monster' && 
        gameState?.phase === 'battle' && 
        card.position === 'face_up_attack' && 
        !card.has_attacked
      
      return (
        <DuelCard
          key={card.id}
          card={card}
          isOwner={isOwner}
          size="md"
          isAttackTarget={isAttackTarget}
          canAttack={canAttack}
          onClick={isAttackTarget ? () => handleSelectAttackTarget(card) : undefined}
          onSummon={(position) => handleSummon(card, position)}
          onSetSpellTrap={() => handleSetSpell(card)}
          onActivate={() => handleActivate(card)}
          onActivateField={() => handleActivateField(card)}
          onFlip={() => handleFlip(card)}
          onChangePosition={(pos) => handleChangePosition(card, pos)}
          onAttack={canAttack ? () => handleAttack(card) : undefined}
        />
      )
    }

    return (
      <div
        key={`empty-${type}-${index}`}
        className={cn(
          cardWidth, cardHeight,
          'rounded-md border transition-all',
          zoneColors[type],
          'flex items-center justify-center'
        )}
      >
        <span className="text-[8px] text-muted-foreground/50 uppercase">{type[0]}{index + 1}</span>
      </div>
    )
  }

  // Render Extra Monster Zone (shared between players)
  const renderExtraMonsterZone = (position: 'left' | 'right') => {
    // In MR5, Extra Monster Zones are shared - for simplicity, we'll show them as empty
    return (
      <div
        className={cn(
          cardWidth, cardHeight,
          'rounded-md border border-dashed transition-all',
          'bg-violet-900/20 border-violet-500/40',
          'flex items-center justify-center'
        )}
      >
        <Sparkles className="h-4 w-4 text-violet-400/50" />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Field Mat - seamless DSOD background */}
      <div 
        className="flex-1 relative overflow-hidden max-h-[65vh]"
        style={{
          background: 'transparent',
        }}
      >
        {/* Subtle field pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 0%, rgba(0, 200, 255, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 50% 100%, rgba(255, 150, 0, 0.2) 0%, transparent 50%)
            `,
          }}
        />

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col p-2 overflow-y-auto">
          
          {/* Opponent Side */}
          <div className="flex-shrink-0 flex flex-col justify-start gap-0.5">
            
            {/* Opponent Info Bar */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-red-300">{opponentPlayer?.nickname || 'Opponent'}</span>
                <div className="flex items-center gap-1 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50">
                  <Heart className="h-3 w-3 text-red-500" />
                  <span className="text-sm font-bold text-red-400">{opponentLifePoints}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setGraveyardOpen('opponent')}>
                  <Flame className="h-3 w-3 mr-0.5 text-orange-400" />{organizedCards.opponent.graveyard.length}
                </Button>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setBanishedOpen('opponent')}>
                  <Ban className="h-3 w-3 mr-0.5 text-purple-400" />{organizedCards.opponent.banished.length}
                </Button>
              </div>
            </div>

            {/* Opponent Hand (face-down cards shown at top) */}
            <div 
              className="flex justify-center gap-0.5 py-1 px-2 rounded-lg mx-2 mb-0.5"
              style={{
                background: 'linear-gradient(to bottom, rgba(200, 100, 0, 0.15), transparent)',
              }}
            >
              {organizedCards.opponent.hand.length > 0 ? (
                <>
                  <span className="absolute left-4 top-0.5 text-[10px] text-amber-500/70 font-semibold">Opponent's Hand ({organizedCards.opponent.hand.length})</span>
                  <div className="flex justify-center gap-1 w-full pt-3">
                    {organizedCards.opponent.hand.map((card, idx) => (
                      <div key={card.id} className="relative">
                        <DuelCard card={card} isOwner={false} size="sm" showActions={false} />
                        <span className="absolute -top-1 -right-1 text-[8px] bg-amber-700 text-white px-1 rounded">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground/50 py-2 w-full text-center">Opponent's hand is empty</div>
              )}
            </div>

            {/* Opponent Field Layout */}
            <div className="flex justify-center items-center gap-2">
              {/* Opponent Extra Deck & Field Spell (left side) */}
              <div className="flex flex-col gap-1">
                <div className="relative cursor-pointer">
                  <EmptyZone type="extra" size="sm" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-violet-600 text-white px-1 rounded">
                    {organizedCards.opponent.extraDeck.length}
                  </span>
                </div>
                {organizedCards.opponent.fieldZone ? (
                  <DuelCard card={organizedCards.opponent.fieldZone} isOwner={false} size="sm" showActions={false} />
                ) : (
                  <EmptyZone type="field" size="sm" />
                )}
              </div>

              {/* Opponent Main Zones */}
              <div className="flex flex-col gap-1">
                {/* Spell/Trap Row */}
                <div className="flex gap-1 justify-center">
                  {organizedCards.opponent.spellZones.map((card, i) => renderZone(card, 'spell', i, false))}
                </div>
                {/* Monster Row */}
                <div className="flex gap-1 justify-center">
                  {organizedCards.opponent.monsterZones.map((card, i) => renderZone(card, 'monster', i, false))}
                </div>
              </div>

              {/* Opponent Deck & Graveyard (right side) */}
              <div className="flex flex-col gap-1">
                <div className="relative cursor-pointer" onClick={() => setBanishedOpen('opponent')}>
                  {organizedCards.opponent.banished.length > 0 ? (
                    <DuelCard card={organizedCards.opponent.banished[0]} isOwner={false} size="sm" showActions={false} />
                  ) : (
                    <EmptyZone type="banished" size="sm" />
                  )}
                  {organizedCards.opponent.banished.length > 0 && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] bg-purple-600 text-white px-1 rounded">
                      {organizedCards.opponent.banished.length}
                    </span>
                  )}
                </div>
                <div className="relative cursor-pointer" onClick={() => setGraveyardOpen('opponent')}>
                  {organizedCards.opponent.graveyard.length > 0 ? (
                    <DuelCard card={organizedCards.opponent.graveyard[0]} isOwner={false} size="sm" showActions={false} />
                  ) : (
                    <EmptyZone type="graveyard" size="sm" />
                  )}
                  {organizedCards.opponent.graveyard.length > 0 && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] bg-orange-600 text-white px-1 rounded">
                      {organizedCards.opponent.graveyard.length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <EmptyZone type="deck" size="sm" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-blue-600 text-white px-1 rounded">
                    {organizedCards.opponent.deck.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Divider with Extra Monster Zones */}
          <div className="flex items-center justify-center py-1 relative">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex gap-[200px] relative z-10">
              {renderExtraMonsterZone('left')}
              {renderExtraMonsterZone('right')}
            </div>
            <Badge 
              className={cn(
                "absolute left-4 px-3 py-1",
                engineIsMyTurn
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              )}
            >
              {engineIsMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
            </Badge>
            
            {/* Phase Bar */}
            {gameState && (
              <div className="absolute left-1/2 -translate-x-1/2">
                <PhaseBar
                  currentPhase={gameState.phase}
                  isMyTurn={engineIsMyTurn}
                  turnCount={gameState.turnCount}
                  onPhaseChange={changePhase}
                  battlePhaseEnabled={gameState.battlePhaseEnabled}
                />
              </div>
            )}
            
            {/* Attack Controls - shown when selecting attack target */}
            {isSelectingAttackTarget && attackingCard && (
              <div className="absolute right-4 flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">
                  {attackingCard.card_name} is attacking
                </Badge>
                {opponentFieldMonsters.length === 0 && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      executeAttack(attackingCard)
                      setAttackingCard(null)
                      setIsSelectingAttackTarget(false)
                    }}
                  >
                    Direct Attack!
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={cancelAttack}>
                  Cancel
                </Button>
              </div>
            )}
            
            {/* Battle Phase Controls */}
            {engineIsMyTurn && gameState?.phase === 'main1' && gameState.turnCount > 1 && (
              <Button 
                size="sm" 
                variant="outline"
                className="absolute right-4"
                onClick={enterBattlePhase}
              >
                Enter Battle Phase
              </Button>
            )}
            {engineIsMyTurn && gameState?.phase === 'battle' && !isSelectingAttackTarget && (
              <Button 
                size="sm" 
                variant="outline"
                className="absolute right-4"
                onClick={enterMain2}
              >
                End Battle Phase
              </Button>
            )}
          </div>

          {/* My Side */}
          <div className="flex-shrink-0 flex flex-col justify-end gap-0.5">
            
            {/* My Field Layout */}
            <div className="flex justify-center items-center gap-2">
              {/* My Deck & Graveyard (left side for me) */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <EmptyZone type="deck" size="sm" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-blue-600 text-white px-1 rounded">
                    {organizedCards.my.deck.length}
                  </span>
                </div>
              </div>

              {/* My Main Zones */}
              <div className="flex flex-col gap-1">
                {/* Monster Row */}
                <div className="flex gap-1 justify-center">
                  {organizedCards.my.monsterZones.map((card, i) => 
                    renderZone(card, 'monster', i, true, selectingZone === 'monster')
                  )}
                </div>
                {/* Spell/Trap Row */}
                <div className="flex gap-1 justify-center">
                  {organizedCards.my.spellZones.map((card, i) => 
                    renderZone(card, 'spell', i, true, selectingZone === 'spell')
                  )}
                </div>
              </div>

              {/* My Field Spell & Extra Deck (right side for me) */}
              <div className="flex flex-col gap-1">
                {organizedCards.my.fieldZone ? (
                  <DuelCard 
                    card={organizedCards.my.fieldZone} 
                    isOwner={true} 
                    size="sm"
                    onSendToGraveyard={() => handleSendToGraveyard(organizedCards.my.fieldZone!)}
                  />
                ) : (
                  <EmptyZone type="field" size="sm" />
                )}
                <div className="relative cursor-pointer" onClick={() => setExtraDeckOpen(true)}>
                  <EmptyZone type="extra" size="sm" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-violet-600 text-white px-1 rounded">
                    {organizedCards.my.extraDeck.length}
                  </span>
                </div>
              </div>
            </div>

            {/* My Info Bar */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-cyan-300">{myPlayer.nickname}</span>
                <div className="flex items-center gap-1 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50">
                  <Heart className="h-3 w-3 text-cyan-500" />
                  <span className="text-sm font-bold text-cyan-400">{myLifePoints}</span>
          </div>
          </div>
          </div>

            {/* My Hand */}
            <div 
              className="flex justify-center gap-0.5 py-1 px-2 rounded-lg mx-2 relative"
              style={{
                background: 'linear-gradient(to top, rgba(0, 100, 200, 0.2), transparent)',
              }}
            >
              <span className="absolute left-4 bottom-full mb-1 text-[10px] text-cyan-400/80 font-semibold">Your Hand ({organizedCards.my.hand.length})</span>
              {organizedCards.my.hand.length > 0 ? (
                <div className="flex justify-center gap-1 flex-wrap">
                  {organizedCards.my.hand.map((card, idx) => (
                    <div key={card.id} className="relative">
                      <DuelCard
                        card={card}
                        isOwner={true}
                        size="md"
                        className="hover:-translate-y-3 hover:z-20 transition-transform"
                        onSummon={(position) => handleSummon(card, position)}
                        onSetSpellTrap={() => handleSetSpell(card)}
                        onActivate={() => handleActivate(card)}
                        onActivateField={() => handleActivateField(card)}
                      />
                      <span className="absolute -top-1 -right-1 text-[8px] bg-blue-700 text-white px-1 rounded">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/50 py-4 w-full text-center">Your hand is empty - draw cards to begin</div>
              )}
            </div>
          </div>
        </div>

        {/* Zone selection overlay instruction */}
        {selectingZone && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-600/90 text-white px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg">
            Select a {selectingZone} zone to place your card
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-white hover:text-white hover:bg-green-700"
              onClick={() => {
                setPendingAction(null)
                setSelectingZone(null)
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Graveyard Dialog */}
      <Dialog open={graveyardOpen !== null} onOpenChange={() => setGraveyardOpen(null)}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-orange-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Flame className="h-5 w-5" />
              {graveyardOpen === 'mine' ? 'Your' : "Opponent's"} Graveyard
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {(graveyardOpen === 'mine' ? organizedCards.my.graveyard : organizedCards.opponent.graveyard).map((card) => (
                <DuelCard
                  key={card.id}
                  card={{ ...card, position: 'face_up_attack' as CardPosition }}
                  isOwner={graveyardOpen === 'mine'}
                  size="md"
                  showActions={graveyardOpen === 'mine'}
                  onBanish={graveyardOpen === 'mine' ? () => handleBanish(card) : undefined}
                />
              ))}
              {(graveyardOpen === 'mine' ? organizedCards.my.graveyard : organizedCards.opponent.graveyard).length === 0 && (
                <div className="col-span-4 text-center text-muted-foreground py-8">
                  Graveyard is empty
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Banished Dialog */}
      <Dialog open={banishedOpen !== null} onOpenChange={() => setBanishedOpen(null)}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-purple-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <Ban className="h-5 w-5" />
              {banishedOpen === 'mine' ? 'Your' : "Opponent's"} Banished Zone
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {(banishedOpen === 'mine' ? organizedCards.my.banished : organizedCards.opponent.banished).map((card) => (
                <DuelCard
                  key={card.id}
                  card={{ ...card, position: 'face_up_attack' as CardPosition }}
                  isOwner={banishedOpen === 'mine'}
                  size="md"
                  showActions={banishedOpen === 'mine'}
                />
              ))}
              {(banishedOpen === 'mine' ? organizedCards.my.banished : organizedCards.opponent.banished).length === 0 && (
                <div className="col-span-4 text-center text-muted-foreground py-8">
                  Banished zone is empty
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Extra Deck Dialog */}
      <Dialog open={extraDeckOpen} onOpenChange={setExtraDeckOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-violet-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-400">
              <Layers className="h-5 w-5" />
              Your Extra Deck
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {organizedCards.my.extraDeck.map((card) => (
                <DuelCard
                  key={card.id}
                  card={{ ...card, position: 'face_up_attack' as CardPosition }}
                  isOwner={true}
                  size="md"
                  onSummon={handleSummon}
                />
              ))}
              {organizedCards.my.extraDeck.length === 0 && (
                <div className="col-span-4 text-center text-muted-foreground py-8">
                  Extra Deck is empty
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Chain Prompt - shows when opponent activates something */}
      {chainPrompt && (
        <ChainPrompt
          activatingCard={chainPrompt.activatingCard}
          activatingPlayerName={chainPrompt.activatingPlayerId === myPlayerId ? myPlayer.username : (opponentPlayer?.username || 'Opponent')}
          timeRemaining={30}
          onResponse={handleChainResponse}
          availableCards={[
            ...organizedCards.my.hand.filter(c => c.card_type === 'trap' || c.card_type === 'spell'),
            ...organizedCards.my.spellZones.filter((c): c is DuelGameCard => c !== null && c.position === 'face_down'),
          ]}
        />
      )}

      {/* Card Info Panel - shows when hovering over cards */}
      {hoveredCard && (
        <CardInfoPanel card={hoveredCard} />
      )}

      {/* Tribute Selection Modal */}
      {pendingTributeAction && (
        <TributeSelectionModal
          isOpen={true}
          onClose={cancelTributeSummon}
          cardToSummon={pendingTributeAction.card}
          requiredTributes={pendingTributeAction.requiredTributes}
          availableMonsters={organizedCards.my.monsterZones.filter((c): c is DuelGameCard => c !== null)}
          selectedTributes={selectedTributes}
          onSelectTribute={selectTribute}
          onConfirm={confirmTributeSummon}
        />
      )}

      {/* Effect Activation Modal */}
      <EffectActivationModal
        isOpen={!!activatingCard}
        onClose={() => setActivatingCard(null)}
        card={activatingCard}
        onResolve={handleEffectResolve}
      />
    </div>
  )
}
