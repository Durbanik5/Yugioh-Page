'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Users
} from 'lucide-react'
import Image from 'next/image'

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

// Combo guides for popular decks
const comboGuides = [
  {
    id: 'buster-blader',
    deckName: 'Buster Blader',
    difficulty: 'Intermediate',
    combos: 3,
    views: 1250,
    image: '/images/decks/buster-blader.jpg',
    description: 'Lock down your opponent with the Dragon Destroyer combo'
  },
  {
    id: 'blue-eyes',
    deckName: 'Blue-Eyes',
    difficulty: 'Beginner',
    combos: 5,
    views: 3420,
    image: '/images/decks/blue-eyes.jpg',
    description: 'Summon powerful dragons and overwhelm your opponent'
  },
  {
    id: 'dark-magician',
    deckName: 'Dark Magician',
    difficulty: 'Intermediate',
    combos: 4,
    views: 2890,
    image: '/images/decks/dark-magician.jpg',
    description: 'Control the field with the ultimate wizard'
  },
  {
    id: 'hero',
    deckName: 'Elemental HERO',
    difficulty: 'Advanced',
    combos: 8,
    views: 1890,
    image: '/images/decks/hero.jpg',
    description: 'Master fusion summoning with the HERO archetype'
  },
  {
    id: 'dragon-link',
    deckName: 'Dragon Link',
    difficulty: 'Advanced',
    combos: 6,
    views: 4210,
    image: '/images/decks/dragon-link.jpg',
    description: 'Build unstoppable boards with link monsters'
  },
  {
    id: 'sky-striker',
    deckName: 'Sky Striker',
    difficulty: 'Expert',
    combos: 10,
    views: 2150,
    image: '/images/decks/sky-striker.jpg',
    description: 'Resource management and spell mastery'
  },
]

// Puzzle challenges
const puzzles = [
  {
    id: 1,
    title: 'First Strike',
    difficulty: 'Easy',
    description: 'Deal exactly 8000 damage this turn',
    reward: 50,
    completed: true,
    attempts: 156,
    solveRate: 89,
  },
  {
    id: 2,
    title: 'Fusion Fury',
    difficulty: 'Easy',
    description: 'Summon a Fusion Monster and win',
    reward: 75,
    completed: true,
    attempts: 234,
    solveRate: 76,
  },
  {
    id: 3,
    title: 'Chain Reaction',
    difficulty: 'Medium',
    description: 'Create a chain of 4+ links to win',
    reward: 100,
    completed: false,
    attempts: 312,
    solveRate: 54,
  },
  {
    id: 4,
    title: 'Against All Odds',
    difficulty: 'Medium',
    description: 'Win with only 100 LP remaining',
    reward: 150,
    completed: false,
    attempts: 189,
    solveRate: 42,
  },
  {
    id: 5,
    title: 'Extra Deck Master',
    difficulty: 'Hard',
    description: 'Summon 3 different Extra Deck types in one turn',
    reward: 200,
    completed: false,
    attempts: 423,
    solveRate: 28,
  },
  {
    id: 6,
    title: 'One Card Wonder',
    difficulty: 'Hard',
    description: 'Win using only one card from your hand',
    reward: 250,
    completed: false,
    attempts: 567,
    solveRate: 15,
  },
  {
    id: 7,
    title: 'The Impossible',
    difficulty: 'Expert',
    description: 'Win against a full board with no cards in hand',
    reward: 500,
    completed: false,
    attempts: 892,
    solveRate: 5,
  },
]

export function DuelAcademyClient() {
  const [selectedTutorial, setSelectedTutorial] = useState(tutorials[0])
  const [activeTab, setActiveTab] = useState('tutorials')

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
              Master the art of dueling with tutorials, combos, and challenges
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
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
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
                            <p className="text-xs text-muted-foreground truncate">
                              {tutorial.description}
                            </p>
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
                            <Button 
                              size="sm" 
                              variant={lesson.completed ? 'outline' : 'default'}
                            >
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
              <Button variant="outline" size="sm">
                Request a Guide
              </Button>
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
                <p className="text-sm text-muted-foreground">
                  Solve board states and earn rewards
                </p>
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
                      isLocked 
                        ? 'opacity-60' 
                        : 'hover:border-primary/50 cursor-pointer'
                    } ${puzzle.completed ? 'border-green-500/30 bg-green-500/5' : ''}`}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={getDifficultyColor(puzzle.difficulty)}>
                          {puzzle.difficulty}
                        </Badge>
                        {puzzle.completed && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
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
