import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Settings,
  Save,
  Plus,
  Sparkles,
  MessageSquare,
  Calendar,
  Edit3,
  Trash2,
  Circle,
  Play,
  CalendarDays,
  CalendarPlus,
  CloudUpload,
  Target,
  Flag,
  Bell,
  Package,
  FileJson,
  File,
  ThumbsUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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

interface VendorAssignment {
  dailyRate: string;
  estimatedDays: number;
  fixedPrice: string;
  role: string;
}

interface ProjectDetails {
  project: Project;
  client: ClientInfo | null;
  workflowState: Record<string, unknown> | null;
  tasks: Task[];
  missions: Mission[];
  documents: VendorDocument[];
  vendorAssignment: VendorAssignment | null;
}

interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  startDate?: string | null;
  endDate?: string | null;
  completedAt?: string | null;
  notes?: string;
  createdAt?: string;
}

interface CalendarEvent {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  type: 'deadline' | 'meeting' | 'milestone' | 'reminder' | 'personal';
  color?: string | null;
  googleCalendarSynced?: boolean;
}

const eventTypeConfig = {
  deadline: { label: 'Échéance', color: '#ef4444', icon: Flag },
  meeting: { label: 'Réunion', color: '#3b82f6', icon: CalendarDays },
  milestone: { label: 'Jalon', color: '#8b5cf6', icon: Target },
  reminder: { label: 'Rappel', color: '#f59e0b', icon: Bell },
  personal: { label: 'Personnel', color: '#10b981', icon: Calendar },
};

