'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Settings, User, Palette, Heart, Swords, Star, Image,
  Sparkles, Crown, Flame, Zap, Shield, Wand2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  PROFILE_THEMES, 
  YUGIOH_SERIES, 
  CARD_MECHANICS, 
  CARD_TYPES,
  type ThemeConfig 
} from '@/lib/profile-themes'
import type { 
  PlayerProfile, 
  ProfileTheme, 
  YugiohSeries, 
  CardMechanic, 
  CardType,
  Player,
  DeckWithCards 
} from '@/lib/types'

interface ProfileEditorProps {
  playerId: string
  profile: PlayerProfile | null
  decks: DeckWithCards[]
  allPlayers: Player[]
}

export function ProfileEditor({ playerId, profile, decks, allPlayers }: ProfileEditorProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Form state
  const [bio, setBio] = useState(profile?.bio || '')
  const [featuredDeckId, setFeaturedDeckId] = useState(profile?.featured_deck_id || '')
  const [favoriteSeries, setFavoriteSeries] = useState<YugiohSeries | ''>(profile?.favorite_series || '')
  const [favoriteMechanic, setFavoriteMechanic] = useState<CardMechanic | ''>(profile?.favorite_mechanic || '')
  const [favoriteCardType, setFavoriteCardType] = useState<CardType | ''>(profile?.favorite_card_type || '')
  const [favoriteCardName, setFavoriteCardName] = useState(profile?.favorite_card_name || '')
  const [rivalId, setRivalId] = useState(profile?.rival_id || '')
  const [theme, setTheme] = useState<ProfileTheme>(profile?.theme || 'kaiba')
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '')

  // Reset form when profile changes
  useEffect(() => {
    setBio(profile?.bio || '')
    setFeaturedDeckId(profile?.featured_deck_id || '')
    setFavoriteSeries(profile?.favorite_series || '')
    setFavoriteMechanic(profile?.favorite_mechanic || '')
    setFavoriteCardType(profile?.favorite_card_type || '')
    setFavoriteCardName(profile?.favorite_card_name || '')
    setRivalId(profile?.rival_id || '')
    setTheme(profile?.theme || 'kaiba')
    setBannerUrl(profile?.banner_url || '')
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const profileData = {
        player_id: playerId,
        bio: bio.trim() || null,
        featured_deck_id: featuredDeckId || null,
        favorite_series: favoriteSeries || null,
        favorite_mechanic: favoriteMechanic || null,
        favorite_card_type: favoriteCardType || null,
        favorite_card_name: favoriteCardName.trim() || null,
        rival_id: rivalId || null,
        theme,
        banner_url: bannerUrl.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (profile) {
        // Update existing
        const { error } = await supabase
          .from('player_profiles')
          .update(profileData)
          .eq('player_id', playerId)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('player_profiles')
          .insert(profileData)

        if (error) throw error
      }

      toast.success('Profile updated successfully!')
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const currentTheme = PROFILE_THEMES[theme]
  const otherPlayers = allPlayers.filter(p => p.id !== playerId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary/10">
          <Settings className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            <Settings className="h-5 w-5" />
            Customize Profile
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="about" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              About
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">
              <Heart className="h-3 w-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="rival" className="text-xs">
              <Swords className="h-3 w-3 mr-1" />
              Rival
            </TabsTrigger>
            <TabsTrigger value="theme" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              Theme
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell other duelists about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-input border-border focus:border-primary min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-deck">Featured Deck</Label>
              <Select value={featuredDeckId} onValueChange={(v) => setFeaturedDeckId(v === '_none' ? '' : v)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select a deck to feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      <span className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {deck.name}
                        {deck.archetype && (
                          <span className="text-muted-foreground text-xs">({deck.archetype})</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">This deck will be showcased on your profile</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner">Profile Banner URL</Label>
              <Input
                id="banner"
                placeholder="https://example.com/banner.jpg"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="bg-input border-border focus:border-primary"
              />
              {bannerUrl && (
                <div className="relative h-24 w-full rounded overflow-hidden">
                  <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="favorite-series">Favorite Yu-Gi-Oh! Series</Label>
              <Select value={favoriteSeries} onValueChange={(v) => setFavoriteSeries(v === '_none' ? '' : v as YugiohSeries)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select your favorite series" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {Object.entries(YUGIOH_SERIES).map(([key, { label, years }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {label}
                        <span className="text-muted-foreground text-xs">({years})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favorite-mechanic">Favorite Summoning Mechanic</Label>
              <Select value={favoriteMechanic} onValueChange={(v) => setFavoriteMechanic(v === '_none' ? '' : v as CardMechanic)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select your favorite mechanic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {Object.entries(CARD_MECHANICS).map(([key, { label, color }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favorite-type">Favorite Card Type</Label>
              <Select value={favoriteCardType} onValueChange={(v) => setFavoriteCardType(v === '_none' ? '' : v as CardType)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select your favorite type" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="_none">None</SelectItem>
                  {Object.entries(CARD_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favorite-card">Favorite Card</Label>
              <Input
                id="favorite-card"
                placeholder="e.g., Blue-Eyes White Dragon"
                value={favoriteCardName}
                onChange={(e) => setFavoriteCardName(e.target.value)}
                className="bg-input border-border focus:border-primary"
              />
            </div>
          </TabsContent>

          {/* Rival Tab */}
          <TabsContent value="rival" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="rival">Your Rival</Label>
              <Select value={rivalId} onValueChange={(v) => setRivalId(v === '_none' ? '' : v)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select your rival" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {otherPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <span className="flex items-center gap-2">
                        <Swords className="h-3 w-3 text-red-500" />
                        {player.nickname}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your rival will be displayed on your profile with head-to-head stats
              </p>
            </div>

            {rivalId && (
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Swords className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-semibold">
                        {otherPlayers.find(p => p.id === rivalId)?.nickname || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your head-to-head record will be shown on your profile
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Profile Theme</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(PROFILE_THEMES).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                      theme === t.id 
                        ? 'border-primary ring-2 ring-primary/30' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: t.colors.primary }}
                      />
                      <span className="font-semibold text-sm" style={{ color: t.colors.text }}>
                        {t.name}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: t.colors.muted }}>
                      {t.character}
                    </p>
                    {theme === t.id && (
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs bg-primary">Active</Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Preview */}
            <Card 
              className="border-2 overflow-hidden"
              style={{
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.border,
              }}
            >
              <div 
                className="h-16 w-full"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, ${currentTheme.gradientTo})`,
                }}
              />
              <CardContent className="p-4">
                <p className="font-semibold mb-1" style={{ color: currentTheme.colors.text }}>
                  Theme Preview
                </p>
                <p className="text-sm mb-3" style={{ color: currentTheme.colors.muted }}>
                  {currentTheme.description}
                </p>
                <div className="flex gap-2">
                  <Badge style={{ backgroundColor: currentTheme.colors.primary, color: '#fff' }}>
                    Primary
                  </Badge>
                  <Badge style={{ backgroundColor: currentTheme.colors.accent, color: '#000' }}>
                    Accent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1 border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary/80"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
