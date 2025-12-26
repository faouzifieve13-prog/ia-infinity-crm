import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Hash, Users, Briefcase, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChannelList } from '@/components/channels/ChannelList';
import { ChannelView } from '@/components/channels/ChannelView';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'client' | 'vendor';
  scope: 'global' | 'project';
  projectId?: string;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  const initDefaultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/channels/init-defaults');
      return res.json();
    },
    onSuccess: (data: any) => {
      // Use refetchQueries to force refresh since staleTime is Infinity
      queryClient.refetchQueries({ queryKey: ['/api/channels'] });
      toast({
        title: 'Canaux initialisés',
        description: `${data.created?.length || 0} canal(aux) créé(s)`,
      });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return apiRequest('DELETE', `/api/channels/${channelId}`);
    },
    onSuccess: () => {
      // Use refetchQueries to force refresh since staleTime is Infinity
      queryClient.refetchQueries({ queryKey: ['/api/channels'] });
      if (selectedChannel?.id === channelToDelete?.id) {
        setSelectedChannel(null);
      }
      setChannelToDelete(null);
      toast({
        title: 'Canal supprimé',
        description: 'Le canal a été supprimé avec succès',
      });
    },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Canaux de communication</h1>
          <p className="text-muted-foreground">
            Gérez les espaces d'échange avec vos clients et sous-traitants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => initDefaultsMutation.mutate()}>
            <Settings className="h-4 w-4 mr-2" />
            Initialiser les canaux par défaut
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau canal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Channel list */}
        <div className="col-span-3 overflow-y-auto">
          <ChannelList
            selectedChannelId={selectedChannel?.id}
            onSelectChannel={setSelectedChannel}
            showCreateButton={false}
          />

          {selectedChannel && (
            <div className="mt-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setChannelToDelete(selectedChannel)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer ce canal
              </Button>
            </div>
          )}
        </div>

        {/* Channel view */}
        <div className="col-span-9">
          {selectedChannel ? (
            <ChannelView channel={selectedChannel} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Sélectionnez un canal</h3>
                <p className="text-muted-foreground">
                  Choisissez un canal dans la liste pour voir les messages
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create channel dialog */}
      <CreateChannelDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projects={projects || []}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!channelToDelete} onOpenChange={() => setChannelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le canal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages de ce canal seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => channelToDelete && deleteChannelMutation.mutate(channelToDelete.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateChannelDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'client' | 'vendor'>('client');
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [projectId, setProjectId] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/channels', data);
    },
    onSuccess: () => {
      // Use refetchQueries to force refresh since staleTime is Infinity
      queryClient.refetchQueries({ queryKey: ['/api/channels'] });
      onOpenChange(false);
      resetForm();
      toast({
        title: 'Canal créé',
        description: 'Le nouveau canal a été créé avec succès',
      });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('client');
    setScope('global');
    setProjectId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || undefined,
      type,
      scope,
      projectId: scope === 'project' ? projectId : undefined,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau canal</DialogTitle>
          <DialogDescription>
            Créez un espace de communication pour vos clients ou sous-traitants
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du canal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Annonces clients"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du canal..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: 'client' | 'vendor') => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Client
                    </div>
                  </SelectItem>
                  <SelectItem value="vendor">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Sous-traitant
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Portée</Label>
              <Select value={scope} onValueChange={(v: 'global' | 'project') => setScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (tous)</SelectItem>
                  <SelectItem value="project">Projet spécifique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === 'project' && (
            <div className="space-y-2">
              <Label>Projet</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Créer le canal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
