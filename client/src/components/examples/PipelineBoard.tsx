import { PipelineBoard } from '../pipeline/PipelineBoard';
import { mockDeals } from '@/lib/mock-data';

export default function PipelineBoardExample() {
  return (
    <div className="w-full overflow-x-auto">
      <PipelineBoard deals={mockDeals} />
    </div>
  );
}
