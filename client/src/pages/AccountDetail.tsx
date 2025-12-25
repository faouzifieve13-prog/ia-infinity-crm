import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Building2, 
  Mail,
  Globe,
  User,
  Loader2,
  Edit2,
  Save,
  X,
  FileText,
  Briefcase,
  Phone,
  Video,
  ExternalLink,
  CheckCircle2,
  Circle,
  StickyNote,
  RefreshCw,
  Send,
  Inbox,
  Sparkles,
  SendHorizontal,
  Plus,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Account, Deal, Project, Contact, Email, Vendor, Mission } from '@/lib/types';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).default('active'),
  vendorId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const accountFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  domain: z.string().optional(),
  plan: z.enum(['audit', 'automatisation', 'standard', 'automation']).default('audit'),
  status: z.enum(['active', 'inactive', 'churned']).default('active'),
  notes: z.string().optional(),
  loomVideoUrl: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface FollowUpStep {
  id: string;
  label: string;
  completed: boolean;
}

const DEFAULT_FOLLOW_UP_STEPS: FollowUpStep[] = [
  { id: 'premier_contact', label: 'Premier contact', completed: false },
  { id: 'decouverte_besoins', label: 'Découverte besoins', completed: false },
  { id: 'proposition_envoyee', label: 'Proposition envoyée', completed: false },
  { id: 'contrat_signe', label: 'Contrat signé', completed: false },
  { id: 'onboarding', label: 'Onboarding', completed: false },
  { id: 'suivi_regulier', label: 'Suivi régulier', completed: false },
];

const planConfig = {
  audit: { label: 'Audit', variant: 'secondary' as const },
  automatisation: { label: 'Automatisation', variant: 'default' as const },
  standard: { label: 'Standard', variant: 'secondary' as const },
  automation: { label: 'Automation', variant: 'default' as const },
};

const statusConfig = {
  active: { label: 'Actif', variant: 'default' as const, color: 'bg-emerald-500' },
  inactive: { label: 'Inactif', variant: 'secondary' as const, color: 'bg-amber-500' },
  churned: { label: 'Perdu', variant: 'destructive' as const, color: 'bg-red-500' },
};

