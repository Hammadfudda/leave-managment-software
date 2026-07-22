import { mockNotifications } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCircle2, XCircle, Clock, CalendarPlus, Ban } from 'lucide-react';

const iconFor: Record<string, typeof Bell> = {
  leave_submitted: CalendarPlus,
  leave_approved: CheckCircle2,
  leave_rejected: XCircle,
  leave_cancelled: Ban,
  leave_pending_approval: Clock,
};

export default function Notifications() {
  const { user } = useAuth();
  if (!user) return null;
  const notes = mockNotifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Stay updated on your leave activity.</p>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && <p className="text-sm text-gray-400">No notifications.</p>}
        {notes.map((n) => {
          const Icon = iconFor[n.type] || Bell;
          return (
            <div
              key={n.id}
              className={`flex gap-3 rounded-xl border bg-white p-4 shadow-sm animate-fade-in ${
                n.isRead ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'
              }`}
            >
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white'}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
