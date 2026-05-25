'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Swords, 
  Star, 
  Trophy,
  ChevronRight,
  Sparkles,
  Zap,
  Flame,
  Shield
} from 'lucide-react'

// Campaign character data organized by era
const CAMPAIGN_ERAS = {
  dm: {
    name: 'Yu-Gi-Oh! Duel Monsters',
    shortName: 'DM',
    color: 'from-purple-600 to-purple-900',
    accentColor: 'purple',
    description: 'The original series featuring Yugi Muto and the Millennium Puzzle',
    characters: [
      { name: 'Yami Yugi', deck: 'Dark Magician', difficulty: 5, avatar: 'YM', signature: 'Dark Magician' },
      { name: 'Seto Kaiba', deck: 'Blue-Eyes White Dragon', difficulty: 5, avatar: 'SK', signature: 'Blue-Eyes White Dragon' },
      { name: 'Joey Wheeler', deck: 'Red-Eyes Black Dragon', difficulty: 3, avatar: 'JW', signature: 'Red-Eyes Black Dragon' },
      { name: 'Mai Valentine', deck: 'Harpie Lady', difficulty: 3, avatar: 'MV', signature: 'Harpie Lady Sisters' },
      { name: 'Maximillion Pegasus', deck: 'Toon', difficulty: 4, avatar: 'MP', signature: 'Thousand-Eyes Restrict' },
      { name: 'Yami Bakura', deck: 'Occult', difficulty: 4, avatar: 'YB', signature: 'Dark Necrofear' },
      { name: 'Yami Marik', deck: 'Egyptian God', difficulty: 5, avatar: 'YK', signature: 'The Winged Dragon of Ra' },
      { name: 'Ishizu Ishtar', deck: 'Gravekeeper', difficulty: 3, avatar: 'II', signature: 'Gravekeeper\'s Oracle' },
      { name: 'Mako Tsunami', deck: 'Water', difficulty: 2, avatar: 'MT', signature: 'The Legendary Fisherman' },
      { name: 'Weevil Underwood', deck: 'Insect', difficulty: 2, avatar: 'WU', signature: 'Insect Queen' },
      { name: 'Rex Raptor', deck: 'Dinosaur', difficulty: 2, avatar: 'RR', signature: 'Black Tyranno' },
      { name: 'Bandit Keith', deck: 'Machine', difficulty: 3, avatar: 'BK', signature: 'Barrel Dragon' },
      { name: 'Odion', deck: 'Trap', difficulty: 3, avatar: 'OD', signature: 'Mystical Beast Serket' },
      { name: 'Dartz', deck: 'Orichalcos', difficulty: 5, avatar: 'DZ', signature: 'Divine Serpent Geh' },
      { name: 'Rafael', deck: 'Guardian', difficulty: 4, avatar: 'RF', signature: 'Guardian Eatos' },
    ]
  },
  gx: {
    name: 'Yu-Gi-Oh! GX',
    shortName: 'GX',
    color: 'from-orange-500 to-red-700',
    accentColor: 'orange',
    description: 'Duel Academy and the next generation of duelists',
    characters: [
      { name: 'Jaden Yuki', deck: 'Elemental HERO', difficulty: 4, avatar: 'JY', signature: 'Elemental HERO Neos' },
      { name: 'Zane Truesdale', deck: 'Cyber Dragon', difficulty: 5, avatar: 'ZT', signature: 'Cyber End Dragon' },
      { name: 'Aster Phoenix', deck: 'Destiny HERO', difficulty: 4, avatar: 'AP', signature: 'Destiny HERO - Plasma' },
      { name: 'Chazz Princeton', deck: 'Armed Dragon', difficulty: 3, avatar: 'CP', signature: 'Armed Dragon LV10' },
      { name: 'Alexis Rhodes', deck: 'Cyber Angel', difficulty: 3, avatar: 'AR', signature: 'Cyber Angel Dakini' },
      { name: 'Bastion Misawa', deck: 'Water Dragon', difficulty: 3, avatar: 'BM', signature: 'Water Dragon' },
      { name: 'Syrus Truesdale', deck: 'Roid', difficulty: 2, avatar: 'ST', signature: 'Super Vehicroid Jumbo Drill' },
      { name: 'Jesse Anderson', deck: 'Crystal Beast', difficulty: 4, avatar: 'JA', signature: 'Rainbow Dragon' },
      { name: 'Yubel', deck: 'Yubel', difficulty: 5, avatar: 'YU', signature: 'Yubel - The Ultimate Nightmare' },
      { name: 'Dr. Crowler', deck: 'Ancient Gear', difficulty: 3, avatar: 'DC', signature: 'Ancient Gear Golem' },
      { name: 'Sartorius', deck: 'Arcana Force', difficulty: 4, avatar: 'SA', signature: 'Arcana Force XXI - The World' },
      { name: 'Tyranno Hassleberry', deck: 'Dinosaur', difficulty: 3, avatar: 'TH', signature: 'Ultimate Tyranno' },
    ]
  },
  fiveDs: {
    name: 'Yu-Gi-Oh! 5D\'s',
    shortName: '5D\'s',
    color: 'from-red-600 to-yellow-600',
    accentColor: 'red',
    description: 'Synchro Summoning and Turbo Duels in New Domino City',
    characters: [
      { name: 'Yusei Fudo', deck: 'Junk/Synchron', difficulty: 5, avatar: 'YF', signature: 'Stardust Dragon' },
      { name: 'Jack Atlas', deck: 'Resonator', difficulty: 5, avatar: 'JA', signature: 'Red Dragon Archfiend' },
      { name: 'Crow Hogan', deck: 'Blackwing', difficulty: 4, avatar: 'CH', signature: 'Black-Winged Dragon' },
      { name: 'Akiza Izinski', deck: 'Plant', difficulty: 4, avatar: 'AI', signature: 'Black Rose Dragon' },
      { name: 'Leo', deck: 'Morphtronic', difficulty: 3, avatar: 'LE', signature: 'Power Tool Dragon' },
      { name: 'Kalin Kessler', deck: 'Infernity', difficulty: 4, avatar: 'KK', signature: 'Infernity Doom Dragon' },
      { name: 'Rex Goodwin', deck: 'Sun Dragon Inti', difficulty: 5, avatar: 'RG', signature: 'Earthbound Immortal Wiraqocha Rasca' },
      { name: 'Aporia', deck: 'Meklord', difficulty: 5, avatar: 'AP', signature: 'Meklord Astro Dragon Asterisk' },
      { name: 'Z-one', deck: 'Timelord', difficulty: 5, avatar: 'ZO', signature: 'Timelord Progenitor Vorpgate' },
      { name: 'Sherry LeBlanc', deck: 'Noble Knight', difficulty: 4, avatar: 'SL', signature: 'Chevalier de Fleur' },
      { name: 'Antinomy', deck: 'T.G.', difficulty: 4, avatar: 'AN', signature: 'T.G. Blade Blaster' },
    ]
  },
  zexal: {
    name: 'Yu-Gi-Oh! ZEXAL',
    shortName: 'ZEXAL',
    color: 'from-cyan-500 to-blue-700',
    accentColor: 'cyan',
    description: 'Xyz Summoning and the hunt for Number cards',
    characters: [
      { name: 'Yuma Tsukumo', deck: 'Gagaga', difficulty: 3, avatar: 'YT', signature: 'Number 39: Utopia' },
      { name: 'Astral', deck: 'Number', difficulty: 5, avatar: 'AS', signature: 'Number C39: Utopia Ray Victory' },
      { name: 'Kite Tenjo', deck: 'Photon/Galaxy', difficulty: 5, avatar: 'KT', signature: 'Galaxy-Eyes Photon Dragon' },
      { name: 'Reginald Kastle', deck: 'Shark', difficulty: 4, avatar: 'RK', signature: 'Number 32: Shark Drake' },
      { name: 'Rio Kastle', deck: 'Ice', difficulty: 3, avatar: 'RO', signature: 'Number 103: Ragnazero' },
      { name: 'Vetrix', deck: 'Heraldic Beast', difficulty: 4, avatar: 'VX', signature: 'Number 69: Heraldry Crest' },
      { name: 'Quattro', deck: 'Gimmick Puppet', difficulty: 4, avatar: 'Q4', signature: 'Number 15: Gimmick Puppet Giant Grinder' },
      { name: 'Vector', deck: 'Umbral Horror', difficulty: 5, avatar: 'VC', signature: 'Number C104: Umbral Horror Masquerade' },
      { name: 'Nash', deck: 'Shark', difficulty: 5, avatar: 'NS', signature: 'Number 101: Silent Honor ARK' },
      { name: 'Don Thousand', deck: 'Numeron', difficulty: 5, avatar: 'DT', signature: 'Number C1000: Numeronius' },
      { name: 'Mizar', deck: 'Galaxy', difficulty: 5, avatar: 'MZ', signature: 'Number 107: Galaxy-Eyes Tachyon Dragon' },
    ]
  },
  arcv: {
    name: 'Yu-Gi-Oh! ARC-V',
    shortName: 'ARC-V',
    color: 'from-green-500 to-teal-700',
    accentColor: 'green',
    description: 'Pendulum Summoning and dimensional counterparts',
    characters: [
      { name: 'Yuya Sakaki', deck: 'Performapal/Odd-Eyes', difficulty: 4, avatar: 'YS', signature: 'Odd-Eyes Pendulum Dragon' },
      { name: 'Declan Akaba', deck: 'D/D/D', difficulty: 5, avatar: 'DA', signature: 'D/D/D Doom King Armageddon' },
      { name: 'Yuto', deck: 'Phantom Knights', difficulty: 4, avatar: 'YO', signature: 'Dark Rebellion Xyz Dragon' },
      { name: 'Yugo', deck: 'Speedroid', difficulty: 4, avatar: 'YG', signature: 'Clear Wing Synchro Dragon' },
      { name: 'Yuri', deck: 'Predaplant', difficulty: 4, avatar: 'YR', signature: 'Starving Venom Fusion Dragon' },
      { name: 'Shay Obsidian', deck: 'Raidraptor', difficulty: 4, avatar: 'SO', signature: 'Raidraptor - Ultimate Falcon' },
      { name: 'Sora Perse', deck: 'Fluffal/Frightfur', difficulty: 4, avatar: 'SP', signature: 'Frightfur Tiger' },
      { name: 'Gong Strong', deck: 'Superheavy Samurai', difficulty: 3, avatar: 'GS', signature: 'Superheavy Samurai Warlord Susanowo' },
      { name: 'Sylvio Sawatari', deck: 'Abyss Actor', difficulty: 3, avatar: 'SS', signature: 'Abyss Actor - Superstar' },
      { name: 'Zuzu Boyle', deck: 'Melodious', difficulty: 3, avatar: 'ZB', signature: 'Bloom Diva the Melodious Choir' },
      { name: 'Jack Atlas (ARC-V)', deck: 'Red Dragon Archfiend', difficulty: 5, avatar: 'JK', signature: 'Scarlight Red Dragon Archfiend' },
      { name: 'Crow Hogan (ARC-V)', deck: 'Blackwing', difficulty: 4, avatar: 'CW', signature: 'Assault Blackwing - Raikiri the Rain Shower' },
    ]
  }
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          className={`h-3 w-3 ${star <= level ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

export default function CampaignPage() {
  const [selectedEra, setSelectedEra] = useState<keyof typeof CAMPAIGN_ERAS>('dm')
  const era = CAMPAIGN_ERAS[selectedEra]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2 flex items-center gap-3"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            <Swords className="h-8 w-8 text-primary" />
            Campaign Mode
          </h1>
          <p className="text-muted-foreground">
            Challenge iconic duelists from across Yu-Gi-Oh! history
          </p>
        </div>

        {/* Era Tabs */}
        <Tabs value={selectedEra} onValueChange={(v) => setSelectedEra(v as keyof typeof CAMPAIGN_ERAS)} className="space-y-6">
          <TabsList className="grid grid-cols-5 h-auto gap-2 bg-transparent p-0">
            {Object.entries(CAMPAIGN_ERAS).map(([key, eraData]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10 transition-all`}
              >
                <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  {eraData.shortName}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(CAMPAIGN_ERAS).map(([key, eraData]) => (
            <TabsContent key={key} value={key} className="space-y-6">
              {/* Era Header Card */}
              <Card className={`bg-gradient-to-r ${eraData.color} border-0 overflow-hidden`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-orbitron)' }}>
                        {eraData.name}
                      </h2>
                      <p className="text-white/80 text-sm">
                        {eraData.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{eraData.characters.length}</div>
                      <div className="text-white/70 text-sm">Duelists</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Character Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {eraData.characters.map((character) => (
                  <Card 
                    key={character.name} 
                    className="bg-card border-border hover:border-primary/50 transition-all group cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${eraData.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>
                            {character.avatar}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {character.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {character.deck} Deck
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <DifficultyStars level={character.difficulty} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Signature Card */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs">
                          <Sparkles className="h-3 w-3 text-yellow-500" />
                          <span className="text-muted-foreground">Ace:</span>
                          <span className="text-foreground truncate">{character.signature}</span>
                        </div>
                      </div>
                      
                      {/* Duel Button */}
                      <Button 
                        className="w-full mt-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                        size="sm"
                      >
                        <Swords className="h-4 w-4 mr-2" />
                        Challenge
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Legend */}
        <Card className="mt-8 bg-card/50 border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Difficulty Guide
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DifficultyStars level={1} />
                <span className="text-muted-foreground">Beginner</span>
              </div>
              <div className="flex items-center gap-2">
                <DifficultyStars level={2} />
                <span className="text-muted-foreground">Easy</span>
              </div>
              <div className="flex items-center gap-2">
                <DifficultyStars level={3} />
                <span className="text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <DifficultyStars level={4} />
                <span className="text-muted-foreground">Hard</span>
              </div>
              <div className="flex items-center gap-2">
                <DifficultyStars level={5} />
                <span className="text-muted-foreground">Expert</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
