import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  Bell,
  Menu,
  Search,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  getNotifications,
} from '../services/notifications';

const roleLabel:
Record<string, string> = {
  admin:
    'Administrator',
  manager:
    'Manager',
  team_leader:
    'Team Leader',
  employee:
    'Employee',
};

export default function Topbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    query,
    setQuery,
  ] =
    useState('');

  const [
    unread,
    setUnread,
  ] =
    useState(0);

  const loadUnread =
    useCallback(
      async () => {
        if (!user) {
          setUnread(0);
          return;
        }

        try {
          const result =
            await getNotifications({
              page: 1,
              limit: 1,
            });

          setUnread(
            result.unreadCount
          );
        } catch (
          error
        ) {
          /*
           * Bell must never break the whole Topbar if the notification
           * request temporarily fails.
           */
          console.error(
            'Unable to load notification count:',
            error
          );
        }
      },
      [
        user,
      ]
    );

  useEffect(() => {
    void loadUnread();

    const interval =
      window.setInterval(
        () => {
          void loadUnread();
        },
        30000
      );

    const onFocus =
      () => {
        void loadUnread();
      };

    window.addEventListener(
      'focus',
      onFocus
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        'focus',
        onFocus
      );
    };
  }, [
    loadUnread,
  ]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={
          onMenuClick
        }
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu
          size={20}
        />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          value={
            query
          }
          onChange={
            (
              event
            ) =>
              setQuery(
                event.target.value
              )
          }
          placeholder="Search employees, leaves..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            navigate(
              '/notifications'
            );
          }}
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
          aria-label={
            unread > 0
              ? `${unread} unread notifications`
              : 'Notifications'
          }
          title={
            unread > 0
              ? `${unread} unread notification${unread === 1 ? '' : 's'}`
              : 'Notifications'
          }
        >
          <Bell
            size={20}
          />

          {unread >
            0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {unread >
              99
                ? '99+'
                : unread}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {
                user?.fullName
              }
            </p>

            <p className="text-xs text-gray-500">
              {user
                ? roleLabel[
                    user.role
                  ] ||
                  user.role
                : ''}
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {user
              ?.fullName
              ?.charAt(
                0
              ) ||
              '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
