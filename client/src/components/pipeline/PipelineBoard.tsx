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

const stages: DealStage[] = ['prospect', 'meeting', 'proposal', 'audit', 'negotiation', 'won', 'lost'];

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

    if (stages.includes(newStage)) {
      setLocalDeals((prev) =>
        prev.map((deal) =>
          deal.id === dealId ? { ...deal, stage: newStage } : deal
        )
      );
      onDealMove?.(dealId, newStage);
      console.log(`Deal ${dealId} moved to ${newStage}`);
    }
  };

  const getDealsByStage = (stage: DealStage) =>
    localDeals.filter((deal) => deal.stage === stage);

  const getTotalValue = (stage: DealStage) =>
    getDealsByStage(stage).reduce((sum, deal) => sum + parseFloat(deal.amount), 0);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" data-testid="pipeline-board">
          {stages.map((stage) => (
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
