'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link2, Check, X, ArrowUp } from 'lucide-react'
import Image from 'next/image'
import type { DuelGameCard } from '@/lib/types'

interface ChainLink {
  chainNumber: number
  card: DuelGameCard
  playerId: string
  timestamp: number
}

interface ChainDisplayProps {
  chainLinks: ChainLink[]
  isResolving: boolean
  currentResolvingIndex?: number
  myPlayerId: string
}

export function ChainDisplay({ 
  chainLinks, 
  isResolving,
  currentResolvingIndex,
  myPlayerId 
}: ChainDisplayProps) {
  if (chainLinks.length === 0) return null

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-48">
      <div className="bg-slate-900/95 border border-yellow-500/50 rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 px-3 py-1.5 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-black" />
          <span className="text-sm font-bold text-black">
            Chain x{chainLinks.length}
          </span>
          {isResolving && (
            <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded text-black">
              Resolving
            </span>
          )}
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-2">
            {/* Show chain links in reverse order (newest first for resolution) */}
            {[...chainLinks].reverse().map((link, idx) => {
              const isCurrentResolving = isResolving && idx === 0
              const originalIndex = chainLinks.length - 1 - idx
              
              return (
                <div 
                  key={`${link.card.id}-${link.chainNumber}`}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border transition-all",
                    isCurrentResolving && "border-yellow-400 bg-yellow-500/10 animate-pulse",
                    !isCurrentResolving && "border-slate-700 bg-slate-800/50"
                  )}
                >
                  {/* Chain number */}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    isCurrentResolving ? "bg-yellow-500 text-black" : "bg-slate-700 text-white"
                  )}>
                    {link.chainNumber}
                  </div>
                  
                  {/* Card image */}
                  <div className="w-8 h-12 relative rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={`https://images.ygoprodeck.com/images/cards_small/${link.card.card_id}.jpg`}
                      alt={link.card.card_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  
                  {/* Card info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      isCurrentResolving ? "text-yellow-400" : "text-white"
                    )}>
                      {link.card.card_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {link.playerId === myPlayerId ? 'You' : 'Opponent'}
                    </p>
                  </div>
                  
                  {/* Resolving indicator */}
                  {isCurrentResolving && (
                    <ArrowUp className="h-4 w-4 text-yellow-400 animate-bounce" />
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// Chain response prompt
interface ChainResponsePromptProps {
  isOpen: boolean
  triggeringCard: DuelGameCard | null
  onRespond: () => void
  onPass: () => void
  canRespond: boolean
}

export function ChainResponsePrompt({
  isOpen,
  triggeringCard,
  onRespond,
  onPass,
  canRespond,
}: ChainResponsePromptProps) {
  if (!isOpen || !triggeringCard) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-in-right">
      <div className="bg-slate-900/95 border border-primary rounded-lg p-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-[70px] relative rounded overflow-hidden">
            <Image
              src={`https://images.ygoprodeck.com/images/cards_small/${triggeringCard.card_id}.jpg`}
              alt={triggeringCard.card_name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          
          <div>
            <p className="text-sm font-bold text-primary mb-1">
              {triggeringCard.card_name} activated!
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Do you want to respond?
            </p>
            
            <div className="flex gap-2">
              {canRespond && (
                <Button size="sm" variant="default" onClick={onRespond}>
                  <Check className="h-4 w-4 mr-1" />
                  Chain
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onPass}>
                <X className="h-4 w-4 mr-1" />
                Pass
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
