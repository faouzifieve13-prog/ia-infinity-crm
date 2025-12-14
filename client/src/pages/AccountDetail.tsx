import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { useState } from 'react';
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
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Account, Deal, Project, Contact } from '@/lib/types';

const accountFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  domain: z.string().optional(),
  plan: z.enum(['audit', 'automatisation', 'standard', 'automation']).default('audit'),
  status: z.enum(['active', 'inactive', 'churned']).default('active'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

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
  const [, navigate] = useLocation();
  const accountId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

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

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      contactName: '',
      contactEmail: '',
      domain: '',
      plan: 'audit',
      status: 'active',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
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

  if (account && !form.formState.isDirty && !isEditing) {
    form.reset({
      name: account.name || '',
      contactName: account.contactName || '',
      contactEmail: account.contactEmail || '',
      domain: account.domain || '',
      plan: (account.plan as 'audit' | 'automatisation' | 'standard' | 'automation') || 'audit',
      status: (account.status as 'active' | 'inactive' | 'churned') || 'active',
    });
  }

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

  const onSubmit = (data: AccountFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-2 mt-1">
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
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
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
                <Globe className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Site web</p>
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {account.domain || 'Non défini'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                <Separator />
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
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
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
            <CardHeader>
              <CardTitle className="text-base">Projets</CardTitle>
            </CardHeader>
            <CardContent>
              {accountProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet</p>
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
