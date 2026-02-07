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
  Edit2,
  Plus,
  Save,
  X,
  StickyNote,
  Package,
  Video,
  FileJson,
  File,
  ExternalLink,
  Banknote
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
import { ProjectDeadlineCalendar } from '@/components/projects/ProjectDeadlineCalendar';
import { ProjectVendorsSection } from '@/components/vendors/ProjectVendorsSection';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSpace } from '@/hooks/use-space';
import type { Project, Account, Task, Document, Contact, User, DeliveryMilestone, Vendor, ProjectVendor } from '@/lib/types';

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

const taskFormSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'review', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

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
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [showAddCR, setShowAddCR] = useState(false);
  const [newCRDate, setNewCRDate] = useState('');
  const [newCRTitle, setNewCRTitle] = useState('');
  const [newCRContent, setNewCRContent] = useState('');
  const [newCRType, setNewCRType] = useState('suivi');
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState<'json' | 'pdf' | 'loom' | 'other'>('loom');
  const [newDeliverableUrl, setNewDeliverableUrl] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const { toast } = useToast();
  const { currentSpace } = useSpace();

  // Determine API endpoint based on portal
  const tasksApiEndpoint = currentSpace === 'client' ? '/api/client/tasks'
    : currentSpace === 'vendor' ? '/api/vendor/tasks'
    : '/api/tasks';

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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: projectVendorsList = [] } = useQuery<(ProjectVendor & { vendor: Vendor })[]>({
    queryKey: [`/api/projects/${projectId}/vendors`],
    enabled: !!projectId,
  });

  // Project Updates (CR de suivi)
  const { data: projectUpdates = [] } = useQuery<{ id: string; updateDate: string; title: string; content: string; type: string; createdAt: string; createdById?: string }[]>({
    queryKey: [`/api/projects/${projectId}/updates`],
    enabled: !!projectId,
  });

  // Project Deliverables (fichiers livrables)
  const { data: projectDeliverables = [] } = useQuery<{ id: string; title: string; description?: string; type: string; url?: string; fileName?: string; fileSize?: number; createdAt: string }[]>({
    queryKey: [`/api/projects/${projectId}/deliverables`],
    enabled: !!projectId,
  });

  // Project Milestones (jalons)
  const { data: projectMilestones = [] } = useQuery<DeliveryMilestone[]>({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: !!projectId,
  });

  const vendorContacts = contacts.filter(c => c.contactType === 'vendor');

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assigneeId: '',
      dueDate: '',
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const payload = {
        ...data,
        projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      return apiRequest('POST', tasksApiEndpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tasksApiEndpoint] });
      setTaskDialogOpen(false);
      taskForm.reset();
      toast({
        title: 'Tâche créée',
        description: 'La tâche a été créée avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la tâche.',
        variant: 'destructive',
      });
    },
  });

  const addProjectUpdateMutation = useMutation({
    mutationFn: async (data: { updateDate: string; title: string; content: string; type: string }) => {
      return apiRequest('POST', `/api/projects/${projectId}/updates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/updates`] });
      setNewCRDate('');
      setNewCRTitle('');
      setNewCRContent('');
      setNewCRType('suivi');
      setShowAddCR(false);
      toast({ title: 'CR ajouté', description: 'Le compte-rendu de suivi a été ajouté.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message || 'Impossible d\'ajouter le CR.', variant: 'destructive' });
    },
  });

  const deleteProjectUpdateMutation = useMutation({
    mutationFn: async (updateId: string) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/updates/${updateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/updates`] });
      toast({ title: 'CR supprimé', description: 'Le compte-rendu a été supprimé.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message || 'Impossible de supprimer le CR.', variant: 'destructive' });
    },
  });

  // Project Deliverables Mutations
  const addDeliverableMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; type: string; url?: string }) => {
      return apiRequest('POST', `/api/projects/${projectId}/deliverables`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/deliverables`] });
      setNewDeliverableTitle('');
      setNewDeliverableDescription('');
      setNewDeliverableType('loom');
      setNewDeliverableUrl('');
      setShowAddDeliverable(false);
      toast({ title: 'Livrable ajouté', description: 'Le livrable a été ajouté avec succès.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message || 'Impossible d\'ajouter le livrable.', variant: 'destructive' });
    },
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: async (deliverableId: string) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/deliverables/${deliverableId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/deliverables`] });
      toast({ title: 'Livrable supprimé', description: 'Le livrable a été supprimé.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message || 'Impossible de supprimer le livrable.', variant: 'destructive' });
    },
  });

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

          {/* Sous-traitants du projet */}
          <ProjectVendorsSection
            projectId={projectId!}
            vendors={vendors}
          />

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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
                <Link href="/tasks">
                  <Button variant="outline" size="sm">Voir toutes</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">Aucune tâche associée à ce projet</p>
                  <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Créer une tâche
                  </Button>
                </div>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-primary" />
                CR de Suivi
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCR(true)}
                data-testid="button-add-project-cr"
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter CR
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddCR && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <h4 className="font-medium text-sm">Nouveau compte-rendu de suivi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Date du CR *
                      </label>
                      <Input
                        type="date"
                        value={newCRDate}
                        onChange={(e) => setNewCRDate(e.target.value)}
                        data-testid="input-project-cr-date"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Type
                      </label>
                      <Select value={newCRType} onValueChange={setNewCRType}>
                        <SelectTrigger data-testid="select-project-cr-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="suivi">Suivi</SelectItem>
                          <SelectItem value="avancement">Avancement</SelectItem>
                          <SelectItem value="probleme">Problème</SelectItem>
                          <SelectItem value="livraison">Livraison</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input
                    placeholder="Titre du CR *"
                    value={newCRTitle}
                    onChange={(e) => setNewCRTitle(e.target.value)}
                    data-testid="input-project-cr-title"
                  />
                  <Textarea
                    placeholder="Contenu du compte-rendu *"
                    value={newCRContent}
                    onChange={(e) => setNewCRContent(e.target.value)}
                    rows={4}
                    data-testid="input-project-cr-content"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddCR(false);
                        setNewCRDate('');
                        setNewCRTitle('');
                        setNewCRContent('');
                        setNewCRType('suivi');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      disabled={!newCRDate || !newCRTitle.trim() || !newCRContent.trim() || addProjectUpdateMutation.isPending}
                      onClick={() => addProjectUpdateMutation.mutate({
                        updateDate: newCRDate,
                        title: newCRTitle.trim(),
                        content: newCRContent.trim(),
                        type: newCRType,
                      })}
                      data-testid="button-save-project-cr"
                    >
                      {addProjectUpdateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              )}

              {projectUpdates.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {projectUpdates
                    .sort((a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime())
                    .map((update) => (
                    <div key={update.id} className="p-3 rounded-lg border hover-elevate">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {new Date(update.updateDate).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {update.type}
                            </Badge>
                          </div>
                          <h5 className="font-medium text-sm">{update.title}</h5>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {update.content}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProjectUpdateMutation.mutate(update.id)}
                          disabled={deleteProjectUpdateMutation.isPending}
                          data-testid={`button-delete-project-cr-${update.id}`}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showAddCR && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun compte-rendu de suivi. Cliquez sur "Ajouter CR" pour créer un historique.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Livrables
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDeliverable(true)}
                data-testid="button-add-deliverable"
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddDeliverable && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <h4 className="font-medium text-sm">Nouveau livrable</h4>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Type de livrable *
                    </label>
                    <Select value={newDeliverableType} onValueChange={(v) => setNewDeliverableType(v as 'json' | 'pdf' | 'loom' | 'other')}>
                      <SelectTrigger data-testid="select-deliverable-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loom">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Vidéo Loom
                          </div>
                        </SelectItem>
                        <SelectItem value="json">
                          <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4" />
                            Fichier JSON
                          </div>
                        </SelectItem>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Document PDF
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            Autre
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Titre du livrable *"
                    value={newDeliverableTitle}
                    onChange={(e) => setNewDeliverableTitle(e.target.value)}
                    data-testid="input-deliverable-title"
                  />
                  <Input
                    placeholder={newDeliverableType === 'loom' ? 'URL Loom (https://www.loom.com/share/...)' : 'URL du fichier'}
                    value={newDeliverableUrl}
                    onChange={(e) => setNewDeliverableUrl(e.target.value)}
                    data-testid="input-deliverable-url"
                  />
                  <Textarea
                    placeholder="Description (optionnel)"
                    value={newDeliverableDescription}
                    onChange={(e) => setNewDeliverableDescription(e.target.value)}
                    rows={2}
                    data-testid="input-deliverable-description"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddDeliverable(false);
                        setNewDeliverableTitle('');
                        setNewDeliverableUrl('');
                        setNewDeliverableDescription('');
                        setNewDeliverableType('loom');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      disabled={!newDeliverableTitle.trim() || addDeliverableMutation.isPending}
                      onClick={() => addDeliverableMutation.mutate({
                        title: newDeliverableTitle.trim(),
                        description: newDeliverableDescription.trim() || undefined,
                        type: newDeliverableType,
                        url: newDeliverableUrl.trim() || undefined,
                      })}
                      data-testid="button-save-deliverable"
                    >
                      {addDeliverableMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              )}

              {projectDeliverables.length > 0 ? (
                <div className="space-y-3">
                  {projectDeliverables.map((deliverable) => (
                    <div key={deliverable.id} className="p-3 rounded-lg border hover-elevate">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {deliverable.type === 'loom' && <Video className="h-5 w-5 text-purple-500 mt-0.5" />}
                          {deliverable.type === 'json' && <FileJson className="h-5 w-5 text-amber-500 mt-0.5" />}
                          {deliverable.type === 'pdf' && <FileText className="h-5 w-5 text-red-500 mt-0.5" />}
                          {deliverable.type === 'other' && <File className="h-5 w-5 text-gray-500 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm">{deliverable.title}</h5>
                              <Badge variant="outline" className="text-xs capitalize">
                                {deliverable.type}
                              </Badge>
                            </div>
                            {deliverable.description && (
                              <p className="text-xs text-muted-foreground mt-1">{deliverable.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Ajouté le {new Date(deliverable.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {deliverable.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(deliverable.url, '_blank')}
                              data-testid={`button-open-deliverable-${deliverable.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDeliverableMutation.mutate(deliverable.id)}
                            disabled={deleteDeliverableMutation.isPending}
                            data-testid={`button-delete-deliverable-${deliverable.id}`}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showAddDeliverable && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun livrable. Cliquez sur "Ajouter" pour ajouter des fichiers (JSON, Loom, PDF).
                </p>
              )}
            </CardContent>
          </Card>
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
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Sous-traitants</p>
                  {projectVendorsList.length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {projectVendorsList.map(pv => (
                        <p key={pv.id} className="font-medium text-sm">
                          {pv.vendor?.name || 'Inconnu'}
                          {pv.vendor?.company ? <span className="text-muted-foreground text-xs ml-1">({pv.vendor.company})</span> : null}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium text-muted-foreground">Aucun</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Budget sous-traitants</p>
                  <p className="font-medium">
                    {projectVendorsList.length > 0
                      ? `${projectVendorsList.reduce((total, pv) => {
                          const fixed = Number(pv.fixedPrice) || 0;
                          if (fixed > 0) return total + fixed;
                          return total + (Number(pv.dailyRate) || 0) * (pv.estimatedDays || 0);
                        }, 0).toLocaleString('fr-FR')} \u20ac`
                      : '-'}
                  </p>
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

          {/* Calendrier des deadlines */}
          <ProjectDeadlineCalendar
            project={project}
            milestones={projectMilestones}
            currentMonth={calendarMonth}
            currentYear={calendarYear}
            onMonthChange={(month, year) => {
              setCalendarMonth(month);
              setCalendarYear(year);
            }}
            onMilestonesUpdate={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
            }}
          />

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

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>
              Créer une tâche pour ce projet.
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Intégrer l'API..." {...field} data-testid="input-new-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description de la tâche..." {...field} data-testid="input-new-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="review">En révision</SelectItem>
                          <SelectItem value="completed">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigné à</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-task-assignee">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Non assigné</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date limite</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-new-task-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-new-task">
                  {createTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer la tâche
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
