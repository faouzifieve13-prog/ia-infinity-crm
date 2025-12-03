import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MissionCard } from '@/components/vendor/MissionCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { mockMissions } from '@/lib/mock-data';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Missions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'review' | 'completed'>('all');

  const filteredMissions = mockMissions.filter((mission) => {
    const matchesSearch =
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // todo: remove mock functionality
  const activeMissions = mockMissions.filter((m) => m.status === 'in_progress').length;
  const pendingMissions = mockMissions.filter((m) => m.status === 'pending').length;
  const reviewMissions = mockMissions.filter((m) => m.status === 'review').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">My Missions</h1>
        <p className="text-muted-foreground">Manage your assigned missions and deliverables</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="In Progress"
          value={activeMissions}
          icon={Clock}
        />
        <MetricCard
          title="Pending Start"
          value={pendingMissions}
          icon={AlertCircle}
        />
        <MetricCard
          title="Under Review"
          value={reviewMissions}
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-missions"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onClick={() => console.log('View mission', mission.id)}
          />
        ))}
      </div>

      {filteredMissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No missions found</p>
        </div>
      )}
    </div>
  );
}
