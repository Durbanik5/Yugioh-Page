'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Achievement definitions
export const ATTRIBUTE_ACHIEVEMENTS = [
  { id: 'dark', name: 'Shadow Master', key: 'DARK', description: 'Summon DARK monsters' },
  { id: 'light', name: 'Light Bringer', key: 'LIGHT', description: 'Summon LIGHT monsters' },
  { id: 'fire', name: 'Inferno Caller', key: 'FIRE', description: 'Summon FIRE monsters' },
  { id: 'water', name: 'Tidal Ruler', key: 'WATER', description: 'Summon WATER monsters' },
  { id: 'wind', name: 'Storm Weaver', key: 'WIND', description: 'Summon WIND monsters' },
  { id: 'earth', name: 'Terra Former', key: 'EARTH', description: 'Summon EARTH monsters' },
  { id: 'divine', name: 'Divine Vessel', key: 'DIVINE', description: 'Summon DIVINE monsters' },
]

export const TYPE_ACHIEVEMENTS = [
  { id: 'aqua', name: 'Aqua Master', key: 'Aqua', description: 'Summon Aqua-type monsters' },
  { id: 'beast', name: 'Beast Tamer', key: 'Beast', description: 'Summon Beast-type monsters' },
  { id: 'beast_warrior', name: 'Beast-Warrior Hunter', key: 'Beast-Warrior', description: 'Summon Beast-Warrior-type monsters' },
  { id: 'cyberse', name: 'Cyberse Hacker', key: 'Cyberse', description: 'Summon Cyberse-type monsters' },
  { id: 'dinosaur', name: 'Dinosaur Excavator', key: 'Dinosaur', description: 'Summon Dinosaur-type monsters' },
  { id: 'divine_beast', name: 'Divine-Beast Chosen', key: 'Divine-Beast', description: 'Summon Divine-Beast-type monsters' },
  { id: 'dragon', name: 'Dragon Master', key: 'Dragon', description: 'Summon Dragon-type monsters' },
  { id: 'fairy', name: 'Fairy Guardian', key: 'Fairy', description: 'Summon Fairy-type monsters' },
  { id: 'fiend', name: 'Fiend Lord', key: 'Fiend', description: 'Summon Fiend-type monsters' },
  { id: 'fish', name: 'Fish Angler', key: 'Fish', description: 'Summon Fish-type monsters' },
  { id: 'insect', name: 'Insect Collector', key: 'Insect', description: 'Summon Insect-type monsters' },
  { id: 'machine', name: 'Machine Engineer', key: 'Machine', description: 'Summon Machine-type monsters' },
  { id: 'plant', name: 'Plant Cultivator', key: 'Plant', description: 'Summon Plant-type monsters' },
  { id: 'psychic', name: 'Psychic Duelist', key: 'Psychic', description: 'Summon Psychic-type monsters' },
  { id: 'pyro', name: 'Pyro Igniter', key: 'Pyro', description: 'Summon Pyro-type monsters' },
  { id: 'reptile', name: 'Reptile Handler', key: 'Reptile', description: 'Summon Reptile-type monsters' },
  { id: 'rock', name: 'Rock Breaker', key: 'Rock', description: 'Summon Rock-type monsters' },
  { id: 'sea_serpent', name: 'Sea Serpent Sailor', key: 'Sea Serpent', description: 'Summon Sea Serpent-type monsters' },
  { id: 'spellcaster', name: 'Spellcaster Sage', key: 'Spellcaster', description: 'Summon Spellcaster-type monsters' },
  { id: 'thunder', name: 'Thunder Striker', key: 'Thunder', description: 'Summon Thunder-type monsters' },
  { id: 'warrior', name: 'Warrior Champion', key: 'Warrior', description: 'Summon Warrior-type monsters' },
  { id: 'winged_beast', name: 'Winged Beast Falconer', key: 'Winged Beast', description: 'Summon Winged Beast-type monsters' },
  { id: 'wyrm', name: 'Wyrm Tamer', key: 'Wyrm', description: 'Summon Wyrm-type monsters' },
  { id: 'zombie', name: 'Zombie Necromancer', key: 'Zombie', description: 'Summon Zombie-type monsters' },
]

// Tier thresholds
export const TIER_THRESHOLDS = {
  bronze: 10,
  silver: 50,
  gold: 250,
  platinum: 500,
  legendary: 1000,
  mythic: 2500,
}

export type AchievementTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary' | 'mythic'

export interface AchievementProgress {
  achievement_type: string
  achievement_key: string
  progress: number
}

export function getTierForProgress(progress: number): AchievementTier {
  if (progress >= TIER_THRESHOLDS.mythic) return 'mythic'
  if (progress >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (progress >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (progress >= TIER_THRESHOLDS.gold) return 'gold'
  if (progress >= TIER_THRESHOLDS.silver) return 'silver'
  if (progress >= TIER_THRESHOLDS.bronze) return 'bronze'
  return 'none'
}

export function getNextTierThreshold(progress: number): number {
  const thresholds = [10, 50, 250, 500, 1000, 2500]
  for (const threshold of thresholds) {
    if (progress < threshold) return threshold
  }
  return 2500
}

export function getTierColor(tier: AchievementTier): string {
  switch (tier) {
    case 'mythic': return 'bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 text-white'
    case 'legendary': return 'bg-purple-500 text-purple-100'
    case 'platinum': return 'bg-cyan-400 text-cyan-900'
    case 'gold': return 'bg-yellow-500 text-yellow-900'
    case 'silver': return 'bg-slate-400 text-slate-900'
    case 'bronze': return 'bg-amber-700 text-amber-200'
    default: return 'bg-slate-700 text-slate-400'
  }
}

// Hook to fetch player achievements
export function usePlayerAchievements(playerId: string) {
  const [achievements, setAchievements] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = useCallback(async () => {
    if (!playerId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/achievements?playerId=${playerId}`)
      if (!response.ok) throw new Error('Failed to fetch achievements')
      const data = await response.json()
      setAchievements(data.achievements || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  const getProgress = (type: string, key: string): number => {
    // API stores as "attribute_DARK" or "monster_type_Dragon"
    const lookupKey = `${type}_${key}`
    return achievements[lookupKey] || 0
  }

  return { achievements, loading, error, getProgress, refetch: fetchAchievements }
}

// Function to track card summon during duel (call this when a monster is summoned)
export async function trackCardSummon(playerId: string, card: {
  attribute?: string
  race?: string // Monster type in YGOProDeck API is called "race"
}) {
  if (!playerId || !card) return

  try {
    const updates: { type: string; key: string }[] = []

    // Track attribute
    if (card.attribute) {
      updates.push({ type: 'attribute', key: card.attribute })
    }

    // Track monster type (race)
    if (card.race) {
      updates.push({ type: 'monster_type', key: card.race })
    }

    // Send all updates
    if (updates.length > 0) {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          updates,
        }),
      })
    }
  } catch (error) {
    console.error('Failed to track card summon:', error)
  }
}
