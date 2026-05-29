'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, 
  Filter, 
  Database,
  Sword,
  Shield,
  Sparkles,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Moon,
  Sun,
  Star,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import Image from 'next/image'

// Yu-Gi-Oh card attributes
const ATTRIBUTES = [
  { value: 'all', label: 'All Attributes', icon: Star, color: 'text-slate-400' },
  { value: 'DARK', label: 'DARK', icon: Moon, color: 'text-purple-400' },
  { value: 'LIGHT', label: 'LIGHT', icon: Sun, color: 'text-yellow-400' },
  { value: 'FIRE', label: 'FIRE', icon: Flame, color: 'text-red-400' },
  { value: 'WATER', label: 'WATER', icon: Droplets, color: 'text-blue-400' },
  { value: 'WIND', label: 'WIND', icon: Wind, color: 'text-green-400' },
  { value: 'EARTH', label: 'EARTH', icon: Mountain, color: 'text-amber-600' },
  { value: 'DIVINE', label: 'DIVINE', icon: Sparkles, color: 'text-yellow-500' },
]

// Yu-Gi-Oh card types
const CARD_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Normal Monster', label: 'Normal Monster' },
  { value: 'Effect Monster', label: 'Effect Monster' },
  { value: 'Ritual Monster', label: 'Ritual Monster' },
  { value: 'Fusion Monster', label: 'Fusion Monster' },
  { value: 'Synchro Monster', label: 'Synchro Monster' },
  { value: 'XYZ Monster', label: 'Xyz Monster' },
  { value: 'Pendulum Monster', label: 'Pendulum Monster' },
  { value: 'Link Monster', label: 'Link Monster' },
  { value: 'Spell Card', label: 'Spell Card' },
  { value: 'Trap Card', label: 'Trap Card' },
]

// Monster types/races
const MONSTER_TYPES = [
  { value: 'all', label: 'All Monster Types' },
  { value: 'Aqua', label: 'Aqua' },
  { value: 'Beast', label: 'Beast' },
  { value: 'Beast-Warrior', label: 'Beast-Warrior' },
  { value: 'Cyberse', label: 'Cyberse' },
  { value: 'Dinosaur', label: 'Dinosaur' },
  { value: 'Divine-Beast', label: 'Divine-Beast' },
  { value: 'Dragon', label: 'Dragon' },
  { value: 'Fairy', label: 'Fairy' },
  { value: 'Fiend', label: 'Fiend' },
  { value: 'Fish', label: 'Fish' },
  { value: 'Insect', label: 'Insect' },
  { value: 'Machine', label: 'Machine' },
  { value: 'Plant', label: 'Plant' },
  { value: 'Psychic', label: 'Psychic' },
  { value: 'Pyro', label: 'Pyro' },
  { value: 'Reptile', label: 'Reptile' },
  { value: 'Rock', label: 'Rock' },
  { value: 'Sea Serpent', label: 'Sea Serpent' },
  { value: 'Spellcaster', label: 'Spellcaster' },
  { value: 'Thunder', label: 'Thunder' },
  { value: 'Warrior', label: 'Warrior' },
  { value: 'Winged Beast', label: 'Winged Beast' },
  { value: 'Wyrm', label: 'Wyrm' },
  { value: 'Zombie', label: 'Zombie' },
]

// Spell/Trap subtypes
const SPELL_TYPES = [
  { value: 'all', label: 'All Spell Types' },
  { value: 'Normal', label: 'Normal Spell' },
  { value: 'Continuous', label: 'Continuous Spell' },
  { value: 'Equip', label: 'Equip Spell' },
  { value: 'Field', label: 'Field Spell' },
  { value: 'Quick-Play', label: 'Quick-Play Spell' },
  { value: 'Ritual', label: 'Ritual Spell' },
]

const TRAP_TYPES = [
  { value: 'all', label: 'All Trap Types' },
  { value: 'Normal', label: 'Normal Trap' },
  { value: 'Continuous', label: 'Continuous Trap' },
  { value: 'Counter', label: 'Counter Trap' },
]

