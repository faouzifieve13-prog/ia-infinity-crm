import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationBell() {
  const {
    unreadNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotifications();

  const [, setLocation] = useLocation();

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate to the linked resource if link exists
    if (notification.link) {
      setLocation(notification.link);
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              Tout marquer lu
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        )}

        {!isLoading && unreadNotifications.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Aucune notification
          </div>
        )}

        {!isLoading && unreadNotifications.length > 0 && (
          <div className="divide-y">
            {unreadNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer flex flex-col items-start gap-1 p-3 focus:bg-accent"
              >
                <div className="flex items-start gap-2 w-full">
                  <div className={`mt-1 ${getNotificationTypeColor(notification.type)}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-1">
                      {notification.title}
                    </div>
                    {notification.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {!isLoading && unreadNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => setLocation('/notifications')}
              >
                Voir toutes les notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
