import { Calendar, CheckCircle2, FolderKanban, ArrowRight, MoreHorizontal, Edit2, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProjectStatus, PricingTier } from '@/lib/types';

interface ProjectCardProject {
  id: string;
  name: string;
  accountName?: string;
  status: ProjectStatus;
  progress: number;
  tasksCompleted?: number;
  totalTasks?: number;
  startDate?: string | null;
  endDate?: string | null;
  pricingTier?: PricingTier | null;
}

const PRICING_TIERS: Record<string, { label: string; price: number }> = {
  simple: { label: 'Simple', price: 150 },
  intermediate: { label: 'Intermédiaire', price: 250 },
  expert: { label: 'Expert', price: 350 },
};

interface ProjectCardProps {
  project: ProjectCardProject;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  index?: number;
  showPricing?: boolean;
}

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  active: { label: 'Actif', variant: 'default', color: 'bg-emerald-500' },
  on_hold: { label: 'En pause', variant: 'secondary', color: 'bg-amber-500' },
  completed: { label: 'Terminé', variant: 'outline', color: 'bg-blue-500' },
  cancelled: { label: 'Annulé', variant: 'destructive', color: 'bg-red-500' },
  archived: { label: 'Archivé', variant: 'secondary', color: 'bg-gray-500' },
};

export function ProjectCard({ project, onClick, onEdit, onArchive, onDelete, index = 0, showPricing = false }: ProjectCardProps) {
  const status = statusConfig[project.status];
  const isArchived = project.status === 'archived';
  const pricingInfo = project.pricingTier ? PRICING_TIERS[project.pricingTier] : null;

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
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
              {showPricing && pricingInfo && (
                <Badge variant="outline" className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                  {pricingInfo.price}€
                </Badge>
              )}
              {(onEdit || onArchive || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-project-actions-${project.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-project-${project.id}`}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    {onArchive && (
                      <DropdownMenuItem onClick={onArchive} data-testid={`button-archive-project-${project.id}`}>
                        {isArchived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Désarchiver
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archiver
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`button-delete-project-${project.id}`}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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
                <span>
                  {project.endDate 
                    ? new Date(project.endDate).toLocaleDateString('fr-FR')
                    : 'Non définie'
                  }
                </span>
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
