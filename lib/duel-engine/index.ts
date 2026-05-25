// Yu-Gi-Oh! Duel Engine
// A complete rules-accurate duel simulator

export * from './types'
export * from './constants'
export { GameStateManager, getGameStateManager, clearGameStateManager } from './game-state'
export { RuleValidator } from './rule-validator'
export { ActionExecutor, actionExecutor } from './action-executor'

// Game processor - the core game loop based on ygopro-core architecture
export { 
  GameProcessor, 
  getGameProcessor, 
  clearGameProcessor,
  ProcessorType,
  GameEvent,
  Reason,
  Phase,
  Location,
} from './game-processor'
export type { 
  ProcessorUnit, 
  GameEventData, 
  ChainLink, 
  PlayerState, 
  FieldState 
} from './game-processor'

// Card scripting system - data-driven effect definitions
export * from './card-scripts'
