'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Trophy, 
  Flame, 
  Droplets, 
  Wind, 
  Mountain, 
  Sparkles, 
  Moon, 
  Sun,
  Star,
  Swords,
  Shield,
  Zap,
  Crown,
  Target,
  Medal,
  Award
} from 'lucide-react'

// Achievement tier thresholds
const TIER_THRESHOLDS = {
  bronze: 10,
  silver: 50,
  gold: 250,
  platinum: 500,
  legendary: 1000,
  mythic: 2500,
}

const TIER_COLORS = {
  none: 'bg-slate-700 text-slate-400',
  bronze: 'bg-amber-700 text-amber-200',
  silver: 'bg-slate-400 text-slate-900',
  gold: 'bg-yellow-500 text-yellow-900',
  platinum: 'bg-cyan-400 text-cyan-900',
  legendary: 'bg-purple-500 text-purple-100',
  mythic: 'bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 text-white',
}

const TIER_BORDER_COLORS = {
  none: 'border-slate-600',
  bronze: 'border-amber-600',
  silver: 'border-slate-300',
  gold: 'border-yellow-400',
  platinum: 'border-cyan-300',
  legendary: 'border-purple-400',
  mythic: 'border-yellow-300',
}

// Yu-Gi-Oh Attribute achievements
const ATTRIBUTE_ACHIEVEMENTS = [
  {
    id: 'dark_summoner',
    name: 'Shadow Master',
    attribute: 'DARK',
    requirement: 'Summon DARK monsters',
    icon: Moon,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
  },
  {
    id: 'light_summoner',
    name: 'Light Bringer',
    attribute: 'LIGHT',
    requirement: 'Summon LIGHT monsters',
    icon: Sun,
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900/30',
  },
  {
    id: 'fire_summoner',
    name: 'Inferno Caller',
    attribute: 'FIRE',
    requirement: 'Summon FIRE monsters',
    icon: Flame,
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
  },
  {
    id: 'water_summoner',
    name: 'Tidal Ruler',
    attribute: 'WATER',
    requirement: 'Summon WATER monsters',
    icon: Droplets,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
  },
  {
    id: 'wind_summoner',
    name: 'Storm Weaver',
    attribute: 'WIND',
    requirement: 'Summon WIND monsters',
    icon: Wind,
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
  },
  {
    id: 'earth_summoner',
    name: 'Terra Former',
    attribute: 'EARTH',
    requirement: 'Summon EARTH monsters',
    icon: Mountain,
    color: 'text-amber-600',
    bgColor: 'bg-amber-900/30',
  },
  {
    id: 'divine_summoner',
    name: 'Divine Vessel',
    attribute: 'DIVINE',
    requirement: 'Summon DIVINE monsters',
    icon: Sparkles,
    color: 'text-yellow-200',
    bgColor: 'bg-yellow-800/30',
  },
]

// Monster type achievements
const TYPE_ACHIEVEMENTS = [
  { id: 'dragon_master', name: 'Dragon Master', type: 'Dragon', requirement: 'Summon Dragon-type monsters', icon: Flame, color: 'text-orange-400' },
  { id: 'spellcaster_sage', name: 'Spellcaster Sage', type: 'Spellcaster', requirement: 'Summon Spellcaster-type monsters', icon: Sparkles, color: 'text-violet-400' },
  { id: 'warrior_champion', name: 'Warrior Champion', type: 'Warrior', requirement: 'Summon Warrior-type monsters', icon: Swords, color: 'text-red-400' },
  { id: 'machine_engineer', name: 'Machine Engineer', type: 'Machine', requirement: 'Summon Machine-type monsters', icon: Zap, color: 'text-slate-400' },
  { id: 'fiend_lord', name: 'Fiend Lord', type: 'Fiend', requirement: 'Summon Fiend-type monsters', icon: Moon, color: 'text-purple-500' },
  { id: 'fairy_guardian', name: 'Fairy Guardian', type: 'Fairy', requirement: 'Summon Fairy-type monsters', icon: Star, color: 'text-pink-400' },
  { id: 'zombie_necromancer', name: 'Zombie Necromancer', type: 'Zombie', requirement: 'Summon Zombie-type monsters', icon: Shield, color: 'text-gray-400' },
  { id: 'beast_tamer', name: 'Beast Tamer', type: 'Beast', requirement: 'Summon Beast-type monsters', icon: Target, color: 'text-amber-500' },
]

// Summoning method achievements
const SUMMON_ACHIEVEMENTS = [
  { id: 'fusion_master', name: 'Fusion Master', method: 'Fusion', requirement: 'Perform Fusion Summons', icon: Sparkles, color: 'text-purple-400' },
  { id: 'synchro_tuner', name: 'Synchro Tuner', method: 'Synchro', requirement: 'Perform Synchro Summons', icon: Zap, color: 'text-white' },
  { id: 'xyz_overlord', name: 'Xyz Overlord', method: 'Xyz', requirement: 'Perform Xyz Summons', icon: Star, color: 'text-black' },
  { id: 'link_networker', name: 'Link Networker', method: 'Link', requirement: 'Perform Link Summons', icon: Target, color: 'text-blue-400' },
  { id: 'pendulum_swinger', name: 'Pendulum Swinger', method: 'Pendulum', requirement: 'Perform Pendulum Summons', icon: Wind, color: 'text-cyan-400' },
  { id: 'ritual_priest', name: 'Ritual Priest', method: 'Ritual', requirement: 'Perform Ritual Summons', icon: Moon, color: 'text-blue-300' },
]

