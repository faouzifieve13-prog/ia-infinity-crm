import { Bell, CheckCircle2, AlertCircle, Clock, Sparkles, Info, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';
import { GlobalSearch } from '@/components/GlobalSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { Notification } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const notificationIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: Clock,
  info: Info,
};

const notificationColors = {
  success: 'text-emerald-500 bg-emerald-500/10',
  error: 'text-red-500 bg-red-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  info: 'text-blue-500 bg-blue-500/10',
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return notifDate.toLocaleDateString('fr-FR');
}

export function AppHeader() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <SidebarTrigger
            data-testid="button-sidebar-toggle"
            className="hover:bg-muted transition-colors"
          />
        </motion.div>
        <SpaceSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative group"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 group-hover:text-primary transition-colors" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1"
                  >
                    <Badge className="h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center bg-primary shadow-lg shadow-primary/30">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Notifications</h4>
                </div>
                {unreadCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => markAllAsReadMutation.mutate()}
                      disabled={markAllAsReadMutation.isPending}
                    >
                      {markAllAsReadMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <ScrollArea className="max-h-80">
              {isLoadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification, index) => {
                  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info;
                  const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info;
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <DropdownMenuItem
                        className={`flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm block truncate ${!notification.isRead ? 'font-medium' : ''}`}>
                            {notification.title}
                          </span>
                          {notification.description && (
                            <span className="text-xs text-muted-foreground block truncate">
                              {notification.description}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground/70 mt-1 block">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </DropdownMenuItem>
                    </motion.div>
                  );
                })
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary hover:text-primary"
                    onClick={() => navigate('/notifications')}
                  >
                    Voir toutes les notifications
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
