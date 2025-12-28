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
  Plus
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

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <ListTodo className="h-4 w-4 mr-2" />
              Tâches ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="missions" data-testid="tab-missions">
              <FolderKanban className="h-4 w-4 mr-2" />
              Missions ({missions.length})
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages ({comments.length})
            </TabsTrigger>
          </TabsList>

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
      </div>
    </div>
  );
}