// Duel achievements
const DUEL_ACHIEVEMENTS = [
  { id: 'duelist', name: 'Duelist', requirement: 'Win duels', icon: Trophy, color: 'text-yellow-400' },
  { id: 'streak_master', name: 'Streak Master', requirement: 'Achieve win streaks', icon: Flame, color: 'text-orange-400' },
  { id: 'comeback_king', name: 'Comeback King', requirement: 'Win with 1000 LP or less', icon: Crown, color: 'text-yellow-500' },
  { id: 'otk_specialist', name: 'OTK Specialist', requirement: 'Win on turn 1-2', icon: Zap, color: 'text-red-500' },
  { id: 'card_destroyer', name: 'Card Destroyer', requirement: 'Destroy opponent monsters', icon: Swords, color: 'text-red-400' },
  { id: 'damage_dealer', name: 'Damage Dealer', requirement: 'Deal battle damage', icon: Target, color: 'text-orange-500' },
]

// Mock user achievement progress (would come from database)
const mockUserProgress: Record<string, number> = {
  dark_summoner: 127,
  light_summoner: 85,
  fire_summoner: 312,
  water_summoner: 45,
  wind_summoner: 23,
  earth_summoner: 156,
  divine_summoner: 3,
  dragon_master: 89,
  spellcaster_sage: 234,
  warrior_champion: 167,
  machine_engineer: 78,
  fiend_lord: 45,
  fairy_guardian: 12,
  zombie_necromancer: 523,
  beast_tamer: 34,
  fusion_master: 156,
  synchro_tuner: 89,
  xyz_overlord: 234,
  link_networker: 67,
  pendulum_swinger: 12,
  ritual_priest: 8,
  duelist: 1250,
  streak_master: 15,
  comeback_king: 23,
  otk_specialist: 8,
  card_destroyer: 3456,
  damage_dealer: 125000,
}

