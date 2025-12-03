import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Grid3X3, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project, Account, ProjectStatus } from '@/lib/types';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const projectsWithAccount = projects.map(p => ({
    ...p,
    accountName: getAccountName(p.accountId),
    tasksCompleted: 0,
    totalTasks: 0,
  }));

  const filteredProjects = projectsWithAccount.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Projects</h1>
          <p className="text-muted-foreground">Manage active projects and deliverables</p>
        </div>

        <Button data-testid="button-add-project">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-projects"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
            data-testid="button-view-grid"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No projects found</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => console.log('View project', project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