interface YGOCard {
  id: number
  name: string
  type: string
  frameType: string
  desc: string
  race: string
  attribute?: string
  level?: number
  atk?: number
  def?: number
  linkval?: number
  linkmarkers?: string[]
  scale?: number
  archetype?: string
  card_images: { id: number; image_url: string; image_url_small: string; image_url_cropped: string }[]
  card_sets?: { set_name: string; set_code: string; set_rarity: string; set_price: string }[]
  card_prices?: { cardmarket_price: string; tcgplayer_price: string; ebay_price: string; amazon_price: string }[]
  banlist_info?: { ban_tcg?: string; ban_ocg?: string; ban_goat?: string }
}

export default function CardDatabasePage() {
  const [cards, setCards] = useState<YGOCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAttribute, setSelectedAttribute] = useState('all')
  const [selectedCardType, setSelectedCardType] = useState('all')
  const [selectedMonsterType, setSelectedMonsterType] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedCard, setSelectedCard] = useState<YGOCard | null>(null)
  const [page, setPage] = useState(1)
  const [totalCards, setTotalCards] = useState(0)
  const [activeTab, setActiveTab] = useState('browse')
  const cardsPerPage = 20

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      let url = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?'
      const params: string[] = []
      
      if (searchQuery.length >= 2) {
        params.push(`fname=${encodeURIComponent(searchQuery)}`)
      }
      
      if (selectedAttribute !== 'all') {
        params.push(`attribute=${selectedAttribute}`)
      }
      
      if (selectedCardType !== 'all') {
        params.push(`type=${encodeURIComponent(selectedCardType)}`)
      }
      
      if (selectedMonsterType !== 'all') {
        params.push(`race=${encodeURIComponent(selectedMonsterType)}`)
      }
      
      if (selectedLevel !== 'all') {
        params.push(`level=${selectedLevel}`)
      }

      params.push(`num=${cardsPerPage}`)
      params.push(`offset=${(page - 1) * cardsPerPage}`)
      
      url += params.join('&')
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.data) {
        setCards(data.data)
        setTotalCards(data.meta?.total_rows || data.data.length)
      } else {
        setCards([])
        setTotalCards(0)
      }
    } catch (error) {
      console.error('Error fetching cards:', error)
      setCards([])
      setTotalCards(0)
    }
    setLoading(false)
  }, [searchQuery, selectedAttribute, selectedCardType, selectedMonsterType, selectedLevel, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCards()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchCards])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedAttribute('all')
    setSelectedCardType('all')
    setSelectedMonsterType('all')
    setSelectedLevel('all')
    setPage(1)
  }

  const getCardTypeColor = (type: string) => {
    if (type.includes('Spell')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    if (type.includes('Trap')) return 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    if (type.includes('Fusion')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    if (type.includes('Synchro')) return 'bg-slate-200/20 text-slate-200 border-slate-200/30'
    if (type.includes('XYZ') || type.includes('Xyz')) return 'bg-slate-800/50 text-slate-300 border-slate-600/30'
    if (type.includes('Link')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (type.includes('Ritual')) return 'bg-blue-700/20 text-blue-300 border-blue-700/30'
    if (type.includes('Pendulum')) return 'bg-gradient-to-r from-teal-500/20 to-orange-500/20 text-orange-300 border-orange-500/30'
    if (type.includes('Normal')) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30' // Effect monster
  }

  const getAttributeIcon = (attribute?: string) => {
    const attr = ATTRIBUTES.find(a => a.value === attribute)
    if (attr) {
      const Icon = attr.icon
      return <Icon className={`h-4 w-4 ${attr.color}`} />
    }
    return null
  }

  const getBanlistBadge = (banlistInfo?: YGOCard['banlist_info']) => {
    if (!banlistInfo?.ban_tcg) return null
    const status = banlistInfo.ban_tcg
    if (status === 'Banned') return <Badge variant="destructive" className="text-xs">Banned</Badge>
    if (status === 'Limited') return <Badge className="bg-red-500/20 text-red-400 text-xs">Limited</Badge>
    if (status === 'Semi-Limited') return <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Semi-Limited</Badge>
    return null
  }

  const totalPages = Math.ceil(totalCards / cardsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              Card Database
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse and search over 12,000 Yu-Gi-Oh! cards
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {totalCards > 0 && `${totalCards.toLocaleString()} cards found`}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Cards</TabsTrigger>
            <TabsTrigger value="attributes">By Attribute</TabsTrigger>
            <TabsTrigger value="types">By Type</TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cards by name..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Select value={selectedAttribute} onValueChange={(v) => { setSelectedAttribute(v); setPage(1) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTES.map(attr => (
                          <SelectItem key={attr.value} value={attr.value}>
                            <span className="flex items-center gap-2">
                              <attr.icon className={`h-4 w-4 ${attr.color}`} />
                              {attr.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedCardType} onValueChange={(v) => { setSelectedCardType(v); setPage(1) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Card Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedMonsterType} onValueChange={(v) => { setSelectedMonsterType(v); setPage(1) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Monster Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONSTER_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setPage(1) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Level/Rank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(level => (
                          <SelectItem key={level} value={String(level)}>Level {level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={resetFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[421/614] rounded-lg" />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No cards found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {cards.map((card) => (
                    <Card 
                      key={card.id} 
                      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="aspect-[421/614] relative bg-slate-900">
                        <Image
                          src={card.card_images[0]?.image_url_small || card.card_images[0]?.image_url}
                          alt={card.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                        {getBanlistBadge(card.banlist_info) && (
                          <div className="absolute top-2 left-2">
                            {getBanlistBadge(card.banlist_info)}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <h4 className="font-medium text-xs truncate">{card.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {getAttributeIcon(card.attribute)}
                          <span className="text-xs text-muted-foreground truncate">{card.race}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* By Attribute Tab */}
          <TabsContent value="attributes" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ATTRIBUTES.filter(a => a.value !== 'all').map((attr) => {
                const Icon = attr.icon
                return (
                  <Card 
                    key={attr.value}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedAttribute(attr.value)
                      setActiveTab('browse')
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                        attr.value === 'DARK' ? 'bg-purple-500/20' :
                        attr.value === 'LIGHT' ? 'bg-yellow-500/20' :
                        attr.value === 'FIRE' ? 'bg-red-500/20' :
                        attr.value === 'WATER' ? 'bg-blue-500/20' :
                        attr.value === 'WIND' ? 'bg-green-500/20' :
                        attr.value === 'EARTH' ? 'bg-amber-500/20' :
                        'bg-yellow-500/20'
                      }`}>
                        <Icon className={`h-8 w-8 ${attr.color}`} />
                      </div>
                      <h3 className="font-bold text-lg">{attr.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Browse {attr.label} monsters
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* By Type Tab */}
          <TabsContent value="types" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Monster Types */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    <Sword className="h-5 w-5 text-orange-400" />
                    Monster Cards
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CARD_TYPES.filter(t => t.value.includes('Monster')).map(type => (
                      <Badge 
                        key={type.value}
                        variant="outline"
                        className={`cursor-pointer hover:bg-accent ${getCardTypeColor(type.value)}`}
                        onClick={() => {
                          setSelectedCardType(type.value)
                          setActiveTab('browse')
                        }}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monster Races */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-400" />
                    Monster Types
                  </h3>
                  <ScrollArea className="h-48">
                    <div className="flex flex-wrap gap-2">
                      {MONSTER_TYPES.filter(t => t.value !== 'all').map(type => (
                        <Badge 
                          key={type.value}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setSelectedMonsterType(type.value)
                            setActiveTab('browse')
                          }}
                        >
                          {type.label}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Spell/Trap Types */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-teal-400" />
                    Spell & Trap Cards
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Spell Cards</p>
                      <div className="flex flex-wrap gap-2">
                        {SPELL_TYPES.filter(t => t.value !== 'all').map(type => (
                          <Badge 
                            key={type.value}
                            variant="outline"
                            className="cursor-pointer hover:bg-teal-500/20 text-teal-400 border-teal-500/30"
                            onClick={() => {
                              setSelectedCardType('Spell Card')
                              setActiveTab('browse')
                            }}
                          >
                            {type.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Trap Cards</p>
                      <div className="flex flex-wrap gap-2">
                        {TRAP_TYPES.filter(t => t.value !== 'all').map(type => (
                          <Badge 
                            key={type.value}
                            variant="outline"
                            className="cursor-pointer hover:bg-pink-500/20 text-pink-400 border-pink-500/30"
                            onClick={() => {
                              setSelectedCardType('Trap Card')
                              setActiveTab('browse')
                            }}
                          >
                            {type.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Card Detail Modal */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getAttributeIcon(selectedCard.attribute)}
                  {selectedCard.name}
                  {getBanlistBadge(selectedCard.banlist_info)}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="aspect-[421/614] relative rounded-lg overflow-hidden bg-slate-900">
                  <Image
                    src={selectedCard.card_images[0]?.image_url}
                    alt={selectedCard.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Card Details */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getCardTypeColor(selectedCard.type)}>
                      {selectedCard.type}
                    </Badge>
                    {selectedCard.attribute && (
                      <Badge variant="outline" className="gap-1">
                        {getAttributeIcon(selectedCard.attribute)}
                        {selectedCard.attribute}
                      </Badge>
                    )}
                  </div>

                  {selectedCard.level && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Level {selectedCard.level}</span>
                    </div>
                  )}

                  {selectedCard.linkval && (
                    <div className="flex items-center gap-2">
                      <span>Link-{selectedCard.linkval}</span>
                      {selectedCard.linkmarkers && (
                        <span className="text-xs text-muted-foreground">
                          ({selectedCard.linkmarkers.join(', ')})
                        </span>
                      )}
                    </div>
                  )}

                  {selectedCard.scale !== undefined && (
                    <div className="flex items-center gap-2">
                      <span>Pendulum Scale: {selectedCard.scale}</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedCard.race}</span>
                    {selectedCard.archetype && (
                      <span> / {selectedCard.archetype}</span>
                    )}
                  </div>

                  {(selectedCard.atk !== undefined || selectedCard.def !== undefined) && (
                    <div className="flex items-center gap-4">
                      {selectedCard.atk !== undefined && (
                        <div className="flex items-center gap-1">
                          <Sword className="h-4 w-4 text-red-400" />
                          <span>ATK {selectedCard.atk}</span>
                        </div>
                      )}
                      {selectedCard.def !== undefined && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-blue-400" />
                          <span>DEF {selectedCard.def}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-sm leading-relaxed">{selectedCard.desc}</p>
                  </div>

                  {/* Card Sets */}
                  {selectedCard.card_sets && selectedCard.card_sets.length > 0 && (
                    <div className="pt-2 border-t">
                      <h4 className="font-medium text-sm mb-2">Card Sets</h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {selectedCard.card_sets.slice(0, 10).map((set, i) => (
                            <div key={i} className="text-xs flex items-center justify-between">
                              <span className="truncate flex-1">{set.set_name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {set.set_rarity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Prices */}
                  {selectedCard.card_prices && selectedCard.card_prices[0] && (
                    <div className="pt-2 border-t">
                      <h4 className="font-medium text-sm mb-2">Market Prices</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">TCGplayer:</span>{' '}
                          <span className="text-green-400">${selectedCard.card_prices[0].tcgplayer_price}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cardmarket:</span>{' '}
                          <span className="text-green-400">${selectedCard.card_prices[0].cardmarket_price}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a 
                      href={`https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${selectedCard.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Official Database
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
