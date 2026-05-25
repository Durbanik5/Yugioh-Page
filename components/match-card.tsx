'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Swords, Users, Layers, Trophy, Bookmark, BookmarkCheck, Star, StarOff,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { MatchWithParticipants, SavedMatch } from '@/lib/types'

interface MatchCardProps {
  match: MatchWithParticipants
  currentPlayerId?: string
  savedMatch?: SavedMatch | null
  onSaveChange?: () => void
  showSaveButton?: boolean
  compact?: boolean
}

function getMatchTypeIcon(type: string) {
  switch (type) {
    case '1v1': return <Swords className="h-4 w-4" />
    case 'free_for_all': return <Users className="h-4 w-4" />
    case 'tag_team': return <Layers className="h-4 w-4" />
    default: return <Swords className="h-4 w-4" />
  }
}

function getMatchTypeLabel(type: string) {
  switch (type) {
    case '1v1': return '1v1 Duel'
    case 'free_for_all': return 'Free-For-All'
    case 'tag_team': return 'Tag Team'
    default: return type
  }
}

function getFormatBadge(format: string | undefined) {
  switch (format) {
    case 'tcg':
      return { label: 'TCG', className: 'bg-blue-500 hover:bg-blue-600 text-white' }
    case 'ocg':
      return { label: 'OCG', className: 'bg-red-500 hover:bg-red-600 text-white' }
    case 'casual':
    default:
      return { label: 'Casual', className: 'bg-green-500 hover:bg-green-600 text-white' }
  }
}

export function MatchCard({ 
  match, 
  currentPlayerId, 
  savedMatch,
  onSaveChange,
  showSaveButton = true,
  compact = false
}: MatchCardProps) {
  const [isSaved, setIsSaved] = useState(!!savedMatch)
  const [isShowcase, setIsShowcase] = useState(savedMatch?.showcase || false)
  const [saving, setSaving] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [note, setNote] = useState(savedMatch?.note || '')

  const winners = match.participants.filter(p => p.is_winner)
  const losers = match.participants.filter(p => !p.is_winner)

  const handleSave = async () => {
    if (!currentPlayerId) {
      toast.error('No player selected')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (isSaved) {
        // Remove saved match
        const { error } = await supabase
          .from('saved_matches')
          .delete()
          .eq('player_id', currentPlayerId)
          .eq('match_id', match.id)

        if (error) throw error
        setIsSaved(false)
        setIsShowcase(false)
        toast.success('Match removed from saved')
      } else {
        // Save match
        const { error } = await supabase
          .from('saved_matches')
          .insert({
            player_id: currentPlayerId,
            match_id: match.id,
            note: note || null,
            showcase: false
          })

        if (error) throw error
        setIsSaved(true)
        toast.success('Match saved!')
      }
      onSaveChange?.()
    } catch (error) {
      console.error('Error saving match:', error)
      toast.error('Failed to save match')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleShowcase = async () => {
    if (!currentPlayerId || !isSaved) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('saved_matches')
        .update({ showcase: !isShowcase })
        .eq('player_id', currentPlayerId)
        .eq('match_id', match.id)

      if (error) throw error
      setIsShowcase(!isShowcase)
      toast.success(isShowcase ? 'Removed from showcase' : 'Added to showcase!')
      onSaveChange?.()
    } catch (error) {
      console.error('Error toggling showcase:', error)
      toast.error('Failed to update showcase')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNote = async () => {
    if (!currentPlayerId) return

    setSaving(true)
    const supabase = createClient()

    try {
      if (isSaved) {
        // Update existing
        const { error } = await supabase
          .from('saved_matches')
          .update({ note: note || null })
          .eq('player_id', currentPlayerId)
          .eq('match_id', match.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('saved_matches')
          .insert({
            player_id: currentPlayerId,
            match_id: match.id,
            note: note || null,
            showcase: false
          })

        if (error) throw error
        setIsSaved(true)
      }
      
      toast.success('Note saved!')
      setNoteDialogOpen(false)
      onSaveChange?.()
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className={`bg-card border-border hover:border-primary/30 transition-colors ${isShowcase ? 'ring-1 ring-yellow-500/50' : ''}`}>
        <CardContent className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1.5 border-primary/50">
                {getMatchTypeIcon(match.match_type)}
                {getMatchTypeLabel(match.match_type)}
              </Badge>
              <Badge className={getFormatBadge(match.format).className}>
                {getFormatBadge(match.format).label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(match.played_at).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {isShowcase && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  <Star className="h-3 w-3 mr-1" />
                  Showcase
                </Badge>
              )}
            </div>

            {showSaveButton && currentPlayerId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={saving}>
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSave}>
                    {isSaved ? (
                      <>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Remove from Saved
                      </>
                    ) : (
                      <>
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        Save Match
                      </>
                    )}
                  </DropdownMenuItem>
                  {isSaved && (
                    <>
                      <DropdownMenuItem onClick={handleToggleShowcase}>
                        {isShowcase ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Remove from Showcase
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Add to Showcase
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setNoteDialogOpen(true)}>
                        Add Note
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className={`mt-4 grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
            {/* Winners */}
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <Trophy className="h-4 w-4" />
                <span className="font-medium">
                  {match.match_type === 'tag_team' ? 'Winning Team' : 'Winner'}
                </span>
              </div>
              <div className="space-y-1">
                {winners.map((p) => (
                  <Link 
                    key={p.id} 
                    href={`/player/${p.player_id}`}
                    className="block hover:text-primary transition-colors"
                  >
                    <span className="font-medium">{p.player.nickname}</span>
                    {p.deck && (
                      <span className="text-muted-foreground text-sm ml-2">
                        ({p.deck.name})
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <span className="font-medium">
                  {match.match_type === 'tag_team' ? 'Losing Team' : 'Defeated'}
                </span>
              </div>
              <div className="space-y-1">
                {losers.map((p) => (
                  <Link 
                    key={p.id} 
                    href={`/player/${p.player_id}`}
                    className="block hover:text-primary transition-colors"
                  >
                    <span className="font-medium">{p.player.nickname}</span>
                    {p.deck && (
                      <span className="text-muted-foreground text-sm ml-2">
                        ({p.deck.name})
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {(match.notes || (isSaved && note)) && (
            <div className="mt-3 space-y-1">
              {match.notes && (
                <p className="text-sm text-muted-foreground italic">
                  {match.notes}
                </p>
              )}
              {isSaved && note && (
                <p className="text-sm text-primary/80 italic">
                  Note: {note}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note to Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                placeholder="e.g., Epic comeback with Blue-Eyes!"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <Button onClick={handleSaveNote} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
