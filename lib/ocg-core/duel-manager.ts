/**
 * OCG Duel Manager
 * 
 * Main interface for creating and managing duels using the OCG Core WASM engine.
 * Handles the duel lifecycle, message processing, and state management.
 */

'use client'

// Dynamic import for WASM module - must be loaded at runtime in browser
const loadOcgCore = async () => {
  const module = await import('@n1xx1/ocgcore-wasm')
  return module.default
}

import {
  OcgDuelMode,
  OcgProcessResult,
  OcgLocation,
  OcgPosition,
} from '@n1xx1/ocgcore-wasm'
import type {
  OcgCoreSync,
  OcgDuelHandle,
  OcgMessage,
  OcgCardData,
} from '@n1xx1/ocgcore-wasm'
import {
  preloadDeck,
  createSyncCardReader,
  getCardInfo,
  fetchCardsFromAPI,
} from './card-database'
import {
  preloadDeckScripts,
  createScriptReader,
} from './script-loader'
import type {
  CreateDuelOptions,
  ParsedGameState,
  ParsedCard,
  ParsedPlayerState,
  DuelEvent,
  WaitingState,
  GameAction,
  GamePhase,
} from './types'

// Global core instance (sync version for performance)
let coreInstance: OcgCoreSync | null = null
let coreLoading: Promise<OcgCoreSync> | null = null

/**
 * Initialize the OCG Core WASM module
 */
export async function initializeCore(): Promise<OcgCoreSync> {
  if (coreInstance) return coreInstance
  
  if (coreLoading) return coreLoading
  
  coreLoading = (async () => {
    console.log('[v0] Initializing OCG Core WASM...')
    
    const createCore = await loadOcgCore()
    const core = await createCore({ 
      sync: true,
      print: (str: string) => console.log('[OCG]', str),
      printErr: (str: string) => console.error('[OCG Error]', str),
    })
    
    const version = core.getVersion()
    console.log(`[v0] OCG Core initialized: version ${version[0]}.${version[1]}`)
    
    coreInstance = core
    return core
  })()
  
  return coreLoading
}

/**
 * Check if core is ready
 */
export function isCoreReady(): boolean {
  return coreInstance !== null
}

/**
 * Duel instance class
 */
export class OcgDuel {
  private core: OcgCoreSync
  private handle: OcgDuelHandle
  private cardData: Map<number, OcgCardData>
  private scripts: Map<string, string>
  private eventListeners: ((event: DuelEvent) => void)[] = []
  private currentState: ParsedGameState | null = null
  private messageQueue: OcgMessage[] = []
  
  constructor(
    core: OcgCoreSync,
    handle: OcgDuelHandle,
    cardData: Map<number, OcgCardData>,
    scripts: Map<string, string>
  ) {
    this.core = core
    this.handle = handle
    this.cardData = cardData
    this.scripts = scripts
  }
  
  /**
   * Subscribe to duel events
   */
  onEvent(listener: (event: DuelEvent) => void) {
    this.eventListeners.push(listener)
    return () => {
      const idx = this.eventListeners.indexOf(listener)
      if (idx >= 0) this.eventListeners.splice(idx, 1)
    }
  }
  
