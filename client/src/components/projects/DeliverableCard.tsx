import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  Upload,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ComplianceStepper } from './ComplianceStepper';
import type { ProjectDeliverable } from '@/lib/types';

interface DeliverableCardProps {
  deliverable: ProjectDeliverable;
  projectId: string;
  isVendorView?: boolean;
  onUpload?: (deliverable: ProjectDeliverable) => void;
}

const VERSION_CONFIG: Record<string, { label: string; color: string }> = {
  v1: { label: 'V1 - Première version', color: 'bg-blue-500' },
  v2: { label: 'V2 - Révision', color: 'bg-purple-500' },
  v3: { label: 'Final', color: 'bg-emerald-500' },
};

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  pending: {
    label: 'En attente',
    variant: 'secondary',
    icon: Clock,
    color: 'text-amber-500'
  },
  submitted: {
    label: 'Soumis',
    variant: 'default',
    icon: FileCheck,
    color: 'text-blue-500'
  },
  approved: {
    label: 'Approuvé',
    variant: 'outline',
    icon: CheckCircle2,
    color: 'text-emerald-500'
  },
  rejected: {
    label: 'Rejeté',
    variant: 'destructive',
    icon: XCircle,
    color: 'text-red-500'
  },
};

export function DeliverableCard({
  deliverable,
  projectId,
  isVendorView = false,
  onUpload
}: DeliverableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(deliverable.complianceProgress);

  const versionConfig = VERSION_CONFIG[deliverable.version] || VERSION_CONFIG.v1;
  const statusConfig = STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const canUpload = progress >= 100 && isVendorView;
  const showComplianceWorkflow = deliverable.status === 'pending' || deliverable.status === 'rejected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded && "ring-2 ring-primary/20"
      )}>
        {/* Version color bar */}
        <div className={cn("h-1.5", versionConfig.color)} />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="shrink-0">
                  {versionConfig.label}
                </Badge>
                <CardTitle className="text-base truncate">
                  {deliverable.title}
                </CardTitle>
              </div>
              {deliverable.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {deliverable.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusConfig.variant} className="gap-1">
                <StatusIcon className={cn("h-3 w-3", statusConfig.color)} />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Conformité technique</span>
              <motion.span
                key={progress}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={cn(
                  "font-semibold",
                  progress >= 100 ? "text-emerald-600" : "text-primary"
                )}
              >
                {progress}%
              </motion.span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-3" />
              {progress >= 100 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                  className="absolute -right-1 -top-1"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 bg-white dark:bg-gray-900 rounded-full" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Submitted file link */}
          {deliverable.url && deliverable.status !== 'pending' && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <FileCheck className="h-4 w-4 text-primary shrink-0" />
              <a
                href={deliverable.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex-1 truncate"
              >
                Voir le livrable soumis
              </a>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          )}

          {/* Feedback for rejected deliverables */}
          {deliverable.status === 'rejected' && deliverable.feedback && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Retour de l'équipe
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {deliverable.feedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Expand/Collapse compliance workflow button */}
            {showComplianceWorkflow && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="gap-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Masquer les étapes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Voir les étapes de conformité
                  </>
                )}
              </Button>
            )}

            {/* Upload button */}
            {isVendorView && deliverable.status === 'pending' && (
              <Button
                onClick={() => onUpload?.(deliverable)}
                disabled={!canUpload}
                className={cn(
                  "gap-2 ml-auto",
                  canUpload && "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                <Upload className="h-4 w-4" />
                {canUpload ? 'Téléverser le livrable' : `Déblocage à 100%`}
              </Button>
            )}
          </div>

          {/* Compliance workflow stepper */}
          <AnimatePresence>
            {isExpanded && showComplianceWorkflow && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t">
                  <ComplianceStepper
                    deliverable={deliverable}
                    projectId={projectId}
                    isVendorView={isVendorView}
                    onProgressUpdate={setProgress}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// List component for multiple deliverables
interface DeliverableListProps {
  deliverables: ProjectDeliverable[];
  projectId: string;
  isVendorView?: boolean;
  onUpload?: (deliverable: ProjectDeliverable) => void;
}

export function DeliverableList({
  deliverables,
  projectId,
  isVendorView = false,
  onUpload
}: DeliverableListProps) {
  // Group deliverables by deliverable number
  const grouped = deliverables.reduce((acc, d) => {
    const key = d.deliverableNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<number, ProjectDeliverable[]>);

  // Sort versions within each group
  const sortedGroups = Object.entries(grouped).map(([num, items]) => ({
    number: parseInt(num),
    items: items.sort((a, b) => {
      const order = { v1: 1, v2: 2, v3: 3 };
      return (order[a.version] || 0) - (order[b.version] || 0);
    })
  })).sort((a, b) => a.number - b.number);

  if (deliverables.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Aucun livrable configuré pour ce projet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedGroups.map(({ number, items }) => (
        <div key={number} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Livrable {number}
          </h3>
          <div className="space-y-3">
            {items.map((deliverable) => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                projectId={projectId}
                isVendorView={isVendorView}
                onUpload={onUpload}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DeliverableCard;
