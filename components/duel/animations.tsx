'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Sword, Shield, Zap, Flame, Skull } from 'lucide-react'

interface AttackAnimationProps {
  isActive: boolean
  type: 'attack' | 'direct' | 'destroy' | 'damage' | 'summon' | 'activate'
  position?: { x: number; y: number }
  damage?: number
  onComplete?: () => void
}

export function AttackAnimation({ 
  isActive, 
  type, 
  position,
  damage,
  onComplete 
}: AttackAnimationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, type === 'damage' ? 1500 : 800)
      return () => clearTimeout(timer)
    }
  }, [isActive, type, onComplete])

  if (!visible) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] pointer-events-none flex items-center justify-center",
        type === 'damage' && "bg-red-500/10"
      )}
      style={position ? { 
        left: position.x, 
        top: position.y,
        transform: 'translate(-50%, -50%)' 
      } : undefined}
    >
      {type === 'attack' && (
        <div className="animate-attack-slash">
          <Sword className="h-32 w-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
        </div>
      )}
      
      {type === 'direct' && (
        <div className="animate-pulse-fast">
          <div className="relative">
            <Zap className="h-40 w-40 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-bounce" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-white drop-shadow-lg">
              DIRECT!
            </span>
          </div>
        </div>
      )}
      
      {type === 'destroy' && (
        <div className="animate-explode">
          <Flame className="h-24 w-24 text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]" />
        </div>
      )}
      
      {type === 'damage' && damage !== undefined && (
        <div className="animate-damage-number text-6xl font-bold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
          -{damage}
        </div>
      )}
      
      {type === 'summon' && (
        <div className="animate-summon-flash">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-80 blur-xl" />
        </div>
      )}
      
      {type === 'activate' && (
        <div className="animate-activate-ripple">
          <div className="w-24 h-24 rounded-full border-4 border-cyan-400 opacity-80" />
        </div>
      )}
    </div>
  )
}

// Damage indicator that floats up
interface DamageIndicatorProps {
  damage: number
  isHealing?: boolean
  position: { x: number; y: number }
  onComplete?: () => void
}

export function DamageIndicator({ damage, isHealing, position, onComplete }: DamageIndicatorProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 1500)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div
      className="fixed z-[100] pointer-events-none animate-float-up"
      style={{ left: position.x, top: position.y }}
    >
      <span className={cn(
        "text-4xl font-bold drop-shadow-lg",
        isHealing ? "text-green-400" : "text-red-500"
      )}>
        {isHealing ? '+' : '-'}{Math.abs(damage)}
      </span>
    </div>
  )
}

// Battle result overlay
interface BattleResultProps {
  result: 'win' | 'lose' | 'draw' | null
  onDismiss?: () => void
}

export function BattleResultOverlay({ result, onDismiss }: BattleResultProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (result) {
      setVisible(true)
    }
  }, [result])

  if (!visible || !result) return null

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 cursor-pointer"
      onClick={() => {
        setVisible(false)
        onDismiss?.()
      }}
    >
      <div className={cn(
        "text-center animate-scale-in",
        result === 'win' && "text-yellow-400",
        result === 'lose' && "text-red-500",
        result === 'draw' && "text-gray-400"
      )}>
        <h1 className="text-8xl font-bold mb-4 drop-shadow-[0_0_30px_currentColor]">
          {result === 'win' && 'VICTORY!'}
          {result === 'lose' && 'DEFEAT'}
          {result === 'draw' && 'DRAW'}
        </h1>
        <p className="text-2xl text-gray-300">Click anywhere to continue</p>
      </div>
    </div>
  )
}

// Summoning animation circle
interface SummonCircleProps {
  isActive: boolean
  type: 'normal' | 'special' | 'fusion' | 'synchro' | 'xyz' | 'link'
}

export function SummonCircle({ isActive, type }: SummonCircleProps) {
  if (!isActive) return null

  const colors = {
    normal: 'from-yellow-400 to-orange-500',
    special: 'from-purple-400 to-pink-500',
    fusion: 'from-purple-600 to-violet-700',
    synchro: 'from-white to-gray-300',
    xyz: 'from-black to-yellow-500',
    link: 'from-blue-400 to-cyan-500',
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div className={cn(
        "w-64 h-64 rounded-full bg-gradient-to-r animate-spin-slow opacity-60 blur-sm",
        colors[type]
      )} />
      <div className={cn(
        "absolute w-48 h-48 rounded-full bg-gradient-to-r animate-spin-reverse opacity-80",
        colors[type]
      )} />
    </div>
  )
}

// Chain link indicator
interface ChainLinkProps {
  chainNumber: number
  cardName: string
  position?: { x: number; y: number }
}

export function ChainLinkIndicator({ chainNumber, cardName }: ChainLinkProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div className="bg-slate-900/95 border border-yellow-500 rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
            {chainNumber}
          </span>
          <div>
            <p className="text-xs text-yellow-400">Chain Link {chainNumber}</p>
            <p className="text-sm font-bold text-white">{cardName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
