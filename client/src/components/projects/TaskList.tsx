import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, MoreHorizontal, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskStatus, TaskPriority } from '@/lib/types';

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  timeSpent?: number;
}

interface TaskListProps {
  tasks: TaskItem[];
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const statusConfig: Record<TaskStatus, { icon: typeof Circle; color: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground' },
  in_progress: { icon: Clock, color: 'text-pipeline-audit' },
  review: { icon: AlertCircle, color: 'text-pipeline-proposal' },
  completed: { icon: CheckCircle2, color: 'text-pipeline-won' },
};

const priorityConfig: Record<TaskPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'default' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

export function TaskList({ tasks, onTaskStatusChange }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    onTaskStatusChange?.(taskId, newStatus);
    console.log(`Task ${taskId} status changed to ${newStatus}`);
  };

  const cycleStatus = (task: TaskItem) => {
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'review', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    handleStatusChange(task.id, nextStatus);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {localTasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon;
            const priority = priorityConfig[task.priority];
            const timeSpent = task.timeSpent || 0;

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 hover-elevate"
                data-testid={`task-item-${task.id}`}
              >
                <button
                  onClick={() => cycleStatus(task)}
                  className={`${statusConfig[task.status].color} transition-colors`}
                  data-testid={`task-status-toggle-${task.id}`}
                >
                  <StatusIcon className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <Badge variant={priority.variant} className="text-xs">
                      {priority.label}
                    </Badge>
                  </div>
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {task.assigneeId ? (
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      ??
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}

                {timeSpent > 0 && (
                  <span className="text-xs text-muted-foreground">{timeSpent}h</span>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'pending')}>
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                      Mark In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'review')}>
                      Mark for Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                      Mark Complete
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
