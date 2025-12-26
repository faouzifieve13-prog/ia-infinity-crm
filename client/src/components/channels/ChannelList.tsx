import { useQuery } from '@tanstack/react-query';
import { Hash, Users, Briefcase, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'client' | 'vendor';
  scope: 'global' | 'project';
  projectId?: string;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
}

interface ChannelListProps {
  selectedChannelId?: string;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel?: () => void;
  showCreateButton?: boolean;
  endpoint?: string;
}

export function ChannelList({
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  showCreateButton = false,
  endpoint = '/api/channels'
}: ChannelListProps) {
  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch channels');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const globalChannels = channels?.filter(c => c.scope === 'global') || [];
  const projectChannels = channels?.filter(c => c.scope === 'project') || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Canaux</CardTitle>
        {showCreateButton && onCreateChannel && (
          <Button size="sm" variant="outline" onClick={onCreateChannel}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {globalChannels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Canaux globaux</h4>
            <div className="space-y-1">
              {globalChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={channel.id === selectedChannelId}
                  onClick={() => onSelectChannel(channel)}
                />
              ))}
            </div>
          </div>
        )}

        {projectChannels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Canaux projet</h4>
            <div className="space-y-1">
              {projectChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={channel.id === selectedChannelId}
                  onClick={() => onSelectChannel(channel)}
                />
              ))}
            </div>
          </div>
        )}

        {(!channels || channels.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun canal disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChannelItem({
  channel,
  isSelected,
  onClick
}: {
  channel: Channel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = channel.type === 'client' ? Users : Briefcase;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      <Hash className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{channel.name}</span>
          <Badge variant={channel.type === 'client' ? 'default' : 'secondary'} className="text-xs">
            <Icon className="h-3 w-3 mr-1" />
            {channel.type === 'client' ? 'Client' : 'Sous-traitant'}
          </Badge>
        </div>
        {channel.description && (
          <p className={cn(
            "text-xs truncate",
            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {channel.description}
          </p>
        )}
      </div>
    </button>
  );
}
