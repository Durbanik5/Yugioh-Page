/**
 * Lua Script Loader for OCG Core
 * 
 * Loads card effect scripts from ProjectIgnis CardScripts repository
 * hosted on jsDelivr CDN for fast, reliable access.
 */

// CDN URLs for card scripts
const SCRIPT_CDN_BASE = 'https://cdn.jsdelivr.net/gh/ProjectIgnis/CardScripts@master'
const SCRIPT_CACHE = new Map<string, string>()

// Core utility scripts that must be loaded
const UTILITY_SCRIPTS = [
  'utility.lua',
  'proc_fusion.lua',
  'proc_ritual.lua',
  'proc_synchro.lua',
  'proc_xyz.lua',
  'proc_pendulum.lua',
  'proc_link.lua',
]

/**
 * Fetch a single script from CDN
 */
async function fetchScript(scriptName: string): Promise<string | null> {
  // Check cache
  if (SCRIPT_CACHE.has(scriptName)) {
    return SCRIPT_CACHE.get(scriptName)!
  }
  
  try {
    // Determine the path based on script name
    let url: string
    if (scriptName.match(/^c\d+\.lua$/)) {
      // Card script - format: cXXXXXXXX.lua
      const cardCode = scriptName.match(/c(\d+)\.lua/)?.[1]
      if (!cardCode) return null
      
      // Card scripts are in the 'official' subdirectory
      url = `${SCRIPT_CDN_BASE}/official/${scriptName}`
    } else {
      // Utility script
      url = `${SCRIPT_CDN_BASE}/${scriptName}`
    }
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain',
      },
    })
    
    if (!response.ok) {
      console.warn(`[v0] Script not found: ${scriptName}`)
      return null
    }
    
    const content = await response.text()
    SCRIPT_CACHE.set(scriptName, content)
    return content
  } catch (error) {
    console.error(`[v0] Error fetching script ${scriptName}:`, error)
    return null
  }
}

/**
 * Preload utility scripts
 */
export async function preloadUtilityScripts(): Promise<Map<string, string>> {
  const scripts = new Map<string, string>()
  
  await Promise.all(
    UTILITY_SCRIPTS.map(async (name) => {
      const content = await fetchScript(name)
      if (content) {
        scripts.set(name, content)
      }
    })
  )
  
  return scripts
}

/**
 * Preload scripts for a deck's cards
 */
export async function preloadDeckScripts(cardCodes: number[]): Promise<Map<string, string>> {
  const scripts = new Map<string, string>()
  const uniqueCodes = [...new Set(cardCodes)]
  
  // First load utility scripts
  const utilityScripts = await preloadUtilityScripts()
  for (const [name, content] of utilityScripts) {
    scripts.set(name, content)
  }
  
  // Then load card scripts in parallel (batched to avoid overwhelming the CDN)
  const batchSize = 10
  for (let i = 0; i < uniqueCodes.length; i += batchSize) {
    const batch = uniqueCodes.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (code) => {
        const scriptName = `c${code}.lua`
        const content = await fetchScript(scriptName)
        if (content) {
          scripts.set(scriptName, content)
        }
      })
    )
  }
  
  return scripts
}

/**
 * Create a script reader function for the OCG core
 * Uses pre-loaded scripts for sync access
 */
export function createScriptReader(preloadedScripts: Map<string, string>) {
  return (scriptName: string): string => {
    // Check preloaded scripts
    const script = preloadedScripts.get(scriptName)
    if (script) return script
    
    // Check cache
    const cached = SCRIPT_CACHE.get(scriptName)
    if (cached) return cached
    
    // Script not found - return empty
    // The core will handle missing scripts gracefully
    console.warn(`[v0] Script not loaded: ${scriptName}`)
    return ''
  }
}

/**
 * Async script reader that fetches on demand
 */
export function createAsyncScriptReader() {
  return async (scriptName: string): Promise<string> => {
    const content = await fetchScript(scriptName)
    return content || ''
  }
}

/**
 * Clear script cache
 */
export function clearScriptCache() {
  SCRIPT_CACHE.clear()
}

/**
 * Get cache statistics
 */
export function getScriptCacheStats() {
  return {
    size: SCRIPT_CACHE.size,
    scripts: [...SCRIPT_CACHE.keys()],
  }
}
