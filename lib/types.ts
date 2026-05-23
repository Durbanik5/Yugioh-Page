export interface Player {
  id: string
  nickname: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Deck {
  id: string
  player_id: string
  name: string
  archetype: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export type MatchType = '1v1' | 'free_for_all' | 'tag_team'

export interface Match {
  id: string
  match_type: MatchType
  played_at: string
  notes: string | null
}

export interface MatchParticipant {
  id: string
  match_id: string
  player_id: string
  deck_id: string | null
  team_number: number | null
  is_winner: boolean
}

export interface PlayerStats {
  id: string
  player_id: string
  total_wins: number
  total_losses: number
  wins_1v1: number
  losses_1v1: number
  wins_ffa: number
  losses_ffa: number
  wins_tag: number
  losses_tag: number
  updated_at: string
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats | null
  decks: Deck[]
}

export interface MatchWithParticipants extends Match {
  participants: (MatchParticipant & { player: Player; deck: Deck | null })[]
}
