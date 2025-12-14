import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  FileText,
  Video,
  Save,
  Loader2,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Deal, Account, Document } from '@/lib/types';

const stageConfig = {
  prospect: { label: 'Prospect', color: 'bg-slate-500' },
  meeting: { label: 'RDV', color: 'bg-blue-500' },
  proposal: { label: 'Proposition', color: 'bg-purple-500' },
  audit: { label: 'Audit', color: 'bg-amber-500' },
  negotiation: { label: 'Négociation', color: 'bg-orange-500' },
  won: { label: 'Gagné', color: 'bg-emerald-500' },
  lost: { label: 'Perdu', color: 'bg-red-500' },
};

const dealFormSchema = z.object({
  notes: z.string().optional(),
  loomVideoUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  nextAction: z.string().optional(),
  probability: z.string().optional(),
  amount: z.string().optional(),
  contactPhone: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Non définie';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Non définie';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function DealDetail() {
  const [, params] = useRoute('/deals/:id');
  const [, navigate] = useLocation();
  const dealId = params?.id;
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      notes: '',
      loomVideoUrl: '',
      nextAction: '',
      probability: '10',
      amount: '0',
      contactPhone: '',
    },
  });

  // Update form when deal loads
  if (deal && !form.formState.isDirty) {
    const currentValues = form.getValues();
    if (currentValues.notes !== (deal.notes || '') || 
        currentValues.loomVideoUrl !== (deal.loomVideoUrl || '') ||
        currentValues.nextAction !== (deal.nextAction || '') ||
        currentValues.probability !== String(deal.probability) ||
        currentValues.amount !== (deal.amount || '0') ||
        currentValues.contactPhone !== (deal.contactPhone || '')) {
      form.reset({
        notes: deal.notes || '',
        loomVideoUrl: deal.loomVideoUrl || '',
        nextAction: deal.nextAction || '',
        probability: String(deal.probability),
        amount: deal.amount || '0',
        contactPhone: deal.contactPhone || '',
      });
    }
  }

  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const payload: Record<string, unknown> = {
        notes: data.notes || null,
        loomVideoUrl: data.loomVideoUrl || null,
        nextAction: data.nextAction || null,
        contactPhone: data.contactPhone || null,
        // Always include numeric fields with safe defaults
        probability: data.probability ? parseInt(data.probability, 10) : deal?.probability ?? 10,
        amount: data.amount || deal?.amount || '0',
      };
      return apiRequest('PATCH', `/api/deals/${dealId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Modifications enregistrées',
        description: 'Le prospect a été mis à jour avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le prospect.',
        variant: 'destructive',
      });
    },
  });

  const convertToClientMutation = useMutation({
    mutationFn: async () => {
      // First update the deal stage to 'won'
      await apiRequest('PATCH', `/api/deals/${dealId}/stage`, { 
        stage: 'won',
        position: -1  // Use -1 to indicate "add to end of won column"
      });
      // The account is already linked to the deal, just need to ensure it's active
      if (deal?.accountId) {
        await apiRequest('PATCH', `/api/accounts/${deal.accountId}`, {
          status: 'active',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setConvertDialogOpen(false);
      toast({
        title: 'Prospect converti en client',
        description: 'L\'opportunité a été marquée comme gagnée et le compte est maintenant actif.',
      });
      // Stay on deal page to show updated status
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de convertir le prospect.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: DealFormValues) => {
    updateDealMutation.mutate(data);
  };

  if (dealLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Prospect non trouvé</p>
        <Link href="/pipeline">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au pipeline
          </Button>
        </Link>
      </div>
    );
  }

  const account = accounts.find(a => a.id === deal.accountId);
  const dealDocuments = allDocuments.filter(d => d.dealId === dealId);
  const stage = stageConfig[deal.stage];
  const amountNum = parseFloat(deal.amount || '0');
  const isWonOrLost = deal.stage === 'won' || deal.stage === 'lost';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pipeline">
          <Button variant="ghost" size="icon" data-testid="button-back-pipeline">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold" data-testid="text-deal-title">
              {deal.name || account?.name || 'Opportunité'}
            </h1>
            <Badge className={`${stage.color} text-white`}>{stage.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {account?.name || 'Aucun compte associé'}
          </p>
        </div>
        {!isWonOrLost && (
          <Button 
            onClick={() => setConvertDialogOpen(true)}
            data-testid="button-convert-client"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Convertir en client
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="text-2xl font-bold" data-testid="text-deal-amount">
                  {amountNum.toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Probabilité</p>
                <p className="text-2xl font-bold" data-testid="text-deal-probability">
                  {deal.probability}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jours dans l'étape</p>
                <p className="text-2xl font-bold" data-testid="text-deal-days">
                  {deal.daysInStage}j
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold" data-testid="text-deal-docs">
                  {dealDocuments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations du prospect</CardTitle>
              <CardDescription>Modifier les détails et ajouter des notes</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant estimé (€)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                className="pl-9" 
                                type="number" 
                                placeholder="5000" 
                                {...field} 
                                data-testid="input-deal-amount" 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="probability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probabilité (%)</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger data-testid="select-deal-probability">
                                <SelectValue placeholder="Probabilité" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                                <SelectItem value="50">50%</SelectItem>
                                <SelectItem value="75">75%</SelectItem>
                                <SelectItem value="90">90%</SelectItem>
                                <SelectItem value="100">100%</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone du contact</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              className="pl-9" 
                              type="tel" 
                              placeholder="+33 6 12 34 56 78" 
                              {...field} 
                              data-testid="input-deal-phone" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prochaine action</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ex: Relancer par email la semaine prochaine"
                            {...field} 
                            data-testid="input-deal-next-action"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compte rendu / Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ajoutez vos notes de réunion, observations, points importants..."
                            className="min-h-[150px]"
                            {...field} 
                            data-testid="input-deal-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loomVideoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien vidéo Loom</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              className="pl-9" 
                              type="url" 
                              placeholder="https://www.loom.com/share/..." 
                              {...field} 
                              data-testid="input-deal-loom"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {deal.loomVideoUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                      <Video className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Vidéo Loom disponible</p>
                        <p className="text-xs text-muted-foreground truncate">{deal.loomVideoUrl}</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(deal.loomVideoUrl!, '_blank')}
                        data-testid="button-view-loom"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateDealMutation.isPending}
                      data-testid="button-save-deal"
                    >
                      {updateDealMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Compte associé
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold" data-testid="text-account-name">{account.name}</p>
                    <Badge variant="outline" className="mt-1">{account.plan}</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{account.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{account.contactEmail}</span>
                    </div>
                    {deal.contactPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{deal.contactPhone}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/accounts`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Voir le compte
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun compte associé</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({dealDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealDocuments.length > 0 ? (
                <div className="space-y-2">
                  {dealDocuments.map(doc => (
                    <div 
                      key={doc.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      data-testid={`document-item-${doc.id}`}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      {doc.url && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun document</p>
              )}
              <Link href="/documents">
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Gérer les documents
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{formatDate(deal.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modifié le</span>
                  <span>{formatDate(deal.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir convertir ce prospect en client ? 
              L'opportunité sera marquée comme gagnée et le compte sera activé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-semibold">{deal.name || account?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {amountNum.toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => convertToClientMutation.mutate()}
              disabled={convertToClientMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertToClientMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmer la conversion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
