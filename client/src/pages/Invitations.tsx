import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Copy, UserPlus, Clock, CheckCircle, XCircle, RotateCcw, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import type { Invitation, Account, Vendor, UserRole, Space } from '@shared/schema';

type InvitationWithLink = Invitation & { inviteLink?: string; token?: string };

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  sales: 'Sales',
  delivery: 'Delivery',
  finance: 'Finance',
  client_admin: 'Client Admin',
  client_member: 'Client Member',
  vendor: 'Vendor',
};

const spaceLabels: Record<Space, string> = {
  internal: 'Internal',
  client: 'Client Portal',
  vendor: 'Vendor Portal',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'default' },
  expired: { label: 'Expired', variant: 'outline' },
  revoked: { label: 'Revoked', variant: 'destructive' },
};

export default function Invitations() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'client_member' as UserRole,
    space: 'client' as Space,
    expiresInMinutes: 30,
    accountId: '',
    vendorId: '',
  });

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/invitations', {
        email: data.email,
        role: data.role,
        space: data.space,
        expiresInMinutes: data.expiresInMinutes,
        accountId: data.accountId || undefined,
        vendorId: data.vendorId || undefined,
      });
      return response.json() as Promise<InvitationWithLink>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setNewInviteLink(data.inviteLink || null);
      toast({
        title: 'Invitation created',
        description: `An invitation has been created for ${formData.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/invitations/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      toast({
        title: 'Invitation revoked',
        description: 'The invitation has been revoked and can no longer be used.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      toast({
        title: 'Invitation deleted',
        description: 'The invitation has been permanently deleted.',
      });
    },
  });

  const handleCreateInvite = () => {
    createMutation.mutate(formData);
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied',
      description: 'The invitation link has been copied to your clipboard.',
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewInviteLink(null);
    setFormData({
      email: '',
      role: 'client_member',
      space: 'client',
      expiresInMinutes: 30,
      accountId: '',
      vendorId: '',
    });
  };

  const getRoleForSpace = (space: Space): UserRole[] => {
    switch (space) {
      case 'internal':
        return ['admin', 'sales', 'delivery', 'finance'];
      case 'client':
        return ['client_admin', 'client_member'];
      case 'vendor':
        return ['vendor'];
      default:
        return [];
    }
  };

  const handleSpaceChange = (space: Space) => {
    const roles = getRoleForSpace(space);
    setFormData({
      ...formData,
      space,
      role: roles[0] || 'client_member',
      accountId: space === 'client' ? formData.accountId : '',
      vendorId: space === 'vendor' ? formData.vendorId : '',
    });
  };

  const pendingCount = invitations?.filter(i => i.status === 'pending').length || 0;
  const acceptedCount = invitations?.filter(i => i.status === 'accepted').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Invitations</h1>
          <p className="text-muted-foreground">Send magic link invitations to clients, vendors, and team members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invitation">
              <UserPlus className="mr-2 h-4 w-4" />
              New Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {newInviteLink ? (
              <>
                <DialogHeader>
                  <DialogTitle>Invitation Created</DialogTitle>
                  <DialogDescription>
                    Share this link with {formData.email} to grant them access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <code className="text-xs break-all flex-1">{newInviteLink}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyLink(newInviteLink)}
                      data-testid="button-copy-link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This link will expire in {formData.expiresInMinutes} minutes and can only be used once.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseDialog} data-testid="button-done">Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create Invitation</DialogTitle>
                  <DialogDescription>
                    Generate a magic link to invite someone to the platform.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="space">Portal Access</Label>
                    <Select
                      value={formData.space}
                      onValueChange={(v) => handleSpaceChange(v as Space)}
                    >
                      <SelectTrigger id="space" data-testid="select-space">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal (Team)</SelectItem>
                        <SelectItem value="client">Client Portal</SelectItem>
                        <SelectItem value="vendor">Vendor Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                    >
                      <SelectTrigger id="role" data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getRoleForSpace(formData.space).map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.space === 'client' && accounts && accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="account">Link to Account (Optional)</Label>
                      <Select
                        value={formData.accountId || 'none'}
                        onValueChange={(v) => setFormData({ ...formData, accountId: v === 'none' ? '' : v })}
                      >
                        <SelectTrigger id="account" data-testid="select-account">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.space === 'vendor' && vendors && vendors.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Link to Vendor (Optional)</Label>
                      <Select
                        value={formData.vendorId || 'none'}
                        onValueChange={(v) => setFormData({ ...formData, vendorId: v === 'none' ? '' : v })}
                      >
                        <SelectTrigger id="vendor" data-testid="select-vendor">
                          <SelectValue placeholder="Select vendor..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No vendor</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="expires">Link Expiration</Label>
                    <Select
                      value={formData.expiresInMinutes.toString()}
                      onValueChange={(v) => setFormData({ ...formData, expiresInMinutes: parseInt(v) })}
                    >
                      <SelectTrigger id="expires" data-testid="select-expires">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                        <SelectItem value="10080">7 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button
                    onClick={handleCreateInvite}
                    disabled={!formData.email || createMutation.isPending}
                    data-testid="button-send-invitation"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Invitation'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invitations">
              {isLoading ? <Skeleton className="h-8 w-16" /> : invitations?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-invitations">
              {isLoading ? <Skeleton className="h-8 w-16" /> : pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-accepted-invitations">
              {isLoading ? <Skeleton className="h-8 w-16" /> : acceptedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Expired/Revoked</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inactive-invitations">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (invitations?.length || 0) - pendingCount - acceptedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
          <CardDescription>All invitations sent from this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invitations && invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[invitation.role as UserRole]}</Badge>
                    </TableCell>
                    <TableCell>{spaceLabels[invitation.space as Space]}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[invitation.status]?.variant || 'default'}>
                        {statusConfig[invitation.status]?.label || invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invitation.expiresAt) > new Date() ? (
                        formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })
                      ) : (
                        'Expired'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {invitation.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-revoke-${invitation.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will invalidate the invitation link. The recipient will no longer be able to accept it.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeMutation.mutate(invitation.id)}
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-${invitation.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this invitation record. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No invitations sent yet</p>
              <p className="text-sm">Create your first invitation to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