  /**
   * Emit an event to all listeners
   */
  private emit(event: DuelEvent) {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (e) {
        console.error('[v0] Event listener error:', e)
      }
    }
  }
  
  /**
   * Start the duel
   */
  async start() {
    console.log('[v0] Starting duel...')
    this.core.startDuel(this.handle)
    this.emit({ type: 'game_start' })
    await this.processUntilWaiting()
  }
  
  /**
   * Process duel messages until we need player input
   */
  async processUntilWaiting(): Promise<WaitingState | null> {
    while (true) {
      const result = this.core.duelProcess(this.handle)
      const messages = this.core.duelGetMessage(this.handle)
      
      // Process messages
      for (const msg of messages) {
        this.processMessage(msg)
      }
      
      if (result === OcgProcessResult.END) {
        console.log('[v0] Duel ended')
        return null
      }
      
      if (result === OcgProcessResult.WAITING) {
        // Parse waiting state from last message
        return this.parseWaitingState()
      }
      
      // CONTINUE - keep processing
    }
  }
  
  /**
   * Process a single message from the core
   */
  private processMessage(msg: OcgMessage) {
    this.messageQueue.push(msg)
    
    // Handle different message types and emit events
    // This is a simplified version - full implementation would handle all message types
    const msgType = (msg as { type: string }).type
    
    switch (msgType) {
      case 'new_turn':
        this.emit({ type: 'new_turn', player: (msg as { player: 0 | 1 }).player })
        break
      case 'new_phase':
        const phase = this.parsePhase((msg as { phase: number }).phase)
        this.emit({ type: 'new_phase', phase })
        break
      case 'draw':
        // Parse drawn cards and emit event
        break
      case 'move':
        // Card moved - parse and emit
        break
      case 'damage':
      case 'recover':
        // LP change
        break
      case 'win':
        this.emit({ 
          type: 'game_end', 
          winner: (msg as { winner: 0 | 1 }).winner,
          reason: 'normal'
        })
        break
    }
  }
  
  /**
   * Parse waiting state from current messages
   */
  private parseWaitingState(): WaitingState | null {
    // Get the last message that requires a response
    const lastMsg = this.messageQueue[this.messageQueue.length - 1]
    if (!lastMsg) return null
    
    const msgType = (lastMsg as { type: string }).type
    
    // Return appropriate waiting state based on message type
    switch (msgType) {
      case 'select_idle_cmd':
        return { type: 'select_idle_command', options: [] }
      case 'select_battle_cmd':
        return { type: 'select_battle_command', options: [] }
      case 'select_card':
        return { 
          type: 'select_card', 
          cards: [], 
          min: 1, 
          max: 1, 
          cancelable: false,
          hint: ''
        }
      case 'select_chain':
        return { type: 'select_chain', chains: [], forced: false }
      case 'select_yesno':
        return { type: 'select_yes_no', description: '' }
      default:
        return null
    }
  }
  
  /**
   * Send a response to the core
   */
  async respond(action: GameAction): Promise<WaitingState | null> {
    const response = this.actionToResponse(action)
    if (response) {
      this.core.duelSetResponse(this.handle, response)
    }
    return this.processUntilWaiting()
  }
  
  /**
   * Convert game action to OCG response format
   */
  private actionToResponse(action: GameAction): Uint8Array | null {
    // Convert action to binary response format expected by OCG core
    // This is simplified - full implementation would handle all action types
    const buffer = new ArrayBuffer(64)
    const view = new DataView(buffer)
    
    switch (action.type) {
      case 'select_card':
        // Set selected card indices
        view.setInt32(0, action.indices.length, true)
        action.indices.forEach((idx, i) => {
          view.setInt32(4 + i * 4, idx, true)
        })
        return new Uint8Array(buffer, 0, 4 + action.indices.length * 4)
        
      case 'select_yes_no':
        view.setInt32(0, action.answer ? 1 : 0, true)
        return new Uint8Array(buffer, 0, 4)
        
      case 'pass':
        view.setInt32(0, -1, true)
        return new Uint8Array(buffer, 0, 4)
        
      default:
        return null
    }
  }
  
  /**
   * Get current parsed game state
   */
  getState(): ParsedGameState {
    const field = this.core.duelQueryField(this.handle)
    
    // Parse field state into our format
    const state: ParsedGameState = {
      turn: 1, // Would be tracked from messages
      phase: 'main1',
      currentPlayer: 0,
      players: [
        this.parsePlayerState(0),
        this.parsePlayerState(1),
      ],
      chain: [],
      waitingFor: null,
    }
    
    this.currentState = state
    return state
  }
  
  /**
   * Parse player state from core queries
   */
  private parsePlayerState(player: 0 | 1): ParsedPlayerState {
    const queryCards = (location: number): ParsedCard[] => {
      const count = this.core.duelQueryCount(this.handle, player, location)
      const cards: ParsedCard[] = []
      
      for (let i = 0; i < count; i++) {
        const info = this.core.duelQuery(this.handle, {
          flags: 0xFFFFFFFF, // Query all info
          controller: player,
          location,
          sequence: i,
        })
        
        if (info && info.code) {
          const cardInfo = getCardInfo(info.code)
          cards.push({
            code: info.code,
            name: cardInfo?.name || `Card #${info.code}`,
            desc: cardInfo?.desc || '',
            position: this.parsePosition(info.position || 0),
            controller: player,
            owner: player,
            location: this.locationToString(location),
            sequence: i,
            atk: info.attack,
            def: info.defense,
            level: info.level,
            type: info.type || 0,
            attribute: info.attribute,
            race: info.race ? Number(info.race) : undefined,
            counters: info.counters,
            isPublic: info.isPublic || false,
          })
        }
      }
      
      return cards
    }
    
    const monsterZone = queryCards(OcgLocation.MZONE)
    const spellTrapZone = queryCards(OcgLocation.SZONE)
    
    return {
      lp: 8000, // Would be tracked from messages
      deck: this.core.duelQueryCount(this.handle, player, OcgLocation.DECK),
      hand: queryCards(OcgLocation.HAND),
      monsterZone: this.padZone(monsterZone, 5),
      spellTrapZone: this.padZone(spellTrapZone, 5),
      graveyard: queryCards(OcgLocation.GRAVE),
      banished: queryCards(OcgLocation.REMOVED),
      extraDeck: queryCards(OcgLocation.EXTRA),
      fieldSpell: spellTrapZone.find(c => c?.sequence === 5) || null,
      pendulumZone: [
        spellTrapZone.find(c => c?.sequence === 6) || null,
        spellTrapZone.find(c => c?.sequence === 7) || null,
      ],
    }
  }
  
  /**
   * Pad zone array to fixed length
   */
  private padZone(cards: ParsedCard[], length: number): (ParsedCard | null)[] {
    const result: (ParsedCard | null)[] = new Array(length).fill(null)
    for (const card of cards) {
      if (card.sequence < length) {
        result[card.sequence] = card
      }
    }
    return result
  }
  
  /**
   * Parse position value to string
   */
  private parsePosition(pos: number): ParsedCard['position'] {
    if (pos & OcgPosition.FACEUP_ATTACK) return 'face_up_attack'
    if (pos & OcgPosition.FACEDOWN_ATTACK) return 'face_down_attack'
    if (pos & OcgPosition.FACEUP_DEFENSE) return 'face_up_defense'
    if (pos & OcgPosition.FACEDOWN_DEFENSE) return 'face_down_defense'
    return 'face_up_attack'
  }
  
  /**
   * Parse phase number to string
   */
  private parsePhase(phase: number): GamePhase {
    const phases: Record<number, GamePhase> = {
      0x01: 'draw',
      0x02: 'standby',
      0x04: 'main1',
      0x08: 'battle_start',
      0x10: 'battle_step',
      0x20: 'damage',
      0x40: 'damage_calc',
      0x80: 'battle_end',
      0x100: 'main2',
      0x200: 'end',
    }
    return phases[phase] || 'main1'
  }
  
  /**
   * Convert location to string
   */
  private locationToString(loc: number): string {
    const locations: Record<number, string> = {
      [OcgLocation.DECK]: 'deck',
      [OcgLocation.HAND]: 'hand',
      [OcgLocation.MZONE]: 'monster_zone',
      [OcgLocation.SZONE]: 'spell_trap_zone',
      [OcgLocation.GRAVE]: 'graveyard',
      [OcgLocation.REMOVED]: 'banished',
      [OcgLocation.EXTRA]: 'extra_deck',
    }
    return locations[loc] || 'unknown'
  }
  
  /**
   * Destroy the duel and free resources
   */
  destroy() {
    this.core.destroyDuel(this.handle)
    this.eventListeners = []
    this.messageQueue = []
    this.currentState = null
  }
}

