import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { DealCard } from './DealCard';
import type { DealStage, ProspectStatus } from '@/lib/types';

interface DealOwner {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface ColumnDeal {
  id: string;
  accountName: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  amount: string;
  auditAmount?: string | null;
  developmentAmount?: string | null;
  recurringAmount?: string | null;
  probability: number;
  stage: DealStage;
  nextAction?: string | null;
  daysInStage: number;
  owner: DealOwner;
  missionTypes?: string[] | null;
  prospectStatus?: ProspectStatus | null;
  followUpDate?: string | null;
  followUpNotes?: string | null;
  score?: string | null;
}

interface PipelineColumnProps {
  stage: DealStage;
  deals: ColumnDeal[];
  totalValue: number;
  onEmailClick?: (deal: ColumnDeal) => void;
  onDelete?: (dealId: string) => void;
  onEditContact?: (deal: ColumnDeal) => void;
}

const stageConfig: Record<DealStage, { label: string; color: string }> = {
  prospect: { label: 'Prospect', color: 'bg-slate-500' },
  meeting: { label: 'Meeting', color: 'bg-blue-500' },
  proposal: { label: 'Proposal', color: 'bg-purple-500' },
  audit: { label: 'Audit', color: 'bg-violet-500' },
  negotiation: { label: 'Negotiation', color: 'bg-orange-500' },
  pending_validation: { label: 'En attente de validation', color: 'bg-amber-500' },
  won: { label: 'Won', color: 'bg-emerald-500' },
  lost: { label: 'Lost', color: 'bg-red-500' },
};

export function PipelineColumn({ stage, deals, totalValue, onEmailClick, onDelete, onEditContact }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const config = stageConfig[stage];

  return (
    <div
      className="flex flex-col min-w-[300px] max-w-[300px]"
      data-testid={`pipeline-column-${stage}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="font-semibold text-sm">{config.label}</span>
          <Badge variant="secondary" className="text-xs">
            {deals.length}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalValue.toLocaleString()}€
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 rounded-lg transition-colors min-h-[400px] ${
          isOver ? 'bg-accent/50' : 'bg-muted/30'
        }`}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onEmailClick={onEmailClick} onDelete={onDelete} onEditContact={onEditContact} />
        ))}
      </div>
    </div>
  );
}
