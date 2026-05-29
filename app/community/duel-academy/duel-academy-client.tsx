'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  GraduationCap, 
  BookOpen, 
  Lightbulb, 
  Puzzle, 
  Trophy,
  Play,
  CheckCircle,
  Lock,
  Star,
  Swords,
  Shield,
  Zap,
  Target,
  ChevronRight,
  Clock,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  Circle,
  Hexagon,
  Triangle,
  Square,
  Moon,
  Sun,
  Flame,
  Droplets,
  Wind,
  Mountain,
  ExternalLink
} from 'lucide-react'

// Game mechanics organized by category
const gameRules = {
  turnStructure: {
    title: 'Turn Structure',
    icon: Clock,
    color: 'text-blue-400',
    phases: [
      {
        name: 'Draw Phase',
        description: 'The turn player draws 1 card from their Deck. The player who goes first cannot draw on their first turn.',
        tips: ['Some cards have effects that activate during the Draw Phase', 'You can activate cards/effects during this phase']
      },
      {
        name: 'Standby Phase',
        description: 'A phase for card effects that specifically activate during the Standby Phase. Many maintenance costs are paid here.',
        tips: ['Pay attention to cards with Standby Phase effects', 'Some cards require you to pay Life Points or discard']
      },
      {
        name: 'Main Phase 1',
        description: 'Perform most of your actions: Normal Summon, Set cards, activate Spell/Trap cards, Special Summon monsters.',
        tips: ['You can only Normal Summon/Set once per turn', 'Plan your plays before entering the Battle Phase']
      },
      {
        name: 'Battle Phase',
        description: 'Declare attacks with your monsters. The turn player going first cannot conduct a Battle Phase.',
        subPhases: [
          { name: 'Start Step', desc: 'Announce you are entering Battle Phase' },
          { name: 'Battle Step', desc: 'Select an attack target' },
          { name: 'Damage Step', desc: 'Calculate battle damage' },
          { name: 'End Step', desc: 'Announce end of Battle Phase' }
        ]
      },
      {
        name: 'Main Phase 2',
        description: 'Same actions as Main Phase 1. Use this to set up defenses after attacking.',
        tips: ['Good time to Set Trap cards for opponent\'s turn', 'Summon monsters in Defense Position if needed']
      },
      {
        name: 'End Phase',
        description: 'Declare your turn is over. Apply hand size limit (6 cards). Some effects activate here.',
        tips: ['Discard down to 6 cards if you have more', 'Some effects only activate during the End Phase']
      }
    ]
  },
  cardTypes: {
    title: 'Card Types',
    icon: Layers,
    color: 'text-purple-400',
    categories: [
      {
        name: 'Monster Cards',
        color: 'bg-orange-500/20 text-orange-400',
        types: [
          { name: 'Normal Monster', desc: 'Yellow frame. No effects, relies on stats.', color: 'bg-yellow-600/20' },
          { name: 'Effect Monster', desc: 'Orange frame. Has special abilities.', color: 'bg-orange-500/20' },
          { name: 'Ritual Monster', desc: 'Blue frame. Summoned with Ritual Spell.', color: 'bg-blue-700/20' },
          { name: 'Fusion Monster', desc: 'Purple frame. Summoned with Fusion materials.', color: 'bg-purple-500/20' },
          { name: 'Synchro Monster', desc: 'White frame. Tuner + non-Tuner materials.', color: 'bg-slate-200/20' },
          { name: 'Xyz Monster', desc: 'Black frame. Same-Level materials as Overlay Units.', color: 'bg-slate-700/20' },
          { name: 'Pendulum Monster', desc: 'Half monster/half spell. Can be placed in Pendulum Zones.', color: 'bg-gradient-to-b from-teal-500/20 to-orange-500/20' },
          { name: 'Link Monster', desc: 'Blue frame. Has Link Arrows and Link Rating.', color: 'bg-blue-500/20' },
        ]
      },
      {
        name: 'Spell Cards',
        color: 'bg-teal-500/20 text-teal-400',
        types: [
          { name: 'Normal Spell', desc: 'Activate and resolve immediately.' },
          { name: 'Continuous Spell', desc: 'Remains on field after activation.' },
          { name: 'Equip Spell', desc: 'Attach to a monster to grant effects.' },
          { name: 'Field Spell', desc: 'Affects the entire field. Only 1 per player.' },
          { name: 'Quick-Play Spell', desc: 'Can be activated during either turn.' },
          { name: 'Ritual Spell', desc: 'Used to Ritual Summon monsters.' },
        ]
      },
      {
        name: 'Trap Cards',
        color: 'bg-pink-500/20 text-pink-400',
        types: [
          { name: 'Normal Trap', desc: 'Set first, then activate on a later turn.' },
          { name: 'Continuous Trap', desc: 'Remains on field after activation.' },
          { name: 'Counter Trap', desc: 'Spell Speed 3. Can negate other effects.' },
        ]
      }
    ]
  },
  attributes: {
    title: 'Monster Attributes',
    icon: Sparkles,
    color: 'text-yellow-400',
    list: [
      { name: 'DARK', icon: Moon, color: 'text-purple-400', desc: 'Associated with shadow, evil, and the underworld. Many powerful archetypes.' },
      { name: 'LIGHT', icon: Sun, color: 'text-yellow-400', desc: 'Associated with holiness, justice, and celestial beings.' },
      { name: 'FIRE', icon: Flame, color: 'text-red-400', desc: 'Associated with flames, heat, and destruction.' },
      { name: 'WATER', icon: Droplets, color: 'text-blue-400', desc: 'Associated with oceans, ice, and aquatic life.' },
      { name: 'WIND', icon: Wind, color: 'text-green-400', desc: 'Associated with air, flying creatures, and speed.' },
      { name: 'EARTH', icon: Mountain, color: 'text-amber-600', desc: 'Associated with land, rocks, and physical strength.' },
      { name: 'DIVINE', icon: Star, color: 'text-yellow-500', desc: 'Reserved for god cards. Extremely rare.' },
    ]
  },
  summoningMethods: {
    title: 'Summoning Methods',
    icon: Swords,
    color: 'text-orange-400',
    methods: [
      {
        name: 'Normal Summon',
        desc: 'Once per turn, Summon a monster from your hand. Level 5-6 requires 1 Tribute, Level 7+ requires 2 Tributes.',
        icon: Circle,
        color: 'text-yellow-400'
      },
      {
        name: 'Special Summon',
        desc: 'Summon monsters through card effects. No limit per turn unless specified.',
        icon: Sparkles,
        color: 'text-blue-400'
      },
      {
        name: 'Flip Summon',
        desc: 'Change a face-down Defense Position monster to face-up Attack Position.',
        icon: Square,
        color: 'text-slate-400'
      },
      {
        name: 'Fusion Summon',
        desc: 'Use Polymerization or similar cards to fuse materials from hand/field into a Fusion Monster.',
        icon: Hexagon,
        color: 'text-purple-400'
      },
      {
        name: 'Synchro Summon',
        desc: 'Send 1 Tuner + 1+ non-Tuner monsters whose Levels equal the Synchro Monster\'s Level.',
        icon: Circle,
        color: 'text-slate-200'
      },
      {
        name: 'Xyz Summon',
        desc: 'Overlay 2+ monsters of the same Level as materials (Overlay Units) for an Xyz Monster.',
        icon: Triangle,
        color: 'text-slate-400'
      },
      {
        name: 'Pendulum Summon',
        desc: 'With 2 Pendulum cards in Pendulum Zones, Summon multiple monsters between their Scales.',
        icon: Layers,
        color: 'text-teal-400'
      },
      {
        name: 'Link Summon',
        desc: 'Send materials whose total Link equals the Link Monster\'s Link Rating.',
        icon: Hexagon,
        color: 'text-blue-400'
      },
      {
        name: 'Ritual Summon',
        desc: 'Use a Ritual Spell and Tribute monsters whose Levels meet the requirement.',
        icon: Star,
        color: 'text-blue-700'
      },
    ]
  },
  chainRules: {
    title: 'Chains & Spell Speed',
    icon: Zap,
    color: 'text-green-400',
    content: [
      {
        name: 'Spell Speed 1',
        desc: 'Normal Spells, Equip Spells, Continuous Spells, Field Spells, Ritual Spells, and most monster effects.',
        rule: 'Cannot be chained to anything. Can only start a chain.'
      },
      {
        name: 'Spell Speed 2',
        desc: 'Quick-Play Spells, Normal Traps, Continuous Traps, and Quick Effects.',
        rule: 'Can be chained to Spell Speed 1 or 2.'
      },
      {
        name: 'Spell Speed 3',
        desc: 'Counter Traps only.',
        rule: 'Can be chained to any Spell Speed. Only Counter Traps can chain to Counter Traps.'
      }
    ],
    chainExample: [
      'Player A activates a Spell Card (Chain Link 1)',
      'Player B chains a Quick-Play Spell (Chain Link 2)',
      'Player A chains their Trap Card (Chain Link 3)',
      'Neither player adds to the chain',
      'Chain resolves backwards: 3 → 2 → 1'
    ]
  }
}

