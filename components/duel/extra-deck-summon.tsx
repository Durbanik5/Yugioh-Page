'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, Sparkles, Zap, Link2, Star, Hexagon } from 'lucide-react'
import Image from 'next/image'
import type { DuelGameCard } from '@/lib/types'

type SummonType = 'fusion' | 'synchro' | 'xyz' | 'link'

interface ExtraDeckSummonDialogProps {
  isOpen: boolean
  onClose: () => void
  extraDeckCards: DuelGameCard[]
  fieldMonsters: DuelGameCard[]
  handMonsters: DuelGameCard[]
  graveyardCards: DuelGameCard[]
  onSummon: (extraDeckCard: DuelGameCard, materials: DuelGameCard[], summonType: SummonType) => void
}

// Determine summon type from card type
function getSummonType(cardType: string | undefined): SummonType | null {
  if (!cardType) return null
  const type = cardType.toLowerCase()
  if (type.includes('fusion')) return 'fusion'
  if (type.includes('synchro')) return 'synchro'
  if (type.includes('xyz')) return 'xyz'
  if (type.includes('link')) return 'link'
  return null
}

// Get summon type color
function getSummonTypeColor(type: SummonType) {
  switch (type) {
    case 'fusion': return 'from-purple-600 to-violet-700'
    case 'synchro': return 'from-gray-200 to-gray-400'
    case 'xyz': return 'from-gray-900 to-yellow-500'
    case 'link': return 'from-blue-500 to-cyan-400'
  }
}

function getSummonTypeIcon(type: SummonType) {
  switch (type) {
    case 'fusion': return <Sparkles className="h-4 w-4" />
    case 'synchro': return <Star className="h-4 w-4" />
    case 'xyz': return <Hexagon className="h-4 w-4" />
    case 'link': return <Link2 className="h-4 w-4" />
  }
}

