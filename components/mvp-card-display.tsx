'use client'

import { useState, useEffect } from 'react'

interface ThemeConfig {
  colors: {
    text: string
    muted: string
    accent: string
    card: string
    border: string
  }
  name: string
}

interface MVPCardDisplayProps {
  mvpCardName: string
  themeConfig: ThemeConfig
}

export function MVPCardDisplay({ mvpCardName, themeConfig }: MVPCardDisplayProps) {
  const [cardImage, setCardImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCardImage = async () => {
      try {
        // Search for the card by name
        const response = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(mvpCardName)}`
        )
        const data = await response.json()
        
        if (data.data && data.data.length > 0) {
          setCardImage(data.data[0].card_images[0]?.image_url || null)
        }
      } catch (error) {
        console.error('[v0] Error fetching MVP card image:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCardImage()
  }, [mvpCardName])

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[180px]">
        <div className="w-full h-full rounded-lg bg-gradient-to-b from-purple-900/30 to-purple-950/30 flex items-center justify-center border-2 border-purple-700/30">
          <p className="text-xs text-purple-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (cardImage) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[180px]">
        <img
          src={cardImage}
          alt={mvpCardName}
          className="w-full h-full object-cover rounded-lg border border-purple-700/50"
        />
      </div>
    )
  }

  // Fallback if image not found
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[180px]">
      <div className="w-full h-full rounded-lg bg-gradient-to-b from-purple-900 to-purple-950 flex items-center justify-center border-2 border-purple-700/50 p-2">
        <div className="text-center">
          <p className="text-xs text-purple-300 uppercase tracking-widest mb-1">MVP Card</p>
          <p className="text-xs font-bold text-white break-words" style={{ color: themeConfig.colors.accent }}>
            {mvpCardName}
          </p>
        </div>
      </div>
    </div>
  )
}
