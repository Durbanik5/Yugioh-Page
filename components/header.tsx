import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Swords, Users, Ban, Radio, Gamepad2, MessageCircle, Newspaper, BookOpen } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/30 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center kaiba-border">
              <span className="text-primary font-bold text-lg" style={{ fontFamily: 'var(--font-orbitron)' }}>KC</span>
            </div>
            <div className="absolute inset-0 rounded bg-primary/10 blur-md group-hover:bg-primary/20 transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wider text-foreground" style={{ fontFamily: 'var(--font-orbitron)' }}>
              DUEL TRACKER
            </span>
            <span className="text-xs text-muted-foreground tracking-widest">KAIBACORP</span>
          </div>
        </Link>
        
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/live" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Duel</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/matches" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              <span className="hidden sm:inline">Matches</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/campaign" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Campaign</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Duelists</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/banlist" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              <span className="hidden sm:inline">Banlist</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/community" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Community</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">News</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <a 
              href="https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rules</span>
            </a>
          </Button>
        </nav>
      </div>
    </header>
  )
}
