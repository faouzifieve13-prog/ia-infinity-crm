import { useState } from 'react';
import { Plus, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { mockDeals, mockUsers } from '@/lib/mock-data';
import type { DealStage } from '@/lib/types';

export default function Pipeline() {
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  const filteredDeals = ownerFilter === 'all'
    ? mockDeals
    : mockDeals.filter((deal) => deal.owner.id === ownerFilter);

  const handleDealMove = (dealId: string, newStage: DealStage) => {
    console.log(`Deal ${dealId} moved to stage ${newStage}`);
  };

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
              {mockUsers.filter((u) => u.role === 'sales').map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
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
