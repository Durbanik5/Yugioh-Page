'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search, Trash2, Package, Filter, SortAsc, X, DollarSign, RefreshCw, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CollectionCard, CardCondition, CardSetInfo, CardPriceInfo } from '@/lib/types'
import Image from 'next/image'

interface YGOCard {
  id: number
  name: string
  type: string
  race: string
  attribute?: string
  level?: number
  atk?: number
  def?: number
  card_images: { image_url: string; image_url_small: string }[]
  card_sets?: CardSetInfo[]
  card_prices?: CardPriceInfo[]
}

interface PlayerCollectionProps {
  playerId: string
}

const CONDITIONS: { value: CardCondition; label: string }[] = [
  { value: 'mint', label: 'Mint' },
  { value: 'near_mint', label: 'Near Mint' },
  { value: 'lightly_played', label: 'Lightly Played' },
  { value: 'moderately_played', label: 'Moderately Played' },
  { value: 'heavily_played', label: 'Heavily Played' },
  { value: 'damaged', label: 'Damaged' },
]

const EDITIONS = [
  { value: '1st_edition', label: '1st Edition' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'limited', label: 'Limited Edition' },
]

export function PlayerCollection({ playerId }: PlayerCollectionProps) {
  const [collection, setCollection] = useState<CollectionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'added' | 'quantity' | 'price'>('added')
  
  // Add card form state
  const [cardSearch, setCardSearch] = useState('')
  const [searchResults, setSearchResults] = useState<YGOCard[]>([])
  const [selectedCard, setSelectedCard] = useState<YGOCard | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<CardCondition>('near_mint')
  const [notes, setNotes] = useState('')
  
  // New set/edition state
  const [selectedSet, setSelectedSet] = useState<CardSetInfo | null>(null)
  const [edition, setEdition] = useState<string>('unlimited')
  
  // Price refresh state
  const [refreshingPrices, setRefreshingPrices] = useState(false)

  const supabase = createClient()

  const fetchCollection = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('player_collection')
      .select('*')
      .eq('player_id', playerId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Error fetching collection:', error)
    } else {
      setCollection(data || [])
    }
    setLoading(false)
  }, [playerId, supabase])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  // Card search with debounce
  useEffect(() => {
    if (cardSearch.length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardSearch)}&num=10&offset=0`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.data || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [cardSearch])

  const handleSelectCard = (card: YGOCard) => {
    setSelectedCard(card)
    setCardSearch(card.name)
    setSearchResults([])
    setSelectedSet(null)
  }

  const handleAddCard = async () => {
    if (!selectedCard) {
      toast.error('Please select a card')
      return
    }

    // Get the price from selected set or from card_prices
    let marketPrice: number | null = null
    if (selectedSet?.set_price) {
      marketPrice = parseFloat(selectedSet.set_price) || null
    } else if (selectedCard.card_prices?.[0]?.tcgplayer_price) {
      marketPrice = parseFloat(selectedCard.card_prices[0].tcgplayer_price) || null
    }

    const { error } = await supabase.from('player_collection').insert({
      player_id: playerId,
      card_name: selectedCard.name,
      card_id: selectedCard.id,
      card_image: selectedCard.card_images[0]?.image_url_small,
      card_type: selectedCard.type,
      card_race: selectedCard.race,
      card_attribute: selectedCard.attribute || null,
      card_level: selectedCard.level || null,
      card_atk: selectedCard.atk ?? null,
      card_def: selectedCard.def ?? null,
      quantity,
      rarity: selectedSet?.set_rarity || null,
      condition,
      notes: notes || null,
      set_name: selectedSet?.set_name || null,
      set_code: selectedSet?.set_code || null,
      edition: edition || null,
      market_price: marketPrice,
      price_updated_at: marketPrice ? new Date().toISOString() : null,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('This exact card (same set, rarity, condition) already exists')
      } else {
        toast.error('Failed to add card')
        console.error(error)
      }
      return
    }

    toast.success(`Added ${quantity}x ${selectedCard.name}${selectedSet ? ` (${selectedSet.set_code})` : ''} to collection`)
    setIsAddDialogOpen(false)
    resetForm()
    fetchCollection()
  }

  const resetForm = () => {
    setCardSearch('')
    setSelectedCard(null)
    setSearchResults([])
    setQuantity(1)
    setCondition('near_mint')
    setNotes('')
    setSelectedSet(null)
    setEdition('unlimited')
  }

  const handleUpdateQuantity = async (card: CollectionCard, newQuantity: number) => {
    if (newQuantity < 1) return

    const { error } = await supabase
      .from('player_collection')
      .update({ quantity: newQuantity })
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to update quantity')
      return
    }

    setCollection(prev => prev.map(c => c.id === card.id ? { ...c, quantity: newQuantity } : c))
  }

  const handleDeleteCard = async (card: CollectionCard) => {
    const { error } = await supabase
      .from('player_collection')
      .delete()
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to remove card')
      return
    }

    toast.success(`Removed ${card.card_name} from collection`)
    setCollection(prev => prev.filter(c => c.id !== card.id))
  }

  // Refresh prices for all cards with card_id
  const handleRefreshPrices = async () => {
    setRefreshingPrices(true)
    const cardsWithIds = collection.filter(c => c.card_id)
    const uniqueCardIds = [...new Set(cardsWithIds.map(c => c.card_id))]
    
    let updated = 0
    for (const cardId of uniqueCardIds) {
      try {
        const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`)
        if (res.ok) {
          const data = await res.json()
          const cardData = data.data?.[0]
          if (cardData) {
            // Update all matching cards in collection
            const matchingCards = collection.filter(c => c.card_id === cardId)
            for (const card of matchingCards) {
              // Find matching set price or use general price
              let newPrice: number | null = null
              if (card.set_code && cardData.card_sets) {
                const matchingSet = cardData.card_sets.find((s: CardSetInfo) => s.set_code === card.set_code)
                if (matchingSet) {
                  newPrice = parseFloat(matchingSet.set_price) || null
                }
              }
              if (!newPrice && cardData.card_prices?.[0]?.tcgplayer_price) {
                newPrice = parseFloat(cardData.card_prices[0].tcgplayer_price) || null
              }
              
              if (newPrice !== null) {
                await supabase
                  .from('player_collection')
                  .update({ 
                    market_price: newPrice,
                    price_updated_at: new Date().toISOString()
                  })
                  .eq('id', card.id)
                updated++
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching price for card:', cardId, error)
      }
    }
    
    toast.success(`Updated prices for ${updated} cards`)
    fetchCollection()
    setRefreshingPrices(false)
  }

  // Filter and sort collection
  const filteredCollection = useMemo(() => {
    return collection
      .filter(card => {
        const matchesSearch = card.card_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (card.set_code?.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesType = filterType === 'all' || 
          (filterType === 'token' ? card.card_type?.toLowerCase().includes('token') : card.card_type?.toLowerCase().includes(filterType.toLowerCase()))
        return matchesSearch && matchesType
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.card_name.localeCompare(b.card_name)
        if (sortBy === 'quantity') return b.quantity - a.quantity
        if (sortBy === 'price') return (b.market_price || 0) - (a.market_price || 0)
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      })
  }, [collection, searchQuery, filterType, sortBy])

  // Stats - Reordered: Monsters, Spells, Traps, Tokens
  const totalCards = collection.reduce((sum, c) => sum + c.quantity, 0)
  const monsterCount = collection.filter(c => c.card_type?.toLowerCase().includes('monster') && !c.card_type?.toLowerCase().includes('token')).reduce((sum, c) => sum + c.quantity, 0)
  const spellCount = collection.filter(c => c.card_type?.toLowerCase() === 'spell card').reduce((sum, c) => sum + c.quantity, 0)
  const trapCount = collection.filter(c => c.card_type?.toLowerCase() === 'trap card').reduce((sum, c) => sum + c.quantity, 0)
  const tokenCount = collection.filter(c => c.card_type?.toLowerCase().includes('token')).reduce((sum, c) => sum + c.quantity, 0)
  
  // Calculate total collection value
  const totalValue = collection.reduce((sum, c) => sum + ((c.market_price || 0) * c.quantity), 0)

  const getConditionColor = (cond: CardCondition | null) => {
    switch (cond) {
      case 'mint': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'near_mint': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'lightly_played': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'moderately_played': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'heavily_played': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'damaged': return 'bg-red-700/20 text-red-300 border-red-700/30'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return null
    return `$${price.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary - Reordered: Total, Monsters, Spells, Traps, Tokens, Value */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalCards}</p>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{monsterCount}</p>
            <p className="text-xs text-muted-foreground">Monsters</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{spellCount}</p>
            <p className="text-xs text-muted-foreground">Spells</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{trapCount}</p>
            <p className="text-xs text-muted-foreground">Traps</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-500">{tokenCount}</p>
            <p className="text-xs text-muted-foreground">Tokens</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">${totalValue.toFixed(2)}</p>
            <p className="text-xs text-amber-400/70">Est. Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards or set codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] bg-input border-border">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monster">Monsters</SelectItem>
            <SelectItem value="spell">Spells</SelectItem>
            <SelectItem value="trap">Traps</SelectItem>
            <SelectItem value="token">Tokens</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[150px] bg-input border-border">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="added">Recently Added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          onClick={handleRefreshPrices}
          disabled={refreshingPrices || collection.length === 0}
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshingPrices ? 'animate-spin' : ''}`} />
          Update Prices
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Card to Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Card Search */}
              <div className="space-y-2">
                <Label>Search Card</Label>
                <div className="relative">
                  <Input
                    placeholder="Type card name..."
                    value={cardSearch}
                    onChange={(e) => { setCardSearch(e.target.value); setSelectedCard(null); setSelectedSet(null) }}
                    className="bg-input border-border"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {searchResults.length > 0 && !selectedCard && (
                  <div className="absolute z-50 w-full max-h-64 overflow-auto bg-popover border border-border rounded-md shadow-lg mt-1">
                    {searchResults.map((card) => (
                      <button
                        type="button"
                        key={card.id}
                        onClick={() => handleSelectCard(card)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left"
                      >
                        {card.card_images[0] && (
                          <Image
                            src={card.card_images[0].image_url_small}
                            alt={card.name}
                            width={32}
                            height={47}
                            className="rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{card.name}</p>
                          <p className="text-xs text-muted-foreground">{card.type}</p>
                        </div>
                        {card.card_prices?.[0]?.tcgplayer_price && parseFloat(card.card_prices[0].tcgplayer_price) > 0 && (
                          <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                            ${parseFloat(card.card_prices[0].tcgplayer_price).toFixed(2)}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Card Preview */}
              {selectedCard && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border">
                  {selectedCard.card_images[0] && (
                    <Image
                      src={selectedCard.card_images[0].image_url_small}
                      alt={selectedCard.name}
                      width={60}
                      height={88}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{selectedCard.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCard.type}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => { setSelectedCard(null); setCardSearch(''); setSelectedSet(null) }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedCard.card_prices?.[0]?.tcgplayer_price && parseFloat(selectedCard.card_prices[0].tcgplayer_price) > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-amber-400">
                        <DollarSign className="h-3 w-3" />
                        TCGPlayer: ${parseFloat(selectedCard.card_prices[0].tcgplayer_price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Set Selection (TCGPlayer-style) */}
              {selectedCard && selectedCard.card_sets && selectedCard.card_sets.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Select Printing / Set
                  </Label>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-background/50">
                    {/* Option for no specific set */}
                    <button
                      type="button"
                      onClick={() => setSelectedSet(null)}
                      className={`w-full flex items-center justify-between p-2 rounded text-left text-sm transition-colors ${
                        selectedSet === null ? 'bg-primary/20 border border-primary/50' : 'hover:bg-accent'
                      }`}
                    >
                      <span className="text-muted-foreground">No specific set</span>
                    </button>
                    {selectedCard.card_sets.map((set, idx) => (
                      <button
                        type="button"
                        key={`${set.set_code}-${idx}`}
                        onClick={() => setSelectedSet(set)}
                        className={`w-full flex items-center justify-between p-2 rounded text-left text-sm transition-colors ${
                          selectedSet?.set_code === set.set_code ? 'bg-primary/20 border border-primary/50' : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{set.set_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{set.set_code}</span>
                            <span>•</span>
                            <span>{set.set_rarity}</span>
                          </div>
                        </div>
                        {parseFloat(set.set_price) > 0 && (
                          <Badge variant="outline" className="text-green-400 border-green-400/50 ml-2 shrink-0">
                            ${parseFloat(set.set_price).toFixed(2)}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedSet && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="text-foreground font-mono">{selectedSet.set_code}</span> - {selectedSet.set_rarity}
                    </p>
                  )}
                </div>
              )}

              {/* Edition */}
              <div className="space-y-2">
                <Label>Edition</Label>
                <Select value={edition} onValueChange={setEdition}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITIONS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="bg-input border-border"
                />
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-input border-border resize-none"
                  rows={2}
                />
              </div>

              <Button onClick={handleAddCard} className="w-full" disabled={!selectedCard}>
                Add to Collection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Collection Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCollection.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterType !== 'all' 
                ? 'No cards match your search' 
                : 'Your collection is empty. Start adding cards!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCollection.map((card) => (
            <Card key={card.id} className="bg-card border-border group relative overflow-hidden">
              <div className="aspect-[59/86] relative">
                {card.card_image ? (
                  <Image
                    src={card.card_image}
                    alt={card.card_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {/* Quantity Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-black/70 text-white border-0">
                    x{card.quantity}
                  </Badge>
                </div>
                {/* Price Badge */}
                {card.market_price && card.market_price > 0 && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-amber-500/90 text-black border-0 font-semibold">
                      ${card.market_price.toFixed(2)}
                    </Badge>
                  </div>
                )}
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(card, card.quantity - 1)}
                      disabled={card.quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="text-white font-bold min-w-[2rem] text-center">{card.quantity}</span>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(card, card.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteCard(card)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate" title={card.card_name}>
                  {card.card_name}
                </p>
                {/* Set Code */}
                {card.set_code && (
                  <p className="text-[10px] text-cyan-400 font-mono truncate" title={`${card.set_name} - ${card.set_code}`}>
                    {card.set_code}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {card.rarity && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {card.rarity}
                    </Badge>
                  )}
                  {card.edition && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-400 border-amber-400/30">
                      {EDITIONS.find(e => e.value === card.edition)?.label || card.edition}
                    </Badge>
                  )}
                  {card.condition && (
                    <Badge className={`text-[10px] px-1 py-0 ${getConditionColor(card.condition)}`}>
                      {CONDITIONS.find(c => c.value === card.condition)?.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
