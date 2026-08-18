import api from './api';
import type { Notification } from '../types';

interface BackendNotification {
  _id: string;
  userId: string;
  type: Notification['type'];
  message: string;
  relatedLeaveRequestId?: string | null;
  isRead: boolean;
  emailSent?: boolean;
  createdAt: string;
  updatedAt?: string;
}

function mapNotification(item: BackendNotification): Notification {
  return {
    id: item._id,
    userId: String(item.userId),
    type: item.type,
    message: item.message,
    relatedLeaveRequestId: item.relatedLeaveRequestId || undefined,
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
  };
}

export async function getNotifications(): Promise<{
  items: Notification[];
  unreadCount: number;
}> {
  const response = await api.get('/notifications', {
    params: { page: 1, limit: 500 },
  });

  return {
    items: (response.data?.data || []).map(mapNotification),
    unreadCount: Number(response.data?.unreadCount || 0),
  };
}

export async function markNotificationRead(
  notificationId: string
): Promise<Notification> {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return mapNotification(response.data.data);
}
