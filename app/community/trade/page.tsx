import { ArrowLeftRight } from 'lucide-react'
import { TradeClient } from './trade-client'

export const metadata = {
  title: 'Trade Hub | Yu-Gi-Oh! Card Hub',
  description: 'Trade cards directly with other players in the community',
}

export default function TradePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ArrowLeftRight className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Trade Hub</h1>
            <p className="text-muted-foreground">Create and manage card trades with other players</p>
          </div>
        </div>
        
        <TradeClient />
      </div>
    </div>
  )
}
