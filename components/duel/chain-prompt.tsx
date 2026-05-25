'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'

interface ChainPromptProps {
  isVisible: boolean
  message: string
  cardName?: string
  timeLimit?: number // seconds
  onRespond: () => void
  onPass: () => void
  className?: string
}

export function ChainPrompt({
  isVisible,
  message,
  cardName,
  timeLimit = 30,
  onRespond,
  onPass,
  className,
}: ChainPromptProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(timeLimit)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onPass() // Auto-pass when time runs out
          return timeLimit
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, timeLimit, onPass])

  if (!isVisible) return null

  const urgency = timeLeft <= 10 ? 'urgent' : timeLeft <= 20 ? 'warning' : 'normal'

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
        "bg-slate-900/95 border rounded-lg shadow-2xl p-4 min-w-[300px] max-w-[400px]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        urgency === 'urgent' && "border-red-500 shadow-red-500/20",
        urgency === 'warning' && "border-yellow-500 shadow-yellow-500/20",
        urgency === 'normal' && "border-primary shadow-primary/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle 
          className={cn(
            "h-5 w-5 flex-shrink-0 mt-0.5",
            urgency === 'urgent' && "text-red-500",
            urgency === 'warning' && "text-yellow-500",
            urgency === 'normal' && "text-primary"
          )} 
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {cardName && (
            <Badge variant="outline" className="mt-1 text-xs">
              {cardName}
            </Badge>
          )}
        </div>
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
            urgency === 'urgent' && "bg-red-950 text-red-400",
            urgency === 'warning' && "bg-yellow-950 text-yellow-400",
            urgency === 'normal' && "bg-slate-800 text-slate-300"
          )}
        >
          <Clock className="h-3 w-3" />
          {timeLeft}s
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={onRespond}
          className="flex-1"
          variant="default"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Respond
        </Button>
        <Button
          onClick={onPass}
          variant="outline"
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Pass
        </Button>
      </div>
    </div>
  )
}

// Component for showing the current chain
interface ChainDisplayProps {
  chain: Array<{
    cardName: string
    playerName: string
    chainLink: number
  }>
  className?: string
}

export function ChainDisplay({ chain, className }: ChainDisplayProps) {
  if (chain.length === 0) return null

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-40",
        "bg-slate-900/90 border border-slate-700 rounded-lg p-3 min-w-[200px]",
        className
      )}
    >
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">CHAIN</h4>
      <div className="space-y-2">
        {chain.map((link, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2 text-xs p-2 rounded",
              idx === chain.length - 1 
                ? "bg-primary/20 border border-primary/50" 
                : "bg-slate-800/50"
            )}
          >
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {link.chainLink}
            </Badge>
            <div className="flex-1">
              <div className="font-medium">{link.cardName}</div>
              <div className="text-muted-foreground">{link.playerName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
