// Effect Executor - Interprets and executes card effect scripts
// Based on EDOPro/Master Duel effect resolution system

import type { GameState, GameCard, Location, DuelPhase } from '../types'
import type { 
  CardScript, 
  CardEffect, 
  EffectAction, 
  CardFilter, 
  TriggerEvent,
  EffectCost,
  EffectTarget
} from './script-types'
import { getCardScript, hasCardScript } from './script-types'

export interface EffectExecutionContext {
  state: GameState
  activatingPlayer: string
  card: GameCard
  effect: CardEffect
  targets?: GameCard[]
  costPaid?: boolean
  chainLink?: number
}

export interface EffectActivationResult {
  canActivate: boolean
  reason?: string
  requiresCost?: boolean
  requiresTarget?: boolean
  validTargets?: GameCard[]
}

export interface EffectResolutionResult {
  success: boolean
  newState: GameState
  log: string[]
  error?: string
}

// Track once-per-turn effect usage
const effectUsageThisTurn = new Map<string, Set<string>>()
const effectUsageThisDuel = new Map<string, Set<string>>()

export function resetTurnEffectUsage(roomId: string): void {
  effectUsageThisTurn.delete(roomId)
}

export function resetDuelEffectUsage(roomId: string): void {
  effectUsageThisDuel.delete(roomId)
  effectUsageThisTurn.delete(roomId)
}

// ============================================
// FILTER MATCHING
// ============================================

export function matchesFilter(
  card: GameCard, 
  filter: CardFilter, 
  state: GameState,
  activatingPlayer: string
): boolean {
  // Card ID filter
  if (filter.cardId !== undefined) {
    const ids = Array.isArray(filter.cardId) ? filter.cardId : [filter.cardId]
    if (!ids.includes(card.cardId)) return false
  }
  
  // Name filters
  if (filter.name !== undefined) {
    if (filter.name instanceof RegExp) {
      if (!filter.name.test(card.name)) return false
    } else {
      if (card.name !== filter.name) return false
    }
  }
  
  if (filter.nameContains !== undefined) {
    if (!card.name.toLowerCase().includes(filter.nameContains.toLowerCase())) return false
  }
  
  // Card type filter
  if (filter.cardType !== undefined) {
    const cardCategory = card.category.toLowerCase()
    const isMonster = cardCategory.includes('monster')
    const isSpell = cardCategory.includes('spell')
    const isTrap = cardCategory.includes('trap')
    
    const matchesType = filter.cardType.some(type => {
      if (type === 'monster') return isMonster
      if (type === 'spell') return isSpell
      if (type === 'trap') return isTrap
      return false
    })
    
    if (!matchesType) return false
  }
  
  // Monster type (race) filter
  if (filter.monsterType !== undefined && card.race) {
    if (!filter.monsterType.includes(card.race)) return false
  }
  
  // Attribute filter
  if (filter.attribute !== undefined && card.attribute) {
    if (!filter.attribute.includes(card.attribute)) return false
  }
  
  // Level filter
  if (filter.level !== undefined) {
    if (typeof filter.level === 'number') {
      if (card.level !== filter.level) return false
    } else {
      if (filter.level.min !== undefined && (card.level || 0) < filter.level.min) return false
      if (filter.level.max !== undefined && (card.level || 0) > filter.level.max) return false
    }
  }
  
  // ATK filter
  if (filter.attack !== undefined) {
    if (typeof filter.attack === 'number') {
      if (card.attack !== filter.attack) return false
    } else {
      if (filter.attack.min !== undefined && (card.attack || 0) < filter.attack.min) return false
      if (filter.attack.max !== undefined && (card.attack || 0) > filter.attack.max) return false
    }
  }
  
  // DEF filter
  if (filter.defense !== undefined) {
    if (typeof filter.defense === 'number') {
      if (card.defense !== filter.defense) return false
    } else {
      if (filter.defense.min !== undefined && (card.defense || 0) < filter.defense.min) return false
      if (filter.defense.max !== undefined && (card.defense || 0) > filter.defense.max) return false
    }
  }
  
  // Location filter
  if (filter.location !== undefined) {
    if (!filter.location.includes(card.location)) return false
  }
  
  // Controller filter
  if (filter.controller !== undefined && filter.controller !== 'any') {
    const isOwnCard = card.controllerId === activatingPlayer
    if (filter.controller === 'self' && !isOwnCard) return false
    if (filter.controller === 'opponent' && isOwnCard) return false
  }
  
  // Owner filter
  if (filter.owner !== undefined && filter.owner !== 'any') {
    const isOwnCard = card.ownerId === activatingPlayer
    if (filter.owner === 'self' && !isOwnCard) return false
    if (filter.owner === 'opponent' && isOwnCard) return false
  }
  
  // Position filter
  if (filter.position !== undefined) {
    const isFaceUp = card.position === 'face_up' || 
                     card.position === 'face_up_attack' || 
                     card.position === 'face_up_defense'
    const isFaceDown = card.position === 'face_down' || 
                       card.position === 'face_down_defense'
    const isAttack = card.position === 'face_up_attack'
    const isDefense = card.position === 'face_up_defense' || 
                      card.position === 'face_down_defense'
    
    const matchesPosition = filter.position.some(pos => {
      if (pos === 'face_up') return isFaceUp
      if (pos === 'face_down') return isFaceDown
      if (pos === 'attack') return isAttack
      if (pos === 'defense') return isDefense
      return false
    })
    
    if (!matchesPosition) return false
  }
  
  // Custom filter
  if (filter.custom !== undefined) {
    if (!filter.custom(card, state, activatingPlayer)) return false
  }
  
  return true
}

