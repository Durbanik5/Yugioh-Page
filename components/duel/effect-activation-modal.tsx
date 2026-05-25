'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Sword, Shield, Star, Sparkles, AlertCircle, 
  Search, Target, Trash2, RotateCcw, Plus, Zap
} from 'lucide-react'
import type { DuelGameCard } from '@/lib/types'

interface EffectActivationModalProps {
  isOpen: boolean
  onClose: () => void
  card: DuelGameCard | null
  onResolve: (action: EffectAction) => void
  availableTargets?: DuelGameCard[]
}

export type EffectAction = 
  | { type: 'search_deck' }
  | { type: 'destroy'; targetIds: string[] }
  | { type: 'special_summon'; cardId: string; position: 'attack' | 'defense' }
  | { type: 'add_to_hand'; cardId: string }
  | { type: 'banish'; targetIds: string[] }
  | { type: 'negate' }
  | { type: 'draw'; count: number }
  | { type: 'send_to_gy'; targetIds: string[] }
  | { type: 'manual' } // For effects that need manual resolution

// Parse common effect keywords to suggest actions
function parseEffectKeywords(effectText: string | null | undefined): string[] {
  if (!effectText) return []
  
  const keywords: string[] = []
  const text = effectText.toLowerCase()
  
  if (text.includes('add') && (text.includes('hand') || text.includes('deck'))) {
    keywords.push('search')
  }
  if (text.includes('special summon')) {
    keywords.push('special_summon')
  }
  if (text.includes('destroy')) {
    keywords.push('destroy')
  }
  if (text.includes('draw')) {
    keywords.push('draw')
  }
  if (text.includes('banish')) {
    keywords.push('banish')
  }
  if (text.includes('negate')) {
    keywords.push('negate')
  }
  if (text.includes('send') && text.includes('graveyard')) {
    keywords.push('send_to_gy')
  }
  if (text.includes('target')) {
    keywords.push('target')
  }
  
  return keywords
}

export function EffectActivationModal({
  isOpen,
  onClose,
  card,
  onResolve,
  availableTargets = [],
}: EffectActivationModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])

  if (!card) return null

  const imageUrl = card.card_id
    ? `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`
    : '/images/card-back.jpg'

  const isMonster = ['monster', 'normal_monster', 'effect_monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)
  const effectKeywords = parseEffectKeywords(card.effect_text)

  const handleResolve = (actionType: string) => {
    switch (actionType) {
      case 'search':
        onResolve({ type: 'search_deck' })
        break
      case 'draw':
        onResolve({ type: 'draw', count: 1 })
        break
      case 'destroy':
        onResolve({ type: 'destroy', targetIds: selectedTargets })
        break
      case 'banish':
        onResolve({ type: 'banish', targetIds: selectedTargets })
        break
      case 'negate':
        onResolve({ type: 'negate' })
        break
      default:
        onResolve({ type: 'manual' })
    }
    setSelectedTargets([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Effect Activated: {card.card_name}
          </DialogTitle>
          <DialogDescription>
            Read the effect and select the appropriate action to resolve it
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Card Image */}
          <div className="w-40 flex-shrink-0">
            <div className="relative aspect-[59/86] rounded-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt={card.card_name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {/* Card Stats */}
            {isMonster && (
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline" className="bg-red-950/50 text-red-400 border-red-800">
                  <Sword className="h-3 w-3 mr-1" />
                  {card.attack ?? '?'}
                </Badge>
                <Badge variant="outline" className="bg-blue-950/50 text-blue-400 border-blue-800">
                  <Shield className="h-3 w-3 mr-1" />
                  {card.defense ?? '?'}
                </Badge>
              </div>
            )}
          </div>

          {/* Effect Text and Actions */}
          <div className="flex-1 flex flex-col">
            {/* Card Type */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {card.card_type.replace('_', ' ').toUpperCase()}
              </Badge>
              {card.level && (
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-yellow-500">Level {card.level}</span>
                </div>
              )}
            </div>

            {/* Effect Text */}
            <ScrollArea className="h-32 rounded-md border border-slate-700 bg-slate-950/50 p-3 mb-4">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {card.effect_text || 'No effect text available. This card may be a Normal Monster with no effect.'}
              </p>
            </ScrollArea>

            {/* Detected Keywords */}
            {effectKeywords.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Detected effect types:</p>
                <div className="flex flex-wrap gap-1">
                  {effectKeywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="text-[10px] capitalize">
                      {keyword.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-2" />

            {/* Action Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Select action to resolve:</p>
              <div className="grid grid-cols-2 gap-2">
                {effectKeywords.includes('search') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('search')}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Deck
                  </Button>
                )}
                {effectKeywords.includes('draw') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('draw')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Draw Card(s)
                  </Button>
                )}
                {effectKeywords.includes('destroy') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('destroy')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Destroy Target(s)
                  </Button>
                )}
                {effectKeywords.includes('special_summon') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('special_summon')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Special Summon
                  </Button>
                )}
                {effectKeywords.includes('banish') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('banish')}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Banish
                  </Button>
                )}
                {effectKeywords.includes('negate') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('negate')}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Negate
                  </Button>
                )}
              </div>

              {/* Manual Resolution */}
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => handleResolve('manual')}
              >
                Resolve Manually (Effect Applied)
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel Activation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
