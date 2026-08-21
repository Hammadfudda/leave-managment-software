import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Ban,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import Button from '../components/ui/Button';

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';

import {
  getApiErrorMessage,
} from '../services/api';

import type {
  Notification,
} from '../types';

const iconFor:
Record<
  Notification['type'],
  typeof Bell
> = {
  leave_submitted:
    CalendarPlus,

  leave_approved:
    CheckCircle2,

  leave_rejected:
    XCircle,

  leave_cancelled:
    Ban,

  leave_pending_approval:
    Clock,

  extension_requested:
    CalendarPlus,

  stop_requested:
    RotateCcw,
};

export default function Notifications() {
  const {
    user,
  } = useAuth();

  const [
    notes,
    setNotes,
  ] =
    useState<
      Notification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const load =
    useCallback(
      async (
        showLoader =
          false
      ) => {
        if (!user) {
          return;
        }

        if (
          showLoader
        ) {
          setLoading(
            true
          );
        }

        try {
          const result =
            await getNotifications({
              page: 1,
              limit: 100,
            });

          setNotes(
            result.notifications
          );

          setUnreadCount(
            result.unreadCount
          );

          setErrorMessage(
            ''
          );
        } catch (
          error
        ) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              'Unable to load notifications.'
            )
          );
        } finally {
          if (
            showLoader
          ) {
            setLoading(
              false
            );
          }
        }
      },
      [
        user,
      ]
    );

  useEffect(() => {
    void load(
      true
    );

    const interval =
      window.setInterval(
        () => {
          void load(
            false
          );
        },
        30000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    load,
  ]);

  if (!user) {
    return null;
  }

  const markOne =
    async (
      notification:
        Notification
    ) => {
      if (
        notification.isRead
      ) {
        return;
      }

      try {
        await markNotificationRead(
          notification.id
        );

        setNotes(
          (
            previous
          ) =>
            previous.map(
              (
                item
              ) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      isRead:
                        true,
                    }
                  : item
            )
        );

        setUnreadCount(
          (
            previous
          ) =>
            Math.max(
              0,
              previous -
                1
            )
        );
      } catch (
        error
      ) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            'Unable to mark notification as read.'
          )
        );
      }
    };

  const markAll =
    async () => {
      if (
        unreadCount ===
        0
      ) {
        return;
      }

      setMarkingAll(
        true
      );

      try {
        await markAllNotificationsRead();

        setNotes(
          (
            previous
          ) =>
            previous.map(
              (
                item
              ) => ({
                ...item,
                isRead:
                  true,
              })
            )
        );

        setUnreadCount(
          0
        );
      } catch (
        error
      ) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            'Unable to mark all notifications as read.'
          )
        );
      } finally {
        setMarkingAll(
          false
        );
      }
    };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Stay updated on your leave activity.
          </p>
        </div>

        {unreadCount >
          0 && (
          <Button
            variant="secondary"
            disabled={
              markingAll
            }
            onClick={() =>
              void markAll()
            }
          >
            {markingAll
              ? 'Marking...'
              : `Mark all read (${unreadCount})`}
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          Loading notifications...
        </div>
      ) : (
        <div className="space-y-2">
          {notes.length ===
            0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
              <Bell
                size={28}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 text-sm text-gray-400">
                No notifications.
              </p>
            </div>
          )}

          {notes.map(
            (
              notification
            ) => {
              const Icon =
                iconFor[
                  notification
                    .type
                ] ||
                Bell;

              return (
                <button
                  key={
                    notification.id
                  }
                  type="button"
                  onClick={() =>
                    void markOne(
                      notification
                    )
                  }
                  className={`flex w-full gap-3 rounded-xl border p-4 text-left shadow-sm transition animate-fade-in ${
                    notification.isRead
                      ? 'border-gray-100 bg-white hover:bg-gray-50'
                      : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      notification.isRead
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <Icon
                      size={16}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      {
                        notification.message
                      }
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(
                        notification.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