// ============================================
// EFFECT ACTIVATION VALIDATION
// ============================================

export function canActivateEffect(
  card: GameCard,
  effect: CardEffect,
  state: GameState,
  activatingPlayer: string,
  allCards: GameCard[]
): EffectActivationResult {
  // Check if card is in valid activation location
  if (!effect.activationLocations.includes(card.location)) {
    return { canActivate: false, reason: `Cannot activate from ${card.location}` }
  }
  
  // Check turn player restriction
  if (effect.turnPlayerOnly && state.turnPlayer !== activatingPlayer) {
    return { canActivate: false, reason: 'Can only activate during your turn' }
  }
  
  // Check phase restrictions
  if (effect.activationPhases && !effect.activationPhases.includes(state.phase)) {
    return { canActivate: false, reason: `Cannot activate during ${state.phase} phase` }
  }
  
  // Check once per turn
  if (effect.oncePerTurn || effect.hardOncePerTurn) {
    const usageKey = effect.oncePerTurnId || `${card.cardId}-${effect.id}`
    const roomUsage = effectUsageThisTurn.get(state.roomId)
    if (roomUsage?.has(usageKey)) {
      return { canActivate: false, reason: 'Already used this effect this turn' }
    }
  }
  
  // Check once per duel
  if (effect.oncePerDuel) {
    const usageKey = `${card.cardId}-${effect.id}`
    const duelUsage = effectUsageThisDuel.get(state.roomId)
    if (duelUsage?.has(usageKey)) {
      return { canActivate: false, reason: 'Already used this effect this duel' }
    }
  }
  
  // Check custom condition
  if (effect.condition && !effect.condition(state, card)) {
    return { canActivate: false, reason: 'Activation condition not met' }
  }
  
  // Check if targeting is required and valid targets exist
  let validTargets: GameCard[] = []
  if (effect.target && !effect.target.optional) {
    validTargets = findValidTargets(effect.target, state, activatingPlayer, allCards, card)
    if (validTargets.length < (effect.target.count === 'up_to' ? 1 : 
                               effect.target.count === 'all' ? 1 : 
                               effect.target.count)) {
      return { canActivate: false, reason: 'No valid targets' }
    }
  }
  
  // Check if cost can be paid (basic check - full validation during execution)
  if (effect.cost) {
    const costs = Array.isArray(effect.cost) ? effect.cost : [effect.cost]
    for (const cost of costs) {
      const canPay = canPayCost(cost, state, activatingPlayer, allCards)
      if (!canPay) {
        return { canActivate: false, reason: 'Cannot pay activation cost' }
      }
    }
  }
  
  return {
    canActivate: true,
    requiresCost: !!effect.cost,
    requiresTarget: !!effect.target,
    validTargets
  }
}

