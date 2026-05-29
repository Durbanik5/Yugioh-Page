import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// All valid attributes and monster types
const VALID_ATTRIBUTES = ['DARK', 'LIGHT', 'FIRE', 'WATER', 'WIND', 'EARTH', 'DIVINE']
const VALID_MONSTER_TYPES = [
  'Aqua', 'Beast', 'Beast-Warrior', 'Cyberse', 'Dinosaur', 'Divine-Beast',
  'Dragon', 'Fairy', 'Fiend', 'Fish', 'Insect', 'Machine', 'Plant',
  'Psychic', 'Pyro', 'Reptile', 'Rock', 'Sea Serpent', 'Spellcaster',
  'Thunder', 'Warrior', 'Winged Beast', 'Wyrm', 'Zombie'
]

// GET - Fetch achievements for a player
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerId = searchParams.get('playerId')

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('player_achievements')
    .select('*')
    .eq('player_id', playerId)

  if (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }

  // Convert to a map for easier access
  const achievementsMap: Record<string, number> = {}
  
  // Initialize all achievements to 0
  VALID_ATTRIBUTES.forEach(attr => {
    achievementsMap[`attribute_${attr}`] = 0
  })
  VALID_MONSTER_TYPES.forEach(type => {
    achievementsMap[`type_${type}`] = 0
  })

  // Override with actual progress from database
  data?.forEach((achievement) => {
    const key = `${achievement.achievement_type}_${achievement.achievement_key}`
    achievementsMap[key] = achievement.progress
  })

  return NextResponse.json({ achievements: achievementsMap })
}

// POST - Update achievements (called when cards are summoned in duels)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, cardsSummoned } = body

    if (!playerId || !cardsSummoned || !Array.isArray(cardsSummoned)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const supabase = await createClient()

    // Group cards by attribute and type
    const attributeCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}

    cardsSummoned.forEach((card: { attribute?: string; race?: string }) => {
      if (card.attribute && VALID_ATTRIBUTES.includes(card.attribute)) {
        attributeCounts[card.attribute] = (attributeCounts[card.attribute] || 0) + 1
      }
      if (card.race && VALID_MONSTER_TYPES.includes(card.race)) {
        typeCounts[card.race] = (typeCounts[card.race] || 0) + 1
      }
    })

    // Upsert attribute achievements
    for (const [attribute, count] of Object.entries(attributeCounts)) {
      await supabase.rpc('increment_achievement', {
        p_player_id: playerId,
        p_achievement_type: 'attribute',
        p_achievement_key: attribute,
        p_increment: count
      })
    }

    // Upsert type achievements
    for (const [type, count] of Object.entries(typeCounts)) {
      await supabase.rpc('increment_achievement', {
        p_player_id: playerId,
        p_achievement_type: 'type',
        p_achievement_key: type,
        p_increment: count
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating achievements:', error)
    return NextResponse.json({ error: 'Failed to update achievements' }, { status: 500 })
  }
}
