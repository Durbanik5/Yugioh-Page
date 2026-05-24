export interface Player {
  id: string
  nickname: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type DeckFormat = 'tcg' | 'ocg' | 'casual'

export interface Deck {
  id: string
  player_id: string
  name: string
  archetype: string | null
  description: string | null
  banner_url: string | null
  format: DeckFormat
  mvp_card_name: string | null
  created_at: string
}

export interface DeckChange {
  id: string
  deck_id: string
  change_type: 'added' | 'removed' | 'updated'
  card_name: string
  quantity: number
  category: 'main' | 'extra' | 'side' | null
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
  changes?: DeckChange[]
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

export type DuelRoomStatus = 'waiting' | 'active' | 'finished'
export type TurnPhase = 'draw' | 'standby' | 'main' | 'battle' | 'main2' | 'end'

export interface DuelRoom {
  id: string
  room_code: string
  name: string
  status: DuelRoomStatus
  match_type: MatchType
  stream_url: string | null
  created_by: string | null
  winner_id: string | null
  turn_count: number
  current_turn_player_id: string | null
  turn_phase: TurnPhase
  created_at: string
  started_at: string | null
  ended_at: string | null
}

export interface DuelRoomParticipant {
  id: string
  room_id: string
  player_id: string
  deck_id: string | null
  life_points: number
  team_number: number | null
  is_spectator: boolean
  joined_at: string
  hand_count: number
  monster_zones: string
  spell_trap_zones: string
}

export interface DuelRoomEvent {
  id: string
  room_id: string
  player_id: string | null
  event_type: 'life_change' | 'turn_change' | 'phase_change' | 'game_start' | 'game_end' | 'custom'
  description: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface DuelRoomMessage {
  id: string
  room_id: string
  player_id: string
  message: string
  created_at: string
}

export interface DuelRoomWithParticipants extends DuelRoom {
  participants: (DuelRoomParticipant & { player: Player; deck: Deck | null })[]
  creator: Player | null
}

export type CardCondition = 'mint' | 'near_mint' | 'lightly_played' | 'moderately_played' | 'heavily_played' | 'damaged'

export interface CollectionCard {
  id: string
  player_id: string
  card_name: string
  card_id: number | null
  card_image: string | null
  card_type: string | null
  card_race: string | null
  card_attribute: string | null
  card_level: number | null
  card_atk: number | null
  card_def: number | null
  quantity: number
  rarity: string | null
  condition: CardCondition | null
  notes: string | null
  added_at: string
}
