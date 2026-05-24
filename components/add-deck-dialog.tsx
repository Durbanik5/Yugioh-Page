'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeckFormat } from '@/lib/types'

interface AddDeckDialogProps {
  playerId: string
}

export function AddDeckDialog({ playerId }: AddDeckDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [archetype, setArchetype] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<DeckFormat>('casual')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a deck name')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('decks')
        .insert({
          player_id: playerId,
          name: name.trim(),
          archetype: archetype.trim() || null,
          description: description.trim() || null,
          format: format,
        })

      if (error) throw error

      toast.success('Deck added successfully!')
      setOpen(false)
      setName('')
      setArchetype('')
      setDescription('')
      setFormat('casual')
      router.refresh()
    } catch (error) {
      console.error('Error adding deck:', error)
      toast.error('Failed to add deck')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary/10">
          <Plus className="h-4 w-4 mr-2" />
          Add Deck
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30 kaiba-border">
        <DialogHeader>
          <DialogTitle className="text-xl" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Add New Deck
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Register a new deck for this duelist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="deckName" className="text-foreground">Deck Name *</Label>
            <Input
              id="deckName"
              placeholder="e.g., Blue-Eyes White Dragon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="archetype" className="text-foreground">Archetype</Label>
              <Input
                id="archetype"
                placeholder="e.g., Dragon"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                className="bg-input border-border focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="format" className="text-foreground">Format</Label>
              <Select value={format} onValueChange={(v: DeckFormat) => setFormat(v)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcg">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      TCG
                    </span>
                  </SelectItem>
                  <SelectItem value="ocg">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      OCG
                    </span>
                  </SelectItem>
                  <SelectItem value="casual">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Casual
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes about this deck..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border focus:border-primary min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-border hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/80"
            >
              {loading ? 'Adding...' : 'Add Deck'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
