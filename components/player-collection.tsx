'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search, Trash2, Package, Filter, SortAsc, Edit2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CollectionCard, CardCondition } from '@/lib/types'
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

const RARITIES = [
  'Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare', 
  'Ultimate Rare', 'Ghost Rare', 'Starlight Rare', 'Collector\'s Rare',
  'Prismatic Secret Rare', 'Quarter Century Secret Rare'
]

export function PlayerCollection({ playerId }: PlayerCollectionProps) {
  const [collection, setCollection] = useState<CollectionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'added' | 'quantity'>('added')
  
  // Add card form state
  const [cardSearch, setCardSearch] = useState('')
  const [searchResults, setSearchResults] = useState<YGOCard[]>([])
  const [selectedCard, setSelectedCard] = useState<YGOCard | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [rarity, setRarity] = useState<string>('')
  const [condition, setCondition] = useState<CardCondition>('near_mint')
  const [notes, setNotes] = useState('')

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
  }

  const handleAddCard = async () => {
    if (!selectedCard) {
      toast.error('Please select a card')
      return
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
      rarity: rarity || null,
      condition,
      notes: notes || null,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('This card with same rarity and condition already exists in your collection')
      } else {
        toast.error('Failed to add card')
      }
      return
    }

    toast.success(`Added ${quantity}x ${selectedCard.name} to collection`)
    setIsAddDialogOpen(false)
    resetForm()
    fetchCollection()
  }

  const resetForm = () => {
    setCardSearch('')
    setSelectedCard(null)
    setSearchResults([])
    setQuantity(1)
    setRarity('')
    setCondition('near_mint')
    setNotes('')
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

  // Filter and sort collection
  const filteredCollection = collection
    .filter(card => {
      const matchesSearch = card.card_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || card.card_type?.toLowerCase().includes(filterType.toLowerCase())
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.card_name.localeCompare(b.card_name)
      if (sortBy === 'quantity') return b.quantity - a.quantity
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    })

  // Get unique card types for filter
  const cardTypes = [...new Set(collection.map(c => c.card_type).filter(Boolean))]

  // Stats
  const totalCards = collection.reduce((sum, c) => sum + c.quantity, 0)
  const uniqueCards = collection.length
  const monsterCount = collection.filter(c => c.card_type?.toLowerCase().includes('monster')).reduce((sum, c) => sum + c.quantity, 0)
  const spellCount = collection.filter(c => c.card_type?.toLowerCase() === 'spell card').reduce((sum, c) => sum + c.quantity, 0)
  const trapCount = collection.filter(c => c.card_type?.toLowerCase() === 'trap card').reduce((sum, c) => sum + c.quantity, 0)

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

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalCards}</p>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{uniqueCards}</p>
            <p className="text-xs text-muted-foreground">Unique Cards</p>
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
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your collection..."
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
          </SelectContent>
        </Select>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border">
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
                    onChange={(e) => { setCardSearch(e.target.value); setSelectedCard(null) }}
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
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Card Preview */}
              {selectedCard && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
                  {selectedCard.card_images[0] && (
                    <Image
                      src={selectedCard.card_images[0].image_url_small}
                      alt={selectedCard.name}
                      width={48}
                      height={70}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{selectedCard.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCard.type}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedCard(null); setCardSearch('') }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

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

              {/* Rarity */}
              <div className="space-y-2">
                <Label>Rarity (Optional)</Label>
                <Select value={rarity} onValueChange={setRarity}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select rarity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="Set number, edition, etc..."
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {card.rarity && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {card.rarity}
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
