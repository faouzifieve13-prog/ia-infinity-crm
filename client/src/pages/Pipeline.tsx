import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Filter, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Deal, DealStage } from '@/lib/types';

interface DealWithRelations extends Deal {
  owner: { id: string; name: string; email: string; avatar?: string | null };
}

export default function Pipeline() {
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stage, position }: { dealId: string; stage: DealStage; position: number }) => {
      return apiRequest('PATCH', `/api/deals/${dealId}/stage`, { stage, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
    },
  });

  const dealsWithRelations: DealWithRelations[] = deals.map(deal => ({
    ...deal,
    accountName: deal.accountName || 'Unknown Account',
    contactName: deal.contactName || 'Unknown Contact',
    owner: { 
      id: deal.ownerId, 
      name: deal.ownerName || 'Unknown', 
      email: deal.ownerEmail || '', 
      avatar: null 
    },
  }));

  const filteredDeals = ownerFilter === 'all'
    ? dealsWithRelations
    : dealsWithRelations.filter((deal) => deal.ownerId === ownerFilter);

  const handleDealMove = (dealId: string, newStage: DealStage) => {
    console.log(`Deal ${dealId} moved to stage ${newStage}`);
    updateDealStageMutation.mutate({ dealId, stage: newStage, position: 0 });
  };

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Pipeline</h1>
          <p className="text-muted-foreground">Manage your sales pipeline and deals</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40" data-testid="select-owner-filter">
              <SelectValue placeholder="Filter by owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" data-testid="button-filter">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" data-testid="button-export">
            <Download className="h-4 w-4" />
          </Button>

          <Button data-testid="button-add-deal">
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>

      <PipelineBoard deals={filteredDeals} onDealMove={handleDealMove} />
    </div>
  );
}
