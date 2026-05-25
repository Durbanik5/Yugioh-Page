'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Swords, Users, Layers, Plus, X, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Deck, MatchType, DuelFormat } from '@/lib/types'

interface PlayerWithDecks extends Player {
  decks: Deck[]
}

interface RecordMatchFormProps {
  players: PlayerWithDecks[]
}

interface Participant {
  playerId: string
  deckId: string | null
  teamNumber: number | null
  isWinner: boolean
  placement: number | null
}

const MATCH_TYPES: { value: MatchType; label: string; icon: React.ReactNode; minPlayers: number }[] = [
  { value: '1v1', label: '1v1 Duel', icon: <Swords className="h-4 w-4" />, minPlayers: 2 },
  { value: 'free_for_all', label: 'Free-For-All', icon: <Users className="h-4 w-4" />, minPlayers: 3 },
  { value: 'tag_team', label: 'Tag Team', icon: <Layers className="h-4 w-4" />, minPlayers: 4 },
]

const DUEL_FORMATS: { value: DuelFormat; label: string; description: string; color: string }[] = [
  { value: 'casual', label: 'Casual', description: 'No banlist restrictions', color: 'bg-green-500' },
  { value: 'tcg', label: 'TCG', description: 'TCG banlist rules', color: 'bg-blue-500' },
  { value: 'ocg', label: 'OCG', description: 'OCG banlist rules', color: 'bg-red-500' },
]

