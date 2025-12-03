import { TaskList } from '../projects/TaskList';
import { mockTasks } from '@/lib/mock-data';

export default function TaskListExample() {
  return <TaskList tasks={mockTasks} />;
}
