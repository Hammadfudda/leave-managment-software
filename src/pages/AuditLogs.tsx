import { useEffect, useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Search, ChevronDown } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { getApiErrorMessage } from '../services/api';
import { getAuditLogs } from '../services/auditLogs';
import type { AuditLog } from '../types';

type TimeFilter = 'all' | 'day' | 'week' | 'month' | 'year';

function inTimeRange(dateStr: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true;

  const date = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);

  if (filter === 'day') start.setHours(0, 0, 0, 0);
  else if (filter === 'week') start.setDate(now.getDate() - 7);
  else if (filter === 'month') start.setMonth(now.getMonth() - 1);
  else if (filter === 'year') start.setFullYear(now.getFullYear() - 1);

  return date >= start;
}

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        setAuditLogs(await getAuditLogs());
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Unable to load audit logs.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesQuery =
        !q ||
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.affectedPerson?.toLowerCase().includes(q) ?? false) ||
        (log.department?.toLowerCase().includes(q) ?? false);

      const matchesAction =
        actionFilter === 'all' ||
        log.action.toLowerCase() === actionFilter.toLowerCase();

      return matchesQuery && matchesAction && inTimeRange(log.createdAt, timeFilter);
    });
  }, [auditLogs, query, actionFilter, timeFilter]);

  const actionTone = (action: string): 'green' | 'red' | 'blue' | 'gray' => {
    if (action.startsWith('CREATE')) return 'green';
    if (
      action.startsWith('DELETE') ||
      action.startsWith('DEACTIVATE') ||
      action.startsWith('REJECT') ||
      action.startsWith('CANCEL')
    ) {
      return 'red';
    }
    if (action.startsWith('APPROVE') || action.startsWith('EDIT')) return 'blue';
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
        <p className="mt-1 text-sm text-gray-500">
          Complete trail of administrative and leave actions stored in the database.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, action, department..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All actions</option>
          <option value="CREATE_EMPLOYEE">Create employee</option>
          <option value="APPROVE_LEAVE">Approve leave</option>
          <option value="REJECT_LEAVE">Reject leave</option>
          <option value="CREATE_LEAVE_POLICY">Create leave policy</option>
          <option value="EDIT_LEAVE_POLICY">Edit leave policy</option>
          <option value="DELETE_LEAVE_POLICY">Delete leave policy</option>
        </select>

        <div className="flex flex-wrap gap-1.5">
          {timeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                timeFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter.label}
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
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    Loading audit logs...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    No audit logs found.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 animate-fade-in">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.actorName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionTone(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.affectedPerson || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{log.department || '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {log.leaveType || '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-3 text-gray-500">
                      {log.comment || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailLog(log)}
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

      <Modal
        open={!!detailLog}
        onClose={() => setDetailLog(null)}
        title="Audit Log Details"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setDetailLog(null)}>
            Close
          </Button>
        }
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
            <Row
              label="Target"
              value={`${detailLog.targetType || '—'} · ${detailLog.targetId || '—'}`}
            />
            <div>
              <p className="text-xs text-gray-500">Full details</p>
              <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-gray-800">
                {detailLog.details || '—'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        title="Unable to Load Audit Logs"
        size="sm"
        footer={<Button onClick={() => setErrorMessage(null)}>OK</Button>}
      >
        <p className="text-sm text-gray-600">{errorMessage}</p>
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
