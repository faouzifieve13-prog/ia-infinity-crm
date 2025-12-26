import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Pin, Trash2, Paperclip, Megaphone, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isAnnouncement: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }[];
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'client' | 'vendor';
  scope: 'global' | 'project';
}

interface ChannelViewProps {
  channel: Channel;
}

export function ChannelView({ channel }: ChannelViewProps) {
  const [message, setMessage] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const isAdmin = role && !['client_admin', 'client_member', 'vendor'].includes(role);

  const { data: messages, isLoading } = useQuery<ChannelMessage[]>({
    queryKey: [`/api/channels/${channel.id}/messages`],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channel.id}/messages`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; isAnnouncement: boolean }) => {
      return apiRequest('POST', `/api/channels/${channel.id}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channel.id}/messages`] });
      setMessage('');
      setIsAnnouncement(false);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest('DELETE', `/api/channels/${channel.id}/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channel.id}/messages`] });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, pin }: { messageId: string; pin: boolean }) => {
      if (pin) {
        return apiRequest('POST', `/api/channels/${channel.id}/messages/${messageId}/pin`);
      } else {
        return apiRequest('DELETE', `/api/channels/${channel.id}/messages/${messageId}/pin`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channel.id}/messages`] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate({ content: message, isAnnouncement });
  };

  const sortedMessages = messages?.slice().reverse() || [];
  const pinnedMessages = sortedMessages.filter(m => m.isPinned);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              # {channel.name}
              <Badge variant={channel.type === 'client' ? 'default' : 'secondary'}>
                {channel.type === 'client' ? 'Client' : 'Sous-traitant'}
              </Badge>
            </CardTitle>
            {channel.description && (
              <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Pinned messages */}
        {pinnedMessages.length > 0 && (
          <div className="bg-muted/50 border-b p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Pin className="h-4 w-4" />
              Messages épinglés
            </div>
            <div className="space-y-2">
              {pinnedMessages.slice(0, 2).map((msg) => (
                <div key={msg.id} className="text-sm bg-background rounded p-2">
                  <span className="font-medium">{msg.user?.name || 'Utilisateur'}: </span>
                  {msg.content.substring(0, 100)}
                  {msg.content.length > 100 && '...'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Aucun message dans ce canal. Soyez le premier à écrire !
            </div>
          ) : (
            sortedMessages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.userId === user?.id}
                isAdmin={!!isAdmin}
                onDelete={() => deleteMessageMutation.mutate(msg.id)}
                onPin={(pin) => pinMessageMutation.mutate({ messageId: msg.id, pin })}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          {isAdmin && (
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant={isAnnouncement ? 'default' : 'outline'}
                onClick={() => setIsAnnouncement(!isAnnouncement)}
              >
                <Megaphone className="h-4 w-4 mr-1" />
                Annonce
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageItem({
  message,
  isOwn,
  isAdmin,
  onDelete,
  onPin,
}: {
  message: ChannelMessage;
  isOwn: boolean;
  isAdmin: boolean;
  onDelete: () => void;
  onPin: (pin: boolean) => void;
}) {
  const initials = message.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className={cn(
      "flex gap-3 group",
      message.isAnnouncement && "bg-primary/5 -mx-4 px-4 py-3 rounded-lg border border-primary/20"
    )}>
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={cn(
          message.isAnnouncement ? "bg-primary text-primary-foreground" : ""
        )}>
          {message.isAnnouncement ? <Megaphone className="h-4 w-4" /> : initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {message.user?.name || 'Utilisateur'}
          </span>
          {message.isAnnouncement && (
            <Badge variant="default" className="text-xs">
              <Megaphone className="h-3 w-3 mr-1" />
              Annonce
            </Badge>
          )}
          {message.isPinned && (
            <Badge variant="outline" className="text-xs">
              <Pin className="h-3 w-3 mr-1" />
              Épinglé
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: fr })}
          </span>
          {(isOwn || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => onPin(!message.isPinned)}>
                    <Pin className="h-4 w-4 mr-2" />
                    {message.isPinned ? 'Désépingler' : 'Épingler'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="mt-1 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted px-2 py-1 rounded"
              >
                <Paperclip className="h-3 w-3" />
                {att.fileName}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
