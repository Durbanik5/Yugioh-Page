'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { DuelCard } from './duel-card'
import type { DuelGameCard } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TributeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  cardToSummon: DuelGameCard
  requiredTributes: number
  availableMonsters: DuelGameCard[]
  selectedTributes: string[]
  onSelectTribute: (cardId: string) => void
  onConfirm: () => void
}

export function TributeSelectionModal({
  isOpen,
  onClose,
  cardToSummon,
  requiredTributes,
  availableMonsters,
  selectedTributes,
  onSelectTribute,
  onConfirm,
}: TributeSelectionModalProps) {
  const canConfirm = selectedTributes.length === requiredTributes

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Tribute Summon: {cardToSummon.card_name}
          </DialogTitle>
          <DialogDescription>
            Level {cardToSummon.level} monsters require {requiredTributes} tribute{requiredTributes > 1 ? 's' : ''}.
            Select {requiredTributes} monster{requiredTributes > 1 ? 's' : ''} to tribute.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-sm text-slate-400 mb-3">
            Selected: {selectedTributes.length} / {requiredTributes}
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            {availableMonsters.map((monster) => {
              const isSelected = selectedTributes.includes(monster.id)
              
              return (
                <div
                  key={monster.id}
                  className={cn(
                    'relative cursor-pointer transition-all',
                    isSelected && 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900 rounded'
                  )}
                  onClick={() => onSelectTribute(monster.id)}
                >
                  <DuelCard
                    card={monster}
                    isOwner={true}
                    size="md"
                    showActions={false}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-red-500/30 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        TRIBUTE
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 text-slate-300 truncate max-w-[80px]">
                    {monster.card_name}
                  </div>
                </div>
              )
            })}
          </div>

          {availableMonsters.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No monsters available to tribute
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={!canConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Tribute Summon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
