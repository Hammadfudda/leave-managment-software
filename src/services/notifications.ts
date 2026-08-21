import api from './api';
import type { Notification } from '../types';

interface BackendNotification {
  _id: string;
  userId: string;
  type: Notification['type'];
  message: string;
  relatedLeaveRequestId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  emailSent?: boolean;
}

interface NotificationListResponse {
  success: boolean;
  data: BackendNotification[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function mapNotification(
  notification: BackendNotification
): Notification {
  return {
    id: notification._id,
    userId: notification.userId,
    type: notification.type,
    message: notification.message,
    relatedLeaveRequestId:
      notification.relatedLeaveRequestId,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

export async function getNotifications(
  params?: {
    isRead?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const response =
    await api.get<NotificationListResponse>(
      '/notifications',
      {
        params: {
          page: 1,
          limit: 100,
          ...params,
        },
      }
    );

  return {
    notifications:
      (response.data.data || []).map(
        mapNotification
      ),
    unreadCount:
      Number(
        response.data.unreadCount || 0
      ),
  };
}

export async function markNotificationRead(
  id: string
): Promise<Notification> {
  const response =
    await api.patch<{
      success: boolean;
      data: BackendNotification;
    }>(
      `/notifications/${id}/read`
    );

  return mapNotification(
    response.data.data
  );
}

export async function markAllNotificationsRead():
Promise<void> {
  await api.patch(
    '/notifications/read-all'
  );
}
