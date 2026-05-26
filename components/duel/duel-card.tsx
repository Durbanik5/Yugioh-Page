'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Sword, Shield, Flame, RotateCcw,
  Eye, EyeOff, Plus, Minus, ChevronRight, Crosshair
} from 'lucide-react'
import type { DuelGameCard, CardPosition } from '@/lib/types'

interface DuelCardProps {
  card: DuelGameCard
  isOwner: boolean
  isHidden?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  onSummon?: (position: 'face_up_attack' | 'face_up_defense' | 'face_down_defense') => void
  onSetSpellTrap?: () => void
  onActivate?: () => void
  onFlip?: () => void
  onChangePosition?: (position: CardPosition) => void
  onAttack?: () => void  // New attack action
  onSendToGraveyard?: () => void
  onBanish?: (faceDown?: boolean) => void
  onAddCounter?: () => void
  onRemoveCounter?: () => void
  onHover?: (card: DuelGameCard | null) => void
  disabled?: boolean
  selected?: boolean
  isAttackTarget?: boolean  // Highlight as valid attack target
  canAttack?: boolean  // Whether this monster can currently attack
  showActions?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-[70px]',
  md: 'w-16 h-[94px]',
  lg: 'w-20 h-[117px]',
}

export function DuelCard({
  card,
  isOwner,
  isHidden = false,
  size = 'md',
  onClick,
  onSummon,
  onSetSpellTrap,
  onActivate,
  onFlip,
  onChangePosition,
  onAttack,
  onSendToGraveyard,
  onBanish,
  onAddCounter,
  onRemoveCounter,
  onHover,
  disabled = false,
  selected = false,
  isAttackTarget = false,
  canAttack = false,
  showActions = true,
  className,
}: DuelCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showSummonOptions, setShowSummonOptions] = useState(false)
  const [showPositionOptions, setShowPositionOptions] = useState(false)

  const showCardBack = isHidden || 
    (!isOwner && card.location === 'hand') ||
    (card.position === 'face_down' && !isOwner) ||
    (card.position === 'face_down_defense' && !isOwner && !card.is_revealed)

  const isDefensePosition = card.position === 'face_up_defense' || card.position === 'face_down_defense'
  const isFaceDown = card.position === 'face_down' || card.position === 'face_down_defense'

  const imageUrl = showCardBack || imageError
    ? '/images/card-back.jpg'
    : card.card_id
      ? `https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`
      : '/images/card-back.jpg'

  // Check card types
  const isMonster = ['monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum', 'normal_monster', 'effect_monster'].includes(card.card_type)
  const isMainDeckMonster = card.card_type === 'monster' || card.card_type === 'normal_monster' || card.card_type === 'effect_monster'
  const isSpellTrap = ['spell', 'trap'].includes(card.card_type)

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
    setShowSummonOptions(false)
    setShowPositionOptions(false)
  }

  const cardContent = (
    <div
      className={cn(
        'relative rounded-sm overflow-hidden transition-all duration-200 cursor-pointer',
        sizeClasses[size],
        isDefensePosition && card.location === 'monster_zone' && 'rotate-90',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        isAttackTarget && 'ring-2 ring-red-500 ring-offset-2 ring-offset-background animate-pulse',
        canAttack && 'ring-2 ring-green-500/50',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:scale-105 hover:z-10',
        className
      )}
      onMouseEnter={() => onHover?.(card)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Image
        src={imageUrl}
        alt={showCardBack ? 'Card back' : card.card_name}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        unoptimized
      />
      
      {/* Card counters */}
      {card.counters > 0 && (
        <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] font-bold px-1 rounded-full min-w-4 text-center">
          {card.counters}
        </div>
      )}

      {/* Attack/Defense overlay for face-up monsters */}
      {!showCardBack && isMonster && card.location === 'monster_zone' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white px-0.5 flex justify-between">
          <span>{card.attack}</span>
          <span>{card.defense}</span>
        </div>
      )}

      {/* Face-down indicator */}
      {isFaceDown && isOwner && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <EyeOff className="h-4 w-4 text-white/70" />
        </div>
      )}
    </div>
  )

  // If no actions or not owner, just return the card with onClick
  if (!showActions || !isOwner) {
    return (
      <div onClick={disabled ? undefined : onClick}>
        {cardContent}
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        setShowSummonOptions(false)
        setShowPositionOptions(false)
      }
    }}>
      <PopoverTrigger asChild disabled={disabled}>
        {cardContent}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground truncate border-b mb-1">
          {card.card_name}
        </div>

        {/* Hand actions - following official Yu-Gi-Oh! rules */}
        {card.location === 'hand' && (
          <div className="space-y-0.5">
            {/* Normal Summon for main deck monsters */}
            {isMainDeckMonster && onSummon && !showSummonOptions && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-xs"
                onClick={() => setShowSummonOptions(true)}
              >
                <span className="flex items-center">
                  <Sword className="mr-2 h-3.5 w-3.5" />
                  Normal Summon
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {isMainDeckMonster && onSummon && showSummonOptions && (
              <div className="pl-2 space-y-0.5 border-l-2 border-primary/50 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => handleAction(() => onSummon('face_up_attack'))}
                >
                  <Sword className="mr-2 h-3.5 w-3.5" />
                  Attack Position
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => handleAction(() => onSummon('face_up_defense'))}
                >
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  Defense Position
                </Button>
              </div>
            )}
            {/* Set monster (face-down defense) */}
            {isMainDeckMonster && onSummon && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => handleAction(() => onSummon('face_down_defense'))}
              >
                <EyeOff className="mr-2 h-3.5 w-3.5" />
                Set Monster
              </Button>
            )}
            {/* Spell/Trap - can only Set from hand (Normal Spells are played, not "activated") */}
            {isSpellTrap && onSetSpellTrap && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => handleAction(onSetSpellTrap)}
              >
                <EyeOff className="mr-2 h-3.5 w-3.5" />
                Set
              </Button>
            )}
            {/* Only Normal/Quick-Play Spells can be played from hand */}
            {card.card_type === 'spell' && onActivate && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => handleAction(onActivate)}
              >
                <Flame className="mr-2 h-3.5 w-3.5" />
                Play Spell
              </Button>
            )}
          </div>
        )}

        {/* Field actions for monsters */}
        {card.location === 'monster_zone' && (
          <div className="space-y-0.5">
            {/* Attack action - only for face-up attack position monsters that can attack */}
            {!isFaceDown && card.position === 'face_up_attack' && onAttack && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => handleAction(onAttack)}
                disabled={card.has_attacked}
              >
                <Crosshair className="mr-2 h-3.5 w-3.5" />
                {card.has_attacked ? 'Already Attacked' : 'Attack'}
              </Button>
            )}
            {isFaceDown && onFlip && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => handleAction(onFlip)}
              >
                <Eye className="mr-2 h-3.5 w-3.5" />
                Flip Summon
              </Button>
            )}
            {/* Activate monster effect - for face-up effect monsters */}
            {!isFaceDown && onActivate && card.card_type === 'effect_monster' && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-purple-400 hover:text-purple-500 hover:bg-purple-950/20"
                onClick={() => handleAction(onActivate)}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Activate Effect
              </Button>
            )}
            {!isFaceDown && onChangePosition && !showPositionOptions && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-xs"
                onClick={() => setShowPositionOptions(true)}
              >
                <span className="flex items-center">
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Change Position
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isFaceDown && onChangePosition && showPositionOptions && (
              <div className="pl-2 space-y-0.5 border-l-2 border-primary/50 ml-2">
                {card.position !== 'face_up_attack' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => handleAction(() => onChangePosition('face_up_attack'))}
                  >
                    <Sword className="mr-2 h-3.5 w-3.5" />
                    Attack Position
                  </Button>
                )}
                {card.position !== 'face_up_defense' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => handleAction(() => onChangePosition('face_up_defense'))}
                  >
                    <Shield className="mr-2 h-3.5 w-3.5" />
                    Defense Position
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Field actions for spell/trap */}
        {card.location === 'spell_zone' && isFaceDown && onActivate && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => handleAction(onActivate)}
          >
            <Flame className="mr-2 h-3.5 w-3.5" />
            Activate
          </Button>
        )}

        {/* Graveyard actions - banish for card effects */}
        {card.location === 'graveyard' && onBanish && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => handleAction(() => onBanish(false))}
          >
            <Eye className="mr-2 h-3.5 w-3.5" />
            Banish (Card Effect)
          </Button>
        )}

        {/* Field spell zone - can replace and send to GY */}
        {card.location === 'field_zone' && onSendToGraveyard && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => handleAction(onSendToGraveyard)}
          >
            <EyeOff className="mr-2 h-3.5 w-3.5" />
            Send to GY (Replace)
          </Button>
        )}

        {/* Note for field monster/spell zone cards */}
        {card.location !== 'hand' && (card.location === 'monster_zone' || card.location === 'spell_zone') && (
          <>
            <Separator className="my-1" />
            <div className="px-2 py-1 text-[10px] text-muted-foreground italic">
              Cards go to GY through battle or card effects
            </div>
          </>
        )}

        {/* Counter actions */}
        <Separator className="my-1" />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Counters: {card.counters}</span>
          <div className="flex gap-1">
            {onRemoveCounter && (
              <Button 
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleAction(onRemoveCounter)}
                disabled={card.counters === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
            )}
            {onAddCounter && (
              <Button 
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleAction(onAddCounter)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Empty zone placeholder
export function EmptyZone({
  type,
  onClick,
  highlight = false,
  size = 'md',
  className,
}: {
  type: 'monster' | 'spell' | 'field' | 'extra' | 'deck' | 'graveyard' | 'banished'
  onClick?: () => void
  highlight?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const labels = {
    monster: 'M',
    spell: 'S/T',
    field: 'Field',
    extra: 'Extra',
    deck: 'Deck',
    graveyard: 'GY',
    banished: 'Ban',
  }

  return (
    <div
      className={cn(
        'rounded-sm border-2 border-dashed flex items-center justify-center transition-all',
        sizeClasses[size],
        highlight 
          ? 'border-primary bg-primary/10 cursor-pointer hover:bg-primary/20' 
          : 'border-border/50 bg-muted/20',
        onClick && 'cursor-pointer hover:border-muted-foreground',
        className
      )}
      onClick={onClick}
    >
      <span className="text-[10px] text-muted-foreground font-medium">{labels[type]}</span>
    </div>
  )
}
