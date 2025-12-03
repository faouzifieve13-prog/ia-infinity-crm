import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { Deal } from '@/lib/types';

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ownerInitials = deal.owner.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover-elevate active-elevate-2"
      data-testid={`deal-card-${deal.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
            data-testid={`deal-drag-handle-${deal.id}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{deal.accountName}</h4>
              <span className="font-bold text-sm whitespace-nowrap">
                {deal.amount.toLocaleString()}€
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mb-2">
              {deal.contactName}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Calendar className="h-3 w-3" />
              <span className="truncate">{deal.nextAction}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 mr-2">
                <Progress value={deal.probability} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">{deal.probability}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {ownerInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {deal.daysInStage}d
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