function getTier(progress: number): keyof typeof TIER_COLORS {
  if (progress >= TIER_THRESHOLDS.mythic) return 'mythic'
  if (progress >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (progress >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (progress >= TIER_THRESHOLDS.gold) return 'gold'
  if (progress >= TIER_THRESHOLDS.silver) return 'silver'
  if (progress >= TIER_THRESHOLDS.bronze) return 'bronze'
  return 'none'
}

function getNextTierThreshold(progress: number): number {
  if (progress < TIER_THRESHOLDS.bronze) return TIER_THRESHOLDS.bronze
  if (progress < TIER_THRESHOLDS.silver) return TIER_THRESHOLDS.silver
  if (progress < TIER_THRESHOLDS.gold) return TIER_THRESHOLDS.gold
  if (progress < TIER_THRESHOLDS.platinum) return TIER_THRESHOLDS.platinum
  if (progress < TIER_THRESHOLDS.legendary) return TIER_THRESHOLDS.legendary
  if (progress < TIER_THRESHOLDS.mythic) return TIER_THRESHOLDS.mythic
  return TIER_THRESHOLDS.mythic
}

function TierBadge({ tier, size = 'md' }: { tier: keyof typeof TIER_COLORS; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full ${TIER_COLORS[tier]} ${TIER_BORDER_COLORS[tier]} border-2 flex items-center justify-center font-bold shadow-lg`}>
      {tier === 'none' ? '-' : tier.charAt(0).toUpperCase()}
    </div>
  )
}

function AchievementRow({ 
  achievement, 
  progress 
}: { 
  achievement: { id: string; name: string; requirement: string; icon: any; color: string; attribute?: string; bgColor?: string }
  progress: number 
}) {
  const tier = getTier(progress)
  const nextThreshold = getNextTierThreshold(progress)
  const progressPercent = tier === 'mythic' ? 100 : (progress / nextThreshold) * 100
  const Icon = achievement.icon
  
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg ${achievement.bgColor || 'bg-card/50'} border border-border/50 hover:border-border transition-colors`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full bg-background/50 flex items-center justify-center ${achievement.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Name & Requirement */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{achievement.name}</span>
          {achievement.attribute && (
            <Badge variant="outline" className={`text-xs ${achievement.color}`}>
              {achievement.attribute}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{achievement.requirement}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progress.toLocaleString()} / {nextThreshold.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Tier badges */}
      <div className="flex items-center gap-1">
        <TierBadge tier={progress >= TIER_THRESHOLDS.bronze ? 'bronze' : 'none'} size="sm" />
        <TierBadge tier={progress >= TIER_THRESHOLDS.silver ? 'silver' : 'none'} size="sm" />
        <TierBadge tier={progress >= TIER_THRESHOLDS.gold ? 'gold' : 'none'} size="sm" />
        <TierBadge tier={progress >= TIER_THRESHOLDS.platinum ? 'platinum' : 'none'} size="sm" />
        <TierBadge tier={progress >= TIER_THRESHOLDS.legendary ? 'legendary' : 'none'} size="sm" />
        <TierBadge tier={progress >= TIER_THRESHOLDS.mythic ? 'mythic' : 'none'} size="sm" />
      </div>
    </div>
  )
}

function AchievementTable({ 
  achievements, 
  userProgress 
}: { 
  achievements: Array<{ id: string; name: string; requirement: string; icon: any; color: string; attribute?: string; bgColor?: string }>
  userProgress: Record<string, number>
}) {
  return (
    <div className="space-y-2">
      {achievements.map((achievement) => (
        <AchievementRow
          key={achievement.id}
          achievement={achievement}
          progress={userProgress[achievement.id] || 0}
        />
      ))}
    </div>
  )
}

export function AchievementsClient() {
  const [activeTab, setActiveTab] = useState('attributes')
  
  // Calculate total achievements stats
  const totalAchievements = [
    ...ATTRIBUTE_ACHIEVEMENTS,
    ...TYPE_ACHIEVEMENTS,
    ...SUMMON_ACHIEVEMENTS,
    ...DUEL_ACHIEVEMENTS,
  ].length
  
  const completedBronze = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.bronze).length
  const completedSilver = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.silver).length
  const completedGold = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.gold).length
  const completedPlatinum = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.platinum).length
  const completedLegendary = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.legendary).length
  const completedMythic = Object.values(mockUserProgress).filter(p => p >= TIER_THRESHOLDS.mythic).length
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Achievements</h1>
            <p className="text-muted-foreground">Track your dueling milestones and earn medals</p>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-amber-900/20 border-amber-700/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="bronze" size="lg" />
              <p className="text-2xl font-bold text-amber-400 mt-2">{completedBronze}</p>
              <p className="text-xs text-muted-foreground">Bronze</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-500/20 border-slate-400/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="silver" size="lg" />
              <p className="text-2xl font-bold text-slate-300 mt-2">{completedSilver}</p>
              <p className="text-xs text-muted-foreground">Silver</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-900/20 border-yellow-600/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="gold" size="lg" />
              <p className="text-2xl font-bold text-yellow-400 mt-2">{completedGold}</p>
              <p className="text-xs text-muted-foreground">Gold</p>
            </CardContent>
          </Card>
          <Card className="bg-cyan-900/20 border-cyan-500/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="platinum" size="lg" />
              <p className="text-2xl font-bold text-cyan-400 mt-2">{completedPlatinum}</p>
              <p className="text-xs text-muted-foreground">Platinum</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-900/20 border-purple-500/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="legendary" size="lg" />
              <p className="text-2xl font-bold text-purple-400 mt-2">{completedLegendary}</p>
              <p className="text-xs text-muted-foreground">Legendary</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-900/20 via-yellow-900/20 to-purple-900/20 border-yellow-500/50">
            <CardContent className="p-4 text-center">
              <TierBadge tier="mythic" size="lg" />
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-purple-400 mt-2">{completedMythic}</p>
              <p className="text-xs text-muted-foreground">Mythic</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tier Requirements Info */}
        <Card className="mb-8 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" />
              Medal Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TierBadge tier="bronze" size="sm" />
                <span><strong>10</strong> for Bronze</span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier="silver" size="sm" />
                <span><strong>50</strong> for Silver</span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier="gold" size="sm" />
                <span><strong>250</strong> for Gold</span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier="platinum" size="sm" />
                <span><strong>500</strong> for Platinum</span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier="legendary" size="sm" />
                <span><strong>1,000</strong> for Legendary</span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier="mythic" size="sm" />
                <span><strong>2,500</strong> for Mythic</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Achievement Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="attributes" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Attributes</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Monster Types</span>
            </TabsTrigger>
            <TabsTrigger value="summons" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Summoning</span>
            </TabsTrigger>
            <TabsTrigger value="duels" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Dueling</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attributes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Attribute Mastery
                </CardTitle>
                <CardDescription>
                  Earn medals by summoning monsters of each attribute
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementTable 
                  achievements={ATTRIBUTE_ACHIEVEMENTS.map(a => ({ ...a, attribute: a.attribute }))} 
                  userProgress={mockUserProgress} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="types">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Monster Type Mastery
                </CardTitle>
                <CardDescription>
                  Earn medals by summoning monsters of each type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementTable 
                  achievements={TYPE_ACHIEVEMENTS} 
                  userProgress={mockUserProgress} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="summons">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Summoning Mastery
                </CardTitle>
                <CardDescription>
                  Earn medals by performing different summoning methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementTable 
                  achievements={SUMMON_ACHIEVEMENTS} 
                  userProgress={mockUserProgress} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="duels">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Duel Mastery
                </CardTitle>
                <CardDescription>
                  Earn medals through your dueling accomplishments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementTable 
                  achievements={DUEL_ACHIEVEMENTS} 
                  userProgress={mockUserProgress} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
