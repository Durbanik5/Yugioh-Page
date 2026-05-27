'use client'

import { cn } from '@/lib/utils'
import { Clock, Pause, Play, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TurnTimerDisplayProps {
  timeRemaining: number
  formattedTime: string
  isMyTurn: boolean
  isLowTime: boolean
  isCriticalTime: boolean
  isPaused: boolean
  onPause?: () => void
  onResume?: () => void
  showControls?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TurnTimerDisplay({
  formattedTime,
  isMyTurn,
  isLowTime,
  isCriticalTime,
  isPaused,
  onPause,
  onResume,
  showControls = false,
  size = 'md',
}: TurnTimerDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-1.5',
    lg: 'text-4xl px-4 py-2',
  }

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border transition-all duration-300",
      sizeClasses[size],
      isMyTurn ? "bg-slate-800/90 border-primary" : "bg-slate-900/80 border-slate-700",
      isCriticalTime && isMyTurn && "border-red-500 bg-red-950/50 animate-pulse",
      isLowTime && isMyTurn && !isCriticalTime && "border-yellow-500 bg-yellow-950/30"
    )}>
      {isCriticalTime && isMyTurn ? (
        <AlertTriangle className={cn(
          "text-red-500",
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
        )} />
      ) : (
        <Clock className={cn(
          isMyTurn ? "text-primary" : "text-muted-foreground",
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
        )} />
      )}
      
      <span className={cn(
        "font-mono font-bold tabular-nums",
        isCriticalTime && isMyTurn && "text-red-500",
        isLowTime && isMyTurn && !isCriticalTime && "text-yellow-500",
        !isLowTime && isMyTurn && "text-white",
        !isMyTurn && "text-muted-foreground"
      )}>
        {formattedTime}
      </span>
      
      {isPaused && (
        <span className="text-xs text-yellow-400 uppercase">Paused</span>
      )}
      
      {showControls && isMyTurn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={isPaused ? onResume : onPause}
        >
          {isPaused ? (
            <Play className="h-3 w-3" />
          ) : (
            <Pause className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}

// Compact timer for mobile/small displays
export function CompactTimer({
  formattedTime,
  isMyTurn,
  isCriticalTime,
}: {
  formattedTime: string
  isMyTurn: boolean
  isCriticalTime: boolean
}) {
  return (
    <div className={cn(
      "px-2 py-0.5 rounded text-sm font-mono font-bold",
      isCriticalTime && isMyTurn && "bg-red-500/20 text-red-400 animate-pulse",
      !isCriticalTime && isMyTurn && "bg-primary/20 text-primary",
      !isMyTurn && "bg-slate-800 text-muted-foreground"
    )}>
      {formattedTime}
    </div>
  )
}
