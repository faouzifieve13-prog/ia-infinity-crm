import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, FileSignature, Search, Filter, Loader2, Eye, Download, Send, Check, X, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Contract, ContractType, ContractStatus, Deal, Account, Vendor } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignaturePad, SignatureDisplay } from '@/components/SignaturePad';

const contractFormSchema = z.object({
  type: z.enum(['audit', 'prestation', 'formation', 'suivi', 'sous_traitance']),
  clientName: z.string().min(1, 'Nom du client requis'),
  clientEmail: z.string().email('Email invalide'),
  clientCompany: z.string().optional(),
  clientAddress: z.string().optional(),
  clientSiret: z.string().optional(),
  amount: z.string().optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  dealId: z.string().optional(),
  accountId: z.string().optional(),
  vendorId: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

const typeLabels: Record<ContractType, string> = {
  audit: "Contrat d'Audit",
  prestation: 'Contrat de Prestation',
  formation: 'Contrat de Formation',
  suivi: 'Contrat de Suivi',
  sous_traitance: 'Contrat de Sous-Traitance',
};

const typeColors: Record<ContractType, string> = {
  audit: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  prestation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  formation: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  suivi: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  sous_traitance: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

const statusLabels: Record<ContractStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
  active: 'Actif',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

function ContractCard({ contract }: { contract: Contract }) {
  const { toast } = useToast();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: ContractStatus }) => {
      return apiRequest('PATCH', `/api/contracts/${contract.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Statut mis à jour' });
    },
  });

  const sendContractMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/contracts/${contract.id}/send`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrat envoyé', description: `Email envoyé à ${contract.clientEmail}` });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message || "Échec de l'envoi du contrat", variant: 'destructive' });
    },
  });

  const signContractMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      return apiRequest('PATCH', `/api/contracts/${contract.id}`, {
        clientSignatureData: signatureData,
        signedByClient: contract.clientName,
        signedAt: new Date().toISOString(),
        status: 'signed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrat signé avec succès' });
      setIsSignatureOpen(false);
    },
    onError: () => {
      toast({ title: 'Erreur lors de la signature', variant: 'destructive' });
    },
  });

  return (
    <>
      <Card className="hover-elevate cursor-pointer" onClick={() => setIsViewOpen(true)} data-testid={`card-contract-${contract.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{contract.title}</CardTitle>
              <CardDescription className="truncate">{contract.contractNumber}</CardDescription>
            </div>
            <Badge className={typeColors[contract.type]}>{typeLabels[contract.type]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{contract.clientCompany || contract.clientName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{contract.clientEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge className={statusColors[contract.status]}>{statusLabels[contract.status]}</Badge>
            <span className="font-semibold text-lg">
              {Number(contract.amount).toLocaleString('fr-FR')} {contract.currency}
            </span>
          </div>
          {contract.createdAt && (
            <p className="text-xs text-muted-foreground">
              Créé le {format(new Date(contract.createdAt), 'dd MMMM yyyy', { locale: fr })}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              {contract.title}
            </DialogTitle>
            <DialogDescription>{contract.contractNumber}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-2">
              <Badge className={typeColors[contract.type]}>{typeLabels[contract.type]}</Badge>
              <Badge className={statusColors[contract.status]}>{statusLabels[contract.status]}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Client</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{contract.clientName}</p>
                  {contract.clientCompany && <p>{contract.clientCompany}</p>}
                  <p>{contract.clientEmail}</p>
                  {contract.clientAddress && <p>{contract.clientAddress}</p>}
                  {contract.clientSiret && <p>SIRET: {contract.clientSiret}</p>}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Montant</h4>
                <p className="text-2xl font-bold">{Number(contract.amount).toLocaleString('fr-FR')} {contract.currency}</p>
                {contract.paymentTerms && (
                  <p className="text-sm text-muted-foreground mt-1">{contract.paymentTerms}</p>
                )}
              </div>
            </div>

            {contract.scope && (
              <div>
                <h4 className="font-medium mb-2">Périmètre</h4>
                <p className="text-sm text-muted-foreground">{contract.scope}</p>
              </div>
            )}

            {contract.deliverables && contract.deliverables.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Livrables</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {contract.deliverables.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {(contract.startDate || contract.endDate) && (
              <div className="grid grid-cols-2 gap-4">
                {contract.startDate && (
                  <div>
                    <h4 className="font-medium mb-1">Date de début</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(contract.startDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                {contract.endDate && (
                  <div>
                    <h4 className="font-medium mb-1">Date de fin</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(contract.endDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {contract.clientSignatureData && (
              <div>
                <h4 className="font-medium mb-2">Signature du client</h4>
                <SignatureDisplay 
                  signatureData={contract.clientSignatureData}
                  signerName={contract.signedByClient || contract.clientName}
                  signedAt={contract.signedAt || undefined}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {contract.status === 'draft' && (
              <Button
                onClick={() => sendContractMutation.mutate()}
                disabled={sendContractMutation.isPending}
                data-testid="button-send-contract"
              >
                {sendContractMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Envoyer au client
              </Button>
            )}
            {contract.status === 'sent' && !contract.clientSignatureData && (
              <Button
                onClick={() => setIsSignatureOpen(true)}
                variant="default"
                data-testid="button-sign-contract"
              >
                <FileSignature className="mr-2 h-4 w-4" />
                Signer le contrat
              </Button>
            )}
            {contract.status === 'sent' && contract.clientSignatureData && (
              <Button
                onClick={() => updateStatusMutation.mutate({ status: 'signed' })}
                disabled={updateStatusMutation.isPending}
                variant="default"
              >
                <Check className="mr-2 h-4 w-4" />
                Valider la signature
              </Button>
            )}
            {contract.status === 'signed' && (
              <Button
                onClick={() => updateStatusMutation.mutate({ status: 'active' })}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Activer le contrat
              </Button>
            )}
            {contract.status === 'active' && (
              <Button
                onClick={() => updateStatusMutation.mutate({ status: 'completed' })}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Terminer le contrat
              </Button>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signature du contrat</DialogTitle>
            <DialogDescription>
              {contract.title} - {contract.contractNumber}
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            onSave={(signatureData) => signContractMutation.mutate(signatureData)}
            onCancel={() => setIsSignatureOpen(false)}
            title="Signez ci-dessous"
            description="Votre signature électronique sera enregistrée et associée au contrat"
            signerName={contract.clientName}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Contracts() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      type: 'audit',
      clientName: '',
      clientEmail: '',
      clientCompany: '',
      clientAddress: '',
      clientSiret: '',
      amount: '',
      description: '',
      scope: '',
      startDate: '',
      endDate: '',
      paymentTerms: '30 jours à réception de facture',
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return apiRequest('POST', '/api/contracts/generate', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrat créé avec succès' });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Erreur lors de la création du contrat', variant: 'destructive' });
    },
  });

  const filteredContracts = contracts.filter((contract) => {
    if (typeFilter !== 'all' && contract.type !== typeFilter) return false;
    if (statusFilter !== 'all' && contract.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        contract.title.toLowerCase().includes(query) ||
        contract.clientName.toLowerCase().includes(query) ||
        contract.clientCompany?.toLowerCase().includes(query) ||
        contract.contractNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    signed: contracts.filter(c => c.status === 'signed' || c.status === 'active').length,
    totalValue: contracts.filter(c => c.status !== 'cancelled').reduce((sum, c) => sum + Number(c.amount), 0),
  };

  const handleDealSelect = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      const account = accounts.find(a => a.id === deal.accountId);
      form.setValue('dealId', dealId);
      form.setValue('accountId', deal.accountId);
      if (account) {
        form.setValue('clientName', account.contactName);
        form.setValue('clientEmail', account.contactEmail);
        form.setValue('clientCompany', account.name);
      }
      form.setValue('amount', deal.amount);
    }
  };

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      form.setValue('vendorId', vendorId);
      form.setValue('clientName', vendor.name);
      form.setValue('clientEmail', vendor.email);
      form.setValue('clientCompany', vendor.company);
    }
  };

  const watchType = form.watch('type');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Contrats</h1>
          <p className="text-muted-foreground">Gérez vos contrats d'audit et de prestation</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-contract">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau contrat</DialogTitle>
              <DialogDescription>
                Remplissez les informations pour générer automatiquement un contrat
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createContractMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de contrat</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contract-type">
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="audit">Contrat d'Audit</SelectItem>
                          <SelectItem value="prestation">Contrat de Prestation</SelectItem>
                          <SelectItem value="formation">Contrat de Formation</SelectItem>
                          <SelectItem value="suivi">Contrat de Suivi</SelectItem>
                          <SelectItem value="sous_traitance">Contrat de Sous-Traitance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchType === 'sous_traitance' && vendors.length > 0 && (
                  <FormItem>
                    <FormLabel>Sélectionner un prestataire</FormLabel>
                    <Select onValueChange={handleVendorSelect}>
                      <SelectTrigger data-testid="select-vendor">
                        <SelectValue placeholder="Sélectionner un prestataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} - {vendor.company} ({Number(vendor.dailyRate).toLocaleString('fr-FR')} EUR/jour)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}

                {watchType !== 'sous_traitance' && deals.length > 0 && (
                  <FormItem>
                    <FormLabel>Lier à une opportunité (optionnel)</FormLabel>
                    <Select onValueChange={handleDealSelect}>
                      <SelectTrigger data-testid="select-deal">
                        <SelectValue placeholder="Sélectionner une opportunité" />
                      </SelectTrigger>
                      <SelectContent>
                        {deals.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.accountName || 'Compte inconnu'} - {Number(deal.amount).toLocaleString('fr-FR')} EUR
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du client</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jean Dupont" data-testid="input-client-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="client@example.com" data-testid="input-client-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entreprise</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom de l'entreprise" data-testid="input-client-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientSiret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIRET</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 456 789 00012" data-testid="input-client-siret" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Adresse complète" data-testid="input-client-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (EUR)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="5000" data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Périmètre (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description du périmètre de la prestation..." data-testid="input-scope" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditions de paiement</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="30 jours à réception de facture" data-testid="input-payment-terms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createContractMutation.isPending} data-testid="button-create-contract">
                    {createContractMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSignature className="mr-2 h-4 w-4" />
                    )}
                    Générer le contrat
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contrats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brouillons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signés / Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valeur Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString('fr-FR')} EUR</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-contracts"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="audit">Audit</SelectItem>
            <SelectItem value="prestation">Prestation</SelectItem>
            <SelectItem value="formation">Formation</SelectItem>
            <SelectItem value="suivi">Suivi</SelectItem>
            <SelectItem value="sous_traitance">Sous-Traitance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="signed">Signé</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun contrat trouvé</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Aucun contrat ne correspond à vos critères de recherche.'
                : 'Créez votre premier contrat pour commencer.'}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-contract">
              <Plus className="mr-2 h-4 w-4" />
              Créer un contrat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  );
}