export function RecordMatchForm({ players }: RecordMatchFormProps) {
  const [matchType, setMatchType] = useState<MatchType>('1v1')
  const [format, setFormat] = useState<DuelFormat>('casual')
  const [participants, setParticipants] = useState<Participant[]>([
    { playerId: '', deckId: null, teamNumber: 1, isWinner: false, placement: null },
    { playerId: '', deckId: null, teamNumber: 2, isWinner: false, placement: null },
  ])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const currentMatchType = MATCH_TYPES.find(t => t.value === matchType)!

  const addParticipant = () => {
    setParticipants([...participants, { 
      playerId: '', 
      deckId: null, 
      teamNumber: matchType === 'tag_team' ? 1 : null,
      isWinner: false,
      placement: null,
    }])
  }

  const removeParticipant = (index: number) => {
    if (participants.length > currentMatchType.minPlayers) {
      setParticipants(participants.filter((_, i) => i !== index))
    }
  }

  const updateParticipant = (index: number, updates: Partial<Participant>) => {
    const newParticipants = [...participants]
    newParticipants[index] = { ...newParticipants[index], ...updates }
    
    // Reset deck if player changed
    if (updates.playerId && updates.playerId !== participants[index].playerId) {
      newParticipants[index].deckId = null
    }
    
    setParticipants(newParticipants)
  }

  const getPlayerDecks = (playerId: string) => {
    return players.find(p => p.id === playerId)?.decks || []
  }

  const getAvailablePlayers = (currentIndex: number) => {
    const selectedIds = participants
      .filter((_, i) => i !== currentIndex)
      .map(p => p.playerId)
      .filter(Boolean)
    
    return players.filter(p => !selectedIds.includes(p.id))
  }

  const handleMatchTypeChange = (type: MatchType) => {
    setMatchType(type)
    const minPlayers = MATCH_TYPES.find(t => t.value === type)!.minPlayers
    
    if (type === '1v1') {
      setParticipants([
        { playerId: '', deckId: null, teamNumber: 1, isWinner: false, placement: null },
        { playerId: '', deckId: null, teamNumber: 2, isWinner: false, placement: null },
      ])
    } else if (type === 'tag_team') {
      setParticipants([
        { playerId: '', deckId: null, teamNumber: 1, isWinner: false, placement: null },
        { playerId: '', deckId: null, teamNumber: 1, isWinner: false, placement: null },
        { playerId: '', deckId: null, teamNumber: 2, isWinner: false, placement: null },
        { playerId: '', deckId: null, teamNumber: 2, isWinner: false, placement: null },
      ])
    } else {
      // Free for all - start with 3 players, auto-assign placements
      setParticipants(Array.from({ length: Math.max(minPlayers, participants.length) }, (_, i) => ({
        playerId: '',
        deckId: null,
        teamNumber: null,
        isWinner: false,
        placement: i + 1,
      })))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const filledParticipants = participants.filter(p => p.playerId)
    if (filledParticipants.length < currentMatchType.minPlayers) {
      toast.error(`Please select at least ${currentMatchType.minPlayers} duelists`)
      return
    }

    const hasWinner = filledParticipants.some(p => p.isWinner)
    if (!hasWinner) {
      if (matchType === 'free_for_all') {
        toast.error('Please assign placements to all duelists')
      } else {
        toast.error('Please select at least one winner')
      }
      return
    }

    // For FFA, validate all placements are set
    if (matchType === 'free_for_all') {
      const placements = filledParticipants.map(p => p.placement).filter(Boolean)
      if (placements.length !== filledParticipants.length) {
        toast.error('Please assign placements to all duelists')
        return
      }
      const uniquePlacements = new Set(placements)
      if (uniquePlacements.size !== placements.length) {
        toast.error('Each duelist must have a unique placement')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Create match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          match_type: matchType,
          format: format,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (matchError) throw matchError

      // Create participants
      const participantsToInsert = filledParticipants.map(p => ({
        match_id: match.id,
        player_id: p.playerId,
        deck_id: p.deckId,
        team_number: p.teamNumber,
        is_winner: p.isWinner,
        placement: matchType === 'free_for_all' ? p.placement : null,
      }))

      const { error: participantsError } = await supabase
        .from('match_participants')
        .insert(participantsToInsert)

      if (participantsError) throw participantsError

      // Update player stats
      for (const participant of filledParticipants) {
        const statsField = matchType === '1v1' 
          ? (participant.isWinner ? 'wins_1v1' : 'losses_1v1')
          : matchType === 'free_for_all'
          ? (participant.isWinner ? 'wins_ffa' : 'losses_ffa')
          : (participant.isWinner ? 'wins_tag' : 'losses_tag')

        const totalField = participant.isWinner ? 'total_wins' : 'total_losses'

        // Get current stats
        const { data: currentStats } = await supabase
          .from('player_stats')
          .select('*')
          .eq('player_id', participant.playerId)
          .single()

        if (currentStats) {
          await supabase
            .from('player_stats')
            .update({
              [statsField]: (currentStats[statsField] || 0) + 1,
              [totalField]: (currentStats[totalField] || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('player_id', participant.playerId)
        }
      }

      toast.success('Duel recorded successfully!')
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error recording match:', error)
      toast.error('Failed to record match')
    } finally {
      setLoading(false)
    }
  }

  if (players.length < 2) {
    return (
      <Card className="bg-card border-primary/30">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            You need at least 2 registered duelists to record a match.
          </p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-primary hover:bg-primary/80"
          >
            Add Duelists
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Match Type Selection */}
      <Card className="bg-card border-primary/30 kaiba-border">
        <CardHeader>
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Match Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {MATCH_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleMatchTypeChange(type.value)}
                className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                  matchType === type.value
                    ? 'border-primary bg-primary/10 kaiba-glow'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={matchType === type.value ? 'text-primary' : 'text-muted-foreground'}>
                  {type.icon}
                </div>
                <span className={`text-sm font-medium ${matchType === type.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Duel Format Selection */}
      <Card className="bg-card border-primary/30 kaiba-border">
        <CardHeader>
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Duel Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {DUEL_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                  format === f.value
                    ? 'border-primary bg-primary/10 kaiba-glow'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${f.color}`} />
                <span className={`text-sm font-medium ${format === f.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {f.label}
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  {f.description}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card className="bg-card border-primary/30 kaiba-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Duelists
          </CardTitle>
          {matchType !== '1v1' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addParticipant}
              className="border-primary/50 hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.map((participant, index) => {
            const playerDecks = getPlayerDecks(participant.playerId)
            const availablePlayers = getAvailablePlayers(index)
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${participant.isWinner ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          {matchType === 'tag_team' ? `Team ${participant.teamNumber} - Player` : `Player ${index + 1}`}
                        </Label>
                        <Select
                          value={participant.playerId}
                          onValueChange={(value) => updateParticipant(index, { playerId: value })}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Select duelist..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.nickname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {matchType === 'tag_team' && (
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground mb-1 block">Team</Label>
                          <Select
                            value={String(participant.teamNumber)}
                            onValueChange={(value) => updateParticipant(index, { teamNumber: parseInt(value) })}
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Team 1</SelectItem>
                              <SelectItem value="2">Team 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {participant.playerId && playerDecks.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Deck Used</Label>
                        <Select
                          value={participant.deckId || 'none'}
                          onValueChange={(value) => updateParticipant(index, { deckId: value === 'none' ? null : value })}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Select deck (optional)..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No deck selected</SelectItem>
                            {playerDecks.map((deck) => (
                              <SelectItem key={deck.id} value={deck.id}>
                                {deck.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {matchType === 'free_for_all' && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Placement</Label>
                        <Select
                          value={String(participant.placement || '')}
                          onValueChange={(value) => updateParticipant(index, { 
                            placement: parseInt(value),
                            isWinner: parseInt(value) === 1
                          })}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Select placement..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: participants.length }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1 === 1 ? '1st Place' : i + 1 === 2 ? '2nd Place' : i + 1 === 3 ? '3rd Place' : `${i + 1}th Place`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {matchType !== 'free_for_all' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`winner-${index}`}
                          checked={participant.isWinner}
                          onCheckedChange={(checked) => {
                            if (matchType === 'tag_team') {
                              // For tag team, set all same team members as winners
                              const newParticipants = participants.map((p, i) => ({
                                ...p,
                                isWinner: p.teamNumber === participant.teamNumber ? !!checked : false
                              }))
                              setParticipants(newParticipants)
                            } else if (matchType === '1v1') {
                              // For 1v1, only one winner
                              const newParticipants = participants.map((p, i) => ({
                                ...p,
                                isWinner: i === index ? !!checked : false
                              }))
                              setParticipants(newParticipants)
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`winner-${index}`} 
                          className="text-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Winner
                        </Label>
                      </div>
                    )}
                  </div>

                  {participants.length > currentMatchType.minPlayers && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="bg-card border-primary/30 kaiba-border">
        <CardHeader>
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Match Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional notes about the match..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-input border-border focus:border-primary min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/80 kaiba-glow h-12 text-lg"
        style={{ fontFamily: 'var(--font-orbitron)' }}
      >
        {loading ? 'Recording...' : 'Record Duel'}
      </Button>
    </form>
  )
}
