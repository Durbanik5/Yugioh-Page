'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, Sparkles, Zap, Shield, Trophy, Target, Layers, Star, RefreshCw, Search, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeckWithCards, DeckCard } from '@/lib/types'

type DeckCategory = 'main' | 'extra' | 'side'

interface YGOCard {
  id: number
  name: string
  type: string
  frameType: string
  desc: string
  atk?: number
  def?: number
  level?: number
  race?: string
  attribute?: string
  card_images?: { id: number; image_url: string; image_url_small: string }[]
}

interface DeckBuildViewerProps {
  deck: DeckWithCards
  record?: { wins: number; losses: number }
}

// Determine card type from YGO API type field
function getCardType(ygoType: string): 'monster' | 'spell' | 'trap' {
  const typeLower = ygoType.toLowerCase()
  if (typeLower.includes('spell')) return 'spell'
  if (typeLower.includes('trap')) return 'trap'
  return 'monster'
}

// Determine deck category from YGO API type field
function getDeckCategory(ygoType: string): DeckCategory {
  const typeLower = ygoType.toLowerCase()
  // Extra deck monsters
  if (
    typeLower.includes('fusion') ||
    typeLower.includes('synchro') ||
    typeLower.includes('xyz') ||
    typeLower.includes('link')
  ) {
    return 'extra'
  }
  return 'main'
}

