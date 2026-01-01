import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  MessageSquare,
  Send,
  AlertCircle,
  Loader2,
  Plus,
  StickyNote,
  Package,
  Video,
  FileJson,
  File,
  ExternalLink,
  RotateCcw,
  ThumbsUp
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const taskFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  vendorId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  pricingTier: string | null;
  deliverySteps: string | null;
  clientValidationNotes: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  vendorId: string | null;
}

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

interface Document {
  id: string;
  name: string;
  type: string | null;
  url: string | null;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  isFromClient: boolean;
  createdAt: string;
}

interface ProjectUpdate {
  id: string;
  updateDate: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  createdById?: string;
}

interface ProjectDeliverable {
  id: string;
  deliverableNumber: number;
  version: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  status: string;
  clientComment?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetail {
  project: Project;
  tasks: Task[];
  missions: Mission[];
  documents: Document[];
  comments: Comment[];
  vendors: Vendor[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" className="bg-emerald-500">Actif</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-blue-500">Terminé</Badge>;
    case "on_hold":
      return <Badge variant="secondary">En pause</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annulé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTaskStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">En attente</Badge>;
    case "in_progress":
      return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
    case "review":
      return <Badge variant="default" className="bg-amber-500">En revue</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-emerald-500">Terminé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return <Badge variant="destructive">Urgent</Badge>;
    case "high":
      return <Badge variant="default" className="bg-orange-500">Haute</Badge>;
    case "medium":
      return <Badge variant="secondary">Moyenne</Badge>;
    case "low":
      return <Badge variant="outline">Basse</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}

export default function ClientProjectDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/client/projects/:id");
  const projectId = params?.id;
  const [newComment, setNewComment] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<ProjectDeliverable | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const { toast } = useToast();

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      vendorId: "",
      dueDate: "",
    },
  });

  const { data, isLoading, error } = useQuery<ProjectDetail>({
    queryKey: ["/api/client/projects", projectId],
    enabled: !!projectId,
  });

  // Project Updates (CR)
  const { data: projectUpdates = [] } = useQuery<ProjectUpdate[]>({
    queryKey: [`/api/client/projects/${projectId}/updates`],
    enabled: !!projectId,
  });

  // Project Deliverables
  const { data: projectDeliverables = [] } = useQuery<ProjectDeliverable[]>({
    queryKey: [`/api/client/projects/${projectId}/deliverables`],
    enabled: !!projectId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/client/projects/${projectId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/projects", projectId] });
      setNewComment("");
      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été envoyé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire.",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const payload = {
        ...data,
        projectId,
        status: "pending",
        vendorId: data.vendorId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      return apiRequest("POST", "/api/client/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/projects", projectId] });
      setTaskDialogOpen(false);
      taskForm.reset();
      toast({
        title: "Tâche créée",
        description: "Votre tâche a été créée avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la tâche.",
        variant: "destructive",
      });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ deliverableId, comment }: { deliverableId: string; comment: string }) => {
      return apiRequest("POST", `/api/client/projects/${projectId}/deliverables/${deliverableId}/request-revision`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client/projects/${projectId}/deliverables`] });
      setRevisionDialogOpen(false);
      setSelectedDeliverable(null);
      setRevisionComment("");
      toast({
        title: "Demande de révision envoyée",
        description: "Le sous-traitant a été notifié de votre demande de modification.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande de révision.",
        variant: "destructive",
      });
    },
  });

  const approveDeliverableMutation = useMutation({
    mutationFn: async (deliverableId: string) => {
      return apiRequest("POST", `/api/client/projects/${projectId}/deliverables/${deliverableId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client/projects/${projectId}/deliverables`] });
      toast({
        title: "Livrable approuvé",
        description: "Le livrable a été validé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le livrable.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card className="border-red-200">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium">Projet non trouvé</p>
              <p className="text-muted-foreground mb-4">Ce projet n'existe pas ou vous n'y avez pas accès.</p>
              <Button onClick={() => setLocation("/client")} data-testid="button-back-to-portal">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au portail
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { project, tasks, missions, documents, comments, vendors = [] } = data;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const completedMissions = missions.filter(m => m.status === "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation("/client")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-project-title">
                {project.name}
              </h1>
              {getStatusBadge(project.status)}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-violet-600" />
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{project.progress}%</div>
              <Progress value={project.progress} className="h-2" />
            </CardContent>
          </Card>

          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-violet-600" />
                Tâches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}/{tasks.length}</div>
              <p className="text-xs text-muted-foreground">tâches terminées</p>
            </CardContent>
          </Card>

          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-600" />
                Échéance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {project.endDate 
                  ? format(new Date(project.endDate), "d MMMM yyyy", { locale: fr })
                  : "Non définie"
                }
              </div>
              {project.startDate && (
                <p className="text-xs text-muted-foreground">
                  Début: {format(new Date(project.startDate), "d MMM yyyy", { locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="livrables" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="livrables" data-testid="tab-livrables">
              <Package className="h-4 w-4 mr-2" />
              Livrables
            </TabsTrigger>
            <TabsTrigger value="cr" data-testid="tab-cr">
              <StickyNote className="h-4 w-4 mr-2" />
              CR ({projectUpdates.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <ListTodo className="h-4 w-4 mr-2" />
              Tâches ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="missions" data-testid="tab-missions">
              <FolderKanban className="h-4 w-4 mr-2" />
              Missions
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              Docs ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="livrables">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-violet-600" />
                  Livrables du projet
                </CardTitle>
                <CardDescription>
                  Chaque projet comprend 3 livrables avec 3 versions: V1 (initial), V2 (retouche), V3 (actualisation selon vos retours)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectDeliverables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun livrable disponible pour le moment</p>
                    <p className="text-sm mt-2">Les livrables seront ajoutés par le sous-traitant au fur et à mesure.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[1, 2, 3].map((num) => {
                      const deliverablesByNum = projectDeliverables.filter(d => d.deliverableNumber === num);
                      if (deliverablesByNum.length === 0) return null;

                      return (
                        <div key={num} className="border rounded-lg p-4">
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-700 dark:text-violet-300 text-sm font-bold">
                              {num}
                            </span>
                            Livrable {num}
                          </h3>
                          <div className="grid gap-3">
                            {['v1', 'v2', 'v3'].map((version) => {
                              const deliverable = deliverablesByNum.find(d => d.version === version);
                              if (!deliverable) return null;

                              const statusColors = {
                                pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                                submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                                approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                                revision_requested: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                              };

                              const statusLabels = {
                                pending: 'En attente',
                                submitted: 'Soumis',
                                approved: 'Approuvé',
                                revision_requested: 'Révision demandée',
                              };

                              return (
                                <div key={deliverable.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
                                      <Badge className={statusColors[deliverable.status as keyof typeof statusColors] || statusColors.pending}>
                                        {statusLabels[deliverable.status as keyof typeof statusLabels] || deliverable.status}
                                      </Badge>
                                    </div>
                                    {deliverable.description && (
                                      <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                                    )}
                                    {deliverable.clientComment && (
                                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 italic">
                                        Votre commentaire: {deliverable.clientComment}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Mis à jour le {format(new Date(deliverable.updatedAt), "d MMM yyyy à HH:mm", { locale: fr })}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {deliverable.url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(deliverable.url, '_blank')}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {deliverable.status === 'submitted' && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedDeliverable(deliverable);
                                            setRevisionDialogOpen(true);
                                          }}
                                          className="text-amber-600 hover:text-amber-700"
                                        >
                                          <RotateCcw className="h-4 w-4 mr-1" />
                                          Révision
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => approveDeliverableMutation.mutate(deliverable.id)}
                                          disabled={approveDeliverableMutation.isPending}
                                          className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                          <ThumbsUp className="h-4 w-4 mr-1" />
                                          Approuver
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cr">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-violet-600" />
                  Comptes-Rendus de Suivi
                </CardTitle>
                <CardDescription>
                  Historique des rapports d'avancement du projet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun compte-rendu pour le moment</p>
                    <p className="text-sm mt-2">Les CR seront ajoutés par l'équipe au fil du projet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {projectUpdates
                      .sort((a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime())
                      .map((update) => {
                        const typeColors = {
                          suivi: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                          avancement: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                          probleme: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                          livraison: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                          autre: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                        };

                        return (
                          <div key={update.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={typeColors[update.type as keyof typeof typeColors] || typeColors.autre}>
                                  {update.type.charAt(0).toUpperCase() + update.type.slice(1)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(update.updateDate), "d MMMM yyyy", { locale: fr })}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-semibold mb-2">{update.title}</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {update.content}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tâches du projet</CardTitle>
                  <CardDescription>Suivez l'avancement de chaque tâche</CardDescription>
                </div>
                <Button onClick={() => setTaskDialogOpen(true)} size="sm" data-testid="button-add-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune tâche pour le moment</p>
                    <Button
                      onClick={() => setTaskDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                      data-testid="button-add-task-empty"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une tâche
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 border rounded-lg"
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                              <h3 className="font-medium">{task.title}</h3>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-7">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(task.priority)}
                            {getTaskStatusBadge(task.status)}
                          </div>
                        </div>
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground ml-7">
                            Échéance: {format(new Date(task.dueDate), "d MMMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missions">
            <Card>
              <CardHeader>
                <CardTitle>Missions</CardTitle>
                <CardDescription>Étapes principales du projet</CardDescription>
              </CardHeader>
              <CardContent>
                {missions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune mission pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missions.map((mission) => (
                      <div 
                        key={mission.id} 
                        className="p-4 border rounded-lg"
                        data-testid={`card-mission-${mission.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium">{mission.title}</h3>
                            {mission.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {mission.description}
                              </p>
                            )}
                            {(mission.startDate || mission.endDate) && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {mission.startDate && format(new Date(mission.startDate), "d MMM", { locale: fr })}
                                {mission.startDate && mission.endDate && " - "}
                                {mission.endDate && format(new Date(mission.endDate), "d MMM yyyy", { locale: fr })}
                              </p>
                            )}
                          </div>
                          {getTaskStatusBadge(mission.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Documents liés à votre projet</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-4 border rounded-lg flex items-center justify-between"
                        data-testid={`card-document-${doc.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-violet-600" />
                          <div>
                            <h3 className="font-medium">{doc.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {doc.type} • {format(new Date(doc.createdAt), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        {doc.url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(doc.url!, '_blank')}
                            data-testid={`button-view-document-${doc.id}`}
                          >
                            Voir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Échangez avec l'équipe projet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun message pour le moment</p>
                      <p className="text-sm">Soyez le premier à envoyer un message !</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div 
                        key={comment.id}
                        className={`flex gap-3 ${comment.isFromClient ? 'flex-row-reverse' : ''}`}
                        data-testid={`comment-${comment.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={comment.isFromClient ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}>
                            {comment.userName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[80%] ${comment.isFromClient ? 'text-right' : ''}`}>
                          <div className={`inline-block p-3 rounded-lg ${
                            comment.isFromClient 
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-left' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {!comment.isFromClient && <span className="font-medium">{comment.userName}</span>}
                            <span>{format(new Date(comment.createdAt), "d MMM à HH:mm", { locale: fr })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSubmitComment} className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 min-h-[80px]"
                    data-testid="input-comment"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-send-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {project.deliverySteps && (
          <Card>
            <CardHeader>
              <CardTitle>Étapes de livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                  {project.deliverySteps}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {project.clientValidationNotes && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                Notes de validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{project.clientValidationNotes}</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
              <DialogDescription>
                Créer une nouvelle tâche pour ce projet.
              </DialogDescription>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input placeholder="Titre de la tâche" {...field} data-testid="input-task-title" />
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
                        <Textarea placeholder="Description de la tâche" {...field} data-testid="input-task-description" />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value || "medium"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue placeholder="Sélectionner une priorité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {vendors.length > 0 && (
                  <FormField
                    control={taskForm.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigner à un sous-traitant</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-vendor">
                              <SelectValue placeholder="Sélectionner un sous-traitant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Non assigné</SelectItem>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'échéance</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-task-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                    {createTaskMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Demander une révision</DialogTitle>
              <DialogDescription>
                {selectedDeliverable && (
                  <>Livrable: {selectedDeliverable.title} ({selectedDeliverable.version.toUpperCase()})</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Décrivez les modifications souhaitées *
                </label>
                <Textarea
                  placeholder="Expliquez ce qui doit être modifié..."
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRevisionDialogOpen(false);
                    setSelectedDeliverable(null);
                    setRevisionComment("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (selectedDeliverable && revisionComment.trim()) {
                      requestRevisionMutation.mutate({
                        deliverableId: selectedDeliverable.id,
                        comment: revisionComment.trim(),
                      });
                    }
                  }}
                  disabled={!revisionComment.trim() || requestRevisionMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {requestRevisionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Demander la révision
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
