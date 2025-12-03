import { WorkflowList } from '../WorkflowList';
import { mockWorkflows } from '@/lib/mock-data';

export default function WorkflowListExample() {
  return <WorkflowList workflows={mockWorkflows} />;
}
