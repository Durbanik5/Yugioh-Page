'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  auth_user_id: string | null
  email: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: 'user' | 'moderator' | 'admin' | 'owner'
  bio: string | null
  wins: number
  losses: number
  elo_rating: number
  tier: string
  created_at: string
  is_banned: boolean
}

interface UserContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isOwner: boolean
  isModerator: boolean
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isOwner: false,
  isModerator: false,
  refreshProfile: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    
    setProfile(data)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        await fetchProfile(user.id)
      }
      
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const isOwner = profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin' || isOwner
  const isModerator = profile?.role === 'moderator' || isAdmin

  return (
    <UserContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isOwner, 
      isModerator,
      refreshProfile 
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
