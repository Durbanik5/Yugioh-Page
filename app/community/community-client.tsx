'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { toast } from 'sonner'
import { 
  Star, Heart, Copy, Layers, User, Filter,
  SortAsc, Code, Check, Loader2
} from 'lucide-react'
import type { PublishedDeck, Player, DeckFormat } from '@/lib/types'
import { 
  rateDeck, 
  toggleFavorite, 
  copyDeckToPlayer, 
  generateDeckCode,
  getPublishedDecks 
} from '@/lib/community-actions'

interface CommunityClientProps {
  initialDecks: PublishedDeck[]
  players: Player[]
}

type SortOption = 'newest' | 'rating' | 'favorites'

export function CommunityClient({ initialDecks, players }: CommunityClientProps) {
  const router = useRouter()
  const [decks, setDecks] = useState(initialDecks)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [formatFilter, setFormatFilter] = useState<DeckFormat | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Load selected player from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('community_player_id')
    if (stored && players.find(p => p.id === stored)) {
      setSelectedPlayerId(stored)
    }
  }, [players])

  // Save selected player to localStorage
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId)
    localStorage.setItem('community_player_id', playerId)
    // Refresh decks to get user-specific data
    refreshDecks(playerId)
  }

  const refreshDecks = async (playerId?: string) => {
    const newDecks = await getPublishedDecks(playerId || selectedPlayerId || undefined)
    setDecks(newDecks)
  }

  const selectedPlayer = players.find(p => p.id === selectedPlayerId)

  // Filter and sort decks
  const filteredDecks = useMemo(() => {
    let result = [...decks]

    // Format filter
    if (formatFilter !== 'all') {
      result = result.filter(d => d.format === formatFilter)
    }

    // Favorites only filter
    if (showFavoritesOnly && selectedPlayerId) {
      result = result.filter(d => d.is_favorited)
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        break
      case 'favorites':
        result.sort((a, b) => b.favorite_count - a.favorite_count)
        break
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [decks, formatFilter, sortBy, showFavoritesOnly, selectedPlayerId])

  const handleRate = async (deckId: string, rating: number) => {
    if (!selectedPlayerId) {
      toast.error('Please select your player profile first')
      return
    }

    setLoadingStates(prev => ({ ...prev, [`rate-${deckId}`]: true }))
    const result = await rateDeck(deckId, selectedPlayerId, rating)
    setLoadingStates(prev => ({ ...prev, [`rate-${deckId}`]: false }))

    if (result.success) {
      toast.success(`Rated ${rating} stars!`)
      refreshDecks(selectedPlayerId)
    } else {
      toast.error(result.error || 'Failed to rate deck')
    }
  }

  const handleToggleFavorite = async (deckId: string) => {
    if (!selectedPlayerId) {
      toast.error('Please select your player profile first')
      return
    }

    setLoadingStates(prev => ({ ...prev, [`fav-${deckId}`]: true }))
    const result = await toggleFavorite(deckId, selectedPlayerId)
    setLoadingStates(prev => ({ ...prev, [`fav-${deckId}`]: false }))

    if (result.success) {
      const deck = decks.find(d => d.id === deckId)
      toast.success(deck?.is_favorited ? 'Removed from favorites' : 'Added to favorites!')
      refreshDecks(selectedPlayerId)
    } else {
      toast.error(result.error || 'Failed to update favorite')
    }
  }

  const handleCopyDeck = async (deckId: string, targetPlayerId: string) => {
    setLoadingStates(prev => ({ ...prev, [`copy-${deckId}`]: true }))
    const result = await copyDeckToPlayer(deckId, targetPlayerId)
    setLoadingStates(prev => ({ ...prev, [`copy-${deckId}`]: false }))

    if (result.success) {
      toast.success('Deck copied to profile!')
      router.push(`/player/${targetPlayerId}`)
    } else {
      toast.error(result.error || 'Failed to copy deck')
    }
  }

  const handleCopyCode = async (deckId: string) => {
    setLoadingStates(prev => ({ ...prev, [`code-${deckId}`]: true }))
    const code = await generateDeckCode(deckId)
    setLoadingStates(prev => ({ ...prev, [`code-${deckId}`]: false }))

    if (code) {
      await navigator.clipboard.writeText(code)
      toast.success('Deck code copied to clipboard!')
    } else {
      toast.error('Failed to generate deck code')
    }
  }

  return (
    <div className="space-y-6">
      {/* Player Selector Banner */}
      <Card className="bg-card/50 border-primary/20">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {selectedPlayer 
                  ? `Acting as: ${selectedPlayer.nickname}`
                  : 'Select your profile to rate, favorite, and copy decks'
                }
              </span>
            </div>
            <Select value={selectedPlayerId || ''} onValueChange={handlePlayerSelect}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select your profile" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {player.nickname.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {player.nickname}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-primary" />
          <h2 
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            SHARED DECKS
          </h2>
          <span className="text-sm text-muted-foreground font-mono">
            ({filteredDecks.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Format Filter */}
          <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as DeckFormat | 'all')}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="tcg">TCG</SelectItem>
              <SelectItem value="ocg">OCG</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="favorites">Most Favorited</SelectItem>
            </SelectContent>
          </Select>

          {/* Favorites Toggle */}
          {selectedPlayerId && (
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={showFavoritesOnly ? "bg-primary" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
            </Button>
          )}
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <Empty
          title="No Decks Found"
          description={showFavoritesOnly 
            ? "You haven't favorited any decks yet." 
            : "No decks have been published to the community yet."
          }
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map(deck => (
            <DeckCard
              key={deck.id}
              deck={deck}
              players={players}
              selectedPlayerId={selectedPlayerId}
              loadingStates={loadingStates}
              onRate={handleRate}
              onToggleFavorite={handleToggleFavorite}
              onCopyDeck={handleCopyDeck}
              onCopyCode={handleCopyCode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DeckCardProps {
  deck: PublishedDeck
  players: Player[]
  selectedPlayerId: string | null
  loadingStates: Record<string, boolean>
  onRate: (deckId: string, rating: number) => void
  onToggleFavorite: (deckId: string) => void
  onCopyDeck: (deckId: string, targetPlayerId: string) => void
  onCopyCode: (deckId: string) => void
}

function DeckCard({ 
  deck, 
  players,
  selectedPlayerId,
  loadingStates,
  onRate,
  onToggleFavorite,
  onCopyDeck,
  onCopyCode
}: DeckCardProps) {
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [selectedCopyTarget, setSelectedCopyTarget] = useState<string>('')

  const mainDeckCount = deck.cards?.filter(c => c.deck_category === 'main').reduce((sum, c) => sum + c.quantity, 0) || 0
  const extraDeckCount = deck.cards?.filter(c => c.deck_category === 'extra').reduce((sum, c) => sum + c.quantity, 0) || 0

  const formatColors: Record<DeckFormat, string> = {
    tcg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ocg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    casual: 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      {/* Banner */}
      {deck.banner_url && (
        <div className="h-24 overflow-hidden rounded-t-lg">
          <img 
            src={deck.banner_url} 
            alt={deck.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{deck.name}</h3>
            {deck.archetype && (
              <p className="text-sm text-muted-foreground truncate">{deck.archetype}</p>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`shrink-0 ${formatColors[deck.format]}`}
          >
            {deck.format.toUpperCase()}
          </Badge>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={deck.player?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {deck.player?.nickname?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            by {deck.player?.nickname || 'Unknown'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Main: {mainDeckCount}</span>
            <span>Extra: {extraDeckCount}</span>
          </div>
        </div>

        {/* Rating Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onRate(deck.id, star)}
                disabled={!selectedPlayerId || loadingStates[`rate-${deck.id}`]}
                className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star 
                  className={`h-5 w-5 ${
                    (deck.user_rating && star <= deck.user_rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : deck.average_rating && star <= Math.round(deck.average_rating)
                        ? 'fill-yellow-400/50 text-yellow-400/50'
                        : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {deck.average_rating ? deck.average_rating.toFixed(1) : '-'} ({deck.rating_count})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Favorite Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleFavorite(deck.id)}
            disabled={!selectedPlayerId || loadingStates[`fav-${deck.id}`]}
            className={deck.is_favorited ? 'border-red-500/50 text-red-400' : ''}
          >
            {loadingStates[`fav-${deck.id}`] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${deck.is_favorited ? 'fill-red-400' : ''}`} />
            )}
            <span className="ml-1">{deck.favorite_count}</span>
          </Button>

          {/* Copy Code Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopyCode(deck.id)}
            disabled={loadingStates[`code-${deck.id}`]}
          >
            {loadingStates[`code-${deck.id}`] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Code className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Code</span>
          </Button>

          {/* Copy to Profile Button */}
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Copy</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy Deck to Profile</DialogTitle>
                <DialogDescription>
                  Select which player profile to copy this deck to. A new deck will be created with all the same cards.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={selectedCopyTarget} onValueChange={setSelectedCopyTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={player.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {player.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {player.nickname}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedCopyTarget) {
                      onCopyDeck(deck.id, selectedCopyTarget)
                      setCopyDialogOpen(false)
                    }
                  }}
                  disabled={!selectedCopyTarget || loadingStates[`copy-${deck.id}`]}
                  className="w-full"
                >
                  {loadingStates[`copy-${deck.id}`] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copy Deck
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
