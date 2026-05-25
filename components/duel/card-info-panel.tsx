'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sword, Shield, Star, Sparkles } from 'lucide-react'
import type { DuelGameCard } from '@/lib/types'

interface CardInfoPanelProps {
  card: DuelGameCard | null
  className?: string
}

export function CardInfoPanel({ card, className }: CardInfoPanelProps) {
  if (!card) {
    return (
      <div className={cn(
        "bg-slate-900/50 border border-slate-700/50 rounded-lg p-4",
        "flex items-center justify-center text-muted-foreground text-sm",
        className
      )}>
        Click a card to view its details
      </div>
    )
  }

  const imageUrl = card.card_id
    ? `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`
    : '/images/card-back.jpg'

  // Determine card type display
  const getCardTypeDisplay = () => {
    const type = card.card_type
    if (type === 'monster' || type === 'normal_monster' || type === 'effect_monster') {
      return card.attribute ? `${card.attribute} Monster` : 'Monster'
    }
    if (type === 'spell') return 'Spell Card'
    if (type === 'trap') return 'Trap Card'
    if (type === 'fusion') return 'Fusion Monster'
    if (type === 'synchro') return 'Synchro Monster'
    if (type === 'xyz') return 'Xyz Monster'
    if (type === 'link') return 'Link Monster'
    return type
  }

  const isMonster = ['monster', 'normal_monster', 'effect_monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)

  return (
    <div className={cn(
      "bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden",
      className
    )}>
      <div className="p-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm text-foreground truncate">{card.card_name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px]">
            {getCardTypeDisplay()}
          </Badge>
          {isMonster && card.level && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] text-yellow-500">{card.level}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Card Image */}
        <div className="w-24 h-36 relative flex-shrink-0 m-2">
          <Image
            src={imageUrl}
            alt={card.card_name}
            fill
            className="object-cover rounded"
            unoptimized
          />
        </div>

        {/* Card Details */}
        <div className="flex-1 p-2 flex flex-col">
          {/* Stats for monsters */}
          {isMonster && (
            <div className="flex gap-3 mb-2">
              <div className="flex items-center gap-1 bg-red-950/50 px-2 py-0.5 rounded">
                <Sword className="h-3 w-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">{card.attack ?? '?'}</span>
              </div>
              <div className="flex items-center gap-1 bg-blue-950/50 px-2 py-0.5 rounded">
                <Shield className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-bold text-blue-400">{card.defense ?? '?'}</span>
              </div>
            </div>
          )}

          {/* Effect Text */}
          <ScrollArea className="flex-1 max-h-20">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {card.effect_text || 'No effect text available. Check the official card database for this card\'s effect.'}
            </p>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
