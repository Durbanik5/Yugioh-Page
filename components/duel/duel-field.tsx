'use client'

import { useState, useMemo, useCallback } from 'react'
import { DuelCard, EmptyZone } from './duel-card'
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
  Layers, Flame, Ban, RotateCcw, Eye, Shuffle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  drawCards,
  summonMonster,
  setSpellTrap,
  activateSpellTrap,
  activateFieldSpell,
  flipCard,
  changePosition,
  sendToGraveyard,
  banishCard,
  returnToHand,
  returnToDeck,
  updateCounters,
  shuffleDeck,
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

  // Card action handlers
  const handleDraw = useCallback(async () => {
    const result = await drawCards(room.id, myPlayerId, 1)
    if (result.success) {
      toast.success('Drew a card')
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to draw')
    }
  }, [room.id, myPlayerId, onCardsChanged])

  const handleSummon = useCallback(async (card: DuelGameCard, position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense') => {
    setPendingAction({ type: 'summon', card, position })
    setSelectingZone('monster')
  }, [])

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
    setSelectedCard(null)
    onCardsChanged()
  }, [pendingAction, onCardsChanged])

  const handleSetSpellTrap = useCallback(async (card: DuelGameCard) => {
    setPendingAction({ type: 'set_spell', card })
    setSelectingZone('spell')
  }, [])

  const handleActivate = useCallback(async (card: DuelGameCard) => {
    // Check if it's a field spell
    if (card.card_type === 'spell' && card.card_name.toLowerCase().includes('field')) {
      const result = await activateFieldSpell(card.id)
      if (result.success) {
        toast.success(`Activated ${card.card_name}`)
        onCardsChanged()
      } else {
        toast.error(result.error || 'Failed to activate')
      }
    } else if (card.location === 'hand') {
      // Need to select a zone
      setPendingAction({ type: 'activate', card })
      setSelectingZone('spell')
    } else {
      // Already on field, just flip face-up
      const result = await activateSpellTrap(card.id)
      if (result.success) {
        toast.success(`Activated ${card.card_name}`)
        onCardsChanged()
      } else {
        toast.error(result.error || 'Failed to activate')
      }
    }
  }, [onCardsChanged])

  const handleFlip = useCallback(async (card: DuelGameCard) => {
    const result = await flipCard(card.id, 'face_up_attack')
    if (result.success) {
      toast.success(`Flip summoned ${card.card_name}`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to flip')
    }
  }, [onCardsChanged])

  const handleChangePosition = useCallback(async (card: DuelGameCard, position: CardPosition) => {
    const result = await changePosition(card.id, position)
    if (result.success) {
      toast.success('Changed position')
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to change position')
    }
  }, [onCardsChanged])

  const handleSendToGraveyard = useCallback(async (card: DuelGameCard) => {
    const result = await sendToGraveyard(card.id)
    if (result.success) {
      toast.success(`Sent ${card.card_name} to Graveyard`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  const handleBanish = useCallback(async (card: DuelGameCard, faceDown: boolean = false) => {
    const result = await banishCard(card.id, faceDown)
    if (result.success) {
      toast.success(`Banished ${card.card_name}`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  const handleReturnToHand = useCallback(async (card: DuelGameCard) => {
    const result = await returnToHand(card.id)
    if (result.success) {
      toast.success(`Returned ${card.card_name} to hand`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  const handleReturnToDeck = useCallback(async (card: DuelGameCard, toTop: boolean = false) => {
    const result = await returnToDeck(card.id, toTop)
    if (result.success) {
      toast.success(`Returned ${card.card_name} to deck`)
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed')
    }
  }, [onCardsChanged])

  const handleAddCounter = useCallback(async (card: DuelGameCard) => {
    const result = await updateCounters(card.id, 1)
    if (result.success) {
      onCardsChanged()
    }
  }, [onCardsChanged])

  const handleRemoveCounter = useCallback(async (card: DuelGameCard) => {
    const result = await updateCounters(card.id, -1)
    if (result.success) {
      onCardsChanged()
    }
  }, [onCardsChanged])

  const handleShuffleDeck = useCallback(async () => {
    const result = await shuffleDeck(room.id, myPlayerId)
    if (result.success) {
      toast.success('Deck shuffled')
      onCardsChanged()
    } else {
      toast.error(result.error || 'Failed to shuffle')
    }
  }, [room.id, myPlayerId, onCardsChanged])

  // Cancel zone selection
  const cancelSelection = useCallback(() => {
    setPendingAction(null)
    setSelectingZone(null)
    setSelectedCard(null)
  }, [])

  // Render a row of zones (monster or spell/trap)
  const renderZoneRow = (
    zones: (DuelGameCard | null)[],
    type: 'monster' | 'spell',
    isMyField: boolean,
    reversed: boolean = false
  ) => {
    const orderedZones = reversed ? [...zones].reverse() : zones
    const isSelecting = selectingZone === type && pendingAction && isMyField

    return (
      <div className="flex gap-1 justify-center">
        {orderedZones.map((card, displayIndex) => {
          const actualIndex = reversed ? 4 - displayIndex : displayIndex
          const isOccupied = card !== null

          if (isOccupied) {
            return (
              <DuelCard
                key={card.id}
                card={card}
                isOwner={isMyField}
                size="sm"
                onFlip={isMyField ? () => handleFlip(card) : undefined}
                onChangePosition={isMyField ? (pos) => handleChangePosition(card, pos) : undefined}
                onSendToGraveyard={isMyField ? () => handleSendToGraveyard(card) : undefined}
                onBanish={isMyField ? (fd) => handleBanish(card, fd) : undefined}
                onReturnToHand={isMyField ? () => handleReturnToHand(card) : undefined}
                onReturnToDeck={isMyField ? (top) => handleReturnToDeck(card, top) : undefined}
                onAddCounter={isMyField ? () => handleAddCounter(card) : undefined}
                onRemoveCounter={isMyField ? () => handleRemoveCounter(card) : undefined}
                onActivate={isMyField && type === 'spell' ? () => handleActivate(card) : undefined}
              />
            )
          }

          return (
            <EmptyZone
              key={`${type}-${actualIndex}`}
              type={type}
              size="sm"
              highlight={isSelecting}
              onClick={isSelecting ? () => handleZoneSelect(actualIndex) : undefined}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-gradient-to-b from-green-950/50 to-green-900/30 rounded-lg border border-green-800/30">
      {/* Zone selection overlay */}
      {selectingZone && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-card p-4 rounded-lg text-center">
            <p className="text-sm mb-2">Select a {selectingZone === 'monster' ? 'Monster' : 'Spell/Trap'} Zone</p>
            <Button variant="outline" size="sm" onClick={cancelSelection}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Opponent's field (top) */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{opponentPlayer?.nickname || 'Opponent'}</span>
          <Badge variant="outline" className="text-red-400 border-red-400/30">
            LP: {opponentLifePoints}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setGraveyardOpen('opponent')}
          >
            <Flame className="h-3 w-3 mr-1" />
            GY ({organizedCards.opponent.graveyard.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setBanishedOpen('opponent')}
          >
            <Ban className="h-3 w-3 mr-1" />
            Ban ({organizedCards.opponent.banished.length})
          </Button>
        </div>
      </div>

      {/* Opponent's hand (face-down) */}
      <div className="flex justify-center gap-0.5">
        {organizedCards.opponent.hand.map((card) => (
          <DuelCard
            key={card.id}
            card={card}
            isOwner={false}
            size="sm"
            showActions={false}
          />
        ))}
        {organizedCards.opponent.hand.length === 0 && (
          <div className="text-xs text-muted-foreground py-2">No cards in hand</div>
        )}
      </div>

      {/* Opponent's spell/trap zones */}
      {renderZoneRow(organizedCards.opponent.spellZones, 'spell', false, true)}

      {/* Opponent's monster zones */}
      {renderZoneRow(organizedCards.opponent.monsterZones, 'monster', false, true)}

      {/* Center area: Field spells, decks, graveyards */}
      <div className="flex justify-between items-center px-4 py-2">
        {/* Opponent's extra deck & field spell */}
        <div className="flex gap-1 items-center">
          {organizedCards.opponent.fieldZone ? (
            <DuelCard
              card={organizedCards.opponent.fieldZone}
              isOwner={false}
              size="sm"
              showActions={false}
            />
          ) : (
            <EmptyZone type="field" size="sm" />
          )}
          <div className="relative">
            <EmptyZone type="extra" size="sm" />
            <span className="absolute bottom-0 right-0 text-[8px] bg-purple-600 text-white px-1 rounded">
              {organizedCards.opponent.extraDeck.length}
            </span>
          </div>
        </div>

        {/* Divider with turn indicator */}
        <div className="flex-1 mx-4 border-t border-border/30 relative">
          <Badge 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -translate-y-1/2",
              isMyTurn ? "bg-primary" : "bg-muted"
            )}
          >
            {isMyTurn ? "Your Turn" : "Opponent's Turn"}
          </Badge>
        </div>

        {/* Opponent's deck & graveyard */}
        <div className="flex gap-1 items-center">
          <div 
            className="relative cursor-pointer"
            onClick={() => setGraveyardOpen('opponent')}
          >
            {organizedCards.opponent.graveyard.length > 0 ? (
              <DuelCard
                card={organizedCards.opponent.graveyard[0]}
                isOwner={false}
                size="sm"
                showActions={false}
              />
            ) : (
              <EmptyZone type="graveyard" size="sm" />
            )}
            <span className="absolute bottom-0 right-0 text-[8px] bg-orange-600 text-white px-1 rounded">
              {organizedCards.opponent.graveyard.length}
            </span>
          </div>
          <div className="relative">
            <EmptyZone type="deck" size="sm" />
            <span className="absolute bottom-0 right-0 text-[8px] bg-blue-600 text-white px-1 rounded">
              {organizedCards.opponent.deck.length}
            </span>
          </div>
        </div>
      </div>

      {/* My monster zones */}
      {renderZoneRow(organizedCards.my.monsterZones, 'monster', true)}

      {/* My spell/trap zones */}
      {renderZoneRow(organizedCards.my.spellZones, 'spell', true)}

      {/* My extra stuff row */}
      <div className="flex justify-between items-center px-4">
        {/* My deck & graveyard */}
        <div className="flex gap-1 items-center">
          <div 
            className="relative cursor-pointer hover:scale-105 transition-transform"
            onClick={handleDraw}
            title="Click to draw"
          >
            <EmptyZone type="deck" size="sm" />
            <span className="absolute bottom-0 right-0 text-[8px] bg-blue-600 text-white px-1 rounded">
              {organizedCards.my.deck.length}
            </span>
          </div>
          <div 
            className="relative cursor-pointer"
            onClick={() => setGraveyardOpen('mine')}
          >
            {organizedCards.my.graveyard.length > 0 ? (
              <DuelCard
                card={organizedCards.my.graveyard[0]}
                isOwner={true}
                size="sm"
                showActions={false}
              />
            ) : (
              <EmptyZone type="graveyard" size="sm" />
            )}
            <span className="absolute bottom-0 right-0 text-[8px] bg-orange-600 text-white px-1 rounded">
              {organizedCards.my.graveyard.length}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={handleDraw}
          >
            Draw
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={handleShuffleDeck}
          >
            <Shuffle className="h-3 w-3" />
          </Button>
        </div>

        {/* My field spell & extra deck */}
        <div className="flex gap-1 items-center">
          <div 
            className="relative cursor-pointer"
            onClick={() => setExtraDeckOpen(true)}
          >
            <EmptyZone type="extra" size="sm" />
            <span className="absolute bottom-0 right-0 text-[8px] bg-purple-600 text-white px-1 rounded">
              {organizedCards.my.extraDeck.length}
            </span>
          </div>
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
        </div>
      </div>

      {/* My info bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{myPlayer.nickname}</span>
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            LP: {myLifePoints}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setGraveyardOpen('mine')}
          >
            <Flame className="h-3 w-3 mr-1" />
            GY ({organizedCards.my.graveyard.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setBanishedOpen('mine')}
          >
            <Ban className="h-3 w-3 mr-1" />
            Ban ({organizedCards.my.banished.length})
          </Button>
        </div>
      </div>

      {/* My hand */}
      <div className="flex justify-center gap-1 pt-2 border-t border-border/30">
        {organizedCards.my.hand.map((card) => (
          <DuelCard
            key={card.id}
            card={card}
            isOwner={true}
            size="md"
            selected={selectedCard?.id === card.id}
            onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
            onSummon={(pos) => handleSummon(card, pos)}
            onSetSpellTrap={() => handleSetSpellTrap(card)}
            onActivate={() => handleActivate(card)}
            onSendToGraveyard={() => handleSendToGraveyard(card)}
            onBanish={(fd) => handleBanish(card, fd)}
          />
        ))}
        {organizedCards.my.hand.length === 0 && (
          <div className="text-xs text-muted-foreground py-4">No cards in hand - click your deck to draw</div>
        )}
      </div>

      {/* Graveyard viewer dialog */}
      <Dialog open={graveyardOpen !== null} onOpenChange={() => setGraveyardOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              {graveyardOpen === 'mine' ? 'Your' : "Opponent's"} Graveyard
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {(graveyardOpen === 'mine' ? organizedCards.my.graveyard : organizedCards.opponent.graveyard).map((card) => (
                <DuelCard
                  key={card.id}
                  card={card}
                  isOwner={graveyardOpen === 'mine'}
                  size="md"
                  onReturnToHand={graveyardOpen === 'mine' ? () => handleReturnToHand(card) : undefined}
                  onBanish={graveyardOpen === 'mine' ? (fd) => handleBanish(card, fd) : undefined}
                  onReturnToDeck={graveyardOpen === 'mine' ? (top) => handleReturnToDeck(card, top) : undefined}
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

      {/* Banished viewer dialog */}
      <Dialog open={banishedOpen !== null} onOpenChange={() => setBanishedOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-purple-500" />
              {banishedOpen === 'mine' ? 'Your' : "Opponent's"} Banished Cards
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {(banishedOpen === 'mine' ? organizedCards.my.banished : organizedCards.opponent.banished).map((card) => (
                <DuelCard
                  key={card.id}
                  card={card}
                  isOwner={banishedOpen === 'mine'}
                  size="md"
                  onReturnToHand={banishedOpen === 'mine' ? () => handleReturnToHand(card) : undefined}
                  onReturnToDeck={banishedOpen === 'mine' ? (top) => handleReturnToDeck(card, top) : undefined}
                />
              ))}
              {(banishedOpen === 'mine' ? organizedCards.my.banished : organizedCards.opponent.banished).length === 0 && (
                <div className="col-span-4 text-center text-muted-foreground py-8">
                  No banished cards
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Extra deck viewer dialog */}
      <Dialog open={extraDeckOpen} onOpenChange={setExtraDeckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Extra Deck
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-4 gap-2 p-2">
              {organizedCards.my.extraDeck.map((card) => (
                <DuelCard
                  key={card.id}
                  card={card}
                  isOwner={true}
                  size="md"
                  onClick={() => {
                    setSelectedCard(card)
                    // Could prompt for special summon zone selection here
                  }}
                />
              ))}
              {organizedCards.my.extraDeck.length === 0 && (
                <div className="col-span-4 text-center text-muted-foreground py-8">
                  Extra deck is empty
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
