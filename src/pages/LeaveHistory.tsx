import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { formatDate } from '../utils/formatDate';
import type { LeaveRequest, LeaveStatus } from '../types';

export default function LeaveHistory() {
  const { user } = useAuth();
  const { leaveRequests, cancelPendingLeave } = useAppData();
  const [filter, setFilter] = useState<LeaveStatus | 'all'>('all');
  const [detail, setDetail] = useState<LeaveRequest | null>(null);

  if (!user) return null;
  const myLeaves = leaveRequests.filter((l) => l.employeeId === user.id);
  const filtered = filter === 'all' ? myLeaves : myLeaves.filter((l) => l.status === filter);

  const filters: { value: LeaveStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const handleCancelPending = () => {
    if (!detail || !user) return;
    cancelPendingLeave(detail.id, user.id);
    setDetail({ ...detail, status: 'cancelled', cancelledReason: 'Cancelled by employee' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Leaves</h1>
          <p className="mt-1 text-sm text-gray-500">Track all your leave requests.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
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
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Start</th>
                <th className="px-5 py-3 font-medium">End</th>
                <th className="px-5 py-3 font-medium">Days</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No leave requests found.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50 animate-fade-in">
                  <td className="px-5 py-3 capitalize text-gray-900">{l.leaveType}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(l.startDate)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(l.actualEndDate || l.endDate)}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {l.daysUsedBeforeCancel != null ? `${l.daysUsedBeforeCancel} / ${l.totalDaysRequested}` : l.totalDaysRequested}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3">
                    <button onClick={() => setDetail(l)} className="text-sm font-medium text-blue-600 hover:text-blue-700">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Leave Request Details" size="md">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">Type</p><p className="font-medium capitalize text-gray-900">{detail.leaveType}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} /></div>
              <div><p className="text-gray-500">Start date</p><p className="font-medium text-gray-900">{formatDate(detail.startDate)}</p></div>
              <div><p className="text-gray-500">End date</p><p className="font-medium text-gray-900">{formatDate(detail.actualEndDate || detail.endDate)}</p></div>
              <div><p className="text-gray-500">Total days requested</p><p className="font-medium text-gray-900">{detail.totalDaysRequested}</p></div>
              <div><p className="text-gray-500">Days counted</p><p className="font-medium text-gray-900">{detail.daysUsedBeforeCancel ?? detail.totalWorkingDays}</p></div>
            </div>
            {detail.status === 'cancelled' && detail.cancelledByName && (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Cancelled by {detail.cancelledByName}. {detail.cancelledReason}
              </div>
            )}
            <div><p className="text-gray-500">Reason</p><p className="mt-1 text-gray-900">{detail.reason}</p></div>
            <div>
              <p className="text-gray-500">Approval history</p>
              <div className="mt-2 space-y-2">
                {detail.approvalHistory.length === 0 && <p className="text-gray-400">No approvals yet.</p>}
                {detail.approvalHistory.map((h, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-gray-900">{h.approverName} <span className="text-xs font-normal text-gray-500">({h.approverRole})</span></p>
                    <p className="text-xs text-gray-500">{h.action} on {formatDate(h.actionDate)} {h.comment && `— "${h.comment}"`}</p>
                  </div>
                ))}
              </div>
            </div>
            {detail.status === 'pending' && (
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
                <Button variant="danger" onClick={handleCancelPending}>Cancel Request</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
