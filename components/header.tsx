'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Swords, Users, Ban, Radio, Gamepad2, MessageCircle, Newspaper, BookOpen, Layers, Store, ArrowLeftRight, GraduationCap, ChevronDown, Trophy, Medal, LogIn, LogOut, Settings, User, Shield, Award, Database } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { user, profile, loading, isAdmin, isOwner } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

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
            <Link href="/database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/leaderboards" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              <span className="hidden sm:inline">Rankings</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/tournaments" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Tournaments</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Achievements</span>
            </Link>
          </Button>
          
          {/* Community dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Community</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/community/decks" className="flex items-center gap-3 cursor-pointer">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Decks</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/community/market" className="flex items-center gap-3 cursor-pointer">
                  <Store className="h-4 w-4 text-primary" />
                  <span>Market</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/community/trade" className="flex items-center gap-3 cursor-pointer">
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                  <span>Trade</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/community/duel-academy" className="flex items-center gap-3 cursor-pointer">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span>Duel Academy</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

          {/* User menu */}
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {profile.display_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{profile.display_name || profile.username}</span>
                  {(isAdmin || isOwner) && (
                    <Shield className="h-3 w-3 text-yellow-500" />
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-3 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                {(isAdmin || isOwner) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-3 cursor-pointer">
                        <Settings className="h-4 w-4 text-yellow-500" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/auth/login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
