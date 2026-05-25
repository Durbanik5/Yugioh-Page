'use client'

import { useState, useMemo } from 'react'
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
  Search, Target, Trash2, RotateCcw, Plus, Zap, Heart, Wand2
} from 'lucide-react'
import type { DuelGameCard } from '@/lib/types'
import { getCardScript, parseEffectText } from '@/lib/duel-engine/card-scripts'

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
  | { type: 'gain_lp'; amount: number }
  | { type: 'inflict_damage'; amount: number }
  | { type: 'change_atk_def' }
  | { type: 'manual' } // For effects that need manual resolution

export function EffectActivationModal({
  isOpen,
  onClose,
  card,
  onResolve,
  availableTargets = [],
}: EffectActivationModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])

  if (!card) return null

  // Try to get the card script for scripted effect handling
  const cardScript = card.card_id ? getCardScript(card.card_id) : undefined
  
  // Parse effect text for action keywords
  const { possibleActions, keywords: effectKeywords } = useMemo(() => {
    return parseEffectText(card.effect_text || '')
  }, [card.effect_text])

  const imageUrl = card.card_id
    ? `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`
    : '/images/card-back.jpg'

  const isMonster = ['monster', 'normal_monster', 'effect_monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)
  
  // Check if this card has a scripted effect
  const hasScript = !!cardScript && cardScript.effects.length > 0
  const scriptedEffects = cardScript?.effects || []

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
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Scripted Effect Info */}
            {hasScript && (
              <div className="mb-3 p-2 rounded bg-green-950/30 border border-green-800/50">
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  This card has scripted effects for automatic resolution
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {scriptedEffects.map(eff => (
                    <Badge key={eff.id} variant="secondary" className="text-[10px]">
                      {eff.name}
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
                {possibleActions.includes('SEARCH_DECK') && (
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
                {possibleActions.includes('DRAW') && (
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
                {possibleActions.includes('DESTROY') && (
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
                {possibleActions.includes('SPECIAL_SUMMON') && (
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
                {possibleActions.includes('BANISH') && (
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
                {possibleActions.includes('NEGATE_EFFECT') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('negate')}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Negate Effect
                  </Button>
                )}
                {possibleActions.includes('INFLICT_DAMAGE') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('damage')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Inflict Damage
                  </Button>
                )}
                {possibleActions.includes('GAIN_LIFEPOINTS') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => handleResolve('gain_lp')}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Gain LP
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
