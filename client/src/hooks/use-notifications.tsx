import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@shared/schema';

interface UnreadNotificationsResponse {
  notifications: Notification[];
  count: number;
}

/**
 * Hook to manage notifications with real-time polling
 * Polls every 10 seconds for new unread notifications
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  // Fetch unread notifications with polling every 10 seconds
  const { data: unreadData, isLoading } = useQuery<UnreadNotificationsResponse>({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Mark a single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to mark as read');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to mark all as read');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to delete notification');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    unreadNotifications: unreadData?.notifications || [],
    unreadCount: unreadData?.count || 0,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
}
