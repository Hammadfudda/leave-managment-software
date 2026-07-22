import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Search, ChevronDown } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import type { AuditLog } from '../types';

type TimeFilter = 'all' | 'day' | 'week' | 'month' | 'year';

function inTimeRange(dateStr: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  if (filter === 'day') start.setHours(0, 0, 0, 0);
  else if (filter === 'week') start.setDate(now.getDate() - 7);
  else if (filter === 'month') start.setMonth(now.getMonth() - 1);
  else if (filter === 'year') start.setFullYear(now.getFullYear() - 1);
  return d >= start;
}

export default function AuditLogs() {
  const { auditLogs } = useAppData();
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = auditLogs.filter((l) => {
    const matchesQuery =
      l.actorName.toLowerCase().includes(query.toLowerCase()) ||
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      l.details.toLowerCase().includes(query.toLowerCase()) ||
      (l.affectedPerson?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (l.department?.toLowerCase().includes(query.toLowerCase()) ?? false);
    const matchesAction = actionFilter === 'all' || l.action.toLowerCase() === actionFilter.toLowerCase();
    return matchesQuery && matchesAction && inTimeRange(l.createdAt, timeFilter);
  });

  const actionTone = (a: string): 'green' | 'red' | 'blue' | 'gray' => {
    if (a.startsWith('CREATE')) return 'green';
    if (a.startsWith('DELETE') || a.startsWith('DEACTIVATE') || a.startsWith('REJECT') || a.startsWith('CANCEL')) return 'red';
    if (a.startsWith('APPROVE') || a.startsWith('EDIT')) return 'blue';
    return 'gray';
  };

  const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'year', label: 'This year' },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Complete trail of all administrative and leave actions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, action, department..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All actions</option>
            <option value="create_employee">Create employee</option>
            <option value="approve_leave">Approve leave</option>
            <option value="reject_leave">Reject leave</option>
            <option value="create_leave_policy">Create leave policy</option>
          </select>
          {timeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                timeFilter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Leave type</th>
                <th className="px-4 py-3 font-medium">Comment</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">No audit logs found.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50 animate-fade-in">
                  <td className="px-4 py-3 font-medium text-gray-900">{l.actorName}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3"><Badge variant={actionTone(l.action)}>{l.action.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{l.affectedPerson || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{l.department || '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{l.leaveType || '—'}</td>
                  <td className="max-w-[120px] truncate px-4 py-3 text-gray-500">{l.comment || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailLog(l)}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View <ChevronDown size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!detailLog} onClose={() => setDetailLog(null)} title="Audit Log Details" size="md"
        footer={<Button variant="secondary" onClick={() => setDetailLog(null)}>Close</Button>}
      >
        {detailLog && (
          <div className="space-y-3 text-sm">
            <Row label="Actor" value={detailLog.actorName} />
            <Row label="Date" value={formatDateTime(detailLog.createdAt)} />
            <Row label="Action" value={detailLog.action.replace(/_/g, ' ')} />
            <Row label="Affected person" value={detailLog.affectedPerson || '—'} />
            <Row label="Department" value={detailLog.department || '—'} />
            <Row label="Leave type" value={detailLog.leaveType || '—'} />
            <Row label="Comment" value={detailLog.comment || '—'} />
            <Row label="Target" value={`${detailLog.targetType} · ${detailLog.targetId}`} />
            <div>
              <p className="text-xs text-gray-500">Full details</p>
              <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-gray-800">{detailLog.details}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      <span className="font-medium capitalize text-gray-900">{value}</span>
    </div>
  );
}
