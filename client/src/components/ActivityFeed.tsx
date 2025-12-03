import { Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ActivityUser {
  id: string;
  name: string;
  email?: string;
}

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  description: string;
  createdAt: string;
  user: ActivityUser;
  dealId?: string;
  projectId?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
}

const typeConfig = {
  call: { icon: Phone, color: 'bg-pipeline-prospect text-white' },
  email: { icon: Mail, color: 'bg-pipeline-proposal text-white' },
  meeting: { icon: Calendar, color: 'bg-pipeline-meeting text-white' },
  note: { icon: FileText, color: 'bg-muted text-muted-foreground' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('fr-FR');
}

export function ActivityFeed({ activities, title = 'Recent Activity' }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
          {activities.map((activity) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;
            const userInitials = activity.user.name
              .split(' ')
              .map((n) => n[0])
              .join('');

            return (
              <div
                key={activity.id}
                className="relative flex gap-4 p-4"
                data-testid={`activity-item-${activity.id}`}
              >
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{activity.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
