'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { 
  Sword, Shield, Flame, Send, RotateCcw, 
  Eye, EyeOff, Plus, Minus, Sparkles, Ban
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
  onSendToGraveyard?: () => void
  onBanish?: (faceDown?: boolean) => void
  onReturnToHand?: () => void
  onReturnToDeck?: (toTop?: boolean) => void
  onAddCounter?: () => void
  onRemoveCounter?: () => void
  disabled?: boolean
  selected?: boolean
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
  onSendToGraveyard,
  onBanish,
  onReturnToHand,
  onReturnToDeck,
  onAddCounter,
  onRemoveCounter,
  disabled = false,
  selected = false,
  showActions = true,
  className,
}: DuelCardProps) {
  const [imageError, setImageError] = useState(false)

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

  const isMonster = ['monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)
  const isSpellTrap = ['spell', 'trap'].includes(card.card_type)

  const cardContent = (
    <div
      className={cn(
        'relative rounded-sm overflow-hidden transition-all duration-200 cursor-pointer',
        sizeClasses[size],
        isDefensePosition && card.location === 'monster_zone' && 'rotate-90',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:scale-105 hover:z-10',
        className
      )}
      onClick={disabled ? undefined : onClick}
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

  // If no actions or not owner, just return the card
  if (!showActions || !isOwner) {
    return cardContent
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>
        {cardContent}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground truncate">
          {card.card_name}
        </div>
        <ContextMenuSeparator />

        {/* Hand actions */}
        {card.location === 'hand' && (
          <>
            {isMonster && onSummon && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Sword className="mr-2 h-4 w-4" />
                  Summon
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => onSummon('face_up_attack')}>
                    <Sword className="mr-2 h-4 w-4" />
                    Attack Position
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onSummon('face_up_defense')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Defense Position
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onSummon('face_down_defense')}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Set (Face-down)
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            {isSpellTrap && (
              <>
                {onActivate && (
                  <ContextMenuItem onClick={onActivate}>
                    <Flame className="mr-2 h-4 w-4" />
                    Activate
                  </ContextMenuItem>
                )}
                {onSetSpellTrap && (
                  <ContextMenuItem onClick={onSetSpellTrap}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Set
                  </ContextMenuItem>
                )}
              </>
            )}
          </>
        )}

        {/* Field actions for monsters */}
        {card.location === 'monster_zone' && (
          <>
            {isFaceDown && onFlip && (
              <ContextMenuItem onClick={onFlip}>
                <Eye className="mr-2 h-4 w-4" />
                Flip Summon
              </ContextMenuItem>
            )}
            {!isFaceDown && onChangePosition && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Change Position
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {card.position !== 'face_up_attack' && (
                    <ContextMenuItem onClick={() => onChangePosition('face_up_attack')}>
                      <Sword className="mr-2 h-4 w-4" />
                      Attack Position
                    </ContextMenuItem>
                  )}
                  {card.position !== 'face_up_defense' && (
                    <ContextMenuItem onClick={() => onChangePosition('face_up_defense')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Defense Position
                    </ContextMenuItem>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}

        {/* Field actions for spell/trap */}
        {card.location === 'spell_zone' && isFaceDown && onActivate && (
          <ContextMenuItem onClick={onActivate}>
            <Flame className="mr-2 h-4 w-4" />
            Activate
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Universal actions */}
        {onSendToGraveyard && (
          <ContextMenuItem onClick={onSendToGraveyard}>
            <Send className="mr-2 h-4 w-4" />
            Send to Graveyard
          </ContextMenuItem>
        )}
        
        {onBanish && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Ban className="mr-2 h-4 w-4" />
              Banish
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => onBanish(false)}>
                <Eye className="mr-2 h-4 w-4" />
                Face-up
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onBanish(true)}>
                <EyeOff className="mr-2 h-4 w-4" />
                Face-down
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {onReturnToHand && (
          <ContextMenuItem onClick={onReturnToHand}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Return to Hand
          </ContextMenuItem>
        )}

        {onReturnToDeck && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return to Deck
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => onReturnToDeck(true)}>
                Top of Deck
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onReturnToDeck(false)}>
                Shuffle into Deck
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* Counter actions */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Counters: {card.counters}</span>
          <div className="flex gap-1">
            {onRemoveCounter && (
              <button 
                onClick={onRemoveCounter}
                className="p-1 hover:bg-muted rounded"
                disabled={card.counters === 0}
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
            {onAddCounter && (
              <button 
                onClick={onAddCounter}
                className="p-1 hover:bg-muted rounded"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
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
