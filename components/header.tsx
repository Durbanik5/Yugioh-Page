'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Swords, Users, Ban, Radio, Gamepad2, LogIn, LogOut, User, Shield } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  username: string
  is_admin: boolean
}

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
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
            <Link href="/matches" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              <span className="hidden sm:inline">Matches</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/banlist" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              <span className="hidden sm:inline">Banlist</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/live" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Duel</span>
            </Link>
          </Button>
          
          {user ? (
            <>
              <Button size="sm" asChild className="bg-primary hover:bg-primary/80 kaiba-glow">
                <Link href="/record" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Record Duel</span>
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                      <span className="text-xs font-bold text-primary">
                        {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden md:inline max-w-24 truncate">
                      {profile?.username || user.email?.split('@')[0]}
                    </span>
                    {profile?.is_admin && (
                      <Shield className="h-3 w-3 text-yellow-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-primary/30">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.username || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      {profile?.is_admin && (
                        <p className="text-xs leading-none text-yellow-500 flex items-center gap-1 mt-1">
                          <Shield className="h-3 w-3" /> Administrator
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/account">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {!loading && (
                <Button size="sm" asChild className="bg-primary hover:bg-primary/80 kaiba-glow">
                  <Link href="/auth/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                </Button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
