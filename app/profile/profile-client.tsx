'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, Trophy, Target, Award, Save, Loader2, Moon, Sun, Flame, Droplets, Wind, Mountain, Sparkles, Star, Swords, Shield, Zap, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Profile } from '@/hooks/use-user'

interface ProfileClientProps {
  profile: Profile
}

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

// Yu-Gi-Oh Attribute achievements
const ATTRIBUTE_ACHIEVEMENTS = [
  { id: 'dark_summoner', name: 'Shadow Master', attribute: 'DARK', icon: Moon, color: 'text-purple-400' },
  { id: 'light_summoner', name: 'Light Bringer', attribute: 'LIGHT', icon: Sun, color: 'text-yellow-300' },
  { id: 'fire_summoner', name: 'Inferno Caller', attribute: 'FIRE', icon: Flame, color: 'text-red-400' },
  { id: 'water_summoner', name: 'Tidal Ruler', attribute: 'WATER', icon: Droplets, color: 'text-blue-400' },
  { id: 'wind_summoner', name: 'Storm Weaver', attribute: 'WIND', icon: Wind, color: 'text-green-400' },
  { id: 'earth_summoner', name: 'Terra Former', attribute: 'EARTH', icon: Mountain, color: 'text-amber-600' },
  { id: 'divine_summoner', name: 'Divine Vessel', attribute: 'DIVINE', icon: Sparkles, color: 'text-yellow-200' },
]

// Monster type achievements
const TYPE_ACHIEVEMENTS = [
  { id: 'dragon_master', name: 'Dragon Master', type: 'Dragon', icon: Flame, color: 'text-orange-400' },
  { id: 'spellcaster_sage', name: 'Spellcaster Sage', type: 'Spellcaster', icon: Sparkles, color: 'text-violet-400' },
  { id: 'warrior_champion', name: 'Warrior Champion', type: 'Warrior', icon: Swords, color: 'text-red-400' },
  { id: 'machine_engineer', name: 'Machine Engineer', type: 'Machine', icon: Zap, color: 'text-slate-400' },
  { id: 'fiend_lord', name: 'Fiend Lord', type: 'Fiend', icon: Moon, color: 'text-purple-500' },
  { id: 'fairy_guardian', name: 'Fairy Guardian', type: 'Fairy', icon: Star, color: 'text-pink-400' },
  { id: 'zombie_necromancer', name: 'Zombie Necromancer', type: 'Zombie', icon: Shield, color: 'text-gray-400' },
  { id: 'beast_tamer', name: 'Beast Tamer', type: 'Beast', icon: Target, color: 'text-amber-500' },
]

// Mock achievement progress (would come from database)
const mockAchievementProgress: Record<string, number> = {
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
}

const getTierForProgress = (progress: number): string => {
  if (progress >= TIER_THRESHOLDS.mythic) return 'mythic'
  if (progress >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (progress >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (progress >= TIER_THRESHOLDS.gold) return 'gold'
  if (progress >= TIER_THRESHOLDS.silver) return 'silver'
  if (progress >= TIER_THRESHOLDS.bronze) return 'bronze'
  return 'none'
}

const getNextTierThreshold = (progress: number): number => {
  const thresholds = [10, 50, 250, 500, 1000, 2500]
  for (const threshold of thresholds) {
    if (progress < threshold) return threshold
  }
  return 2500
}

export function ProfileClient({ profile: initialProfile }: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        username,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated successfully')
      setProfile({ ...profile, display_name: displayName, username, bio })
    }
    setSaving(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'moderator': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    }
  }

  const winRate = profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {profile.display_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                    <Badge variant="outline" className={getRoleBadgeColor(profile.role)}>
                      {profile.role}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Content */}
          <Tabs defaultValue="statistics" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6">
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="decks">Decks</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>

            {/* Statistics Tab */}
            <TabsContent value="statistics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Duel Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-3xl font-bold text-green-400">{profile.wins}</p>
                      <p className="text-sm text-muted-foreground">Wins</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-3xl font-bold text-red-400">{profile.losses}</p>
                      <p className="text-sm text-muted-foreground">Losses</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Win Rate
                      </span>
                      <span className="font-bold">{winRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        ELO Rating
                      </span>
                      <span className="font-bold">{profile.elo_rating}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tier</span>
                      <Badge variant="outline">{profile.tier}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Decks Tab */}
            <TabsContent value="decks" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Your saved decks will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Match History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Your match history will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Saved Tab */}
            <TabsContent value="saved" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Your saved items will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                    Your Achievements
                  </CardTitle>
                  <CardDescription>Track your duelist playstyle and achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="attributes" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="attributes">By Attribute</TabsTrigger>
                      <TabsTrigger value="types">By Type</TabsTrigger>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                    </TabsList>

                    {/* Attributes Tab */}
                    <TabsContent value="attributes" className="mt-4">
                      <ScrollArea className="w-full">
                        <div className="space-y-4 pr-4">
                          {ATTRIBUTE_ACHIEVEMENTS.map((achievement) => {
                            const progress = mockAchievementProgress[achievement.id] || 0
                            const tier = getTierForProgress(progress)
                            const nextThreshold = getNextTierThreshold(progress)
                            const IconComponent = achievement.icon
                            return (
                              <div key={achievement.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                  <IconComponent className={`h-5 w-5 ${achievement.color}`} />
                                  <div>
                                    <h4 className="font-semibold">{achievement.name}</h4>
                                    <p className="text-xs text-muted-foreground">{achievement.attribute}</p>
                                  </div>
                                  <Badge className={TIER_COLORS[tier as keyof typeof TIER_COLORS]}>
                                    {tier}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{progress} / {nextThreshold}</span>
                                    <span className="text-muted-foreground">{Math.round((progress / nextThreshold) * 100)}%</span>
                                  </div>
                                  <Progress value={Math.min((progress / nextThreshold) * 100, 100)} className="h-2" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* Types Tab */}
                    <TabsContent value="types" className="mt-4">
                      <ScrollArea className="w-full">
                        <div className="space-y-4 pr-4">
                          {TYPE_ACHIEVEMENTS.map((achievement) => {
                            const progress = mockAchievementProgress[achievement.id] || 0
                            const tier = getTierForProgress(progress)
                            const nextThreshold = getNextTierThreshold(progress)
                            const IconComponent = achievement.icon
                            return (
                              <div key={achievement.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                  <IconComponent className={`h-5 w-5 ${achievement.color}`} />
                                  <div>
                                    <h4 className="font-semibold">{achievement.name}</h4>
                                    <p className="text-xs text-muted-foreground">{achievement.type}</p>
                                  </div>
                                  <Badge className={TIER_COLORS[tier as keyof typeof TIER_COLORS]}>
                                    {tier}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{progress} / {nextThreshold}</span>
                                    <span className="text-muted-foreground">{Math.round((progress / nextThreshold) * 100)}%</span>
                                  </div>
                                  <Progress value={Math.min((progress / nextThreshold) * 100, 100)} className="h-2" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(TIER_COLORS).map(([tier, colors]) => {
                          const count = Object.entries(mockAchievementProgress).filter(([id, progress]) => {
                            return getTierForProgress(progress) === tier
                          }).length
                          return (
                            <div key={tier} className={`p-4 rounded-lg ${colors} text-center`}>
                              <p className="text-2xl font-bold">{count}</p>
                              <p className="text-sm capitalize">{tier === 'none' ? 'Locked' : tier}</p>
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Edit Profile
                  </CardTitle>
                  <CardDescription>
                    Update your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell other duelists about yourself..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