export default function AccountDetail() {
  const [, params] = useRoute('/accounts/:id');
  const accountId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const { vendorId, ...projectData } = data;
      const project = await apiRequest('POST', '/api/projects', {
        ...projectData,
        accountId,
      });
      const projectResult = await project.json();
      
      let missionCreated = false;
      if (vendorId && projectResult?.id) {
        try {
          await apiRequest('POST', '/api/missions', {
            projectId: projectResult.id,
            vendorId,
            title: `Mission - ${projectData.name}`,
            description: projectData.description || '',
          });
          missionCreated = true;
        } catch {
          missionCreated = false;
        }
      }
      
      return { project: projectResult, vendorId, missionCreated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      setProjectDialogOpen(false);
      projectForm.reset();
      
      if (result.vendorId && !result.missionCreated) {
        toast({
          title: 'Projet créé',
          description: 'Le projet a été créé mais l\'affectation du sous-traitant a échoué. Vous pouvez l\'affecter manuellement.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Projet créé',
          description: result.vendorId ? 'Le projet a été créé et le sous-traitant affecté.' : 'Le projet a été créé avec succès.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le projet.',
        variant: 'destructive',
      });
    },
  });

  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: ['/api/accounts', accountId],
    enabled: !!accountId,
  });

  const { data: allDeals = [] } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: allVendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: accountEmails = [], isLoading: emailsLoading } = useQuery<Email[]>({
    queryKey: ['/api/emails', { accountId }],
    enabled: !!accountId,
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/gmail/sync', { accountId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails', { accountId }] });
      toast({
        title: 'Emails synchronisés',
        description: 'Les emails ont été synchronisés avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de synchroniser les emails.',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      domain: '',
      plan: 'audit',
      status: 'active',
      notes: '',
      loomVideoUrl: '',
    },
  });

  const parseFollowUpSteps = (stepsJson: string | null | undefined): FollowUpStep[] => {
    if (!stepsJson) return [...DEFAULT_FOLLOW_UP_STEPS];
    try {
      const parsed = JSON.parse(stepsJson);
      if (!Array.isArray(parsed)) return [...DEFAULT_FOLLOW_UP_STEPS];
      
      return DEFAULT_FOLLOW_UP_STEPS.map(defaultStep => {
        const savedStep = parsed.find((s: { id?: string }) => s?.id === defaultStep.id);
        if (savedStep && typeof savedStep.completed === 'boolean') {
          return { ...defaultStep, completed: savedStep.completed };
        }
        return { ...defaultStep };
      });
    } catch {
      return [...DEFAULT_FOLLOW_UP_STEPS];
    }
  };

  const [followUpSteps, setFollowUpSteps] = useState<FollowUpStep[]>([...DEFAULT_FOLLOW_UP_STEPS]);
  const [previousSteps, setPreviousSteps] = useState<FollowUpStep[]>([...DEFAULT_FOLLOW_UP_STEPS]);

  const updateMutation = useMutation({
    mutationFn: async (data: AccountFormValues & { followUpSteps?: string }) => {
      return apiRequest('PATCH', `/api/accounts/${accountId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountId] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Client mis à jour',
        description: 'Les modifications ont été enregistrées.',
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le client.',
        variant: 'destructive',
      });
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async (steps: FollowUpStep[]) => {
      return apiRequest('PATCH', `/api/accounts/${accountId}`, {
        followUpSteps: JSON.stringify(steps),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountId] });
      setPreviousSteps([...followUpSteps]);
      toast({
        title: 'Suivi mis à jour',
        description: 'L\'étape de suivi a été mise à jour.',
      });
    },
    onError: (error: Error) => {
      setFollowUpSteps([...previousSteps]);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le suivi.',
        variant: 'destructive',
      });
    },
  });

  const [generatedCR, setGeneratedCR] = useState<string>('');

  const generateCRMutation = useMutation({
    mutationFn: async (): Promise<{ cr: string }> => {
      const response = await apiRequest('POST', `/api/accounts/${accountId}/generate-cr`, {});
      return await response.json();
    },
    onSuccess: (data: { cr: string }) => {
      setGeneratedCR(data.cr);
      toast({
        title: 'CR généré',
        description: 'Le compte rendu a été généré avec succès par ChatGPT.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le CR.',
        variant: 'destructive',
      });
    },
  });

  const sendCRMutation = useMutation({
    mutationFn: async (cr: string): Promise<{ success: boolean; messageId?: string }> => {
      const response = await apiRequest('POST', `/api/accounts/${accountId}/send-cr`, { cr });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'CR envoyé',
        description: 'Le compte rendu a été envoyé par email au client.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer le CR.',
        variant: 'destructive',
      });
    },
  });

  const saveCRToNotesMutation = useMutation({
    mutationFn: async (cr: string) => {
      return apiRequest('PATCH', `/api/accounts/${accountId}`, { notes: cr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountId] });
      toast({
        title: 'CR sauvegardé',
        description: 'Le compte rendu a été enregistré dans les notes.',
      });
      setGeneratedCR('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder le CR.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (account && !isEditing) {
      form.reset({
        name: account.name || '',
        contactName: account.contactName || '',
        contactEmail: account.contactEmail || '',
        contactPhone: account.contactPhone || '',
        domain: account.domain || '',
        plan: (account.plan as 'audit' | 'automatisation' | 'standard' | 'automation') || 'audit',
        status: (account.status as 'active' | 'inactive' | 'churned') || 'active',
        notes: account.notes || '',
        loomVideoUrl: account.loomVideoUrl || '',
      });
      const parsedSteps = parseFollowUpSteps(account.followUpSteps);
      setFollowUpSteps(parsedSteps);
      setPreviousSteps(parsedSteps);
    }
  }, [account, isEditing]);

  const handleFollowUpToggle = (stepId: string) => {
    if (updateFollowUpMutation.isPending) return;
    
    const updatedSteps = followUpSteps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    setFollowUpSteps(updatedSteps);
    updateFollowUpMutation.mutate(updatedSteps);
  };

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Client non trouvé</p>
        <Link href="/accounts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux clients
          </Button>
        </Link>
      </div>
    );
  }

  const accountDeals = allDeals.filter(d => d.accountId === accountId);
  const accountProjects = allProjects.filter(p => p.accountId === accountId);
  const accountContacts = allContacts.filter(c => c.accountId === accountId);
  const status = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.active;
  const plan = planConfig[account.plan as keyof typeof planConfig] || planConfig.audit;

  const completedSteps = followUpSteps.filter(s => s.completed).length;
  const totalSteps = followUpSteps.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const onSubmit = (data: AccountFormValues) => {
    updateMutation.mutate({
      ...data,
      followUpSteps: JSON.stringify(followUpSteps),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold" data-testid="text-account-title">
                {account.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={status.variant}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.color} mr-1.5`} />
                  {status.label}
                </Badge>
                <Badge variant={plan.variant}>{plan.label}</Badge>
              </div>
            </div>
          </div>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit-account">
            <Edit2 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={updateMutation.isPending} data-testid="button-save-account">
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opportunités</p>
                <p className="text-2xl font-semibold">{accountDeals.length}</p>
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
                <p className="text-sm text-muted-foreground">Projets</p>
                <p className="text-2xl font-semibold">{accountProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <User className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contacts</p>
                <p className="text-2xl font-semibold">{accountContacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suivi</p>
                <p className="text-2xl font-semibold">{progressPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations du client</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l'entreprise</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact principal</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-contact" />
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
                              <Input type="email" {...field} data-testid="input-edit-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site web</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-domain" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-plan">
                                  <SelectValue placeholder="Sélectionner un plan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="audit">Audit</SelectItem>
                                <SelectItem value="automatisation">Automatisation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-status">
                                  <SelectValue placeholder="Sélectionner un statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                                <SelectItem value="churned">Perdu</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="loomVideoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lien vidéo Loom</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://www.loom.com/share/..." 
                              data-testid="input-edit-loom"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes / Compte-rendu</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={6}
                              placeholder="Notes de réunion, compte-rendu d'échanges..."
                              data-testid="input-edit-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact principal</p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{account.contactName || 'Non défini'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{account.contactEmail || 'Non défini'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{account.contactPhone || 'Non défini'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Site web</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {account.domain ? (
                          <a href={account.domain} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {account.domain}
                          </a>
                        ) : (
                          <span>Non défini</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Vidéo Loom
              </CardTitle>
              {account.loomVideoUrl && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(account.loomVideoUrl!, '_blank')}
                  data-testid="button-open-loom"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {account.loomVideoUrl ? (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground break-all" data-testid="text-loom-url">
                    {account.loomVideoUrl}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun lien vidéo enregistré. Cliquez sur "Modifier" pour ajouter un lien Loom.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-primary" />
                Notes / Compte-rendu
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateCRMutation.mutate()}
                  disabled={generateCRMutation.isPending}
                  data-testid="button-generate-cr"
                >
                  {generateCRMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Générer CR (IA)
                </Button>
                {(account.notes || generatedCR) && account.contactEmail && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => sendCRMutation.mutate(generatedCR || account.notes || '')}
                    disabled={sendCRMutation.isPending}
                    data-testid="button-send-cr"
                  >
                    {sendCRMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="mr-2 h-4 w-4" />
                    )}
                    Envoyer au client
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedCR && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      CR généré par ChatGPT
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => saveCRToNotesMutation.mutate(generatedCR)}
                        disabled={saveCRToNotesMutation.isPending}
                        data-testid="button-save-cr"
                      >
                        {saveCRToNotesMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Sauvegarder
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setGeneratedCR('')}
                        data-testid="button-dismiss-cr"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <MarkdownRenderer content={generatedCR} className="text-sm" />
                  </div>
                </div>
              )}
              {account.notes ? (
                <MarkdownRenderer content={account.notes} />
              ) : !generatedCR && (
                <p className="text-sm text-muted-foreground">
                  Aucune note enregistrée. Utilisez le bouton "Générer CR (IA)" pour créer un compte-rendu automatique ou cliquez sur "Modifier" pour ajouter des notes manuellement.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Emails
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => syncEmailsMutation.mutate()}
                disabled={syncEmailsMutation.isPending}
                data-testid="button-sync-emails"
              >
                {syncEmailsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Synchroniser
              </Button>
            </CardHeader>
            <CardContent>
              {emailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : accountEmails.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {accountEmails.map((email) => (
                    <div 
                      key={email.id} 
                      className="p-3 rounded-lg border hover-elevate"
                      data-testid={`email-item-${email.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${email.direction === 'inbound' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                          {email.direction === 'inbound' ? (
                            <Inbox className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {email.direction === 'inbound' ? email.fromName || email.fromEmail : email.toEmails?.[0] || 'Destinataire'}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {email.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">{email.subject || '(Sans objet)'}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">{email.snippet}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(email.receivedAt).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun email synchronisé. Cliquez sur "Synchroniser" pour importer les emails depuis Gmail.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Suivi client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{completedSteps}/{totalSteps}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {followUpSteps.map((step) => (
                  <div 
                    key={step.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                    onClick={() => handleFollowUpToggle(step.id)}
                    data-testid={`checkbox-step-${step.id}`}
                  >
                    <Checkbox
                      checked={step.completed}
                      onCheckedChange={() => handleFollowUpToggle(step.id)}
                      disabled={updateFollowUpMutation.isPending}
                    />
                    <span className={step.completed ? 'line-through text-muted-foreground' : ''}>
                      {step.label}
                    </span>
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunités récentes</CardTitle>
            </CardHeader>
            <CardContent>
              {accountDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune opportunité</p>
              ) : (
                <div className="space-y-3">
                  {accountDeals.slice(0, 5).map(deal => (
                    <Link key={deal.id} href={`/deals/${deal.id}`}>
                      <div className="p-2 rounded-lg hover-elevate cursor-pointer">
                        <p className="font-medium text-sm">{deal.name}</p>
                        <p className="text-xs text-muted-foreground">{deal.amount}€</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Projets</CardTitle>
              <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" data-testid="button-add-project-from-account">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nouveau projet</DialogTitle>
                    <DialogDescription>
                      Créer un projet pour {account?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...projectForm}>
                    <form onSubmit={projectForm.handleSubmit((data) => createProjectMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={projectForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom du projet *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Automatisation prospection" {...field} data-testid="input-project-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Description du projet..." {...field} data-testid="input-project-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-project-status">
                                  <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="on_hold">En pause</SelectItem>
                                <SelectItem value="completed">Terminé</SelectItem>
                                <SelectItem value="cancelled">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sous-traitant (optionnel)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-project-vendor">
                                  <SelectValue placeholder="Sélectionner un sous-traitant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Aucun</SelectItem>
                                {allVendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    {vendor.name} {vendor.company ? `(${vendor.company})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-project">
                          {createProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Créer le projet
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {accountProjects.length === 0 ? (
                <div className="text-center py-4">
                  <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Aucun projet</p>
                  <Button size="sm" variant="outline" onClick={() => setProjectDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Créer un projet
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountProjects.slice(0, 5).map(project => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="p-2 rounded-lg hover-elevate cursor-pointer">
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
