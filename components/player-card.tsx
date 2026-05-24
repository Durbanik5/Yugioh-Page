import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Target, Percent } from 'lucide-react'
import type { PlayerWithStats } from '@/lib/types'

interface PlayerCardProps {
  player: PlayerWithStats
  rank?: number
}

export function PlayerCard({ player, rank }: PlayerCardProps) {
  const stats = player.stats
  const totalGames = (stats?.total_wins ?? 0) + (stats?.total_losses ?? 0)
  const winRate = totalGames > 0 ? ((stats?.total_wins ?? 0) / totalGames) * 100 : 0

  const getRankStyle = (r: number | undefined) => {
    if (r === 1) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50'
    if (r === 2) return 'from-gray-400/20 to-gray-500/10 border-gray-400/50'
    if (r === 3) return 'from-amber-700/20 to-amber-800/10 border-amber-700/50'
    return 'from-primary/10 to-primary/5 border-primary/30'
  }

  const getRankBadge = (r: number | undefined) => {
    if (r === 1) return <Badge className="bg-yellow-500 text-yellow-950">1st</Badge>
    if (r === 2) return <Badge className="bg-gray-400 text-gray-950">2nd</Badge>
    if (r === 3) return <Badge className="bg-amber-700 text-amber-50">3rd</Badge>
    return null
  }

  return (
    <Link href={`/player/${player.id}`}>
      <Card className={`group relative overflow-hidden border bg-gradient-to-br ${getRankStyle(rank)} hover:border-primary/60 transition-all duration-300 hover:kaiba-glow cursor-pointer`}>
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent scan-line" />
        </div>
        
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
                <AvatarImage src={player.avatar_url || undefined} alt={player.nickname} />
                <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  {player.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {rank && rank <= 3 && (
                <div className="absolute -top-1 -right-1">
                  {getRankBadge(rank)}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-orbitron)' }}>
                {player.nickname}
              </h3>
              
              {player.decks.length > 0 && (
                <p className="text-sm text-muted-foreground truncate">
                  {player.decks[0]?.name || 'No deck'}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Trophy className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-mono">{stats?.total_wins ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Target className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-mono">{stats?.total_losses ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="text-primary font-mono">{winRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
