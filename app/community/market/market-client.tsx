'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search, Filter, Plus, Coins, TrendingUp, TrendingDown,
  ShoppingCart, Tag, Clock, User, Star, MessageCircle,
  ArrowUpDown, Grid, List, Heart, Eye
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

// Mock data for market listings
const mockListings = [
  {
    id: '1',
    card_id: 46986414,
    card_name: 'Dark Magician',
    card_type: 'Normal Monster',
    rarity: 'Ultra Rare',
    condition: 'Near Mint',
    price: 500,
    currency: 'coins',
    seller: { id: 'user1', name: 'DuelistKing', avatar: '', rating: 4.8 },
    listed_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
    views: 45,
    favorites: 12,
    quantity: 1,
  },
  {
    id: '2',
    card_id: 89631139,
    card_name: 'Blue-Eyes White Dragon',
    card_type: 'Normal Monster',
    rarity: 'Secret Rare',
    condition: 'Mint',
    price: 1200,
    currency: 'coins',
    seller: { id: 'user2', name: 'KaibaFan', avatar: '', rating: 4.9 },
    listed_at: new Date(Date.now() - 1000 * 60 * 60 * 5),
    views: 120,
    favorites: 34,
    quantity: 2,
  },
  {
    id: '3',
    card_id: 70903634,
    card_name: 'Exodia the Forbidden One',
    card_type: 'Effect Monster',
    rarity: 'Ultra Rare',
    condition: 'Lightly Played',
    price: 2500,
    currency: 'coins',
    seller: { id: 'user3', name: 'ExodiaCollector', avatar: '', rating: 5.0 },
    listed_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    views: 250,
    favorites: 89,
    quantity: 1,
  },
  {
    id: '4',
    card_id: 44508094,
    card_name: 'Dark Magician Girl',
    card_type: 'Effect Monster',
    rarity: 'Secret Rare',
    condition: 'Near Mint',
    price: 800,
    currency: 'coins',
    seller: { id: 'user4', name: 'MagicianFan', avatar: '', rating: 4.7 },
    listed_at: new Date(Date.now() - 1000 * 60 * 30),
    views: 78,
    favorites: 23,
    quantity: 3,
  },
]

type Listing = typeof mockListings[0]

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getRarityColor(rarity: string) {
  switch (rarity.toLowerCase()) {
    case 'common': return 'bg-gray-500'
    case 'rare': return 'bg-blue-500'
    case 'super rare': return 'bg-green-500'
    case 'ultra rare': return 'bg-yellow-500'
    case 'secret rare': return 'bg-purple-500'
    case 'ultimate rare': return 'bg-pink-500'
    default: return 'bg-gray-500'
  }
}

