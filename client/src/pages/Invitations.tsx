import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Copy, UserPlus, Clock, CheckCircle, XCircle, RotateCcw, Trash2, Link2, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Invitation, Account, Vendor, Contact, UserRole, Space } from '@shared/schema';

type InvitationWithLink = Invitation & { inviteLink?: string; token?: string; emailSent?: boolean };

type GmailStatus = { connected: boolean; email?: string; error?: string };

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  sales: 'Commercial',
  delivery: 'Livraison',
  finance: 'Finance',
  client_admin: 'Admin Client',
  client_member: 'Membre Client',
  vendor: 'Sous-traitant',
};

const spaceLabels: Record<Space, string> = {
  internal: 'Interne',
  client: 'Portail Client',
  vendor: 'Portail Sous-traitant',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'default' },
  expired: { label: 'Expired', variant: 'outline' },
  revoked: { label: 'Revoked', variant: 'destructive' },
};

const formatExpiration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
  if (minutes < 43200) return `${Math.floor(minutes / 10080)} week${minutes >= 20160 ? 's' : ''}`;
  if (minutes < 525600) return `${Math.floor(minutes / 43200)} month${minutes >= 86400 ? 's' : ''}`;
  return `${Math.floor(minutes / 525600)} year${minutes >= 1051200 ? 's' : ''}`;
};