function findValidTargets(
  targeting: EffectTarget,
  state: GameState,
  activatingPlayer: string,
  allCards: GameCard[],
  activatingCard: GameCard
): GameCard[] {
  return allCards.filter(card => {
    // Don't target self unless allowed
    if (card.id === activatingCard.id && !targeting.canTargetSelf) {
      return false
    }
    
    return matchesFilter(card, targeting.filter, state, activatingPlayer)
  })
}

function canPayCost(
  cost: EffectCost,
  state: GameState,
  activatingPlayer: string,
  allCards: GameCard[]
): boolean {
  switch (cost.type) {
    case 'discard': {
      const handCards = allCards.filter(c => 
        c.controllerId === activatingPlayer && 
        c.location === 'hand' &&
        (!cost.filter || matchesFilter(c, cost.filter, state, activatingPlayer))
      )
      return handCards.length >= (cost.amount || 1)
    }
    
    case 'tribute': {
      const fieldMonsters = allCards.filter(c => 
        c.controllerId === activatingPlayer && 
        c.location === 'monster_zone' &&
        (!cost.filter || matchesFilter(c, cost.filter, state, activatingPlayer))
      )
      return fieldMonsters.length >= (cost.amount || 1)
    }
    
    case 'pay_lp': {
      // Would need player LP from state
      return true // Simplified for now
    }
    
    case 'banish': {
      const locations = cost.from || ['graveyard']
      const validCards = allCards.filter(c =>
        c.controllerId === activatingPlayer &&
        locations.includes(c.location) &&
        (!cost.filter || matchesFilter(c, cost.filter, state, activatingPlayer))
      )
      return validCards.length >= (cost.amount || 1)
    }
    
    case 'send_to_gy': {
      const locations = cost.from || ['deck']
      const validCards = allCards.filter(c =>
        c.ownerId === activatingPlayer &&
        locations.includes(c.location) &&
        (!cost.filter || matchesFilter(c, cost.filter, state, activatingPlayer))
      )
      return validCards.length >= (cost.amount || 1)
    }
    
    default:
      return true
  }
}

// ============================================
// EFFECT RESOLUTION
// ============================================

export async function resolveEffect(
  context: EffectExecutionContext,
  allCards: GameCard[],
  executeAction: (action: EffectAction, context: EffectExecutionContext, allCards: GameCard[]) => Promise<{ state: GameState; log: string[] }>
): Promise<EffectResolutionResult> {
  const { state, effect, card, activatingPlayer, targets } = context
  const logs: string[] = []
  let currentState = { ...state }
  
  // Mark effect as used
  if (effect.oncePerTurn || effect.hardOncePerTurn) {
    const usageKey = effect.oncePerTurnId || `${card.cardId}-${effect.id}`
    if (!effectUsageThisTurn.has(state.roomId)) {
      effectUsageThisTurn.set(state.roomId, new Set())
    }
    effectUsageThisTurn.get(state.roomId)!.add(usageKey)
  }
  
  if (effect.oncePerDuel) {
    const usageKey = `${card.cardId}-${effect.id}`
    if (!effectUsageThisDuel.has(state.roomId)) {
      effectUsageThisDuel.set(state.roomId, new Set())
    }
    effectUsageThisDuel.get(state.roomId)!.add(usageKey)
  }
  
  logs.push(`Resolving effect: ${effect.name}`)
  
  // Execute each action in sequence
  for (const action of effect.actions) {
    // Check action-specific condition
    if (action.condition && !action.condition(currentState, card, targets)) {
      logs.push(`Action condition not met, skipping`)
      continue
    }
    
    try {
      const result = await executeAction(action, { ...context, state: currentState }, allCards)
      currentState = result.state
      logs.push(...result.log)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        newState: currentState,
        log: logs,
        error: `Failed to execute action: ${errorMessage}`
      }
    }
  }
  
  return {
    success: true,
    newState: currentState,
    log: logs
  }
}

