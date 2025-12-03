import { useState } from 'react';
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
import type { Deal, DealStage } from '@/lib/types';

interface PipelineBoardProps {
  deals: Deal[];
  onDealMove?: (dealId: string, newStage: DealStage) => void;
}

const stages: DealStage[] = ['prospect', 'meeting', 'proposal', 'audit', 'negotiation', 'won', 'lost'];

export function PipelineBoard({ deals, onDealMove }: PipelineBoardProps) {
  const [localDeals, setLocalDeals] = useState(deals);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

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
    getDealsByStage(stage).reduce((sum, deal) => sum + deal.amount, 0);

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