function getConditionColor(condition: string) {
  switch (condition.toLowerCase()) {
    case 'mint': return 'text-green-400'
    case 'near mint': return 'text-green-300'
    case 'lightly played': return 'text-yellow-400'
    case 'moderately played': return 'text-orange-400'
    case 'heavily played': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

export function MarketClient() {
  const [listings, setListings] = useState<Listing[]>(mockListings)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterRarity, setFilterRarity] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showCreateListing, setShowCreateListing] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Filter and sort listings
  const filteredListings = listings
    .filter(listing => {
      if (searchQuery && !listing.card_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterRarity !== 'all' && listing.rarity.toLowerCase() !== filterRarity.toLowerCase()) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.listed_at.getTime() - a.listed_at.getTime()
        case 'oldest': return a.listed_at.getTime() - b.listed_at.getTime()
        case 'price-low': return a.price - b.price
        case 'price-high': return b.price - a.price
        case 'popular': return b.views - a.views
        default: return 0
      }
    })

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBuy = (listing: Listing) => {
    toast.success(`Purchased ${listing.card_name} for ${listing.price} coins!`)
    setSelectedListing(null)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterRarity} onValueChange={setFilterRarity}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="super rare">Super Rare</SelectItem>
              <SelectItem value="ultra rare">Ultra Rare</SelectItem>
              <SelectItem value="secret rare">Secret Rare</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setShowCreateListing(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Sell Card
          </Button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{listings.length}</p>
              <p className="text-sm text-muted-foreground">Active Listings</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-sm text-muted-foreground">Sales This Week</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Coins className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">5,000</p>
              <p className="text-sm text-muted-foreground">Your Balance</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">In Cart</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Listings Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredListings.map(listing => (
            <Card 
              key={listing.id} 
              className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setSelectedListing(listing)}
            >
              <div className="relative aspect-[421/614]">
                <Image
                  src={`https://images.ygoprodeck.com/images/cards/${listing.card_id}.jpg`}
                  alt={listing.card_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(listing.id)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <Heart className={cn(
                    "h-4 w-4",
                    favorites.has(listing.id) ? "fill-red-500 text-red-500" : "text-white"
                  )} />
                </button>
                <Badge className={cn("absolute top-2 left-2", getRarityColor(listing.rarity))}>
                  {listing.rarity}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold truncate">{listing.card_name}</h3>
                <p className={cn("text-sm", getConditionColor(listing.condition))}>
                  {listing.condition}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Coins className="h-4 w-4" />
                    <span className="font-bold">{listing.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> {listing.views}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3" /> {listing.favorites}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-3 pt-0 flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{listing.seller.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">{listing.seller.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatTimeAgo(listing.listed_at)}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredListings.map(listing => (
            <Card 
              key={listing.id}
              className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setSelectedListing(listing)}
            >
              <div className="flex gap-4">
                <div className="w-16 h-24 relative rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={`https://images.ygoprodeck.com/images/cards_small/${listing.card_id}.jpg`}
                    alt={listing.card_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{listing.card_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-xs", getRarityColor(listing.rarity))}>
                          {listing.rarity}
                        </Badge>
                        <span className={cn("text-sm", getConditionColor(listing.condition))}>
                          {listing.condition}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Coins className="h-4 w-4" />
                      <span className="font-bold text-lg">{listing.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {listing.seller.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" /> {listing.seller.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTimeAgo(listing.listed_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {listing.views}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(listing.id)
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Heart className={cn(
                    "h-5 w-5",
                    favorites.has(listing.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No listings found</p>
        </div>
      )}

      {/* Listing Detail Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-2xl">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedListing.card_name}</DialogTitle>
                <DialogDescription>
                  Listed by {selectedListing.seller.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="aspect-[421/614] relative rounded-lg overflow-hidden">
                  <Image
                    src={`https://images.ygoprodeck.com/images/cards/${selectedListing.card_id}.jpg`}
                    alt={selectedListing.card_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Badge className={cn(getRarityColor(selectedListing.rarity))}>
                      {selectedListing.rarity}
                    </Badge>
                    <p className={cn("mt-2", getConditionColor(selectedListing.condition))}>
                      Condition: {selectedListing.condition}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {selectedListing.quantity}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{selectedListing.seller.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedListing.seller.name}</p>
                      <div className="flex items-center gap-1 text-sm text-yellow-500">
                        <Star className="h-4 w-4 fill-yellow-500" />
                        {selectedListing.seller.rating}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <div className="flex items-center gap-2 text-2xl font-bold text-yellow-500">
                        <Coins className="h-6 w-6" />
                        {selectedListing.price}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{selectedListing.views} views</p>
                      <p>{selectedListing.favorites} favorites</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => toggleFavorite(selectedListing.id)}>
                  <Heart className={cn(
                    "h-4 w-4 mr-2",
                    favorites.has(selectedListing.id) && "fill-red-500 text-red-500"
                  )} />
                  {favorites.has(selectedListing.id) ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Seller
                </Button>
                <Button onClick={() => handleBuy(selectedListing)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Listing Dialog (placeholder) */}
      <Dialog open={showCreateListing} onOpenChange={setShowCreateListing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Listing</DialogTitle>
            <DialogDescription>
              List a card for sale on the marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>Create listing form coming soon...</p>
            <p className="text-sm mt-2">You&apos;ll be able to search your collection and list cards for sale</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateListing(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