// ============================================
// TRIGGER EVENT HANDLING
// ============================================

export function getTriggeredEffects(
  event: TriggerEvent,
  state: GameState,
  allCards: GameCard[],
  eventData?: unknown
): Array<{ card: GameCard; effect: CardEffect; script: CardScript }> {
  const triggered: Array<{ card: GameCard; effect: CardEffect; script: CardScript }> = []
  
  for (const card of allCards) {
    if (!hasCardScript(card.cardId)) continue
    
    const script = getCardScript(card.cardId)!
    
    for (const effect of script.effects) {
      // Check if effect responds to this trigger
      if (!effect.trigger) continue
      
      const triggers = Array.isArray(effect.trigger) ? effect.trigger : [effect.trigger]
      if (!triggers.includes(event)) continue
      
      // Check trigger condition
      if (effect.triggerCondition && !effect.triggerCondition(state, card, eventData)) {
        continue
      }
      
      // Check if effect can be activated
      const canActivate = canActivateEffect(card, effect, state, card.controllerId, allCards)
      if (canActivate.canActivate) {
        triggered.push({ card, effect, script })
      }
    }
  }
  
  return triggered
}

// ============================================
// PARSE EFFECT TEXT FOR ACTIONS (Fallback)
// ============================================

export function parseEffectText(effectText: string): { 
  possibleActions: string[]
  keywords: string[]
} {
  const text = effectText.toLowerCase()
  const possibleActions: string[] = []
  const keywords: string[] = []
  
  // Draw effects
  if (text.includes('draw')) {
    possibleActions.push('DRAW')
    const drawMatch = text.match(/draw (\d+|a) cards?/i)
    if (drawMatch) {
      keywords.push(`Draw ${drawMatch[1]} card(s)`)
    }
  }
  
  // Search effects
  if (text.includes('add') && (text.includes('deck') || text.includes('hand'))) {
    possibleActions.push('SEARCH_DECK')
    keywords.push('Search deck')
  }
  
  // Destruction effects
  if (text.includes('destroy')) {
    possibleActions.push('DESTROY')
    keywords.push('Destroy')
  }
  
  // Special Summon effects
  if (text.includes('special summon')) {
    possibleActions.push('SPECIAL_SUMMON')
    keywords.push('Special Summon')
  }
  
  // Banish effects
  if (text.includes('banish')) {
    possibleActions.push('BANISH')
    keywords.push('Banish')
  }
  
  // Negate effects
  if (text.includes('negate')) {
    possibleActions.push('NEGATE_EFFECT')
    keywords.push('Negate')
  }
  
  // Send to GY effects
  if (text.includes('send') && text.includes('graveyard')) {
    possibleActions.push('SEND_TO_GRAVEYARD')
    keywords.push('Send to GY')
  }
  
  // Return to hand
  if (text.includes('return') && text.includes('hand')) {
    possibleActions.push('RETURN_TO_HAND')
    keywords.push('Return to hand')
  }
  
  // Damage effects
  if (text.includes('damage') && !text.includes('battle damage')) {
    possibleActions.push('INFLICT_DAMAGE')
    keywords.push('Inflict damage')
  }
  
  // LP gain
  if (text.includes('gain') && text.includes('lp') || text.includes('life points')) {
    possibleActions.push('GAIN_LIFEPOINTS')
    keywords.push('Gain LP')
  }
  
  // ATK/DEF modification
  if (text.includes('atk') || text.includes('def')) {
    if (text.includes('gain') || text.includes('increase') || text.includes('+')) {
      possibleActions.push('CHANGE_ATK_DEF')
      keywords.push('ATK/DEF boost')
    }
    if (text.includes('lose') || text.includes('decrease') || text.includes('-')) {
      possibleActions.push('CHANGE_ATK_DEF')
      keywords.push('ATK/DEF reduction')
    }
  }
  
  return { possibleActions, keywords }
}
