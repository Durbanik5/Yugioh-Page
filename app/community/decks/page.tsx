import { Header } from '@/components/header'
import { Layers } from 'lucide-react'
import { getPublishedDecks, getAllPlayers } from '@/lib/community-actions'
import { CommunityClient } from '../community-client'

export const revalidate = 0

export default async function CommunityDecksPage() {
  const [decks, players] = await Promise.all([
    getPublishedDecks(),
    getAllPlayers()
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative border-b border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="h-8 w-8 text-primary" />
              <h1 
                className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                <span className="text-primary">COMMUNITY DECKS</span>
              </h1>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Discover and share deck builds with fellow duelists. Rate, favorite, and copy 
              decks from the community to your own collection.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <CommunityClient 
          initialDecks={decks} 
          players={players} 
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            <span style={{ fontFamily: 'var(--font-orbitron)' }}>KAIBACORP</span> Community Hub v1.0
          </p>
        </div>
      </footer>
    </div>
  )
}
