import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MissionCard } from '@/components/vendor/MissionCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useSpace } from '@/hooks/use-space';
import type { Mission, Project, MissionStatus } from '@/lib/types';

export default function Missions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MissionStatus>('all');
  const { vendorContactId, currentSpace } = useSpace();

  const isVendorPortal = currentSpace === 'vendor' && vendorContactId;

  const { data: missions = [], isLoading } = useQuery<Mission[]>({
    queryKey: isVendorPortal 
      ? ['/api/vendor/missions', { vendorContactId }] 
      : ['/api/missions'],
    queryFn: async () => {
      const url = isVendorPortal 
        ? `/api/vendor/missions?vendorContactId=${vendorContactId}`
        : '/api/missions';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: isVendorPortal 
      ? ['/api/vendor/projects', { vendorContactId }] 
      : ['/api/projects'],
    queryFn: async () => {
      const url = isVendorPortal 
        ? `/api/vendor/projects?vendorContactId=${vendorContactId}`
        : '/api/projects';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || 'Unknown';
  };

  const missionsWithProject = missions.map(m => ({
    ...m,
    projectName: getProjectName(m.projectId),
  }));

  const filteredMissions = missionsWithProject.filter((mission) => {
    const matchesSearch =
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeMissions = missions.filter((m) => m.status === 'in_progress').length;
  const pendingMissions = missions.filter((m) => m.status === 'pending').length;
  const reviewMissions = missions.filter((m) => m.status === 'review').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Mes Missions</h1>
        <p className="text-muted-foreground">Gérez vos missions et livrables assignés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="En cours"
          value={activeMissions}
          icon={Clock}
        />
        <MetricCard
          title="En attente"
          value={pendingMissions}
          icon={AlertCircle}
        />
        <MetricCard
          title="En révision"
          value={reviewMissions}
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-missions"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="review">En révision</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Aucune mission trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClick={() => console.log('View mission', mission.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
