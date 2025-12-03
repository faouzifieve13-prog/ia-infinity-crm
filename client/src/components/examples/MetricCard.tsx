import { MetricCard } from '../dashboard/MetricCard';
import { DollarSign } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="Monthly Revenue"
        value={85000}
        change={12.5}
        changeLabel="vs last month"
        icon={DollarSign}
        format="currency"
      />
      <MetricCard
        title="Win Rate"
        value={42}
        change={-3}
        format="percent"
      />
    </div>
  );
}
