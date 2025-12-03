import { Calendar, CheckCircle2, FolderKanban, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
  index?: number;
}

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  active: { label: 'Actif', variant: 'default', color: 'bg-emerald-500' },
  on_hold: { label: 'En pause', variant: 'secondary', color: 'bg-amber-500' },
  completed: { label: 'Terminé', variant: 'outline', color: 'bg-blue-500' },
  cancelled: { label: 'Annulé', variant: 'destructive', color: 'bg-red-500' },
};

export function ProjectCard({ project, onClick, index = 0 }: ProjectCardProps) {
  const status = statusConfig[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        className="cursor-pointer group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300"
        onClick={onClick}
        data-testid={`project-card-${project.id}`}
      >
        <div className={`h-1 ${status.color} transition-all duration-300 group-hover:h-1.5`} />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-muted">
                  <FolderKanban className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
              </div>
              {project.accountName && (
                <p className="text-sm text-muted-foreground truncate pl-8">{project.accountName}</p>
              )}
            </div>
            <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progression</span>
                <motion.span 
                  className="font-semibold text-primary"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {project.progress}%
                </motion.span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full ${status.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{project.tasksCompleted || 0}/{project.totalTasks || 0} tâches</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                Voir le projet
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
