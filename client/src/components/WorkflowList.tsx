import { useState } from 'react';
import { Play, Pause, AlertTriangle, Clock, CheckCircle2, MoreHorizontal, RefreshCw, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Workflow } from '@/lib/types';

interface WorkflowListProps {
  workflows: Workflow[];
  onStatusChange?: (workflowId: string, status: 'active' | 'paused') => void;
}

const statusConfig = {
  active: { icon: CheckCircle2, color: 'text-pipeline-won', bgColor: 'bg-pipeline-won/10', label: 'Active' },
  paused: { icon: Pause, color: 'text-pipeline-proposal', bgColor: 'bg-pipeline-proposal/10', label: 'Paused' },
  error: { icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Error' },
};

function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkflowList({ workflows, onStatusChange }: WorkflowListProps) {
  const [localWorkflows, setLocalWorkflows] = useState(workflows);

  const toggleStatus = (workflowId: string) => {
    setLocalWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId && wf.status !== 'error') {
          const newStatus = wf.status === 'active' ? 'paused' : 'active';
          onStatusChange?.(workflowId, newStatus);
          console.log(`Workflow ${workflowId} status changed to ${newStatus}`);
          return { ...wf, status: newStatus as typeof wf.status };
        }
        return wf;
      })
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflows</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {localWorkflows.map((workflow) => {
            const config = statusConfig[workflow.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={workflow.id}
                className="flex items-center gap-4 p-4"
                data-testid={`workflow-item-${workflow.id}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}>
                  <StatusIcon className={`h-5 w-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{workflow.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {workflow.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {workflow.lastRun && (
                      <div className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        <span>Last: {formatDateTime(workflow.lastRun)}</span>
                      </div>
                    )}
                    {workflow.nextRun && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Next: {formatDateTime(workflow.nextRun)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-24">
                  <Progress value={workflow.successRate} className="h-2" />
                  <span className="text-xs text-muted-foreground">{workflow.successRate}%</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStatus(workflow.id)}
                  disabled={workflow.status === 'error'}
                  data-testid={`workflow-toggle-${workflow.id}`}
                >
                  {workflow.status === 'active' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => console.log('View logs', workflow.id)}>
                      <History className="mr-2 h-4 w-4" />
                      View Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => console.log('Run now', workflow.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Now
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