// Tutorial categories with lessons
const tutorials = [
  {
    id: 'basics',
    title: 'Dueling Basics',
    description: 'Learn the fundamental rules of Yu-Gi-Oh!',
    icon: BookOpen,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    lessons: [
      { id: 1, title: 'Understanding the Field', duration: '5 min', completed: true },
      { id: 2, title: 'Card Types Explained', duration: '8 min', completed: true },
      { id: 3, title: 'Phases of a Turn', duration: '6 min', completed: false },
      { id: 4, title: 'Normal & Special Summons', duration: '7 min', completed: false },
      { id: 5, title: 'Battle Phase Basics', duration: '5 min', completed: false },
    ]
  },
  {
    id: 'monsters',
    title: 'Monster Mechanics',
    description: 'Master different monster summoning types',
    icon: Swords,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    lessons: [
      { id: 1, title: 'Tribute Summoning', duration: '6 min', completed: false },
      { id: 2, title: 'Fusion Summoning', duration: '8 min', completed: false },
      { id: 3, title: 'Synchro Summoning', duration: '10 min', completed: false },
      { id: 4, title: 'Xyz Summoning', duration: '9 min', completed: false },
      { id: 5, title: 'Link Summoning', duration: '12 min', completed: false },
      { id: 6, title: 'Pendulum Summoning', duration: '15 min', completed: false },
    ]
  },
  {
    id: 'spells-traps',
    title: 'Spells & Traps',
    description: 'Learn to use and counter spell/trap cards',
    icon: Zap,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    lessons: [
      { id: 1, title: 'Spell Card Types', duration: '7 min', completed: false },
      { id: 2, title: 'Trap Card Types', duration: '7 min', completed: false },
      { id: 3, title: 'Chain Links Explained', duration: '10 min', completed: false },
      { id: 4, title: 'Spell Speed & Timing', duration: '12 min', completed: false },
      { id: 5, title: 'Counter Traps', duration: '8 min', completed: false },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Strategies',
    description: 'Take your dueling to the next level',
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    lessons: [
      { id: 1, title: 'Card Advantage', duration: '10 min', completed: false },
      { id: 2, title: 'Board State Analysis', duration: '12 min', completed: false },
      { id: 3, title: 'Hand Traps Guide', duration: '15 min', completed: false },
      { id: 4, title: 'Side Decking', duration: '10 min', completed: false },
      { id: 5, title: 'Meta Game Awareness', duration: '8 min', completed: false },
    ]
  },
]

// Combo guides
const comboGuides = [
  { id: 'buster-blader', deckName: 'Buster Blader', difficulty: 'Intermediate', combos: 3, views: 1250, description: 'Lock down your opponent with the Dragon Destroyer combo' },
  { id: 'blue-eyes', deckName: 'Blue-Eyes', difficulty: 'Beginner', combos: 5, views: 3420, description: 'Summon powerful dragons and overwhelm your opponent' },
  { id: 'dark-magician', deckName: 'Dark Magician', difficulty: 'Intermediate', combos: 4, views: 2890, description: 'Control the field with the ultimate wizard' },
  { id: 'hero', deckName: 'Elemental HERO', difficulty: 'Advanced', combos: 8, views: 1890, description: 'Master fusion summoning with the HERO archetype' },
  { id: 'dragon-link', deckName: 'Dragon Link', difficulty: 'Advanced', combos: 6, views: 4210, description: 'Build unstoppable boards with link monsters' },
  { id: 'sky-striker', deckName: 'Sky Striker', difficulty: 'Expert', combos: 10, views: 2150, description: 'Resource management and spell mastery' },
]

// Puzzles
const puzzles = [
  { id: 1, title: 'First Strike', difficulty: 'Easy', description: 'Deal exactly 8000 damage this turn', reward: 50, completed: true, solveRate: 89 },
  { id: 2, title: 'Fusion Fury', difficulty: 'Easy', description: 'Summon a Fusion Monster and win', reward: 75, completed: true, solveRate: 76 },
  { id: 3, title: 'Chain Reaction', difficulty: 'Medium', description: 'Create a chain of 4+ links to win', reward: 100, completed: false, solveRate: 54 },
  { id: 4, title: 'Against All Odds', difficulty: 'Medium', description: 'Win with only 100 LP remaining', reward: 150, completed: false, solveRate: 42 },
  { id: 5, title: 'Extra Deck Master', difficulty: 'Hard', description: 'Summon 3 different Extra Deck types in one turn', reward: 200, completed: false, solveRate: 28 },
  { id: 6, title: 'One Card Wonder', difficulty: 'Hard', description: 'Win using only one card from your hand', reward: 250, completed: false, solveRate: 15 },
  { id: 7, title: 'The Impossible', difficulty: 'Expert', description: 'Win against a full board with no cards in hand', reward: 500, completed: false, solveRate: 5 },
]

export function DuelAcademyClient() {
  const [selectedTutorial, setSelectedTutorial] = useState(tutorials[0])
  const [activeTab, setActiveTab] = useState('rules')

  const totalLessons = tutorials.reduce((acc, t) => acc + t.lessons.length, 0)
  const completedLessons = tutorials.reduce((acc, t) => acc + t.lessons.filter(l => l.completed).length, 0)
  const overallProgress = Math.round((completedLessons / totalLessons) * 100)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
      case 'Beginner':
        return 'bg-green-500/20 text-green-400'
      case 'Medium':
      case 'Intermediate':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'Hard':
      case 'Advanced':
        return 'bg-orange-500/20 text-orange-400'
      case 'Expert':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              Duel Academy
            </h1>
            <p className="text-muted-foreground mt-1">
              Master the art of dueling with rules, tutorials, combos, and challenges
            </p>
          </div>
          
          {/* Overall Progress */}
          <Card className="w-full md:w-72">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} lessons</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span>Rank: Novice Duelist</span>
                </div>
                <span className="text-xs font-medium text-primary">{overallProgress}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Combos
            </TabsTrigger>
            <TabsTrigger value="puzzles" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Puzzles
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab - NEW */}
          <TabsContent value="rules" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Turn Structure */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    Turn Structure
                  </CardTitle>
                  <CardDescription>The 6 phases of every turn</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {gameRules.turnStructure.phases.map((phase, i) => (
                      <AccordionItem key={i} value={`phase-${i}`}>
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 rounded-full p-0 justify-center">{i + 1}</Badge>
                            {phase.name}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground space-y-2">
                          <p>{phase.description}</p>
                          {phase.subPhases && (
                            <div className="mt-2 space-y-1 pl-4 border-l-2 border-primary/30">
                              {phase.subPhases.map((sub, j) => (
                                <div key={j}>
                                  <span className="font-medium text-foreground">{sub.name}:</span> {sub.desc}
                                </div>
                              ))}
                            </div>
                          )}
                          {phase.tips && (
                            <div className="mt-2 space-y-1">
                              {phase.tips.map((tip, j) => (
                                <div key={j} className="flex items-start gap-2 text-xs">
                                  <Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  {tip}
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Monster Attributes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    Monster Attributes
                  </CardTitle>
                  <CardDescription>The 7 monster attributes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gameRules.attributes.list.map((attr) => {
                      const Icon = attr.icon
                      return (
                        <div key={attr.name} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50">
                          <div className={`p-2 rounded-full ${
                            attr.name === 'DARK' ? 'bg-purple-500/20' :
                            attr.name === 'LIGHT' ? 'bg-yellow-500/20' :
                            attr.name === 'FIRE' ? 'bg-red-500/20' :
                            attr.name === 'WATER' ? 'bg-blue-500/20' :
                            attr.name === 'WIND' ? 'bg-green-500/20' :
                            attr.name === 'EARTH' ? 'bg-amber-500/20' :
                            'bg-yellow-500/20'
                          }`}>
                            <Icon className={`h-5 w-5 ${attr.color}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{attr.name}</h4>
                            <p className="text-xs text-muted-foreground">{attr.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Card Types */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-400" />
                    Card Types
                  </CardTitle>
                  <CardDescription>All card types in Yu-Gi-Oh!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {gameRules.cardTypes.categories.map((category) => (
                      <div key={category.name}>
                        <h4 className={`font-medium mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full ${category.color}`}>
                          {category.name}
                        </h4>
                        <div className="space-y-2">
                          {category.types.map((type) => (
                            <div key={type.name} className={`p-2 rounded-lg border ${type.color || 'bg-accent/30'}`}>
                              <h5 className="font-medium text-sm">{type.name}</h5>
                              <p className="text-xs text-muted-foreground">{type.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summoning Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-orange-400" />
                    Summoning Methods
                  </CardTitle>
                  <CardDescription>How to bring monsters to the field</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {gameRules.summoningMethods.methods.map((method) => {
                        const Icon = method.icon
                        return (
                          <div key={method.name} className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`h-4 w-4 ${method.color}`} />
                              <h4 className="font-medium">{method.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">{method.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chain Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-400" />
                    Chains & Spell Speed
                  </CardTitle>
                  <CardDescription>How card effects interact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {gameRules.chainRules.content.map((speed, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{i + 1}</Badge>
                          <h4 className="font-medium">{speed.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{speed.desc}</p>
                        <p className="text-xs text-primary">{speed.rule}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 rounded-lg bg-accent/30">
                    <h4 className="font-medium mb-2 text-sm">Example Chain:</h4>
                    <div className="space-y-1">
                      {gameRules.chainRules.chainExample.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a 
                      href="https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Official Rulebook (PDF)
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Tutorial Categories */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Categories</h3>
                {tutorials.map((tutorial) => {
                  const Icon = tutorial.icon
                  const completed = tutorial.lessons.filter(l => l.completed).length
                  const total = tutorial.lessons.length
                  const progress = Math.round((completed / total) * 100)
                  
                  return (
                    <Card 
                      key={tutorial.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        selectedTutorial.id === tutorial.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedTutorial(tutorial)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${tutorial.bgColor}`}>
                            <Icon className={`h-5 w-5 ${tutorial.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{tutorial.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{tutorial.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={progress} className="h-1 flex-1" />
                              <span className="text-xs text-muted-foreground">{completed}/{total}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Lesson List */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = selectedTutorial.icon
                        return (
                          <div className={`p-2 rounded-lg ${selectedTutorial.bgColor}`}>
                            <Icon className={`h-6 w-6 ${selectedTutorial.color}`} />
                          </div>
                        )
                      })()}
                      <div>
                        <CardTitle>{selectedTutorial.title}</CardTitle>
                        <CardDescription>{selectedTutorial.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {selectedTutorial.lessons.map((lesson, index) => (
                          <div
                            key={lesson.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                              lesson.completed 
                                ? 'bg-green-500/5 border-green-500/20' 
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              lesson.completed 
                                ? 'bg-green-500 text-white' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {lesson.completed ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <span className="text-sm font-medium">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{lesson.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{lesson.duration}</span>
                              </div>
                            </div>
                            <Button size="sm" variant={lesson.completed ? 'outline' : 'default'}>
                              {lesson.completed ? 'Review' : 'Start'}
                              <Play className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Combos Tab */}
          <TabsContent value="combos" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Popular Deck Combos</h3>
              <Button variant="outline" size="sm">Request a Guide</Button>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {comboGuides.map((guide) => (
                <Card key={guide.id} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="aspect-video relative bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Swords className="h-12 w-12 text-slate-600" />
                    </div>
                    <Badge className={`absolute top-2 right-2 ${getDifficultyColor(guide.difficulty)}`}>
                      {guide.difficulty}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-bold text-lg">{guide.deckName}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{guide.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          {guide.combos} combos
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {guide.views.toLocaleString()} views
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Puzzles Tab */}
          <TabsContent value="puzzles" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Puzzle Challenges</h3>
                <p className="text-sm text-muted-foreground">Solve board states and earn rewards</p>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-bold">125 Points</span>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {puzzles.map((puzzle, index) => {
                const isLocked = index > 2 && !puzzles[index - 1]?.completed
                
                return (
                  <Card 
                    key={puzzle.id} 
                    className={`relative overflow-hidden transition-all ${
                      isLocked ? 'opacity-60' : 'hover:border-primary/50 cursor-pointer'
                    } ${puzzle.completed ? 'border-green-500/30 bg-green-500/5' : ''}`}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={getDifficultyColor(puzzle.difficulty)}>{puzzle.difficulty}</Badge>
                        {puzzle.completed && <CheckCircle className="h-5 w-5 text-green-500" />}
                      </div>
                      <h4 className="font-bold mb-1">#{puzzle.id} {puzzle.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{puzzle.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{puzzle.solveRate}% solve rate</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4" />
                          <span className="font-bold">{puzzle.reward}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