export function DeckBuildViewer({ deck, record }: DeckBuildViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [cards, setCards] = useState<DeckCard[]>(deck.cards || [])
  const [newCard, setNewCard] = useState({ 
    name: '', 
    type: 'monster' as 'monster' | 'spell' | 'trap', 
    category: 'main' as DeckCategory,
    quantity: 1 
  })
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<DeckCategory>('main')
  const router = useRouter()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YGOCard[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedCard, setSelectedCard] = useState<YGOCard | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search YGOPRODeck API
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(searchQuery)}&num=15&offset=0`
        )
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.data || [])
          setShowResults(true)
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('Error searching cards:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  // Filter cards by deck category
  const mainDeckCards = cards.filter(c => !c.deck_category || c.deck_category === 'main')
  const extraDeckCards = cards.filter(c => c.deck_category === 'extra')
  const sideDeckCards = cards.filter(c => c.deck_category === 'side')

  // Further filter by card type within each category
  const getCardsByType = (categoryCards: DeckCard[], type: string) => 
    categoryCards.filter(c => c.card_type === type)

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0)
  const mainDeckTotal = mainDeckCards.reduce((sum, c) => sum + c.quantity, 0)
  const extraDeckTotal = extraDeckCards.reduce((sum, c) => sum + c.quantity, 0)
  const sideDeckTotal = sideDeckCards.reduce((sum, c) => sum + c.quantity, 0)

  const handleSelectCard = (card: YGOCard) => {
    setSelectedCard(card)
    setSearchQuery(card.name)
    setShowResults(false)
    
    // Auto-fill card details
    const cardType = getCardType(card.type)
    const suggestedCategory = getDeckCategory(card.type)
    
    setNewCard({
      name: card.name,
      type: cardType,
      category: suggestedCategory,
      quantity: 1
    })
  }

  const clearSelection = () => {
    setSelectedCard(null)
    setSearchQuery('')
    setNewCard({ name: '', type: 'monster', category: activeTab, quantity: 1 })
  }

  const handleAddCard = async () => {
    if (!newCard.name.trim()) {
      toast.error('Please enter a card name')
      return
    }

    setAdding(true)
    const supabase = createClient()

    try {
      // Check if card already exists in deck with same category
      const existingCard = cards.find(
        c => c.card_name.toLowerCase() === newCard.name.trim().toLowerCase() && 
             c.card_type === newCard.type &&
             (c.deck_category || 'main') === newCard.category
      )

      if (existingCard) {
        // Update quantity
        const newQuantity = Math.min(existingCard.quantity + newCard.quantity, 3)
        const { error } = await supabase
          .from('deck_cards')
          .update({ quantity: newQuantity })
          .eq('id', existingCard.id)

        if (error) throw error

        setCards(cards.map(c => 
          c.id === existingCard.id ? { ...c, quantity: newQuantity } : c
        ))
        toast.success(`Updated ${newCard.name} quantity to ${newQuantity}`)
      } else {
        // Insert new card
        const { data, error } = await supabase
          .from('deck_cards')
          .insert({
            deck_id: deck.id,
            card_name: newCard.name.trim(),
            card_type: newCard.type,
            deck_category: newCard.category,
            quantity: newCard.quantity
          })
          .select()
          .single()

        if (error) throw error

        setCards([...cards, data])
        toast.success(`Added ${newCard.name} to ${newCard.category === 'main' ? 'Main' : newCard.category === 'extra' ? 'Extra' : 'Side'} Deck`)
      }

      clearSelection()
      setAddDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error adding card:', error)
      toast.error('Failed to add card')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCard = async (cardId: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('deck_cards')
        .delete()
        .eq('id', cardId)

      if (error) throw error

      setCards(cards.filter(c => c.id !== cardId))
      toast.success('Card removed')
      router.refresh()
    } catch (error) {
      console.error('Error removing card:', error)
      toast.error('Failed to remove card')
    }
  }

  const getCardTypeColor = (type: string) => {
    switch (type) {
      case 'monster': return 'border-yellow-500/30 bg-yellow-500/10'
      case 'spell': return 'border-green-500/30 bg-green-500/10'
      case 'trap': return 'border-purple-500/30 bg-purple-500/10'
      default: return 'border-border'
    }
  }

  const CardSection = ({ 
    title, 
    icon, 
    sectionCards, 
    color 
  }: { 
    title: string
    icon: React.ReactNode
    sectionCards: DeckCard[]
    color: string
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {sectionCards.reduce((sum, c) => sum + c.quantity, 0)}
        </Badge>
      </div>
      {sectionCards.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-6">No {title.toLowerCase()} yet</p>
      ) : (
        <div className="space-y-1 pl-6">
          {sectionCards.map((card) => (
            <div 
              key={card.id} 
              className={`flex items-center justify-between p-2 rounded border ${color} group`}
            >
              <span className="text-sm text-foreground">
                {card.quantity > 1 && <span className="text-muted-foreground mr-1">{card.quantity}x</span>}
                {card.card_name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveCard(card.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const DeckCategoryContent = ({ categoryCards }: { categoryCards: DeckCard[] }) => (
    <div className="space-y-4">
      <CardSection 
        title="Monsters" 
        icon={<Sparkles className="h-4 w-4 text-yellow-400" />}
        sectionCards={getCardsByType(categoryCards, 'monster')}
        color={getCardTypeColor('monster')}
      />
      <CardSection 
        title="Spells" 
        icon={<Zap className="h-4 w-4 text-green-400" />}
        sectionCards={getCardsByType(categoryCards, 'spell')}
        color={getCardTypeColor('spell')}
      />
      <CardSection 
        title="Traps" 
        icon={<Shield className="h-4 w-4 text-purple-400" />}
        sectionCards={getCardsByType(categoryCards, 'trap')}
        color={getCardTypeColor('trap')}
      />
    </div>
  )

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`bg-card border-border ${deck.is_active ? 'ring-1 ring-primary/50' : ''}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                {deck.name}
                {deck.is_active && (
                  <Badge variant="outline" className="text-xs border-primary text-primary">Active</Badge>
                )}
              </CardTitle>
              {deck.archetype && (
                <p className="text-sm text-muted-foreground">{deck.archetype}</p>
              )}
              {record && (record.wins > 0 || record.losses > 0) && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-sm">
                    <Trophy className="h-3 w-3 text-green-500" />
                    <span className="text-green-500 font-medium">{record.wins}W</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Target className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 font-medium">{record.losses}L</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({record.wins + record.losses > 0 ? Math.round((record.wins / (record.wins + record.losses)) * 100) : 0}% WR)
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs">
                {totalCards} total
              </Badge>
              <div className="flex gap-1 text-xs text-muted-foreground">
                <span>{mainDeckTotal}M</span>
                <span>/</span>
                <span>{extraDeckTotal}E</span>
                <span>/</span>
                <span>{sideDeckTotal}S</span>
              </div>
            </div>
          </div>
          {deck.description && (
            <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="p-4 pt-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span>View Deck Build</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeckCategory)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="main" className="flex items-center gap-1.5 text-xs">
                  <Layers className="h-3 w-3" />
                  Main
                  <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{mainDeckTotal}</Badge>
                </TabsTrigger>
                <TabsTrigger value="extra" className="flex items-center gap-1.5 text-xs">
                  <Star className="h-3 w-3" />
                  Extra
                  <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{extraDeckTotal}</Badge>
                </TabsTrigger>
                <TabsTrigger value="side" className="flex items-center gap-1.5 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  Side
                  <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{sideDeckTotal}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="mt-0">
                <DeckCategoryContent categoryCards={mainDeckCards} />
              </TabsContent>
              
              <TabsContent value="extra" className="mt-0">
                <DeckCategoryContent categoryCards={extraDeckCards} />
              </TabsContent>
              
              <TabsContent value="side" className="mt-0">
                <DeckCategoryContent categoryCards={sideDeckCards} />
              </TabsContent>
            </Tabs>

            <Dialog open={addDialogOpen} onOpenChange={(open) => {
              setAddDialogOpen(open)
              if (!open) clearSelection()
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setNewCard(prev => ({ ...prev, category: activeTab }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card to {activeTab === 'main' ? 'Main' : activeTab === 'extra' ? 'Extra' : 'Side'} Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-primary/30 max-w-lg">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'var(--font-orbitron)' }}>Add Card to {deck.name}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 pt-4">
                  {/* Card Search */}
                  <div className="space-y-2" ref={searchRef}>
                    <Label htmlFor="card-search">Search Card Database</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="card-search"
                        placeholder="Search for a card..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          if (selectedCard) setSelectedCard(null)
                        }}
                        className="bg-secondary border-border pl-9 pr-9"
                      />
                      {(searchQuery || isSearching) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : searchQuery && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0"
                              onClick={clearSelection}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                        {searchResults.map((card) => (
                          <button
                            key={card.id}
                            className="w-full px-3 py-2 text-left hover:bg-secondary/80 flex items-center gap-3 border-b border-border/50 last:border-0"
                            onClick={() => handleSelectCard(card)}
                          >
                            {card.card_images?.[0]?.image_url_small && (
                              <img 
                                src={card.card_images[0].image_url_small} 
                                alt={card.name}
                                className="w-8 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{card.type}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getCardType(card.type)}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                      <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-card border border-border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
                        No cards found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>

                  {/* Selected Card Preview */}
                  {selectedCard && (
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="flex items-start gap-3">
                        {selectedCard.card_images?.[0]?.image_url_small && (
                          <img 
                            src={selectedCard.card_images[0].image_url_small} 
                            alt={selectedCard.name}
                            className="w-16 h-24 object-cover rounded shadow-md"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{selectedCard.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{selectedCard.type}</p>
                          {selectedCard.atk !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              ATK: {selectedCard.atk} / DEF: {selectedCard.def ?? 'N/A'}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedCard.desc}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Entry Fallback */}
                  {!selectedCard && (
                    <div className="space-y-2">
                      <Label htmlFor="card-name" className="text-muted-foreground text-xs">Or enter card name manually</Label>
                      <Input
                        id="card-name"
                        placeholder="e.g. Blue-Eyes White Dragon"
                        value={newCard.name}
                        onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                        className="bg-secondary border-border"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Deck Category</Label>
                    <Select 
                      value={newCard.category} 
                      onValueChange={(value: DeckCategory) => setNewCard({ ...newCard, category: value })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">
                          <span className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Main Deck
                          </span>
                        </SelectItem>
                        <SelectItem value="extra">
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-400" />
                            Extra Deck
                          </span>
                        </SelectItem>
                        <SelectItem value="side">
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-cyan-400" />
                            Side Deck
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Card Type</Label>
                      <Select 
                        value={newCard.type} 
                        onValueChange={(value: 'monster' | 'spell' | 'trap') => setNewCard({ ...newCard, type: value })}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monster">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-yellow-400" />
                              Monster
                            </span>
                          </SelectItem>
                          <SelectItem value="spell">
                            <span className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-green-400" />
                              Spell
                            </span>
                          </SelectItem>
                          <SelectItem value="trap">
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-400" />
                              Trap
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Select 
                        value={String(newCard.quantity)} 
                        onValueChange={(value) => setNewCard({ ...newCard, quantity: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleAddCard} 
                    disabled={adding || !newCard.name.trim()}
                    className="w-full bg-primary hover:bg-primary/80"
                  >
                    {adding ? 'Adding...' : 'Add Card'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}
