import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarPlus,
  Ban,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { getApiErrorMessage } from '../services/api';
import {
  getNotifications,
  markNotificationRead,
} from '../services/notifications';
import type { Notification } from '../types';

const iconFor: Record<string, typeof Bell> = {
  leave_submitted: CalendarPlus,
  leave_approved: CheckCircle2,
  leave_rejected: XCircle,
  leave_cancelled: Ban,
  leave_pending_approval: Clock,
  extension_requested: CalendarPlus,
  stop_requested: Ban,
};

export default function Notifications() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const result = await getNotifications();
        setNotes(result.items);
        setUnreadCount(result.unreadCount);
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, 'Unable to load notifications.')
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  if (!user) return null;

  const handleRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      const updated = await markNotificationRead(notification.id);
      setNotes((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Unable to mark notification as read.')
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Stay updated on your leave activity.
          {unreadCount > 0 ? ` ${unreadCount} unread.` : ''}
        </p>
      </div>

      <div className="space-y-2">
        {loading && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            Loading notifications...
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            No notifications.
          </div>
        )}

        {!loading &&
          notes.map((notification) => {
            const Icon = iconFor[notification.type] || Bell;

            return (
              <button
                type="button"
                key={notification.id}
                onClick={() => void handleRead(notification)}
                className={`flex w-full gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-colors animate-fade-in ${
                  notification.isRead
                    ? 'border-gray-100'
                    : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/60'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    notification.isRead
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>

                {!notification.isRead && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
      </div>

      <Modal
        open={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        title="Notification Error"
        size="sm"
        footer={<Button onClick={() => setErrorMessage(null)}>OK</Button>}
      >
        <p className="text-sm text-gray-600">{errorMessage}</p>
      </Modal>
    </div>
  );
}
