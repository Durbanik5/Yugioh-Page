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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Search, Plus, ArrowRight, Shuffle } from 'lucide-react'
import type { DuelGameCard } from '@/lib/types'

interface DeckSearchModalProps {
  open: boolean
  onClose: () => void
  cards: DuelGameCard[]
  title?: string
  description?: string
  onSelectCard: (card: DuelGameCard, action: 'add_to_hand' | 'special_summon' | 'send_to_gy' | 'banish') => void
  allowedActions?: ('add_to_hand' | 'special_summon' | 'send_to_gy' | 'banish')[]
  showShuffle?: boolean
  onShuffle?: () => void
}

export function DeckSearchModal({
  open,
  onClose,
  cards = [],
  title = 'Search Deck',
  description = 'Select a card from your deck',
  onSelectCard,
  allowedActions = ['add_to_hand'],
  showShuffle = true,
  onShuffle,
}: DeckSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<DuelGameCard | null>(null)
  const [filter, setFilter] = useState<'all' | 'monster' | 'spell' | 'trap'>('all')

  const filteredCards = useMemo(() => {
    if (!cards) return []
    let filtered = cards

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(card => {
        if (filter === 'monster') {
          return ['monster', 'normal_monster', 'effect_monster', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(card.card_type)
        }
        return card.card_type === filter
      })
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(card => 
        card.card_name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [cards, filter, searchQuery])

  const handleSelectAction = (action: 'add_to_hand' | 'special_summon' | 'send_to_gy' | 'banish') => {
    if (selectedCard) {
      onSelectCard(selectedCard, action)
      setSelectedCard(null)
      setSearchQuery('')
      onClose()
    }
  }

  const actionLabels = {
    add_to_hand: 'Add to Hand',
    special_summon: 'Special Summon',
    send_to_gy: 'Send to GY',
    banish: 'Banish',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by card name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="monster">Monster</TabsTrigger>
                <TabsTrigger value="spell">Spell</TabsTrigger>
                <TabsTrigger value="trap">Trap</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Card Grid */}
          <ScrollArea className="h-[300px] border rounded-lg p-2">
            <div className="grid grid-cols-6 gap-2">
              {filteredCards.map((card) => {
                const imageUrl = card.card_id
                  ? `https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`
                  : '/images/card-back.jpg'

                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={cn(
                      "relative aspect-[59/86] rounded overflow-hidden transition-all",
                      "hover:scale-105 hover:z-10 hover:ring-2 hover:ring-primary",
                      selectedCard?.id === card.id && "ring-2 ring-primary scale-105 z-10"
                    )}
                  >
                    <Image
                      src={imageUrl}
                      alt={card.card_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                )
              })}
            </div>
            {filteredCards.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No cards found
              </div>
            )}
          </ScrollArea>

          {/* Selected Card Info */}
          {selectedCard && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="w-16 h-24 relative flex-shrink-0">
                  <Image
                    src={selectedCard.card_id
                      ? `https://images.ygoprodeck.com/images/cards_small/${selectedCard.card_id}.jpg`
                      : '/images/card-back.jpg'}
                    alt={selectedCard.card_name}
                    fill
                    className="object-cover rounded"
                    unoptimized
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{selectedCard.card_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {selectedCard.effect_text || 'No effect text available'}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {allowedActions.map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant={action === 'add_to_hand' ? 'default' : 'outline'}
                        onClick={() => handleSelectAction(action)}
                        className="text-xs h-7"
                      >
                        {action === 'add_to_hand' && <Plus className="h-3 w-3 mr-1" />}
                        {action === 'special_summon' && <ArrowRight className="h-3 w-3 mr-1" />}
                        {actionLabels[action]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} in deck
            </div>
            <div className="flex gap-2">
              {showShuffle && onShuffle && (
                <Button variant="outline" size="sm" onClick={onShuffle}>
                  <Shuffle className="h-4 w-4 mr-1" />
                  Shuffle
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
