'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, RefreshCw, CheckCircle, XCircle, Cpu } from 'lucide-react'
import { useOcgCoreStatus, useOcgDuel } from '@/hooks/use-ocg-duel'
import type { DeckConfig } from '@/lib/ocg-core/types'

// Sample test decks (just a few cards for testing)
const TEST_DECK_1: DeckConfig = {
  main: [
    89631139, // Blue-Eyes White Dragon
    89631139,
    89631139,
    38517737, // Maiden with Eyes of Blue
    38517737,
    38517737,
    80701178, // Sage with Eyes of Blue
    80701178,
    80701178,
    9596126,  // The White Stone of Legend
    9596126,
    9596126,
    71039903, // Blue-Eyes Alternative White Dragon
    71039903,
    71039903,
    45467446, // White Stone of Ancients
    45467446,
    45467446,
    47712498, // Dragon Spirit of White
    47712498,
    // Fill rest with staples
    24094653, // Dark Hole
    83764718, // Monster Reborn
    70368879, // Raigeki
    81439173, // Pot of Greed
    4149689,  // Mirror Force
    4149689,
    4149689,
    44095762, // Torrential Tribute
    44095762,
    5318639,  // Mystical Space Typhoon
    5318639,
    5318639,
    97077563, // Cosmic Cyclone
    97077563,
    73628505, // Twin Twisters
    73628505,
    32807846, // Solemn Judgment
    41420027, // Solemn Warning
    84749824, // Cards of Consonance
    84749824,
  ],
  extra: [
    38517737, // Blue-Eyes Twin Burst Dragon (placeholder - use real code)
    62873545, // Blue-Eyes Spirit Dragon
    23995346, // Azure-Eyes Silver Dragon
    17696270, // Blue-Eyes Ultimate Dragon
  ],
}

const TEST_DECK_2: DeckConfig = {
  main: [
    46986414, // Dark Magician
    46986414,
    46986414,
    38033121, // Dark Magician Girl
    38033121,
    38033121,
    22804410, // Magician's Rod
    22804410,
    22804410,
    61901281, // Magician's Robe
    61901281,
    61901281,
    3287077,  // Magician Navigation
    3287077,
    3287077,
    36996508, // Dark Magical Circle
    36996508,
    36996508,
    73752131, // Eternal Soul
    73752131,
    // Staples
    24094653, // Dark Hole
    83764718, // Monster Reborn
    70368879, // Raigeki
    81439173, // Pot of Greed
    4149689,  // Mirror Force
    4149689,
    4149689,
    44095762, // Torrential Tribute
    44095762,
    5318639,  // Mystical Space Typhoon
    5318639,
    5318639,
    97077563, // Cosmic Cyclone
    97077563,
    73628505, // Twin Twisters
    73628505,
    32807846, // Solemn Judgment
    41420027, // Solemn Warning
    41420027,
    35261759, // Thousand Knives
  ],
  extra: [
    41546, // Dark Paladin
    21501505, // Amulet Dragon
    52190020, // Ebon Illusion Magician
    94380860, // The Dark Magicians
  ],
}

export function OcgTestComponent() {
  const { status, version } = useOcgCoreStatus()
  const [showDuel, setShowDuel] = useState(false)
  
  return (
    <div className="space-y-6 p-4">
      {/* Core Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            OCG Core WASM Status
          </CardTitle>
          <CardDescription>
            Yu-Gi-Oh! rules engine compiled to WebAssembly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span>Loading WASM module...</span>
              </>
            )}
            {status === 'ready' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600">Core loaded successfully</span>
                <Badge variant="secondary">v{version}</Badge>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600">Failed to load WASM module</span>
              </>
            )}
          </div>
          
          {status === 'ready' && !showDuel && (
            <Button 
              className="mt-4" 
              onClick={() => setShowDuel(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Test Duel Engine
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Duel Test Card */}
      {showDuel && (
        <DuelTestCard onClose={() => setShowDuel(false)} />
      )}
    </div>
  )
}

function DuelTestCard({ onClose }: { onClose: () => void }) {
  const {
    isLoading,
    isReady,
    error,
    gameState,
    events,
    startDuel,
    resetDuel,
  } = useOcgDuel({
    player1Deck: TEST_DECK_1,
    player2Deck: TEST_DECK_2,
    onEvent: (event) => {
      console.log('[v0] Duel event:', event)
    },
  })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WASM Duel Test</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardTitle>
        <CardDescription>
          Testing Blue-Eyes vs Dark Magician
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={startDuel} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Duel
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetDuel}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
        
        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-4 text-red-600 dark:text-red-400">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {/* Game State */}
        {gameState && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Player 1 */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Player 1 (Blue-Eyes)</h4>
                <div className="space-y-1 text-sm">
                  <p>LP: {gameState.players[0].lp}</p>
                  <p>Hand: {gameState.players[0].hand.length} cards</p>
                  <p>Deck: {gameState.players[0].deck} cards</p>
                  <p>Monsters: {gameState.players[0].monsterZone.filter(Boolean).length}</p>
                  <p>GY: {gameState.players[0].graveyard.length}</p>
                </div>
              </div>
              
              {/* Player 2 */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Player 2 (Dark Magician)</h4>
                <div className="space-y-1 text-sm">
                  <p>LP: {gameState.players[1].lp}</p>
                  <p>Hand: {gameState.players[1].hand.length} cards</p>
                  <p>Deck: {gameState.players[1].deck} cards</p>
                  <p>Monsters: {gameState.players[1].monsterZone.filter(Boolean).length}</p>
                  <p>GY: {gameState.players[1].graveyard.length}</p>
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">
                Turn {gameState.turn} - {gameState.phase} - 
                Player {gameState.currentPlayer + 1}&apos;s turn
              </p>
            </div>
          </div>
        )}
        
        {/* Events Log */}
        {events.length > 0 && (
          <div className="rounded-lg border p-4 max-h-48 overflow-y-auto">
            <h4 className="font-medium mb-2">Event Log</h4>
            <div className="space-y-1 text-sm">
              {events.map((event, i) => (
                <p key={i} className="text-muted-foreground">
                  [{event.type}] {JSON.stringify(event).substring(0, 80)}...
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
