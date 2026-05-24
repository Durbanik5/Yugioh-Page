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
  placement: number | null
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

export interface DeckCard {
  id: string
  deck_id: string
  card_name: string
  card_type: 'monster' | 'spell' | 'trap'
  deck_category: 'main' | 'extra' | 'side'
  quantity: number
  created_at: string
}

export interface DeckWithCards extends Deck {
  cards: DeckCard[]
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats | null
  decks: DeckWithCards[]
}

export interface MatchWithParticipants extends Match {
  participants: (MatchParticipant & { player: Player; deck: Deck | null })[]
}

export interface BannedCard {
  id: string
  card_name: string
  card_id: number | null
  card_image: string | null
  card_type: string | null
  reason: string | null
  banned_at: string
  banned_by: string | null
}

export interface BanProposal {
  id: string
  card_name: string
  card_id: number | null
  card_image: string | null
  card_type: string | null
  proposal_type: 'ban' | 'unban'
  reason: string | null
  proposed_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  resolved_at: string | null
}

export interface ProposalVote {
  id: string
  proposal_id: string
  player_id: string
  vote: 'yes' | 'no'
  voted_at: string
}

export interface BanProposalWithVotes extends BanProposal {
  votes: (ProposalVote & { player: Player })[]
  proposer: Player | null
}
