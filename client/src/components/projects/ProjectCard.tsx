import { Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ProjectStatus } from '@/lib/types';

interface ProjectCardProject {
  id: string;
  name: string;
  accountName?: string;
  status: ProjectStatus;
  progress: number;
  tasksCompleted?: number;
  totalTasks?: number;
  startDate: string;
}

interface ProjectCardProps {
  project: ProjectCardProject;
  onClick?: () => void;
}

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  on_hold: { label: 'On Hold', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const status = statusConfig[project.status];

  return (
    <Card
      className="cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={`project-card-${project.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{project.name}</CardTitle>
            {project.accountName && (
              <p className="text-sm text-muted-foreground truncate">{project.accountName}</p>
            )}
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>{project.tasksCompleted || 0}/{project.totalTasks || 0} tasks</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
