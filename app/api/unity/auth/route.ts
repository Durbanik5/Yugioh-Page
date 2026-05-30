import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/unity/auth - Login or register from Unity
export async function POST(request: NextRequest) {
  try {
    const { action, email, password, nickname } = await request.json()

    if (action === 'login') {
      // Login existing user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 401 })
      }

      // Get player data
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()

      // Get player profile
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('player_id', player?.id)
        .single()

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        player: player,
        profile: profile,
        session: {
          access_token: authData.session?.access_token,
          refresh_token: authData.session?.refresh_token,
        }
      })

    } else if (action === 'register') {
      // Register new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      // Create player record
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          user_id: authData.user?.id,
          nickname: nickname || email.split('@')[0],
          email: email,
        })
        .select()
        .single()

      if (playerError) {
        return NextResponse.json({ error: playerError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
        },
        player: player,
        message: 'Account created successfully'
      })

    } else if (action === 'validate') {
      // Validate an existing session token
      const { access_token } = await request.json()
      
      const { data: { user }, error } = await supabase.auth.getUser(access_token)
      
      if (error || !user) {
        return NextResponse.json({ valid: false }, { status: 401 })
      }

      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return NextResponse.json({
        valid: true,
        player: player
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Unity auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
