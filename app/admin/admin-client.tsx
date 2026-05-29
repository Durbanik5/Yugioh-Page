'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Users, UserPlus, Mail, Copy, Check, Trash2, Ban, Crown, Settings, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Profile } from '@/hooks/use-user'

interface AdminClientProps {
  profile: Profile
}

export function AdminClient({ profile }: AdminClientProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('user')
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const supabase = createClient()

  const isOwner = profile.role === 'owner'

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      toast.error('Failed to fetch users')
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const createInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    setGenerating(true)
    const inviteCode = generateInviteCode()

    const { error } = await supabase
      .from('profiles')
      .insert({
        email: inviteEmail,
        role: inviteRole,
        invite_code: inviteCode,
      })

    if (error) {
      if (error.code === '23505') {
        toast.error('A user with this email already exists')
      } else {
        toast.error('Failed to create invite')
      }
    } else {
      toast.success('Invite created successfully')
      setInviteEmail('')
      fetchUsers()
    }
    setGenerating(false)
  }

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/auth/claim?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    toast.success('Invite link copied to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update role')
    } else {
      toast.success('Role updated successfully')
      fetchUsers()
    }
  }

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentBanned })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update ban status')
    } else {
      toast.success(currentBanned ? 'User unbanned' : 'User banned')
      fetchUsers()
    }
  }

  const deleteUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      toast.error('Failed to delete user')
    } else {
      toast.success('User deleted')
      fetchUsers()
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'moderator': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    }
  }

  const pendingInvites = users.filter(u => !u.claimed_at && u.invite_code)
  const activeUsers = users.filter(u => u.claimed_at || u.auth_user_id)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users, invites, and site settings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{activeUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{pendingInvites.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin' || u.role === 'owner').length}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Ban className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.is_banned).length}</p>
                  <p className="text-sm text-muted-foreground">Banned Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all registered users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Stats</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : activeUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No active users yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">
                                    {user.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{user.display_name || user.username || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="text-green-400">{user.wins}W</span>
                                {' / '}
                                <span className="text-red-400">{user.losses}L</span>
                                <p className="text-xs text-muted-foreground">{user.elo_rating} ELO</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.is_banned ? (
                                <Badge variant="destructive">Banned</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/20 text-green-400">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isOwner && user.role !== 'owner' && (
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) => updateUserRole(user.id, value)}
                                  >
                                    <SelectTrigger className="w-28 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="moderator">Moderator</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                {user.id !== profile.id && user.role !== 'owner' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleBan(user.id, user.is_banned)}
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                    {isOwner && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive" size="sm">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Delete User</DialogTitle>
                                            <DialogDescription>
                                              Are you sure you want to delete {user.display_name || user.email}? This action cannot be undone.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <DialogFooter>
                                            <Button variant="destructive" onClick={() => deleteUser(user.id)}>
                                              Delete User
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Create Invite
                  </CardTitle>
                  <CardDescription>
                    Send an invite link to a new user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="duelist@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Initial Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={createInvite}
                    disabled={generating || !inviteEmail}
                  >
                    {generating ? 'Creating...' : 'Create Invite'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Invites</CardTitle>
                  <CardDescription>
                    Invites that haven&apos;t been claimed yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {pendingInvites.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No pending invites
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendingInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div>
                              <p className="font-medium text-sm">{invite.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getRoleBadgeColor(invite.role)}>
                                  {invite.role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Code: {invite.invite_code}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyInviteLink(invite.invite_code!)}
                              >
                                {copiedCode === invite.invite_code ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(invite.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isOwner && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Site Settings
                  </CardTitle>
                  <CardDescription>
                    Configure global site settings (Owner only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      Site settings coming soon. This will include things like registration mode, 
                      maintenance mode, and other global configurations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
