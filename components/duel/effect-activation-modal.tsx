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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sword, Shield, Star, Sparkles, AlertCircle, 
  Search, Target, Trash2, RotateCcw, Plus, Zap, Heart, Wand2, Check
} from 'lucide-react'
import type { DuelGameCard } from '@/lib/types'
import { getCardScript, parseEffectText } from '@/lib/duel-engine/card-scripts'

interface EffectExecutors {
  drawCardsEffect: (count: number) => Promise<{ success: boolean }>
  destroyCardsEffect: (cardIds: string[]) => Promise<{ success: boolean }>
  banishCardsEffect: (cardIds: string[], faceDown?: boolean) => Promise<{ success: boolean }>
  searchDeckEffect: (cardId: string) => Promise<{ success: boolean }>
  specialSummonEffect: (cardId: string, position?: 'face_up_attack' | 'face_up_defense') => Promise<{ success: boolean }>
  sendToGraveyardEffect: (cardIds: string[]) => Promise<{ success: boolean }>
  inflictDamageEffect: (targetPlayerId: string, amount: number) => Promise<{ success: boolean }>
  gainLifePointsEffect: (amount: number) => Promise<{ success: boolean }>
}

interface EffectActivationModalProps {
  isOpen: boolean
  onClose: () => void
  card: DuelGameCard | null
  onResolve: (action: EffectAction) => void
  availableTargets?: DuelGameCard[]
  searchableDeck?: DuelGameCard[]
  graveyard?: DuelGameCard[]
  opponentId?: string
  effectExecutors?: EffectExecutors
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
  searchableDeck = [],
  graveyard = [],
  opponentId,
  effectExecutors,
}: EffectActivationModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [showDeckSearch, setShowDeckSearch] = useState(false)
  const [showGraveyardSelect, setShowGraveyardSelect] = useState(false)
  const [selectedDeckCard, setSelectedDeckCard] = useState<string | null>(null)

  // Parse effect text for action keywords - must be called before any early return
  const { possibleActions, keywords: effectKeywords } = useMemo(() => {
    if (!card?.effect_text) return { possibleActions: [], keywords: [] }
    return parseEffectText(card.effect_text)
  }, [card?.effect_text])

  // Early return after all hooks
  if (!card) return null

  // Try to get the card script for scripted effect handling
  const cardScript = card.card_id ? getCardScript(card.card_id) : undefined

  const imageUrl = card.card_id
    ? `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`
    : '/images/card-back.jpg'

  const isMonster = ['monster', 'normal_monster', 'effect_monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)
  
  // Check if this card has a scripted effect
  const hasScript = !!cardScript && cardScript.effects.length > 0
  const scriptedEffects = cardScript?.effects || []

  const handleResolve = async (actionType: string) => {
    // If we have effect executors, use them for actual effect resolution
    if (effectExecutors) {
      switch (actionType) {
        case 'draw':
          // Parse draw count from effect text
          const drawMatch = card?.effect_text?.match(/draw (\d+|a|one|two|three) cards?/i)
          let drawCount = 1
          if (drawMatch) {
            const num = drawMatch[1].toLowerCase()
            if (num === 'a' || num === 'one') drawCount = 1
            else if (num === 'two') drawCount = 2
            else if (num === 'three') drawCount = 3
            else drawCount = parseInt(num) || 1
          }
          // Special case for Pot of Greed
          if (card?.card_name === 'Pot of Greed') drawCount = 2
          await effectExecutors.drawCardsEffect(drawCount)
          break
        case 'destroy':
          if (selectedTargets.length > 0) {
            await effectExecutors.destroyCardsEffect(selectedTargets)
          } else {
            // Show target selection for destroy effects
            onResolve({ type: 'destroy', targetIds: [] })
            return
          }
          break
        case 'banish':
          if (selectedTargets.length > 0) {
            await effectExecutors.banishCardsEffect(selectedTargets)
          }
          break
        case 'search':
          if (selectedDeckCard) {
            await effectExecutors.searchDeckEffect(selectedDeckCard)
          } else {
            setShowDeckSearch(true)
            return
          }
          break
        case 'special_summon':
          if (selectedDeckCard) {
            await effectExecutors.specialSummonEffect(selectedDeckCard)
          } else if (showGraveyardSelect && selectedTargets.length > 0) {
            await effectExecutors.specialSummonEffect(selectedTargets[0])
          } else {
            setShowGraveyardSelect(true)
            return
          }
          break
        case 'gain_lp':
          const lpMatch = card?.effect_text?.match(/gain (\d+) life points?/i)
          const lpAmount = lpMatch ? parseInt(lpMatch[1]) : 1000
          await effectExecutors.gainLifePointsEffect(lpAmount)
          break
        case 'damage':
          if (opponentId) {
            const dmgMatch = card?.effect_text?.match(/inflict (\d+) damage/i)
            const dmgAmount = dmgMatch ? parseInt(dmgMatch[1]) : 500
            await effectExecutors.inflictDamageEffect(opponentId, dmgAmount)
          }
          break
        default:
          onResolve({ type: 'manual' })
      }
    } else {
      // Fallback to passing action to parent
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
    }
    
    setSelectedTargets([])
    setSelectedDeckCard(null)
    setShowDeckSearch(false)
    setShowGraveyardSelect(false)
    onClose()
  }

  const handleSearchSelect = async (cardId: string) => {
    setSelectedDeckCard(cardId)
    if (effectExecutors) {
      await effectExecutors.searchDeckEffect(cardId)
      setShowDeckSearch(false)
      onClose()
    }
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
            
            {/* Deck Search Selection */}
            {showDeckSearch && searchableDeck.length > 0 && (
              <div className="mt-4 p-3 rounded-lg border border-cyan-800/50 bg-cyan-950/20">
                <p className="text-sm font-medium text-cyan-400 mb-2">Select a card from your Deck:</p>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {searchableDeck.map(deckCard => (
                      <button
                        key={deckCard.id}
                        onClick={() => handleSearchSelect(deckCard.id)}
                        className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors text-left"
                      >
                        <div className="w-8 h-11 relative rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={deckCard.card_id 
                              ? `https://images.ygoprodeck.com/images/cards_small/${deckCard.card_id}.jpg`
                              : '/images/card-back.jpg'
                            }
                            alt={deckCard.card_name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{deckCard.card_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {deckCard.card_type.replace('_', ' ')}
                            {deckCard.level ? ` - Level ${deckCard.level}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Graveyard Selection for Special Summon */}
            {showGraveyardSelect && graveyard.length > 0 && (
              <div className="mt-4 p-3 rounded-lg border border-purple-800/50 bg-purple-950/20">
                <p className="text-sm font-medium text-purple-400 mb-2">Select a monster from your Graveyard:</p>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {graveyard
                      .filter(c => c.card_type.toLowerCase().includes('monster'))
                      .map(gyCard => (
                        <button
                          key={gyCard.id}
                          onClick={async () => {
                            if (effectExecutors) {
                              await effectExecutors.specialSummonEffect(gyCard.id)
                              setShowGraveyardSelect(false)
                              onClose()
                            }
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors text-left"
                        >
                          <div className="w-8 h-11 relative rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={gyCard.card_id 
                                ? `https://images.ygoprodeck.com/images/cards_small/${gyCard.card_id}.jpg`
                                : '/images/card-back.jpg'
                              }
                              alt={gyCard.card_name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{gyCard.card_name}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-red-400">ATK {gyCard.attack}</span>
                              <span className="text-blue-400">DEF {gyCard.defense}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
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
