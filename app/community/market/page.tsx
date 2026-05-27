import { Store } from 'lucide-react'
import { MarketClient } from './market-client'

export const metadata = {
  title: 'Card Market | Yu-Gi-Oh! Card Hub',
  description: 'Buy, sell, and trade cards with other players in the community marketplace',
}

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Card Market</h1>
            <p className="text-muted-foreground">Buy, sell, and trade cards with the community</p>
          </div>
        </div>
        
        <MarketClient />
      </div>
    </div>
  )
}
