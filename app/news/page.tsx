'use client'

import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, ExternalLink, Newspaper, Sparkles, AlertTriangle, Trophy } from 'lucide-react'

// Sample news data - in production this would come from a database or API
const newsItems = [
  {
    id: 1,
    title: 'New Banlist Update Announced',
    description: 'Konami has released the latest Forbidden & Limited list changes effective next month. Several popular cards have been hit including key combo pieces.',
    date: '2024-01-15',
    category: 'banlist',
    link: '/banlist'
  },
  {
    id: 2,
    title: 'World Championship Qualifiers Begin',
    description: 'Regional qualifiers for the Yu-Gi-Oh! World Championship are now open. Register your deck and compete for a chance at the world stage.',
    date: '2024-01-12',
    category: 'tournament',
    link: null
  },
  {
    id: 3,
    title: 'New Card Set: Phantom Nightmare',
    description: 'The latest booster set brings powerful new archetypes and support for fan-favorite strategies. Check out the full card list and start planning your builds.',
    date: '2024-01-10',
    category: 'release',
    link: null
  },
  {
    id: 4,
    title: 'Duel Tracker Platform Update',
    description: 'We have rolled out major improvements to the duel simulator including proper tribute summoning, phase system, and card effect resolution.',
    date: '2024-01-08',
    category: 'update',
    link: null
  },
  {
    id: 5,
    title: 'Community Tournament Results',
    description: 'Congratulations to our weekly tournament winners! See the top decks and strategies that dominated this week.',
    date: '2024-01-05',
    category: 'tournament',
    link: '/matches'
  },
]

const categoryIcons = {
  banlist: AlertTriangle,
  tournament: Trophy,
  release: Sparkles,
  update: Newspaper,
}

const categoryColors = {
  banlist: 'bg-red-500/20 text-red-400 border-red-500/30',
  tournament: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  release: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  update: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-orbitron)' }}>
            <Newspaper className="h-8 w-8 text-primary" />
            News & Updates
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay up to date with the latest Yu-Gi-Oh! news, banlist changes, and platform updates.
          </p>
        </div>

        {/* News Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {newsItems.map((item) => {
            const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons] || Newspaper
            const categoryColor = categoryColors[item.category as keyof typeof categoryColors] || categoryColors.update
            
            return (
              <Card key={item.id} className="bg-card/50 border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={categoryColor}>
                      <CategoryIcon className="h-3 w-3 mr-1" />
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mb-4">
                    {item.description}
                  </CardDescription>
                  {item.link && (
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={item.link} className="flex items-center gap-2">
                        Learn More
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State for when there's no news */}
        {newsItems.length === 0 && (
          <Card className="bg-card/50 border-primary/20 p-12 text-center">
            <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No News Yet</h3>
            <p className="text-muted-foreground mb-4">
              Check back later for the latest updates and announcements.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
