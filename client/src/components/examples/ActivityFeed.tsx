import { ActivityFeed } from '../ActivityFeed';
import { mockActivities } from '@/lib/mock-data';

export default function ActivityFeedExample() {
  return <ActivityFeed activities={mockActivities} />;
}
