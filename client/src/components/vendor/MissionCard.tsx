import { Calendar, CheckSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Mission } from '@/lib/types';

interface MissionCardProps {
  mission: Mission;
  onClick?: () => void;
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  review: { label: 'Review', variant: 'secondary' as const },
  completed: { label: 'Completed', variant: 'outline' as const },
};

export function MissionCard({ mission, onClick }: MissionCardProps) {
  const status = statusConfig[mission.status];
  const startDate = new Date(mission.startDate);
  const endDate = new Date(mission.endDate);
  const today = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const progress = Math.min(100, Math.round(((totalDays - daysRemaining) / totalDays) * 100));

  return (
    <Card
      className="cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={`mission-card-${mission.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{mission.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{mission.projectName}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {mission.description}
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{daysRemaining} days remaining</span>
          </div>

          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <CheckSquare className="h-4 w-4" />
              <span>Deliverables</span>
            </div>
            <ul className="text-sm space-y-0.5 ml-5">
              {mission.deliverables.slice(0, 3).map((deliverable, i) => (
                <li key={i} className="text-muted-foreground">
                  {deliverable}
                </li>
              ))}
              {mission.deliverables.length > 3 && (
                <li className="text-muted-foreground">
                  +{mission.deliverables.length - 3} more
                </li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