// Setup date-fns localizer for react-big-calendar
const locales = { 'fr': fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface ProjectUpdate {
  id: string;
  projectId: string;
  updateDate: string;
  title: string;
  content: string;
  type: 'suivi' | 'avancement' | 'probleme' | 'livraison' | 'autre';
  createdAt: string;
  createdById?: string;
}

interface ProjectDeliverable {
  id: string;
  deliverableNumber: number;
  version: string;
  title: string;
  description?: string | null;
  type: string;
  url?: string | null;
  status: string;
  clientComment?: string | null;
  createdAt: string;
  updatedAt: string;
}

const updateTypeConfig = {
  suivi: { label: 'Suivi', color: 'bg-blue-500' },
  avancement: { label: 'Avancement', color: 'bg-green-500' },
  probleme: { label: 'Problème', color: 'bg-red-500' },
  livraison: { label: 'Livraison', color: 'bg-purple-500' },
  autre: { label: 'Autre', color: 'bg-gray-500' },
};

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
  const [showAddCR, setShowAddCR] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [crDate, setCrDate] = useState('');
  const [crTitle, setCrTitle] = useState('');
  const [crContent, setCrContent] = useState('');
  const [crType, setCrType] = useState<'suivi' | 'avancement' | 'probleme' | 'livraison' | 'autre'>('suivi');
  const [crInstructions, setCrInstructions] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventType, setEventType] = useState<'deadline' | 'meeting' | 'milestone' | 'reminder' | 'personal'>('personal');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newStepStartDate, setNewStepStartDate] = useState('');
  const [newStepEndDate, setNewStepEndDate] = useState('');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [deliverableDialogOpen, setDeliverableDialogOpen] = useState(false);
  const [deliverableNumber, setDeliverableNumber] = useState<1 | 2 | 3>(1);
  const [deliverableVersion, setDeliverableVersion] = useState<'v1' | 'v2' | 'v3'>('v1');
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [deliverableType, setDeliverableType] = useState<'loom' | 'json' | 'pdf' | 'other'>('loom');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: details, isLoading } = useQuery<ProjectDetails>({
    queryKey: ['/api/vendor/projects', projectId, 'details'],
    enabled: !!projectId,
  });

  const { data: projectUpdates = [], isLoading: updatesLoading } = useQuery<ProjectUpdate[]>({
    queryKey: ['/api/vendor/projects', projectId, 'updates'],
    enabled: !!projectId,
  });

  const { data: calendarEventsRaw = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/vendor/projects', projectId, 'events'],
    enabled: !!projectId,
  });

  const { data: projectDeliverables = [] } = useQuery<ProjectDeliverable[]>({
    queryKey: ['/api/vendor/projects', projectId, 'deliverables'],
    enabled: !!projectId,
  });

  // Convert raw events to proper Date objects
  const calendarEvents = useMemo(() => {
    return calendarEventsRaw.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  }, [calendarEventsRaw]);

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

  const createCrMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type: string; updateDate: string }) => {
      return apiRequest('POST', `/api/vendor/projects/${projectId}/updates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'updates'] });
      toast({ title: 'CR créé', description: 'Le compte rendu a été enregistré' });
      setShowAddCR(false);
      resetCrForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer le CR', variant: 'destructive' });
    },
  });

  const generateAiCrMutation = useMutation({
    mutationFn: async (instructions?: string) => {
      const response = await apiRequest('POST', `/api/vendor/projects/${projectId}/updates/generate-ai`, {
        instructions,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.title) setCrTitle(data.title);
      if (data.content) setCrContent(data.content);
      toast({ title: 'CR généré', description: "Le contenu a été généré par l'IA" });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de générer le CR avec l'IA", variant: 'destructive' });
    },
  });

  // Calendar event mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; start: string; end: string; type: string; allDay: boolean }) => {
      return apiRequest('POST', `/api/vendor/projects/${projectId}/events`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'events'] });
      toast({ title: 'Événement créé' });
      setEventDialogOpen(false);
      resetEventForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de créer l'événement", variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('DELETE', `/api/vendor/projects/${projectId}/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'events'] });
      toast({ title: 'Événement supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'événement", variant: 'destructive' });
    },
  });

  const syncGoogleCalendarMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('POST', `/api/vendor/projects/${projectId}/events/${eventId}/sync-google`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'events'] });
      toast({ title: 'Synchronisé', description: 'Événement synchronisé avec Google Calendar' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la synchronisation', variant: 'destructive' });
    },
  });

  // Workflow step mutations
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status, notes }: { stepId: string; status?: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/vendor/projects/${projectId}/workflow/steps/${stepId}`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'details'] });
      toast({ title: 'Étape mise à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de mettre à jour l'étape", variant: 'destructive' });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; startDate?: string; endDate?: string }) => {
      return apiRequest('POST', `/api/vendor/projects/${projectId}/workflow/steps`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'details'] });
      toast({ title: 'Étape ajoutée' });
      setStepDialogOpen(false);
      resetStepForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter l'étape", variant: 'destructive' });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest('DELETE', `/api/vendor/projects/${projectId}/workflow/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'details'] });
      toast({ title: 'Étape supprimée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'étape", variant: 'destructive' });
    },
  });

  // Deliverable mutations
  const createDeliverableMutation = useMutation({
    mutationFn: async (data: { deliverableNumber: number; version: string; title: string; description?: string; type: string; url?: string }) => {
      return apiRequest('POST', `/api/vendor/projects/${projectId}/deliverables`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'deliverables'] });
      toast({ title: 'Livrable créé', description: 'Le livrable a été soumis au client' });
      setDeliverableDialogOpen(false);
      resetDeliverableForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer le livrable', variant: 'destructive' });
    },
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: async (deliverableId: string) => {
      return apiRequest('DELETE', `/api/vendor/projects/${projectId}/deliverables/${deliverableId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/projects', projectId, 'deliverables'] });
      toast({ title: 'Livrable supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le livrable', variant: 'destructive' });
    },
  });

  const resetDeliverableForm = () => {
    setDeliverableNumber(1);
    setDeliverableVersion('v1');
    setDeliverableTitle('');
    setDeliverableDescription('');
    setDeliverableType('loom');
    setDeliverableUrl('');
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventStart('');
    setEventEnd('');
    setEventType('personal');
    setEventAllDay(false);
  };

  const resetStepForm = () => {
    setNewStepName('');
    setNewStepDescription('');
    setNewStepStartDate('');
    setNewStepEndDate('');
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !eventStart || !eventEnd) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    createEventMutation.mutate({
      title: eventTitle,
      description: eventDescription,
      start: eventStart,
      end: eventEnd,
      type: eventType,
      allDay: eventAllDay,
    });
  };

  const handleAddStep = () => {
    if (!newStepName.trim()) {
      toast({ title: 'Erreur', description: "Le nom de l'étape est requis", variant: 'destructive' });
      return;
    }
    addStepMutation.mutate({
      name: newStepName,
      description: newStepDescription,
      startDate: newStepStartDate || undefined,
      endDate: newStepEndDate || undefined,
    });
  };

  const handleMarkStepComplete = (stepId: string) => {
    updateStepMutation.mutate({ stepId, status: 'completed' });
  };

  const handleMarkStepInProgress = (stepId: string) => {
    updateStepMutation.mutate({ stepId, status: 'in_progress' });
  };

  // Calendar event style
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const typeConfig = eventTypeConfig[event.type] || eventTypeConfig.personal;
    return {
      style: {
        backgroundColor: event.color || typeConfig.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, []);

  // Calendar slot selection handler
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setEventStart(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEventEnd(format(end, "yyyy-MM-dd'T'HH:mm"));
    setEventDialogOpen(true);
  }, []);

  const resetCrForm = () => {
    setCrDate('');
    setCrTitle('');
    setCrContent('');
    setCrType('suivi');
    setCrInstructions('');
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      // Set default date to today
      if (!crDate) {
        setCrDate(format(new Date(), 'yyyy-MM-dd'));
      }
      await generateAiCrMutation.mutateAsync(crInstructions || undefined);
      // Open the inline form after generation
      setShowAddCR(true);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSaveCr = () => {
    if (!crDate || !crTitle.trim() || !crContent.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir la date, le titre et le contenu', variant: 'destructive' });
      return;
    }
    createCrMutation.mutate({ updateDate: crDate, title: crTitle, content: crContent, type: crType });
  };

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

  const { project, client, workflowState, tasks, missions, documents, vendorAssignment } = details;
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

      {vendorAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-violet-600" />
              Ma Rémunération
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{vendorAssignment.role}</Badge>
              </div>
              {parseFloat(vendorAssignment.fixedPrice) > 0 ? (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Montant facturable</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {parseFloat(vendorAssignment.fixedPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Durée de la mission</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {vendorAssignment.estimatedDays > 0 ? `${vendorAssignment.estimatedDays} jours` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune rémunération définie pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Workflow Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                Suivi du Workflow
              </CardTitle>
              <CardDescription>Timeline des étapes du projet</CardDescription>
            </div>
            <Button onClick={() => setStepDialogOpen(true)} size="sm" data-testid="button-add-step">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une étape
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workflowStepsFromState.length > 0 ? (
            <div className="relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-6">
                {workflowStepsFromState.map((step, index) => (
                  <div key={step.id} className="relative pl-10">
                    {/* Timeline Node */}
                    <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-sm ${
                      step.status === 'completed' ? 'bg-green-500 text-white' :
                      step.status === 'in_progress' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : step.status === 'in_progress' ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                      step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                      step.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                      'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{step.name}</h4>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                          )}
                        </div>
                        <Badge variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {step.status === 'completed' ? 'Terminé' :
                           step.status === 'in_progress' ? 'En cours' : 'En attente'}
                        </Badge>
                      </div>

                      {/* Dates */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        {step.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Début: {new Date(step.startDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {step.endDate && (
                          <div className="flex items-center gap-1">
                            <Flag className="h-3 w-3" />
                            <span>Fin prévue: {new Date(step.endDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {step.completedAt && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            <span>Terminé le: {new Date(step.completedAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>

                      {step.notes && (
                        <p className="text-sm text-muted-foreground italic mb-3">"{step.notes}"</p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {step.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkStepInProgress(step.id)}
                            disabled={updateStepMutation.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Démarrer
                          </Button>
                        )}
                        {step.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkStepComplete(step.id)}
                            disabled={updateStepMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Marquer terminé
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteStepMutation.mutate(step.id)}
                          disabled={deleteStepMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">Aucune étape de workflow définie</p>
              <Button variant="outline" onClick={() => setStepDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une première étape
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Section Comptes Rendus (CR) - Style Admin */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            CR de suivi
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={generatingAI}
              data-testid="button-generate-cr-ai"
            >
              {generatingAI ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Générer avec IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCR(true)}
              data-testid="button-add-cr"
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter CR
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddCR && (
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <h4 className="font-medium text-sm">Nouveau compte-rendu de suivi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Date du CR *
                  </Label>
                  <Input
                    type="date"
                    value={crDate}
                    onChange={(e) => setCrDate(e.target.value)}
                    data-testid="input-cr-date"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Type
                  </Label>
                  <Select value={crType} onValueChange={(v) => setCrType(v as typeof crType)}>
                    <SelectTrigger data-testid="select-cr-type">
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
                value={crTitle}
                onChange={(e) => setCrTitle(e.target.value)}
                data-testid="input-cr-title"
              />
              <Textarea
                placeholder="Contenu du compte-rendu *"
                value={crContent}
                onChange={(e) => setCrContent(e.target.value)}
                rows={4}
                data-testid="input-cr-content"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddCR(false);
                    resetCrForm();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  disabled={!crDate || !crTitle.trim() || !crContent.trim() || createCrMutation.isPending}
                  onClick={() => createCrMutation.mutate({
                    updateDate: crDate,
                    title: crTitle.trim(),
                    content: crContent.trim(),
                    type: crType,
                  })}
                  data-testid="button-save-cr"
                >
                  {createCrMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {updatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : projectUpdates.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {projectUpdates
                .sort((a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime())
                .map((update) => {
                  const typeConfig = updateTypeConfig[update.type] || updateTypeConfig.autre;
                  return (
                    <div key={update.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
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
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <h5 className="font-medium text-sm">{update.title}</h5>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {update.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : !showAddCR && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun compte-rendu de suivi. Cliquez sur "Ajouter CR" pour créer un historique.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deliverables Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-600" />
              Livrables
            </CardTitle>
            <Button onClick={() => setDeliverableDialogOpen(true)} data-testid="button-add-deliverable">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau livrable
            </Button>
          </div>
          <CardDescription>
            Chaque projet comprend 3 livrables avec 3 versions: V1 (initial), V2 (retouche), V3 (actualisation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((num) => {
              const deliverablesByNum = projectDeliverables.filter(d => d.deliverableNumber === num);

              return (
                <div key={num} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-700 dark:text-violet-300 text-sm font-bold">
                      {num}
                    </span>
                    Livrable {num}
                  </h3>
                  {deliverablesByNum.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune version créée</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setDeliverableNumber(num as 1 | 2 | 3);
                          setDeliverableVersion('v1');
                          setDeliverableDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Créer V1
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {['v1', 'v2', 'v3'].map((version) => {
                        const deliverable = deliverablesByNum.find(d => d.version === version);

                        if (!deliverable) {
                          const prevVersion = version === 'v2' ? 'v1' : version === 'v3' ? 'v2' : null;
                          const hasPrevVersion = prevVersion ? deliverablesByNum.some(d => d.version === prevVersion && (d.status === 'approved' || d.status === 'revision_requested')) : true;

                          if (!hasPrevVersion) return null;

                          return (
                            <div key={version} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border-dashed border">
                              <span className="text-sm text-muted-foreground">{version.toUpperCase()} - Non créé</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeliverableNumber(num as 1 | 2 | 3);
                                  setDeliverableVersion(version as 'v1' | 'v2' | 'v3');
                                  setDeliverableDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Créer
                              </Button>
                            </div>
                          );
                        }

                        const statusColors: Record<string, string> = {
                          pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                          submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                          approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                          revision_requested: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                        };

                        const statusLabels: Record<string, string> = {
                          pending: 'En attente',
                          submitted: 'Soumis',
                          approved: 'Approuvé',
                          revision_requested: 'Révision demandée',
                        };

                        return (
                          <div key={deliverable.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                            <div className="flex-shrink-0">
                              {deliverable.type === 'loom' && <Video className="h-6 w-6 text-purple-500" />}
                              {deliverable.type === 'json' && <FileJson className="h-6 w-6 text-amber-500" />}
                              {deliverable.type === 'pdf' && <FileText className="h-6 w-6 text-red-500" />}
                              {deliverable.type === 'other' && <File className="h-6 w-6 text-gray-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-semibold">
                                  {version.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{deliverable.title}</span>
                                <Badge className={statusColors[deliverable.status] || statusColors.pending}>
                                  {statusLabels[deliverable.status] || deliverable.status}
                                </Badge>
                              </div>
                              {deliverable.description && (
                                <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                              )}
                              {deliverable.clientComment && (
                                <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                  <p className="text-sm text-amber-700 dark:text-amber-300">
                                    <strong>Commentaire client:</strong> {deliverable.clientComment}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Mis à jour le {new Date(deliverable.updatedAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {deliverable.url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(deliverable.url!, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              {deliverable.status === 'approved' && (
                                <ThumbsUp className="h-5 w-5 text-emerald-500" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDeliverableMutation.mutate(deliverable.id)}
                                disabled={deleteDeliverableMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Widget Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-violet-600" />
                Calendrier du projet
              </CardTitle>
              <CardDescription>Gérez vos événements, réunions et échéances</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEventDialogOpen(true)} data-testid="button-add-event">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Nouvel événement
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calendar View Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={calendarView === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('month')}
                >
                  Mois
                </Button>
                <Button
                  variant={calendarView === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('week')}
                >
                  Semaine
                </Button>
                <Button
                  variant={calendarView === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('day')}
                >
                  Jour
                </Button>
              </div>

              {/* Event Type Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                {Object.entries(eventTypeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                      <Icon className="h-3 w-3" style={{ color: config.color }} />
                      <span className="text-muted-foreground">{config.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* React Big Calendar */}
              <div className="h-[500px] border rounded-lg p-2 bg-white dark:bg-gray-950">
                <BigCalendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  view={calendarView}
                  onView={(view) => setCalendarView(view as 'month' | 'week' | 'day')}
                  date={calendarDate}
                  onNavigate={(date) => setCalendarDate(date)}
                  eventPropGetter={eventStyleGetter}
                  selectable
                  onSelectSlot={handleSelectSlot}
                  messages={{
                    next: 'Suivant',
                    previous: 'Précédent',
                    today: "Aujourd'hui",
                    month: 'Mois',
                    week: 'Semaine',
                    day: 'Jour',
                    agenda: 'Agenda',
                    date: 'Date',
                    time: 'Heure',
                    event: 'Événement',
                    noEventsInRange: 'Aucun événement dans cette période',
                  }}
                  culture="fr"
                />
              </div>

              {/* Upcoming Events List */}
              {calendarEvents.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Prochains événements</h4>
                  <div className="space-y-2">
                    {calendarEvents
                      .filter(e => new Date(e.start) >= new Date())
                      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                      .slice(0, 5)
                      .map((event) => {
                        const typeConfig = eventTypeConfig[event.type] || eventTypeConfig.personal;
                        const Icon = typeConfig.icon;
                        return (
                          <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: typeConfig.color + '20' }}>
                                <Icon className="h-4 w-4" style={{ color: typeConfig.color }} />
                              </div>
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(event.start), 'dd MMM yyyy HH:mm', { locale: fr })}
                                  {!event.allDay && ` - ${format(new Date(event.end), 'HH:mm', { locale: fr })}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!event.googleCalendarSynced && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => syncGoogleCalendarMutation.mutate(event.id)}
                                  title="Synchroniser avec Google Calendar"
                                >
                                  <CloudUpload className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => deleteEventMutation.mutate(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
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

      {/* Dialog for creating calendar events */}
      <Dialog open={eventDialogOpen} onOpenChange={(open) => { setEventDialogOpen(open); if (!open) resetEventForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-violet-600" />
              Nouvel événement
            </DialogTitle>
            <DialogDescription>
              Ajoutez un événement au calendrier du projet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Titre *</Label>
              <Input
                id="event-title"
                placeholder="Titre de l'événement"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                data-testid="input-event-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-type">Type</Label>
              <Select value={eventType} onValueChange={(value: typeof eventType) => setEventType(value)}>
                <SelectTrigger id="event-type" data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      Échéance
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      Réunion
                    </div>
                  </SelectItem>
                  <SelectItem value="milestone">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Jalon
                    </div>
                  </SelectItem>
                  <SelectItem value="reminder">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-500" />
                      Rappel
                    </div>
                  </SelectItem>
                  <SelectItem value="personal">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      Personnel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Début *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  data-testid="input-event-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">Fin *</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  data-testid="input-event-end"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-allday"
                checked={eventAllDay}
                onChange={(e) => setEventAllDay(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="event-allday">Journée entière</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Description de l'événement (optionnel)"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                data-testid="input-event-description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={createEventMutation.isPending || !eventTitle.trim() || !eventStart || !eventEnd}
              data-testid="button-save-event"
            >
              {createEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding workflow steps */}
      <Dialog open={stepDialogOpen} onOpenChange={(open) => { setStepDialogOpen(open); if (!open) resetStepForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-600" />
              Nouvelle étape
            </DialogTitle>
            <DialogDescription>
              Ajoutez une étape au workflow du projet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="step-name">Nom de l'étape *</Label>
              <Input
                id="step-name"
                placeholder="Ex: Analyse des besoins"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                data-testid="input-step-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="step-description">Description</Label>
              <Textarea
                id="step-description"
                placeholder="Description de l'étape (optionnel)"
                value={newStepDescription}
                onChange={(e) => setNewStepDescription(e.target.value)}
                rows={3}
                data-testid="input-step-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="step-start-date">Date de début</Label>
                <Input
                  id="step-start-date"
                  type="date"
                  value={newStepStartDate}
                  onChange={(e) => setNewStepStartDate(e.target.value)}
                  data-testid="input-step-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="step-end-date">Date de fin prévue</Label>
                <Input
                  id="step-end-date"
                  type="date"
                  value={newStepEndDate}
                  onChange={(e) => setNewStepEndDate(e.target.value)}
                  data-testid="input-step-end-date"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddStep}
              disabled={addStepMutation.isPending || !newStepName.trim()}
              data-testid="button-save-step"
            >
              {addStepMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating deliverables */}
      <Dialog open={deliverableDialogOpen} onOpenChange={(open) => { setDeliverableDialogOpen(open); if (!open) resetDeliverableForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-600" />
              Nouveau livrable
            </DialogTitle>
            <DialogDescription>
              Ajoutez un livrable pour le projet (V1, V2 ou V3)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Livrable N°</Label>
                <Select value={deliverableNumber.toString()} onValueChange={(v) => setDeliverableNumber(parseInt(v) as 1 | 2 | 3)}>
                  <SelectTrigger data-testid="select-deliverable-number">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Livrable 1</SelectItem>
                    <SelectItem value="2">Livrable 2</SelectItem>
                    <SelectItem value="3">Livrable 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Version</Label>
                <Select value={deliverableVersion} onValueChange={(v) => setDeliverableVersion(v as 'v1' | 'v2' | 'v3')}>
                  <SelectTrigger data-testid="select-deliverable-version">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v1">V1 - Initial</SelectItem>
                    <SelectItem value="v2">V2 - Retouche</SelectItem>
                    <SelectItem value="v3">V3 - Actualisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable-title">Titre *</Label>
              <Input
                id="deliverable-title"
                placeholder="Titre du livrable"
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
                data-testid="input-deliverable-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Type de fichier</Label>
              <Select value={deliverableType} onValueChange={(v) => setDeliverableType(v as 'loom' | 'json' | 'pdf' | 'other')}>
                <SelectTrigger data-testid="select-deliverable-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loom">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-500" />
                      Vidéo Loom
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-amber-500" />
                      Fichier JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      Document PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-gray-500" />
                      Autre
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable-url">URL du fichier</Label>
              <Input
                id="deliverable-url"
                placeholder={deliverableType === 'loom' ? 'https://www.loom.com/share/...' : 'https://...'}
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                data-testid="input-deliverable-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable-description">Description</Label>
              <Textarea
                id="deliverable-description"
                placeholder="Description du livrable..."
                value={deliverableDescription}
                onChange={(e) => setDeliverableDescription(e.target.value)}
                rows={3}
                data-testid="input-deliverable-description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeliverableDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                createDeliverableMutation.mutate({
                  deliverableNumber,
                  version: deliverableVersion,
                  title: deliverableTitle.trim(),
                  description: deliverableDescription.trim() || undefined,
                  type: deliverableType,
                  url: deliverableUrl.trim() || undefined,
                });
              }}
              disabled={createDeliverableMutation.isPending || !deliverableTitle.trim()}
              data-testid="button-save-deliverable"
            >
              {createDeliverableMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Soumettre au client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
