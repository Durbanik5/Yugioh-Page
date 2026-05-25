'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DuelPhase } from '@/lib/duel-engine/types'

interface PhaseBarProps {
  currentPhase: DuelPhase
  isMyTurn: boolean
  turnCount: number
  onPhaseChange: (phase: DuelPhase) => void
  battlePhaseEnabled: boolean
}

const PHASES: { id: DuelPhase; label: string; shortLabel: string }[] = [
  { id: 'draw', label: 'Draw Phase', shortLabel: 'DP' },
  { id: 'standby', label: 'Standby Phase', shortLabel: 'SP' },
  { id: 'main1', label: 'Main Phase 1', shortLabel: 'M1' },
  { id: 'battle', label: 'Battle Phase', shortLabel: 'BP' },
  { id: 'main2', label: 'Main Phase 2', shortLabel: 'M2' },
  { id: 'end', label: 'End Phase', shortLabel: 'EP' },
]

export function PhaseBar({ 
  currentPhase, 
  isMyTurn, 
  turnCount, 
  onPhaseChange,
  battlePhaseEnabled 
}: PhaseBarProps) {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase)

  const canAdvanceTo = (phase: DuelPhase): boolean => {
    if (!isMyTurn) return false
    
    const targetIndex = PHASES.findIndex(p => p.id === phase)
    
    // Can only advance forward (or to end from main1/main2)
    if (targetIndex <= currentIndex) return false
    
    // Special cases
    if (phase === 'battle' && !battlePhaseEnabled) return false
    if (phase === 'main2' && currentPhase !== 'battle') return false
    
    // Can skip battle phase
    if (phase === 'end' && (currentPhase === 'main1' || currentPhase === 'main2')) return true
    
    // Normal progression
    if (targetIndex === currentIndex + 1) return true
    
    return false
  }

  const getNextPhase = (): DuelPhase | null => {
    if (!isMyTurn) return null
    
    switch (currentPhase) {
      case 'draw': return 'standby'
      case 'standby': return 'main1'
      case 'main1': return battlePhaseEnabled ? 'battle' : 'end'
      case 'battle': return 'main2'
      case 'main2': return 'end'
      case 'end': return null
      default: return null
    }
  }

  const nextPhase = getNextPhase()

  return (
    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50">
      <div className="text-xs font-medium text-slate-400 px-2">
        Turn {turnCount}
      </div>
      <div className="h-4 w-px bg-slate-700" />
      <div className="flex gap-1">
        {PHASES.map((phase, index) => {
          const isActive = phase.id === currentPhase
          const isPast = index < currentIndex
          const canClick = canAdvanceTo(phase.id)
          
          return (
            <Button
              key={phase.id}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 text-xs font-medium transition-all',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isPast && 'text-slate-500',
                !isActive && !isPast && 'text-slate-400',
                canClick && 'hover:bg-slate-800 cursor-pointer',
                !canClick && !isActive && 'cursor-default hover:bg-transparent'
              )}
              onClick={() => canClick && onPhaseChange(phase.id)}
              disabled={!canClick && !isActive}
              title={phase.label}
            >
              {phase.shortLabel}
            </Button>
          )
        })}
      </div>
      {isMyTurn && nextPhase && (
        <>
          <div className="h-4 w-px bg-slate-700" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs border-primary/50 hover:bg-primary/20"
            onClick={() => onPhaseChange(nextPhase)}
          >
            Next Phase
          </Button>
        </>
      )}
      {!isMyTurn && (
        <div className="text-xs text-yellow-500 px-2 animate-pulse">
          Opponent&apos;s Turn
        </div>
      )}
    </div>
  )
}
