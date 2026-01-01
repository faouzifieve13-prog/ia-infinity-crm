import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Filter, Download, Loader2, Building2, User, DollarSign, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { PipelineMetrics } from '@/components/PipelineMetrics';
import { EmailTemplateDialog } from '@/components/pipeline/EmailTemplateDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Deal, DealStage, Account } from '@/lib/types';

const prospectFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  companyName: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  amount: z.string().optional(),
  probability: z.string().optional(),
  nextAction: z.string().optional(),
  missionTypes: z.array(z.string()).default([]),
});

type ProspectFormValues = z.infer<typeof prospectFormSchema>;

const lostReasonFormSchema = z.object({
  lostReason: z.string().min(1, 'Veuillez sélectionner une raison'),
  lostReasonDetails: z.string().optional(),
});

type LostReasonFormValues = z.infer<typeof lostReasonFormSchema>;

interface DealWithRelations extends Deal {
  owner: { id: string; name: string; email: string; avatar?: string | null };
}

export default function Pipeline() {
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lostReasonDialogOpen, setLostReasonDialogOpen] = useState(false);
  const [pendingDealMove, setPendingDealMove] = useState<{ dealId: string; newStage: DealStage } | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedDealForEmail, setSelectedDealForEmail] = useState<{
    id: string;
    accountName: string;
    contactName: string;
    contactEmail?: string;
    amount: string;
    stage: string;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      name: '',
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      amount: '',
      probability: '10',
      nextAction: '',
      missionTypes: [],
    },
  });

  const lostReasonForm = useForm<LostReasonFormValues>({
    resolver: zodResolver(lostReasonFormSchema),
    defaultValues: {
      lostReason: '',
      lostReasonDetails: '',
    },
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: ProspectFormValues) => {
      let accountId = null;
      
      const existingAccount = accounts.find(
        a => a.name.toLowerCase() === data.companyName.toLowerCase()
      );
      
      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        const newAccount = await apiRequest('POST', '/api/accounts', {
          name: data.companyName,
          contactName: data.contactName || 'Contact principal',
          contactEmail: data.contactEmail || `contact@${data.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
          plan: 'audit',
          status: 'active',
        });
        const accountData = await newAccount.json();
        accountId = accountData.id;
      }

      return apiRequest('POST', '/api/deals', {
        name: data.name,
        accountId,
        amount: data.amount || '0',
        probability: data.probability ? parseInt(data.probability) : 10,
        stage: 'prospect',
        missionTypes: data.missionTypes || [],
        nextAction: data.nextAction || null,
        contactPhone: data.contactPhone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Prospect créé',
        description: 'Le prospect a été ajouté au pipeline.',
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le prospect.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProspectFormValues) => {
    createProspectMutation.mutate(data);
  };

  const updateDealStageMutation = useMutation({
    mutationFn: async ({
      dealId,
      stage,
      position,
      lostReason,
      lostReasonDetails
    }: {
      dealId: string;
      stage: DealStage;
      position: number;
      lostReason?: string;
      lostReasonDetails?: string;
    }) => {
      const response = await apiRequest('PATCH', `/api/deals/${dealId}/stage`, {
        stage,
        position,
        ...(lostReason && { lostReason }),
        ...(lostReasonDetails && { lostReasonDetails }),
      });
      return response.json();
    },
    onSuccess: (data: { projectId?: string; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      if (data.projectId && data.message) {
        toast({
          title: 'Deal gagné !',
          description: data.message,
        });
      } else {
        toast({
          title: 'Deal mis à jour',
          description: 'Le statut du deal a été modifié avec succès.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le deal.',
        variant: 'destructive',
      });
    },
  });

  const dealsWithRelations = deals.map(deal => ({
    id: deal.id,
    accountName: deal.accountName || 'Unknown Account',
    contactName: deal.contactName || 'Unknown Contact',
    contactEmail: deal.contactEmail || null,
    amount: deal.amount,
    probability: deal.probability,
    stage: deal.stage,
    nextAction: deal.nextAction,
    daysInStage: deal.daysInStage,
    missionTypes: deal.missionTypes,
    prospectStatus: deal.prospectStatus,
    followUpDate: deal.followUpDate,
    followUpNotes: deal.followUpNotes,
    score: deal.score || 'C',
    owner: {
      id: deal.ownerId || '',
      name: deal.ownerName || 'Unknown',
      email: deal.ownerEmail || '',
      avatar: null
    },
  }));

  const filteredDeals = dealsWithRelations
    .filter((deal) => ownerFilter === 'all' || deal.owner.id === ownerFilter)
    .filter((deal) => scoreFilter === 'all' || deal.score === scoreFilter);

  const handleDealMove = (dealId: string, newStage: DealStage) => {
    console.log(`Deal ${dealId} moved to stage ${newStage}`);

    // If moving to "lost" stage, show the lost reason dialog
    if (newStage === 'lost') {
      setPendingDealMove({ dealId, newStage });
      setLostReasonDialogOpen(true);
      lostReasonForm.reset(); // Reset form when opening
    } else {
      // For other stages, proceed normally
      updateDealStageMutation.mutate({ dealId, stage: newStage, position: 0 });
    }
  };

  const onLostReasonSubmit = (data: LostReasonFormValues) => {
    if (!pendingDealMove) return;

    updateDealStageMutation.mutate({
      dealId: pendingDealMove.dealId,
      stage: pendingDealMove.newStage,
      position: 0,
      lostReason: data.lostReason,
      lostReasonDetails: data.lostReasonDetails,
    });

    // Close dialog and clear pending move
    setLostReasonDialogOpen(false);
    setPendingDealMove(null);
    lostReasonForm.reset();
  };

  const handleEmailClick = (deal: { id: string; accountName: string; contactName: string; contactEmail?: string | null; amount: string; stage: DealStage }) => {
    setSelectedDealForEmail({
      id: deal.id,
      accountName: deal.accountName,
      contactName: deal.contactName,
      contactEmail: deal.contactEmail || undefined,
      amount: deal.amount,
      stage: deal.stage,
    });
    setEmailDialogOpen(true);
  };

  if (dealsLoading) {
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Pipeline</h1>
          <p className="text-muted-foreground">Manage your sales pipeline and deals</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-32" data-testid="select-score-filter">
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous scores</SelectItem>
              <SelectItem value="A">Score A</SelectItem>
              <SelectItem value="B">Score B</SelectItem>
              <SelectItem value="C">Score C</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40" data-testid="select-owner-filter">
              <SelectValue placeholder="Filter by owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" data-testid="button-filter">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" data-testid="button-export">
            <Download className="h-4 w-4" />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-deal">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ajouter un prospect</DialogTitle>
                <DialogDescription>
                  Créez une nouvelle opportunité dans le pipeline
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'opportunité *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Audit IA pour entreprise X" {...field} data-testid="input-prospect-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entreprise *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Nom de l'entreprise" {...field} data-testid="input-prospect-company" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="Nom du contact" {...field} data-testid="input-prospect-contact" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemple.com" {...field} data-testid="input-prospect-email" />
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
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" type="tel" placeholder="+33 6 12 34 56 78" {...field} data-testid="input-prospect-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                              <Input className="pl-9" type="number" placeholder="5000" {...field} data-testid="input-prospect-amount" />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger data-testid="select-prospect-probability">
                                <SelectValue placeholder="Probabilité" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                                <SelectItem value="50">50%</SelectItem>
                                <SelectItem value="75">75%</SelectItem>
                                <SelectItem value="90">90%</SelectItem>
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
                    name="nextAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prochaine action</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Appeler pour présenter l'offre d'audit" {...field} data-testid="input-prospect-action" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="missionTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de mission</FormLabel>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mission-audit"
                              checked={field.value?.includes('audit')}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, 'audit']);
                                } else {
                                  field.onChange(current.filter((v: string) => v !== 'audit'));
                                }
                              }}
                              data-testid="checkbox-mission-audit"
                            />
                            <Label htmlFor="mission-audit" className="text-sm font-normal flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-violet-500" />
                              Audit
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mission-automatisation"
                              checked={field.value?.includes('automatisation')}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, 'automatisation']);
                                } else {
                                  field.onChange(current.filter((v: string) => v !== 'automatisation'));
                                }
                              }}
                              data-testid="checkbox-mission-auto"
                            />
                            <Label htmlFor="mission-automatisation" className="text-sm font-normal flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Automatisation
                            </Label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <Video className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Réserver une visio</p>
                      <p className="text-xs text-muted-foreground">Planifier un rendez-vous découverte</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/calendar', '_blank')}
                      data-testid="button-book-visio"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Réserver
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={createProspectMutation.isPending} data-testid="button-submit-prospect">
                      {createProspectMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Créer le prospect
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <PipelineMetrics />

      <PipelineBoard deals={filteredDeals} onDealMove={handleDealMove} onEmailClick={handleEmailClick} />

      {/* Lost Reason Dialog */}
      <Dialog open={lostReasonDialogOpen} onOpenChange={(open) => {
        setLostReasonDialogOpen(open);
        if (!open) {
          setPendingDealMove(null);
          lostReasonForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Raison de perte</DialogTitle>
            <DialogDescription>
              Veuillez indiquer pourquoi ce deal a été perdu. Cette information nous aidera à améliorer notre processus de vente.
            </DialogDescription>
          </DialogHeader>
          <Form {...lostReasonForm}>
            <form onSubmit={lostReasonForm.handleSubmit(onLostReasonSubmit)} className="space-y-4">
              <FormField
                control={lostReasonForm.control}
                name="lostReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raison de perte *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lost-reason">
                          <SelectValue placeholder="Sélectionnez une raison" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Prix trop élevé">Prix trop élevé</SelectItem>
                        <SelectItem value="Délais trop longs">Délais trop longs</SelectItem>
                        <SelectItem value="Pas de budget">Pas de budget</SelectItem>
                        <SelectItem value="Concurrent choisi">Concurrent choisi</SelectItem>
                        <SelectItem value="Projet annulé">Projet annulé</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={lostReasonForm.control}
                name="lostReasonDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Détails additionnels</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajoutez des détails supplémentaires sur la raison de perte..."
                        className="min-h-[100px]"
                        data-testid="textarea-lost-reason-details"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLostReasonDialogOpen(false);
                    setPendingDealMove(null);
                    lostReasonForm.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={updateDealStageMutation.isPending}
                  data-testid="button-submit-lost-reason"
                >
                  {updateDealStageMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Confirmer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Template Dialog */}
      {selectedDealForEmail && (
        <EmailTemplateDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          deal={selectedDealForEmail}
        />
      )}
    </div>
  );
}
