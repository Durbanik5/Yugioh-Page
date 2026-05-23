'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AddPlayerDialog() {
  const [open, setOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [deckName, setDeckName] = useState('')
  const [archetype, setArchetype] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      toast.error('Please enter a nickname')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ nickname: nickname.trim() })
        .select()
        .single()

      if (playerError) throw playerError

      // Create player stats
      const { error: statsError } = await supabase
        .from('player_stats')
        .insert({ player_id: player.id })

      if (statsError) throw statsError

      // Create deck if provided
      if (deckName.trim()) {
        const { error: deckError } = await supabase
          .from('decks')
          .insert({
            player_id: player.id,
            name: deckName.trim(),
            archetype: archetype.trim() || null,
            is_active: true,
          })

        if (deckError) throw deckError
      }

      toast.success(`${nickname} has entered the arena!`)
      setOpen(false)
      setNickname('')
      setDeckName('')
      setArchetype('')
      router.refresh()
    } catch (error) {
      console.error('Error adding player:', error)
      toast.error('Failed to add player')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/80 kaiba-glow">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Duelist
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30 kaiba-border">
        <DialogHeader>
          <DialogTitle className="text-xl" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Register New Duelist
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new duelist to the KaibaCorp tracking system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-foreground">Duelist Name *</Label>
            <Input
              id="nickname"
              placeholder="Enter nickname..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deckName" className="text-foreground">Primary Deck Name</Label>
            <Input
              id="deckName"
              placeholder="e.g., Blue-Eyes White Dragon"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="archetype" className="text-foreground">Deck Archetype</Label>
            <Input
              id="archetype"
              placeholder="e.g., Dragon, Spellcaster, Warrior"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="bg-input border-border focus:border-primary"
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
              {loading ? (
                'Registering...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Register
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
