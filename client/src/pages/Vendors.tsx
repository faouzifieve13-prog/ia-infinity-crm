import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Loader2, Users, Briefcase, Mail, Building2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Vendor, VendorAvailability, Project, Mission } from '@/lib/types';

const vendorFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  company: z.string().optional(),
  email: z.string().email('Email invalide'),
  dailyRate: z.string().optional(),
  skills: z.string().optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).default('available'),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

const missionFormSchema = z.object({
  projectId: z.string().min(1, 'Le projet est requis'),
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
});

type MissionFormValues = z.infer<typeof missionFormSchema>;

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | VendorAvailability>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      dailyRate: '',
      skills: '',
      availability: 'available',
    },
  });

  const missionForm = useForm<MissionFormValues>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      projectId: '',
      title: '',
      description: '',
    },
  });

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: missions = [] } = useQuery<Mission[]>({
    queryKey: ['/api/missions'],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const payload = {
        ...data,
        company: data.company || null,
        dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : 0,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return apiRequest('POST', '/api/vendors', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: 'Sous-traitant créé',
        description: 'Le sous-traitant a été ajouté avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le sous-traitant.',
        variant: 'destructive',
      });
    },
  });

  const createMissionMutation = useMutation({
    mutationFn: async (data: MissionFormValues & { vendorId: string }) => {
      return apiRequest('POST', '/api/missions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      setAssignDialogOpen(false);
      setSelectedVendor(null);
      missionForm.reset();
      toast({
        title: 'Mission créée',
        description: 'Le sous-traitant a été affecté au projet.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la mission.',
        variant: 'destructive',
      });
    },
  });

  const onSubmitVendor = (data: VendorFormValues) => {
    createVendorMutation.mutate(data);
  };

  const onSubmitMission = (data: MissionFormValues) => {
    if (!selectedVendor) return;
    createMissionMutation.mutate({ ...data, vendorId: selectedVendor.id });
  };

  const openAssignDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setAssignDialogOpen(true);
  };

  const getVendorMissions = (vendorId: string) => {
    return missions.filter(m => m.vendorId === vendorId);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Non assigné';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projet inconnu';
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.skills || []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAvailability = availabilityFilter === 'all' || vendor.availability === availabilityFilter;
    return matchesSearch && matchesAvailability;
  });

  const getAvailabilityBadge = (availability: VendorAvailability) => {
    switch (availability) {
      case 'available':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Disponible</Badge>;
      case 'busy':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Occupé</Badge>;
      case 'unavailable':
        return <Badge variant="default" className="bg-red-500/10 text-red-600 border-red-500/20">Indisponible</Badge>;
    }
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Sous-traitants</h1>
          <p className="text-muted-foreground">Gérez vos sous-traitants et leurs affectations</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vendor">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau sous-traitant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un sous-traitant</DialogTitle>
              <DialogDescription>
                Renseignez les informations du nouveau sous-traitant.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitVendor)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} data-testid="input-vendor-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Société</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de la société" {...field} data-testid="input-vendor-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemple.com" {...field} data-testid="input-vendor-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dailyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TJM (EUR)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} data-testid="input-vendor-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disponibilité</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vendor-availability">
                              <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="busy">Occupé</SelectItem>
                            <SelectItem value="unavailable">Indisponible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compétences (séparées par des virgules)</FormLabel>
                      <FormControl>
                        <Input placeholder="React, Node.js, Python..." {...field} data-testid="input-vendor-skills" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createVendorMutation.isPending} data-testid="button-submit-vendor">
                    {createVendorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un sous-traitant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-vendors"
          />
        </div>

        <Select value={availabilityFilter} onValueChange={(v) => setAvailabilityFilter(v as typeof availabilityFilter)}>
          <SelectTrigger className="w-40" data-testid="select-availability-filter">
            <SelectValue placeholder="Disponibilité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="busy">Occupé</SelectItem>
            <SelectItem value="unavailable">Indisponible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Aucun sous-traitant trouvé</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un sous-traitant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => {
            const vendorMissions = getVendorMissions(vendor.id);
            return (
              <Card key={vendor.id} className="hover-elevate" data-testid={`card-vendor-${vendor.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{vendor.name}</CardTitle>
                      {vendor.company && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{vendor.company}</span>
                        </div>
                      )}
                    </div>
                    {getAvailabilityBadge(vendor.availability as VendorAvailability)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  
                  {Number(vendor.dailyRate) > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{Number(vendor.dailyRate).toFixed(0)} EUR/jour</span>
                    </div>
                  )}
                  
                  {vendor.skills && vendor.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {vendor.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{vendor.skills.length - 3}</Badge>
                      )}
                    </div>
                  )}

                  {vendor.performance && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Performance: {vendor.performance}%</span>
                    </div>
                  )}
                  
                  {vendorMissions.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Briefcase className="h-3 w-3" />
                        <span>Projets affectés ({vendorMissions.length})</span>
                      </div>
                      <div className="space-y-1">
                        {vendorMissions.slice(0, 2).map((mission) => (
                          <div key={mission.id} className="text-xs bg-muted/50 rounded px-2 py-1 truncate">
                            {getProjectName(mission.projectId)}
                          </div>
                        ))}
                        {vendorMissions.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{vendorMissions.length - 2} autres projets
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => openAssignDialog(vendor)}
                    data-testid={`button-assign-vendor-${vendor.id}`}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Affecter à un projet
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Affecter à un projet</DialogTitle>
            <DialogDescription>
              {selectedVendor && `Créer une mission pour ${selectedVendor.name}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...missionForm}>
            <form onSubmit={missionForm.handleSubmit(onSubmitMission)} className="space-y-4">
              <FormField
                control={missionForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-mission-project">
                          <SelectValue placeholder="Sélectionner un projet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={missionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre de la mission *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Développement frontend" {...field} data-testid="input-mission-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={missionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description de la mission" {...field} data-testid="input-mission-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMissionMutation.isPending} data-testid="button-submit-mission">
                  {createMissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Affecter
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
