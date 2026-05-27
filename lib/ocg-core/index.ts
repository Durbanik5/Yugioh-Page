/**
 * OCG Core WASM Integration
 * 
 * This module wraps the ocgcore-wasm package to provide a Yu-Gi-Oh! rules engine
 * based on EDOPro's ygopro-core compiled to WebAssembly.
 * 
 * Features:
 * - Full game rules implementation (Master Rule 5)
 * - Automatic card effect resolution
 * - Chain management
 * - All summoning mechanics
 */

export * from './types'
export * from './duel-manager'
export * from './card-database'
export * from './script-loader'