/**
 * Create a new duel instance
 */
export async function createDuel(options: CreateDuelOptions): Promise<OcgDuel> {
  const core = await initializeCore()
  
  // Collect all card codes
  const allCodes = [
    ...options.player1.deck.main,
    ...options.player1.deck.extra,
    ...(options.player1.deck.side || []),
    ...options.player2.deck.main,
    ...options.player2.deck.extra,
    ...(options.player2.deck.side || []),
  ]
  
  console.log(`[v0] Preloading ${allCodes.length} cards...`)
  
  // Preload card data and scripts in parallel
  const [cardData, scripts] = await Promise.all([
    preloadDeck(allCodes),
    preloadDeckScripts(allCodes),
  ])
  
  console.log(`[v0] Loaded ${cardData.size} cards, ${scripts.size} scripts`)
  
  // Create card and script readers
  const cardReader = createSyncCardReader(cardData)
  const scriptReader = createScriptReader(scripts)
  
  // Create the duel
  const handle = core.createDuel({
    flags: options.mode || OcgDuelMode.MODE_MR5,
    seed: options.seed || [
      BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
      BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
      BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
      BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
    ],
    team1: {
      drawCountPerTurn: options.player1.drawCountPerTurn || 1,
      startingDrawCount: options.player1.startingDrawCount || 5,
      startingLP: options.player1.startingLP || 8000,
    },
    team2: {
      drawCountPerTurn: options.player2.drawCountPerTurn || 1,
      startingDrawCount: options.player2.startingDrawCount || 5,
      startingLP: options.player2.startingLP || 8000,
    },
    cardReader,
    scriptReader,
    errorHandler: (type, text) => {
      console.warn(`[OCG Error ${type}]`, text)
    },
  })
  
  if (!handle) {
    throw new Error('Failed to create duel')
  }
  
  // Add cards to the duel
  const addDeck = (codes: number[], controller: 0 | 1, location: number) => {
    for (let i = 0; i < codes.length; i++) {
      core.duelNewCard(handle, {
        code: codes[i],
        owner: controller,
        controller,
        location,
        sequence: i,
        position: OcgPosition.FACEDOWN_DEFENSE,
      })
    }
  }
  
  // Add player 1's deck
  addDeck(options.player1.deck.main, 0, OcgLocation.DECK)
  addDeck(options.player1.deck.extra, 0, OcgLocation.EXTRA)
  
  // Add player 2's deck
  addDeck(options.player2.deck.main, 1, OcgLocation.DECK)
  addDeck(options.player2.deck.extra, 1, OcgLocation.EXTRA)
  
  console.log('[v0] Duel created successfully')
  
  return new OcgDuel(core, handle, cardData, scripts)
}

/**
 * Test if WASM core can be loaded
 */
export async function testCoreLoad(): Promise<boolean> {
  try {
    const core = await initializeCore()
    return core !== null
  } catch (e) {
    console.error('[v0] Failed to load OCG Core:', e)
    return false
  }
}