export function ExtraDeckSummonDialog({
  isOpen,
  onClose,
  extraDeckCards,
  fieldMonsters,
  handMonsters,
  graveyardCards,
  onSummon,
}: ExtraDeckSummonDialogProps) {
  const [selectedExtraDeckCard, setSelectedExtraDeckCard] = useState<DuelGameCard | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<DuelGameCard[]>([])
  const [activeTab, setActiveTab] = useState<SummonType>('fusion')

  // Group extra deck cards by type
  const groupedCards = useMemo(() => {
    const groups: Record<SummonType, DuelGameCard[]> = {
      fusion: [],
      synchro: [],
      xyz: [],
      link: [],
    }
    
    extraDeckCards.forEach(card => {
      const type = getSummonType(card.card_type)
      if (type) {
        groups[type].push(card)
      }
    })
    
    return groups
  }, [extraDeckCards])

  // Available materials based on summon type
  const availableMaterials = useMemo(() => {
    switch (activeTab) {
      case 'fusion':
        // Fusion can use hand, field, and sometimes graveyard
        return [...fieldMonsters, ...handMonsters]
      case 'synchro':
        // Synchro uses field monsters (tuner + non-tuner)
        return fieldMonsters
      case 'xyz':
        // XYZ uses field monsters of same level
        return fieldMonsters
      case 'link':
        // Link uses field monsters
        return fieldMonsters
      default:
        return []
    }
  }, [activeTab, fieldMonsters, handMonsters])

  const toggleMaterial = (card: DuelGameCard) => {
    setSelectedMaterials(prev => {
      const exists = prev.find(c => c.id === card.id)
      if (exists) {
        return prev.filter(c => c.id !== card.id)
      }
      return [...prev, card]
    })
  }

  const handleSummon = () => {
    if (selectedExtraDeckCard && selectedMaterials.length > 0) {
      onSummon(selectedExtraDeckCard, selectedMaterials, activeTab)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedExtraDeckCard(null)
    setSelectedMaterials([])
    onClose()
  }

  // Calculate total level/rank for materials
  const totalMaterialLevel = useMemo(() => {
    return selectedMaterials.reduce((sum, card) => sum + (card.level || 0), 0)
  }, [selectedMaterials])

  // Check if materials are valid for selected extra deck card
  const canSummon = useMemo(() => {
    if (!selectedExtraDeckCard || selectedMaterials.length === 0) return false

    switch (activeTab) {
      case 'synchro':
        // Need at least 1 tuner and total level must match
        const hasTuner = selectedMaterials.some(c => c.card_type?.toLowerCase().includes('tuner'))
        return hasTuner && totalMaterialLevel === (selectedExtraDeckCard.level || 0)
      case 'xyz':
        // All materials must be same level as the XYZ monster's rank
        const targetLevel = selectedExtraDeckCard.level || 0
        return selectedMaterials.length >= 2 && 
               selectedMaterials.every(c => c.level === targetLevel)
      case 'link':
        // Number of materials must equal link rating
        const linkRating = selectedExtraDeckCard.link_rating || selectedExtraDeckCard.level || 0
        return selectedMaterials.length === linkRating
      case 'fusion':
        // For now, just require at least 2 materials
        return selectedMaterials.length >= 2
      default:
        return false
    }
  }, [selectedExtraDeckCard, selectedMaterials, activeTab, totalMaterialLevel])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Extra Deck Summon
          </DialogTitle>
          <DialogDescription>
            Select an Extra Deck monster and its materials
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as SummonType)
          setSelectedExtraDeckCard(null)
          setSelectedMaterials([])
        }}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="fusion" className="gap-1">
              <Sparkles className="h-4 w-4" />
              Fusion ({groupedCards.fusion.length})
            </TabsTrigger>
            <TabsTrigger value="synchro" className="gap-1">
              <Star className="h-4 w-4" />
              Synchro ({groupedCards.synchro.length})
            </TabsTrigger>
            <TabsTrigger value="xyz" className="gap-1">
              <Hexagon className="h-4 w-4" />
              XYZ ({groupedCards.xyz.length})
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1">
              <Link2 className="h-4 w-4" />
              Link ({groupedCards.link.length})
            </TabsTrigger>
          </TabsList>

          {(['fusion', 'synchro', 'xyz', 'link'] as SummonType[]).map(type => (
            <TabsContent key={type} value={type} className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Extra Deck Cards */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    {getSummonTypeIcon(type)}
                    Select {type.charAt(0).toUpperCase() + type.slice(1)} Monster
                  </h3>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {groupedCards[type].length === 0 ? (
                        <p className="col-span-4 text-center text-muted-foreground py-4">
                          No {type} monsters in Extra Deck
                        </p>
                      ) : (
                        groupedCards[type].map(card => (
                          <button
                            key={card.id}
                            onClick={() => setSelectedExtraDeckCard(card)}
                            className={cn(
                              "relative rounded overflow-hidden transition-all",
                              selectedExtraDeckCard?.id === card.id && "ring-2 ring-primary scale-105"
                            )}
                          >
                            <div className="w-full aspect-[421/614] relative">
                              <Image
                                src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                                alt={card.card_name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            {selectedExtraDeckCard?.id === card.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Materials Selection */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Select Materials</h3>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {availableMaterials.length === 0 ? (
                        <p className="col-span-4 text-center text-muted-foreground py-4">
                          No available materials
                        </p>
                      ) : (
                        availableMaterials.map(card => {
                          const isSelected = selectedMaterials.some(c => c.id === card.id)
                          return (
                            <button
                              key={card.id}
                              onClick={() => toggleMaterial(card)}
                              className={cn(
                                "relative rounded overflow-hidden transition-all",
                                isSelected && "ring-2 ring-green-500 scale-105"
                              )}
                            >
                              <div className="w-full aspect-[421/614] relative">
                                <Image
                                  src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                                  alt={card.card_name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              {isSelected && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                  <Check className="h-6 w-6 text-green-500" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
                                <span className="text-[10px] text-yellow-400">Lv{card.level}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Selected Card Info */}
              {selectedExtraDeckCard && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex gap-4">
                    <div className="w-20 aspect-[421/614] relative rounded overflow-hidden">
                      <Image
                        src={`https://images.ygoprodeck.com/images/cards/${selectedExtraDeckCard.card_id}.jpg`}
                        alt={selectedExtraDeckCard.card_name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-yellow-400">{selectedExtraDeckCard.card_name}</h4>
                      <div className="flex gap-2 text-sm mb-2">
                        <Badge variant="outline" className={cn("bg-gradient-to-r text-white", getSummonTypeColor(type))}>
                          {type.toUpperCase()}
                        </Badge>
                        {type !== 'link' && <span className="text-yellow-500">Level {selectedExtraDeckCard.level}</span>}
                        {type === 'link' && <span className="text-blue-400">Link-{selectedExtraDeckCard.link_rating || selectedExtraDeckCard.level}</span>}
                        <span className="text-red-400">ATK {selectedExtraDeckCard.attack}</span>
                        {type !== 'link' && <span className="text-blue-400">DEF {selectedExtraDeckCard.defense}</span>}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{selectedExtraDeckCard.effect_text}</p>
                    </div>
                  </div>
                  
                  {/* Material Summary */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Materials: </span>
                      <span className="font-bold">{selectedMaterials.length}</span>
                      {type === 'synchro' && (
                        <span className="ml-2 text-muted-foreground">
                          Total Level: <span className={cn(
                            "font-bold",
                            totalMaterialLevel === (selectedExtraDeckCard.level || 0) ? "text-green-400" : "text-red-400"
                          )}>
                            {totalMaterialLevel}
                          </span>
                          /{selectedExtraDeckCard.level}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSummon} 
                        disabled={!canSummon}
                        className={cn("bg-gradient-to-r", getSummonTypeColor(type))}
                      >
                        {getSummonTypeIcon(type)}
                        <span className="ml-1">{type.charAt(0).toUpperCase() + type.slice(1)} Summon</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
