import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import {
  ArrowLeft,
  Upload,
  FileText,
  Video,
  Image,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  Clock,
  Loader2,
  ExternalLink,
  Settings,
  Save,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import type { Project, Task, Mission } from '@shared/schema';

interface VendorDocument {
  id: string;
  name: string;
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
  projectId?: string | null;
  createdAt?: string;
}

interface ClientInfo {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  contact?: {
    name: string;
    email: string;
    phone?: string;
    title?: string;
  };
}

interface ProjectDetails {
  project: Project;
  client: ClientInfo | null;
  workflowState: Record<string, unknown> | null;
  tasks: Task[];
  missions: Mission[];
  documents: VendorDocument[];
}

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

const statusConfig = {
  active: { label: 'Actif', variant: 'default' as const, color: 'bg-emerald-500' },
  in_progress: { label: 'En cours', variant: 'default' as const, color: 'bg-blue-500' },
  on_hold: { label: 'En pause', variant: 'secondary' as const, color: 'bg-amber-500' },
  completed: { label: 'Terminé', variant: 'outline' as const, color: 'bg-green-500' },
  cancelled: { label: 'Annulé', variant: 'destructive' as const, color: 'bg-red-500' },
};

export default function VendorProjectDetail() {
  const [, params] = useRoute('/vendor/projects/:id');
  const projectId = params?.id;
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: details, isLoading } = useQuery<ProjectDetails>({
    queryKey: ['/api/vendor/projects', projectId, 'details'],
    enabled: !!projectId,
  });

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  const updateWorkflowMutation = useMutation({
    mutationFn: async (newWorkflowState: Record<string, unknown>) => {
      return apiRequest('PATCH', `/api/vendor/projects/${projectId}/workflow`, {
        workflowState: newWorkflowState,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'details'] });
      toast({ title: 'Workflow mis à jour' });
      setWorkflowDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le workflow', variant: 'destructive' });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64 = (e.target?.result as string).split(',')[1];
        
        await apiRequest('POST', `/api/vendor/projects/${projectId}/files`, {
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
          description: fileDescription,
        });

        queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'details'] });
        toast({ title: 'Fichier uploadé', description: 'Le fichier a été ajouté au projet' });
        setUploadDialogOpen(false);
        setFileDescription('');
      } catch (error) {
        toast({ title: 'Erreur', description: "Échec de l'upload", variant: 'destructive' });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({ title: 'Erreur', description: "Impossible de lire le fichier", variant: 'destructive' });
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const initializeWorkflowSteps = () => {
    if (details?.workflowState?.steps) {
      setWorkflowSteps(details.workflowState.steps as WorkflowStep[]);
    } else {
      setWorkflowSteps([
        { id: '1', name: 'Analyse des besoins', status: 'pending' },
        { id: '2', name: 'Développement', status: 'pending' },
        { id: '3', name: 'Tests et validation', status: 'pending' },
        { id: '4', name: 'Livraison finale', status: 'pending' },
      ]);
    }
    setWorkflowDialogOpen(true);
  };

  const updateStepStatus = (stepId: string, status: WorkflowStep['status']) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const saveWorkflow = () => {
    updateWorkflowMutation.mutate({ steps: workflowSteps });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6">
        <p>Projet non trouvé</p>
        <Link href="/vendor/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </Button>
        </Link>
      </div>
    );
  }

  const { project, client, workflowState, tasks, missions, documents } = details;
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.active;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const workflowStepsFromState = (workflowState?.steps as WorkflowStep[] | undefined) || [];
  const hasWorkflowSteps = workflowStepsFromState.length > 0;
  const workflowProgress = hasWorkflowSteps
    ? (workflowStepsFromState.filter(s => s.status === 'completed').length / workflowStepsFromState.length) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vendor/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-project-name">{project.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-file">
                <Upload className="h-4 w-4 mr-2" />
                Ajouter un fichier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un fichier au projet</DialogTitle>
                <DialogDescription>
                  Uploadez un fichier (PDF, DOCX, image, vidéo Loom)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Description du fichier (optionnel)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  data-testid="input-file-description"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.mp4,.webm"
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading}
                  className="w-full"
                  data-testid="button-select-file"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Upload en cours...' : 'Sélectionner un fichier'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={initializeWorkflowSteps} data-testid="button-manage-workflow">
            <Settings className="h-4 w-4 mr-2" />
            Gérer le workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-600" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-lg" data-testid="text-client-name">{client.name}</p>
                  {client.industry && (
                    <p className="text-sm text-muted-foreground">{client.industry}</p>
                  )}
                </div>
                {client.contact && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">Contact principal</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-contact-name">{client.contact.name}</span>
                      {client.contact.title && (
                        <Badge variant="outline" className="text-xs">{client.contact.title}</Badge>
                      )}
                    </div>
                    {client.contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${client.contact.email}`} className="text-violet-600 hover:underline" data-testid="link-contact-email">
                          {client.contact.email}
                        </a>
                      </div>
                    )}
                    {client.contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${client.contact.phone}`} className="text-violet-600 hover:underline" data-testid="link-contact-phone">
                          {client.contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun client associé</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-violet-600" />
              Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Projet</span>
                <span>{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Tâches</span>
                <span>{completedTasks}/{tasks.length}</span>
              </div>
              <Progress value={tasks.length ? (completedTasks / tasks.length) * 100 : 0} className="h-2" />
            </div>
            {hasWorkflowSteps && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Workflow</span>
                  <span>{Math.round(workflowProgress)}%</span>
                </div>
                <Progress value={workflowProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-violet-600" />
              Résumé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Tâches</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">Terminées</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <p className="text-2xl font-bold text-purple-600">{missions.length}</p>
                <p className="text-xs text-muted-foreground">Missions</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <p className="text-2xl font-bold text-orange-600">{documents.length}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {hasWorkflowSteps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-600" />
              État du Workflow
            </CardTitle>
            <CardDescription>Suivi des étapes du projet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowStepsFromState.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {step.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.name}</p>
                    {step.notes && <p className="text-sm text-muted-foreground">{step.notes}</p>}
                  </div>
                  <Badge variant={
                    step.status === 'completed' ? 'default' :
                    step.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {step.status === 'completed' ? 'Terminé' :
                     step.status === 'in_progress' ? 'En cours' : 'En attente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Documents du projet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {doc.mimeType?.includes('pdf') ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : doc.mimeType?.includes('image') ? (
                      <Image className="h-5 w-5 text-blue-500" />
                    ) : doc.mimeType?.includes('video') ? (
                      <Video className="h-5 w-5 text-purple-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      {doc.size && <p className="text-sm text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</p>}
                    </div>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Aucun document. Utilisez le bouton "Ajouter un fichier" pour en ajouter.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            Tâches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  </div>
                  <Badge variant={
                    task.status === 'completed' ? 'default' :
                    task.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {task.status === 'completed' ? 'Terminée' :
                     task.status === 'in_progress' ? 'En cours' : 'En attente'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune tâche</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gérer le workflow du projet</DialogTitle>
            <DialogDescription>
              Mettez à jour le statut de chaque étape du projet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{step.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={step.status === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'pending')}
                  >
                    En attente
                  </Button>
                  <Button
                    variant={step.status === 'in_progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'in_progress')}
                  >
                    En cours
                  </Button>
                  <Button
                    variant={step.status === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'completed')}
                  >
                    Terminé
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveWorkflow} disabled={updateWorkflowMutation.isPending}>
              {updateWorkflowMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