export default function Invitations() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [lastEmailSent, setLastEmailSent] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'client_member' as UserRole,
    space: 'client' as Space,
    expiresInMinutes: 259200, // 6 months by default
    accountId: '',
    vendorId: '',
    vendorContactId: '', // For contacts of type 'vendor' without a vendor record
    vendorName: '',
    sendEmail: true,
  });

  // WORKAROUND: Use ref to store the last selected vendor value
  // This bypasses any React state timing issues
  const selectedVendorRef = useRef<{ vendorId: string; vendorContactId: string; vendorName: string }>({
    vendorId: '',
    vendorContactId: '',
    vendorName: '',
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

  // Also load contacts of type 'vendor' that might not have a vendor record yet
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Filter contacts that are vendors and don't have a linked vendor record
  const vendorContacts = contacts?.filter(c => c.contactType === 'vendor') || [];

  const { data: gmailStatus } = useQuery<GmailStatus>({
    queryKey: ['/api/gmail/status'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // IMPORTANT: Send vendorContactId separately - the backend will create a vendor from it
      // DO NOT map vendorContactId to vendorId - they are different concepts:
      // - vendorId = existing vendor in vendors table
      // - vendorContactId = contact of type 'vendor' that needs a vendor record created

      const payload = {
        email: data.email,
        role: data.role,
        space: data.space,
        expiresInMinutes: data.expiresInMinutes,
        accountId: data.accountId || undefined,
        // Only send vendorId if it's a real vendor from the vendors table
        vendorId: data.vendorId || undefined,
        // Send vendorContactId if a contact was selected - backend will create vendor from it
        vendorContactId: data.vendorContactId || undefined,
        vendorName: data.vendorName || undefined,
        sendEmail: data.sendEmail,
      };

      // Debug: Log the exact payload being sent
      console.log("[Invitations] === SENDING INVITATION ===");
      console.log("[Invitations] data.vendorId:", data.vendorId || "(empty)");
      console.log("[Invitations] data.vendorContactId:", data.vendorContactId || "(empty)");
      console.log("[Invitations] Full payload:", JSON.stringify(payload, null, 2));

      const response = await apiRequest('POST', '/api/invitations', payload);
      return response.json() as Promise<InvitationWithLink>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setNewInviteLink(data.inviteLink || null);
      setLastEmailSent(data.emailSent || false);
      const emailInfo = data.emailSent 
        ? ' Email sent successfully!' 
        : formData.sendEmail && !data.emailSent 
          ? ' Email could not be sent.' 
          : '';
      toast({
        title: 'Invitation created',
        description: `An invitation has been created for ${formData.email}.${emailInfo}`,
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

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/invitations/${id}/resend`);
      return response.json() as Promise<InvitationWithLink>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      const emailInfo = data.emailSent ? ' Email envoyé avec succès.' : '';
      toast({
        title: 'Invitation renvoyée',
        description: `Un nouveau lien a été créé pour ${data.email}.${emailInfo}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de renvoyer l'invitation.",
        variant: 'destructive',
      });
    },
  });

  const handleCreateInvite = () => {
    // Debug: Log the exact state at the moment of submission
    console.log("[Invitations] handleCreateInvite called");
    console.log("[Invitations] Current formData state:", JSON.stringify(formData, null, 2));
    console.log("[Invitations] Ref values:", JSON.stringify(selectedVendorRef.current, null, 2));

    // CRITICAL FIX: Use ref values as the primary source for vendor data
    // This bypasses any React state update timing issues
    const vendorIdToUse = formData.vendorId || selectedVendorRef.current.vendorId;
    const vendorContactIdToUse = formData.vendorContactId || selectedVendorRef.current.vendorContactId;
    const vendorNameToUse = formData.vendorName || selectedVendorRef.current.vendorName;

    console.log("[Invitations] Final vendor values:");
    console.log("  - vendorId:", vendorIdToUse);
    console.log("  - vendorContactId:", vendorContactIdToUse);
    console.log("  - vendorName:", vendorNameToUse);

    // Force the values to be included in the payload
    const submissionData = {
      ...formData,
      vendorId: vendorIdToUse,
      vendorContactId: vendorContactIdToUse,
      vendorName: vendorNameToUse,
    };

    console.log("[Invitations] Submitting with data:", JSON.stringify(submissionData, null, 2));
    createMutation.mutate(submissionData);
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
    setLastEmailSent(false);
    // Reset both state and ref
    selectedVendorRef.current = { vendorId: '', vendorContactId: '', vendorName: '' };
    setFormData({
      email: '',
      role: 'client_member',
      space: 'client',
      expiresInMinutes: 259200, // 6 months by default
      accountId: '',
      vendorId: '',
      vendorContactId: '',
      vendorName: '',
      sendEmail: true,
    });
  };

  const getRoleForSpace = (space: Space): UserRole[] => {
    switch (space) {
      case 'internal':
        return ['admin', 'sales'];
      case 'client':
        return ['client_admin'];
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
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            // Reset form when dialog closes
            handleCloseDialog();
          } else {
            setIsDialogOpen(true);
          }
        }}>
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
                    {lastEmailSent 
                      ? `An email has been sent to ${formData.email}.`
                      : `Share this link with ${formData.email} to grant them access.`
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {lastEmailSent && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span className="text-sm">Email sent successfully to {formData.email}</span>
                    </div>
                  )}
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
                    This link will expire in {formatExpiration(formData.expiresInMinutes)} and can only be used once.
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
                        <SelectItem value="internal">Interne (Équipe)</SelectItem>
                        <SelectItem value="client">Portail Client</SelectItem>
                        <SelectItem value="vendor">Portail Sous-traitant</SelectItem>
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
                  {formData.space === 'vendor' && (
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Sous-traitant existant</Label>
                      {((vendors && vendors.length > 0) || vendorContacts.length > 0) ? (
                        <>
                          <Select
                            value={formData.vendorId ? `vendor:${formData.vendorId}` : formData.vendorContactId ? `contact:${formData.vendorContactId}` : 'new'}
                            onValueChange={(v) => {
                              console.log("[Invitations] Vendor Select onValueChange triggered with value:", v);
                              if (v === 'new') {
                                console.log("[Invitations] Setting to 'new' vendor - clearing IDs");
                                // Update ref IMMEDIATELY (sync)
                                selectedVendorRef.current = { vendorId: '', vendorContactId: '', vendorName: '' };
                                setFormData(prev => ({
                                  ...prev,
                                  vendorId: '',
                                  vendorContactId: '',
                                  vendorName: '',
                                }));
                              } else if (v.startsWith('vendor:')) {
                                const vendorId = v.replace('vendor:', '');
                                const selectedVendor = vendors?.find(vendor => vendor.id === vendorId);
                                console.log("[Invitations] Selected vendor:", vendorId, "Vendor object:", selectedVendor);
                                // Update ref IMMEDIATELY (sync) - this is the critical fix
                                selectedVendorRef.current = {
                                  vendorId: vendorId,
                                  vendorContactId: '',
                                  vendorName: selectedVendor?.name || '',
                                };
                                console.log("[Invitations] Ref updated to:", selectedVendorRef.current);
                                setFormData(prev => {
                                  const newState = {
                                    ...prev,
                                    vendorId: vendorId,
                                    vendorContactId: '',
                                    vendorName: selectedVendor?.name || '',
                                    email: selectedVendor?.email && !prev.email ? selectedVendor.email : prev.email
                                  };
                                  console.log("[Invitations] New formData state will be:", newState);
                                  return newState;
                                });
                              } else if (v.startsWith('contact:')) {
                                const contactId = v.replace('contact:', '');
                                const selectedContact = vendorContacts.find(c => c.id === contactId);
                                console.log("[Invitations] Selected contact:", contactId, "Contact object:", selectedContact);

                                // CRITICAL FIX: If contact already has a vendorId, use it directly!
                                const existingVendorId = selectedContact?.vendorId || '';
                                console.log("[Invitations] Contact's existing vendorId:", existingVendorId || "(none)");

                                // Update ref IMMEDIATELY (sync)
                                selectedVendorRef.current = {
                                  // Use contact's vendorId if it exists, otherwise we'll need vendorContactId
                                  vendorId: existingVendorId,
                                  vendorContactId: existingVendorId ? '' : contactId, // Only set if no vendorId
                                  vendorName: selectedContact?.name || '',
                                };
                                console.log("[Invitations] Ref updated to:", selectedVendorRef.current);

                                setFormData(prev => {
                                  const newState = {
                                    ...prev,
                                    // Use contact's vendorId if it exists
                                    vendorId: existingVendorId,
                                    // Only set vendorContactId if contact doesn't have a vendorId yet
                                    vendorContactId: existingVendorId ? '' : contactId,
                                    vendorName: selectedContact?.name || '',
                                    email: selectedContact?.email && !prev.email ? selectedContact.email : prev.email
                                  };
                                  console.log("[Invitations] New formData state will be:", newState);
                                  return newState;
                                });
                              }
                            }}
                          >
                            <SelectTrigger id="vendor" data-testid="select-vendor">
                              <SelectValue placeholder="Sélectionner un sous-traitant..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">+ Créer un nouveau sous-traitant</SelectItem>
                              {vendors && vendors.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">Sous-traitants</div>
                                  {vendors.map((vendor) => (
                                    <SelectItem key={`vendor:${vendor.id}`} value={`vendor:${vendor.id}`}>
                                      {vendor.name} {vendor.email ? `(${vendor.email})` : ''}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {vendorContacts.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">Contacts (type sous-traitant)</div>
                                  {vendorContacts.map((contact) => (
                                    <SelectItem key={`contact:${contact.id}`} value={`contact:${contact.id}`}>
                                      {contact.name} {contact.email ? `(${contact.email})` : ''}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {formData.vendorId || formData.vendorContactId
                              ? "Le compte sera lié à ce sous-traitant existant"
                              : "Un nouveau sous-traitant sera créé automatiquement"
                            }
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                          Aucun sous-traitant existant. Un nouveau sera créé automatiquement.
                        </p>
                      )}
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
                        <SelectItem value="43200">1 month</SelectItem>
                        <SelectItem value="129600">3 months</SelectItem>
                        <SelectItem value="259200">6 months</SelectItem>
                        <SelectItem value="525600">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <Checkbox
                      id="sendEmail"
                      checked={formData.sendEmail}
                      onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked === true })}
                      disabled={!gmailStatus?.connected}
                      data-testid="checkbox-send-email"
                    />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="sendEmail" className="cursor-pointer flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send invitation by email
                      </Label>
                      {gmailStatus?.connected ? (
                        <span className="text-xs text-muted-foreground">
                          Sending from {gmailStatus.email}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Gmail not connected
                        </span>
                      )}
                    </div>
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
                        {invitation.status !== 'accepted' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Renvoyer l'invitation"
                            onClick={() => resendMutation.mutate(invitation.id)}
                            disabled={resendMutation.isPending}
                            data-testid={`button-resend-${invitation.id}`}
                          >
                            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
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
