'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search, Plus, ArrowLeftRight, Clock, Check, X,
  MessageCircle, User, ChevronRight, Send, AlertCircle
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

// Mock trade data
const mockTrades = [
  {
    id: 'trade1',
    status: 'pending',
    initiator: { id: 'user1', name: 'DuelistKing', avatar: '' },
    receiver: { id: 'me', name: 'You', avatar: '' },
    initiatorCards: [
      { card_id: 46986414, card_name: 'Dark Magician', quantity: 1 },
      { card_id: 44508094, card_name: 'Dark Magician Girl', quantity: 1 },
    ],
    receiverCards: [
      { card_id: 89631139, card_name: 'Blue-Eyes White Dragon', quantity: 1 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 30),
    messages: [
      { sender: 'user1', text: 'Hey, would you trade your Blue-Eyes for my Dark Magician cards?', time: new Date() }
    ],
  },
  {
    id: 'trade2',
    status: 'accepted',
    initiator: { id: 'me', name: 'You', avatar: '' },
    receiver: { id: 'user2', name: 'KaibaFan', avatar: '' },
    initiatorCards: [
      { card_id: 70903634, card_name: 'Exodia the Forbidden One', quantity: 1 },
    ],
    receiverCards: [
      { card_id: 89631139, card_name: 'Blue-Eyes White Dragon', quantity: 3 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
    messages: [],
  },
  {
    id: 'trade3',
    status: 'declined',
    initiator: { id: 'user3', name: 'ExodiaCollector', avatar: '' },
    receiver: { id: 'me', name: 'You', avatar: '' },
    initiatorCards: [
      { card_id: 46986414, card_name: 'Dark Magician', quantity: 2 },
    ],
    receiverCards: [
      { card_id: 70903634, card_name: 'Exodia the Forbidden One', quantity: 1 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    messages: [],
  },
]

type Trade = typeof mockTrades[0]

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">Pending</Badge>
    case 'accepted':
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">Accepted</Badge>
    case 'declined':
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/50">Declined</Badge>
    case 'completed':
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function TradeClient() {
  const [trades, setTrades] = useState<Trade[]>(mockTrades)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [showCreateTrade, setShowCreateTrade] = useState(false)
  const [messageInput, setMessageInput] = useState('')

  const pendingTrades = trades.filter(t => t.status === 'pending')
  const activeTrades = trades.filter(t => t.status === 'accepted')
  const historyTrades = trades.filter(t => t.status === 'declined' || t.status === 'completed')

  const handleAcceptTrade = (trade: Trade) => {
    setTrades(prev => prev.map(t => 
      t.id === trade.id ? { ...t, status: 'accepted' } : t
    ))
    setSelectedTrade(null)
    toast.success('Trade accepted!')
  }

  const handleDeclineTrade = (trade: Trade) => {
    setTrades(prev => prev.map(t => 
      t.id === trade.id ? { ...t, status: 'declined' } : t
    ))
    setSelectedTrade(null)
    toast.success('Trade declined')
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTrade) return
    
    setTrades(prev => prev.map(t => 
      t.id === selectedTrade.id 
        ? { ...t, messages: [...t.messages, { sender: 'me', text: messageInput, time: new Date() }] }
        : t
    ))
    setSelectedTrade(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { sender: 'me', text: messageInput, time: new Date() }]
    } : null)
    setMessageInput('')
  }

  const TradeCard = ({ trade, onClick }: { trade: Trade; onClick: () => void }) => {
    const isIncoming = trade.receiver.id === 'me'
    const otherUser = isIncoming ? trade.initiator : trade.receiver
    
    return (
      <Card 
        className="hover:border-primary/50 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{otherUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isIncoming ? 'Wants to trade with you' : 'Trade request sent'}
                </p>
              </div>
            </div>
            {getStatusBadge(trade.status)}
          </div>

          <div className="flex items-center gap-2">
            {/* Their offer */}
            <div className="flex-1 p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">They offer:</p>
              <div className="flex gap-1">
                {trade.initiatorCards.slice(0, 3).map((card, i) => (
                  <div key={i} className="w-10 h-14 relative rounded overflow-hidden">
                    <Image
                      src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                      alt={card.card_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {card.quantity > 1 && (
                      <Badge className="absolute bottom-0 right-0 text-[10px] h-4 px-1">
                        x{card.quantity}
                      </Badge>
                    )}
                  </div>
                ))}
                {trade.initiatorCards.length > 3 && (
                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    +{trade.initiatorCards.length - 3}
                  </div>
                )}
              </div>
            </div>

            <ArrowLeftRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

            {/* What they want */}
            <div className="flex-1 p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">They want:</p>
              <div className="flex gap-1">
                {trade.receiverCards.slice(0, 3).map((card, i) => (
                  <div key={i} className="w-10 h-14 relative rounded overflow-hidden">
                    <Image
                      src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                      alt={card.card_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {card.quantity > 1 && (
                      <Badge className="absolute bottom-0 right-0 text-[10px] h-4 px-1">
                        x{card.quantity}
                      </Badge>
                    )}
                  </div>
                ))}
                {trade.receiverCards.length > 3 && (
                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    +{trade.receiverCards.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(trade.created_at)}
            </span>
            {trade.messages.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {trade.messages.length} message{trade.messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={() => setShowCreateTrade(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Trade
        </Button>
      </div>

      {/* Trade Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTrades.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeTrades.length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">24</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Trades Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingTrades.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{pendingTrades.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTrades.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No pending trades</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeTrades.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No active trades</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyTrades.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No trade history</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {historyTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Trade Detail Dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          {selectedTrade && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Trade with {selectedTrade.initiator.id === 'me' ? selectedTrade.receiver.name : selectedTrade.initiator.name}
                  {getStatusBadge(selectedTrade.status)}
                </DialogTitle>
                <DialogDescription>
                  Created {formatTimeAgo(selectedTrade.created_at)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Trade Items */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Their offer */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedTrade.initiator.name} offers:
                    </h4>
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTrade.initiatorCards.map((card, i) => (
                          <div key={i} className="text-center">
                            <div className="aspect-[421/614] relative rounded overflow-hidden mb-1">
                              <Image
                                src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                                alt={card.card_name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <p className="text-xs truncate">{card.card_name}</p>
                            {card.quantity > 1 && (
                              <Badge variant="secondary" className="text-[10px]">x{card.quantity}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* What they want */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedTrade.receiver.name} gives:
                    </h4>
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTrade.receiverCards.map((card, i) => (
                          <div key={i} className="text-center">
                            <div className="aspect-[421/614] relative rounded overflow-hidden mb-1">
                              <Image
                                src={`https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`}
                                alt={card.card_name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <p className="text-xs truncate">{card.card_name}</p>
                            {card.quantity > 1 && (
                              <Badge variant="secondary" className="text-[10px]">x{card.quantity}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <Separator />

                {/* Messages */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </h4>
                  <ScrollArea className="h-32 border rounded-lg p-3 mb-3">
                    {selectedTrade.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedTrade.messages.map((msg, i) => (
                          <div 
                            key={i}
                            className={cn(
                              "p-2 rounded-lg max-w-[80%]",
                              msg.sender === 'me' 
                                ? "bg-primary/10 ml-auto text-right" 
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {selectedTrade.status === 'pending' && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                {selectedTrade.status === 'pending' && selectedTrade.receiver.id === 'me' && (
                  <>
                    <Button variant="outline" onClick={() => handleDeclineTrade(selectedTrade)}>
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                    <Button onClick={() => handleAcceptTrade(selectedTrade)}>
                      <Check className="h-4 w-4 mr-2" />
                      Accept Trade
                    </Button>
                  </>
                )}
                {selectedTrade.status === 'accepted' && (
                  <Button>
                    Complete Trade
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Trade Dialog */}
      <Dialog open={showCreateTrade} onOpenChange={setShowCreateTrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Trade</DialogTitle>
            <DialogDescription>
              Select a user and cards to create a trade offer
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Trade creation form coming soon...</p>
            <p className="text-sm mt-2">You&apos;ll be able to search users and select cards to trade</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTrade(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
