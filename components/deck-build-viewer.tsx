'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, Sparkles, Zap, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeckWithCards, DeckCard } from '@/lib/types'

interface DeckBuildViewerProps {
  deck: DeckWithCards
}

export function DeckBuildViewer({ deck }: DeckBuildViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [cards, setCards] = useState<DeckCard[]>(deck.cards || [])
  const [newCard, setNewCard] = useState({ name: '', type: 'monster' as const, quantity: 1 })
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  const monsters = cards.filter(c => c.card_type === 'monster')
  const spells = cards.filter(c => c.card_type === 'spell')
  const traps = cards.filter(c => c.card_type === 'trap')

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0)

  const handleAddCard = async () => {
    if (!newCard.name.trim()) {
      toast.error('Please enter a card name')
      return
    }

    setAdding(true)
    const supabase = createClient()

    try {
      // Check if card already exists in deck
      const existingCard = cards.find(
        c => c.card_name.toLowerCase() === newCard.name.trim().toLowerCase() && c.card_type === newCard.type
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
            quantity: newCard.quantity
          })
          .select()
          .single()

        if (error) throw error

        setCards([...cards, data])
        toast.success(`Added ${newCard.name} to deck`)
      }

      setNewCard({ name: '', type: 'monster', quantity: 1 })
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

  const getCardTypeIcon = (type: string) => {
    switch (type) {
      case 'monster': return <Sparkles className="h-4 w-4 text-yellow-400" />
      case 'spell': return <Zap className="h-4 w-4 text-green-400" />
      case 'trap': return <Shield className="h-4 w-4 text-purple-400" />
      default: return null
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
            </div>
            <Badge variant="secondary" className="text-xs">
              {totalCards} cards
            </Badge>
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

          <CollapsibleContent className="pt-4 space-y-4">
            <CardSection 
              title="Monsters" 
              icon={<Sparkles className="h-4 w-4 text-yellow-400" />}
              sectionCards={monsters}
              color={getCardTypeColor('monster')}
            />
            <CardSection 
              title="Spells" 
              icon={<Zap className="h-4 w-4 text-green-400" />}
              sectionCards={spells}
              color={getCardTypeColor('spell')}
            />
            <CardSection 
              title="Traps" 
              icon={<Shield className="h-4 w-4 text-purple-400" />}
              sectionCards={traps}
              color={getCardTypeColor('trap')}
            />

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-4 border-primary/30 text-primary hover:bg-primary/10">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-primary/30">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'var(--font-orbitron)' }}>Add Card to {deck.name}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Card Name</Label>
                    <Input
                      id="card-name"
                      placeholder="e.g. Blue-Eyes White Dragon"
                      value={newCard.name}
                      onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                      className="bg-secondary border-border"
                    />
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
                    disabled={adding}
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
