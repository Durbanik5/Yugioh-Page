'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MatchCard } from '@/components/match-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Swords, Users, Layers, Filter, User } from 'lucide-react'
import type { MatchWithParticipants, Player, SavedMatch, MatchType } from '@/lib/types'

interface MatchesClientProps {
  matches: MatchWithParticipants[]
  players: Player[]
  savedMatches: SavedMatch[]
}

export function MatchesClient({ matches, players, savedMatches }: MatchesClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all')
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchType | 'all'>('all')
  const router = useRouter()

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Filter by match type
      if (matchTypeFilter !== 'all' && match.match_type !== matchTypeFilter) {
        return false
      }
      // No player filtering on the main matches page - show all
      return true
    })
  }, [matches, matchTypeFilter])

  const getSavedMatchForPlayer = (matchId: string): SavedMatch | null => {
    if (selectedPlayer === 'all') return null
    return savedMatches.find(sm => sm.match_id === matchId && sm.player_id === selectedPlayer) || null
  }

  const handleSaveChange = () => {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters:
        </div>

        {/* Match Type Filter */}
        <Select value={matchTypeFilter} onValueChange={(v) => setMatchTypeFilter(v as MatchType | 'all')}>
          <SelectTrigger className="w-36 h-8 text-sm bg-input border-border">
            <SelectValue placeholder="Match Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="1v1">
              <span className="flex items-center gap-2">
                <Swords className="h-3 w-3" />
                1v1 Duel
              </span>
            </SelectItem>
            <SelectItem value="free_for_all">
              <span className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                Free-For-All
              </span>
            </SelectItem>
            <SelectItem value="tag_team">
              <span className="flex items-center gap-2">
                <Layers className="h-3 w-3" />
                Tag Team
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Player selector for saving */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Save as:</span>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-40 h-8 text-sm bg-input border-border">
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  No player
                </span>
              </SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.nickname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-xs">
          {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            currentPlayerId={selectedPlayer === 'all' ? undefined : selectedPlayer}
            savedMatch={getSavedMatchForPlayer(match.id)}
            onSaveChange={handleSaveChange}
            showSaveButton={selectedPlayer !== 'all'}
          />
        ))}
      </div>
    </div>
  )
}
