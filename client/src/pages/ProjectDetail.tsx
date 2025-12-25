import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Building2, 
  CheckCircle2, 
  FileText,
  Users,
  Target,
  BarChart3,
  Loader2,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { DeliveryWorkflow } from '@/components/projects/DeliveryWorkflow';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Project, Account, Task, Document, Contact } from '@/lib/types';

const statusConfig = {
  active: { label: 'Actif', variant: 'default' as const, color: 'bg-emerald-500' },
  on_hold: { label: 'En pause', variant: 'secondary' as const, color: 'bg-amber-500' },
  completed: { label: 'Terminé', variant: 'outline' as const, color: 'bg-blue-500' },
  cancelled: { label: 'Annulé', variant: 'destructive' as const, color: 'bg-red-500' },
  archived: { label: 'Archivé', variant: 'secondary' as const, color: 'bg-slate-500' },
};

const projectFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled', 'archived']).default('active'),
  accountId: z.string().optional(),
  vendorContactId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

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

export default function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const projectId = params?.id;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
      accountId: '',
      vendorContactId: '',
      startDate: '',
      endDate: '',
    },
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const vendorContacts = contacts.filter(c => c.contactType === 'vendor');

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const parseDate = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        return date.toISOString();
      };
      
      const payload = {
        ...data,
        accountId: data.accountId || null,
        vendorContactId: data.vendorContactId || null,
        startDate: data.startDate ? parseDate(data.startDate) : undefined,
        endDate: data.endDate ? parseDate(data.endDate) : undefined,
      };
      return apiRequest('PATCH', `/api/projects/${projectId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      setEditDialogOpen(false);
      toast({
        title: 'Projet modifié',
        description: 'Le projet a été modifié avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le projet.',
        variant: 'destructive',
      });
    },
  });

  const handleOpenEditDialog = () => {
    if (project) {
      const formatDateForInput = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };

      editForm.reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        accountId: project.accountId || '',
        vendorContactId: project.vendorContactId || '',
        startDate: formatDateForInput(project.startDate),
        endDate: formatDateForInput(project.endDate),
      });
      setEditDialogOpen(true);
    }
  };

  const onEditSubmit = (data: ProjectFormValues) => {
    updateMutation.mutate(data);
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Projet non trouvé</p>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux projets
          </Button>
        </Link>
      </div>
    );
  }

  const account = accounts.find(a => a.id === project.accountId);
  const projectTasks = allTasks.filter(t => t.projectId === projectId);
  const projectDocuments = allDocuments.filter(d => d.projectId === projectId);
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const status = statusConfig[project.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold" data-testid="text-project-title">
              {project.name}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {account?.name || 'Aucun client associé'}
          </p>
        </div>
        <Button variant="outline" onClick={handleOpenEditDialog} data-testid="button-edit-project">
          <Edit2 className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progression</p>
                <p className="text-2xl font-bold">{project.progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tâches</p>
                <p className="text-2xl font-bold">{completedTasks}/{projectTasks.length}</p>
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
                <p className="text-2xl font-bold">{projectDocuments.length}</p>
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
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-lg font-medium">
                  {project.startDate && project.endDate 
                    ? `${Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} jours`
                    : 'Non définie'
                  }
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
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {project.description || 'Aucune description disponible.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Progression du projet</CardTitle>
                <CardDescription>Avancement global</CardDescription>
              </div>
              <Badge variant="outline">{project.progress}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={project.progress} className="h-3" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Tâches complétées: {completedTasks}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted" />
                    <span className="text-muted-foreground">Tâches restantes: {projectTasks.length - completedTasks}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Tâches ({projectTasks.length})</CardTitle>
              <Link href="/tasks">
                <Button variant="outline" size="sm">Voir toutes</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucune tâche associée à ce projet
                </p>
              ) : (
                <div className="space-y-3">
                  {projectTasks.slice(0, 5).map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`task-item-${task.id}`}
                    >
                      <CheckCircle2 
                        className={`h-5 w-5 ${task.status === 'completed' ? 'text-emerald-500' : 'text-muted-foreground'}`} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {project.status !== 'cancelled' && (
            <DeliveryWorkflow 
              project={project} 
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
              }}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{account?.name || 'Non assigné'}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date de début</p>
                  <p className="font-medium">{formatDate(project.startDate)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date de fin</p>
                  <p className="font-medium">{formatDate(project.endDate)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Créé le</p>
                  <p className="font-medium">{formatDate(project.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Documents ({projectDocuments.length})</CardTitle>
              <Link href="/documents">
                <Button variant="outline" size="sm">Voir tous</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projectDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Aucun document associé
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDocuments.slice(0, 3).map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center gap-2 p-2 rounded-lg hover-elevate cursor-pointer"
                      data-testid={`document-item-${doc.id}`}
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>
              Modifiez les informations du projet.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du projet *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Automatisation CRM" 
                        {...field} 
                        data-testid="input-edit-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Décrivez le projet..." 
                        className="resize-none" 
                        {...field} 
                        data-testid="input-edit-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-account">
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="vendorContactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sous-traitant assigné</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-vendor">
                          <SelectValue placeholder="Sélectionner un sous-traitant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendorContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-status">
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="on_hold">En pause</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="cancelled">Annulé</SelectItem>
                        <SelectItem value="archived">Archivé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-edit-project-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-edit-project-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-edit-submit"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
