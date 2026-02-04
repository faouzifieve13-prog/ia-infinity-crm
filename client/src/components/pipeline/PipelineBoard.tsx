import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PipelineColumn } from './PipelineColumn';
import { DealCard } from './DealCard';
import type { DealStage, ProspectStatus } from '@/lib/types';

interface DealOwner {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface PipelineDeal {
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

interface PipelineBoardProps {
  deals: PipelineDeal[];
  onDealMove?: (dealId: string, newStage: DealStage) => void;
  onEmailClick?: (deal: PipelineDeal) => void;
  onDelete?: (dealId: string) => void;
  onEditContact?: (deal: PipelineDeal) => void;
}

// Stages affichés dans le pipeline
const displayStages: DealStage[] = ['prospect', 'audit', 'pending_validation', 'won', 'lost'];

// Toutes les étapes valides (pour le drag & drop)
const allValidStages: DealStage[] = ['prospect', 'meeting', 'proposal', 'audit', 'negotiation', 'pending_validation', 'won', 'lost'];

// Mapping des anciennes étapes vers les nouvelles pour l'affichage
const stageMapping: Record<DealStage, DealStage> = {
  'prospect': 'prospect',
  'meeting': 'prospect',      // Les anciens RDV vont dans Prospect
  'proposal': 'audit',        // Les anciennes propositions vont dans Audit
  'audit': 'audit',
  'negotiation': 'pending_validation', // Les négociations vont dans En attente
  'pending_validation': 'pending_validation',
  'won': 'won',
  'lost': 'lost',
};

export function PipelineBoard({ deals, onDealMove, onEmailClick, onDelete, onEditContact }: PipelineBoardProps) {
  const [localDeals, setLocalDeals] = useState(deals);
  const [activeDeal, setActiveDeal] = useState<PipelineDeal | null>(null);

  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = localDeals.find((d) => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as DealStage;

    if (allValidStages.includes(newStage)) {
      setLocalDeals((prev) =>
        prev.map((deal) =>
          deal.id === dealId ? { ...deal, stage: newStage } : deal
        )
      );
      onDealMove?.(dealId, newStage);
      console.log(`Deal ${dealId} moved to ${newStage}`);
    }
  };

  // Récupère les deals pour une étape affichée (inclut les anciennes étapes mappées)
  const getDealsByStage = (displayStage: DealStage) =>
    localDeals.filter((deal) => stageMapping[deal.stage] === displayStage);

  const getTotalValue = (displayStage: DealStage) =>
    getDealsByStage(displayStage).reduce((sum, deal) => {
      const auditAmount = deal.auditAmount ? parseFloat(deal.auditAmount) : 0;
      const developmentAmount = deal.developmentAmount ? parseFloat(deal.developmentAmount) : 0;
      const recurringAmount = deal.recurringAmount ? parseFloat(deal.recurringAmount) : 0;
      const detailedTotal = auditAmount + developmentAmount + recurringAmount;
      // Use detailed amounts if available, otherwise fall back to legacy amount field
      return sum + (detailedTotal > 0 ? detailedTotal : parseFloat(deal.amount));
    }, 0);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" data-testid="pipeline-board">
          {displayStages.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              deals={getDealsByStage(stage)}
              totalValue={getTotalValue(stage)}
              onEmailClick={onEmailClick}
              onDelete={onDelete}
              onEditContact={onEditContact}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  );
}
