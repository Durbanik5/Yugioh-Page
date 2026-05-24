'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Ban, Plus, ThumbsUp, ThumbsDown, Search, Trash2, Vote, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BannedCard, BanProposalWithVotes, Player } from '@/lib/types'
import Image from 'next/image'

interface YGOCard {
  id: number
  name: string
  type: string
  desc: string
  card_images: { image_url: string; image_url_small: string }[]
}

export default function BanlistPage() {
  const [bannedCards, setBannedCards] = useState<BannedCard[]>([])
  const [proposals, setProposals] = useState<BanProposalWithVotes[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false)

  // Card search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YGOCard[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCard, setSelectedCard] = useState<YGOCard | null>(null)

  // Form state
  const [reason, setReason] = useState('')
  const [proposalType, setProposalType] = useState<'ban' | 'unban'>('ban')
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch banned cards
    const { data: banned } = await supabase
      .from('banned_cards')
      .select('*')
      .order('banned_at', { ascending: false })

    // Fetch proposals with votes
    const { data: props } = await supabase
      .from('ban_proposals')
      .select(`
        *,
        proposer:players!ban_proposals_proposed_by_fkey(*),
        votes:proposal_votes(
          *,
          player:players(*)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Fetch players
    const { data: playerList } = await supabase
      .from('players')
      .select('*')
      .order('nickname')

    setBannedCards(banned || [])
    setProposals((props || []) as BanProposalWithVotes[])
    setPlayers(playerList || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Search YGOPRODeck API
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(searchQuery)}&num=10&offset=0`
        )
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.data || [])
        } else {
          setSearchResults([])
        }
      } catch {
        setSearchResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAddToBanlist = async () => {
    if (!selectedCard) {
      toast.error('Please select a card')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('banned_cards').insert({
      card_name: selectedCard.name,
      card_id: selectedCard.id,
      card_image: selectedCard.card_images[0]?.image_url_small,
      card_type: selectedCard.type,
      reason: reason || null,
      banned_by: selectedPlayer || null,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('This card is already banned')
      } else {
        toast.error('Failed to add card to banlist')
      }
    } else {
      toast.success(`${selectedCard.name} has been banned`)
      setAddDialogOpen(false)
      resetForm()
      fetchData()
    }

    setSubmitting(false)
  }

  const handleRemoveFromBanlist = async (card: BannedCard) => {
    const { error } = await supabase
      .from('banned_cards')
      .delete()
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to remove card from banlist')
    } else {
      toast.success(`${card.card_name} has been unbanned`)
      fetchData()
    }
  }

  const handleCreateProposal = async () => {
    if (!selectedCard) {
      toast.error('Please select a card')
      return
    }

    if (proposalType === 'ban') {
      const alreadyBanned = bannedCards.some(
        (c) => c.card_name.toLowerCase() === selectedCard.name.toLowerCase()
      )
      if (alreadyBanned) {
        toast.error('This card is already banned')
        return
      }
    }

    if (proposalType === 'unban') {
      const isBanned = bannedCards.some(
        (c) => c.card_name.toLowerCase() === selectedCard.name.toLowerCase()
      )
      if (!isBanned) {
        toast.error('This card is not currently banned')
        return
      }
    }

    setSubmitting(true)

    const { error } = await supabase.from('ban_proposals').insert({
      card_name: selectedCard.name,
      card_id: selectedCard.id,
      card_image: selectedCard.card_images[0]?.image_url_small,
      card_type: selectedCard.type,
      proposal_type: proposalType,
      reason: reason || null,
      proposed_by: selectedPlayer || null,
    })

    if (error) {
      toast.error('Failed to create proposal')
    } else {
      toast.success('Proposal created successfully')
      setProposeDialogOpen(false)
      resetForm()
      fetchData()
    }

    setSubmitting(false)
  }

  const handleVote = async (proposalId: string, vote: 'yes' | 'no') => {
    if (!selectedPlayer) {
      toast.error('Please select your player to vote')
      return
    }

    // Check if already voted
    const proposal = proposals.find((p) => p.id === proposalId)
    const existingVote = proposal?.votes.find((v) => v.player_id === selectedPlayer)

    if (existingVote) {
      // Update vote
      const { error } = await supabase
        .from('proposal_votes')
        .update({ vote })
        .eq('id', existingVote.id)

      if (error) {
        toast.error('Failed to update vote')
      } else {
        toast.success('Vote updated')
        fetchData()
      }
    } else {
      // Create new vote
      const { error } = await supabase.from('proposal_votes').insert({
        proposal_id: proposalId,
        player_id: selectedPlayer,
        vote,
      })

      if (error) {
        toast.error('Failed to submit vote')
      } else {
        toast.success('Vote submitted')
        fetchData()
      }
    }
  }

  const handleApproveProposal = async (proposal: BanProposalWithVotes) => {
    // Update proposal status
    await supabase
      .from('ban_proposals')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', proposal.id)

    if (proposal.proposal_type === 'ban') {
      // Add to banlist
      await supabase.from('banned_cards').insert({
        card_name: proposal.card_name,
        card_id: proposal.card_id,
        card_image: proposal.card_image,
        card_type: proposal.card_type,
        reason: proposal.reason,
        banned_by: proposal.proposed_by,
      })
      toast.success(`${proposal.card_name} has been banned`)
    } else {
      // Remove from banlist
      await supabase
        .from('banned_cards')
        .delete()
        .eq('card_name', proposal.card_name)
      toast.success(`${proposal.card_name} has been unbanned`)
    }

    fetchData()
  }

  const handleRejectProposal = async (proposal: BanProposalWithVotes) => {
    await supabase
      .from('ban_proposals')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', proposal.id)

    toast.success('Proposal rejected')
    fetchData()
  }

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedCard(null)
    setReason('')
    setProposalType('ban')
  }

  const CardSearchInput = () => (
    <div className="space-y-2">
      <Label>Search Card</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Yu-Gi-Oh card..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setSelectedCard(null)
          }}
          className="pl-9 bg-input border-border"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchResults.length > 0 && !selectedCard && (
        <div className="border border-border rounded-md bg-card max-h-60 overflow-y-auto">
          {searchResults.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setSelectedCard(card)
                setSearchQuery(card.name)
                setSearchResults([])
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left"
            >
              {card.card_images[0] && (
                <Image
                  src={card.card_images[0].image_url_small}
                  alt={card.name}
                  width={32}
                  height={47}
                  className="rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.name}</p>
                <p className="text-xs text-muted-foreground truncate">{card.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCard && (
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border">
          {selectedCard.card_images[0] && (
            <Image
              src={selectedCard.card_images[0].image_url_small}
              alt={selectedCard.name}
              width={48}
              height={70}
              className="rounded"
            />
          )}
          <div className="flex-1">
            <p className="font-medium">{selectedCard.name}</p>
            <p className="text-sm text-muted-foreground">{selectedCard.type}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCard(null)
              setSearchQuery('')
            }}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold text-foreground flex items-center gap-3"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              <Ban className="h-8 w-8 text-destructive" />
              BANLIST / HOUSE RULES
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage banned cards and vote on proposals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-[180px] bg-input border-border">
                <SelectValue placeholder="Select yourself..." />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="banlist" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="banlist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ban className="h-4 w-4 mr-2" />
              Banned Cards ({bannedCards.length})
            </TabsTrigger>
            <TabsTrigger value="proposals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Vote className="h-4 w-4 mr-2" />
              Proposals ({proposals.length})
            </TabsTrigger>
          </TabsList>

          {/* Banned Cards Tab */}
          <TabsContent value="banlist" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-destructive hover:bg-destructive/80">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Banlist
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Add Card to Banlist</DialogTitle>
                    <DialogDescription>
                      Search for a card to add to your house banlist.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <CardSearchInput />
                    <div className="space-y-2">
                      <Label>Reason (Optional)</Label>
                      <Textarea
                        placeholder="Why is this card being banned?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                    <Button
                      onClick={handleAddToBanlist}
                      disabled={!selectedCard || submitting}
                      className="w-full bg-destructive hover:bg-destructive/80"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Ban Card
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {bannedCards.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Ban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No cards are currently banned.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add cards to create your house banlist.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bannedCards.map((card) => (
                  <Card key={card.id} className="bg-card border-border group relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFromBanlist(card)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {card.card_image ? (
                          <Image
                            src={card.card_image}
                            alt={card.card_name}
                            width={60}
                            height={88}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-[60px] h-[88px] bg-muted rounded flex items-center justify-center">
                            <Ban className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{card.card_name}</h3>
                          {card.card_type && (
                            <p className="text-xs text-muted-foreground truncate">{card.card_type}</p>
                          )}
                          {card.reason && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{card.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Banned {new Date(card.banned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/80">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Create Ban Proposal</DialogTitle>
                    <DialogDescription>
                      Propose a card to be added or removed from the banlist.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Proposal Type</Label>
                      <Select
                        value={proposalType}
                        onValueChange={(v) => setProposalType(v as 'ban' | 'unban')}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ban">Ban Card</SelectItem>
                          <SelectItem value="unban">Unban Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <CardSearchInput />
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea
                        placeholder="Why should this card be banned/unbanned?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                    <Button
                      onClick={handleCreateProposal}
                      disabled={!selectedCard || submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Vote className="h-4 w-4 mr-2" />
                      )}
                      Submit Proposal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {proposals.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending proposals.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a proposal to suggest banning or unbanning a card.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {proposals.map((proposal) => {
                  const yesVotes = proposal.votes.filter((v) => v.vote === 'yes').length
                  const noVotes = proposal.votes.filter((v) => v.vote === 'no').length
                  const totalVotes = yesVotes + noVotes
                  const myVote = proposal.votes.find((v) => v.player_id === selectedPlayer)

                  return (
                    <Card key={proposal.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={proposal.proposal_type === 'ban' ? 'destructive' : 'default'}
                              className="uppercase"
                            >
                              {proposal.proposal_type}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-3">
                          {proposal.card_image ? (
                            <Image
                              src={proposal.card_image}
                              alt={proposal.card_name}
                              width={60}
                              height={88}
                              className="rounded"
                            />
                          ) : (
                            <div className="w-[60px] h-[88px] bg-muted rounded flex items-center justify-center">
                              <Ban className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{proposal.card_name}</h3>
                            {proposal.card_type && (
                              <p className="text-xs text-muted-foreground">{proposal.card_type}</p>
                            )}
                            {proposal.reason && (
                              <p className="text-sm text-muted-foreground mt-2">{proposal.reason}</p>
                            )}
                            {proposal.proposer && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Proposed by {proposal.proposer.nickname}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Voting Section */}
                        <div className="space-y-3 pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Votes</span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-green-500">
                                <ThumbsUp className="h-4 w-4" />
                                {yesVotes}
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <ThumbsDown className="h-4 w-4" />
                                {noVotes}
                              </span>
                            </div>
                          </div>

                          {totalVotes > 0 && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${(yesVotes / totalVotes) * 100}%` }}
                              />
                            </div>
                          )}

                          {/* Vote Buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant={myVote?.vote === 'yes' ? 'default' : 'outline'}
                              size="sm"
                              className={`flex-1 ${myVote?.vote === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                              onClick={() => handleVote(proposal.id, 'yes')}
                              disabled={!selectedPlayer}
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              Yes
                            </Button>
                            <Button
                              variant={myVote?.vote === 'no' ? 'default' : 'outline'}
                              size="sm"
                              className={`flex-1 ${myVote?.vote === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                              onClick={() => handleVote(proposal.id, 'no')}
                              disabled={!selectedPlayer}
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              No
                            </Button>
                          </div>

                          {/* Approve/Reject Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10"
                              onClick={() => handleApproveProposal(proposal)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleRejectProposal(proposal)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
