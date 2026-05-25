export interface Player {
  id: string
  nickname: string
  avatar_url: string | null
  auth_user_id: string | null
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
export type DuelFormat = 'tcg' | 'ocg' | 'casual'

export interface Match {
  id: string
  match_type: MatchType
  format: DuelFormat
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
  format: DuelFormat
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
  // New set/edition/price fields
  set_name: string | null
  set_code: string | null
  edition: string | null
  market_price: number | null
  price_updated_at: string | null
}

// Card set info from YGOProDeck API
export interface CardSetInfo {
  set_name: string
  set_code: string
  set_rarity: string
  set_rarity_code: string
  set_price: string
}

// Card price info from YGOProDeck API
export interface CardPriceInfo {
  cardmarket_price: string
  tcgplayer_price: string
  ebay_price: string
  amazon_price: string
  coolstuffinc_price: string
}

export interface SavedMatch {
  id: string
  player_id: string
  match_id: string
  note: string | null
  showcase: boolean
  created_at: string
}

export interface SavedMatchWithDetails extends SavedMatch {
  match: MatchWithParticipants
}

// Profile Customization Types
export type ProfileTheme = 'kaiba' | 'yugi' | 'joey' | 'marik' | 'pegasus' | 'jaden' | 'yusei' | 'yuma' | 'yuya' | 'yusaku'
export type YugiohSeries = 'duel_monsters' | 'gx' | 'five_ds' | 'zexal' | 'arc_v' | 'vrains' | 'sevens' | 'go_rush'
export type CardMechanic = 'fusion' | 'ritual' | 'synchro' | 'xyz' | 'pendulum' | 'link' | 'normal' | 'effect'
export type CardType = 'dragon' | 'spellcaster' | 'warrior' | 'fiend' | 'fairy' | 'zombie' | 'machine' | 'aqua' | 'pyro' | 'rock' | 'winged_beast' | 'plant' | 'insect' | 'thunder' | 'dinosaur' | 'reptile' | 'fish' | 'sea_serpent' | 'beast' | 'beast_warrior' | 'psychic' | 'divine_beast' | 'wyrm' | 'cyberse'

export interface PlayerProfile {
  id: string
  player_id: string
  bio: string | null
  featured_deck_id: string | null
  favorite_series: YugiohSeries | null
  favorite_mechanic: CardMechanic | null
  favorite_card_type: CardType | null
  favorite_card_name: string | null
  rival_id: string | null
  theme: ProfileTheme
  banner_url: string | null
  created_at: string
  updated_at: string
}

export interface PlayerProfileWithRelations extends PlayerProfile {
  featured_deck?: DeckWithCards | null
  rival?: Player | null
}
