import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatDate } from '../utils/formatDate';
import { CORE_LEAVE_TYPES } from '../types';
import type { LeaveRequest } from '../types';

export default function Approvals() {
  const { user } = useAuth();
  const {
    leaveRequests, leaveBalances, getUserById,
    approveLeave, rejectLeave, cancelLeaveByAdmin,
  } = useAppData();
  const [tab, setTab] = useState<'pending' | 'history' | 'active'>('pending');
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');
  const [cancelMode, setCancelMode] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  if (!user) return null;

  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

  const pending = leaveRequests.filter(
    (l) => l.currentApproverRole === user.role && l.status !== 'approved' && l.status !== 'rejected' && l.status !== 'cancelled'
  );

  const history = leaveRequests.filter((l) =>
    l.approvalHistory.some((h) => h.approverId === user.id) ||
    (isAdminOrManager && ['approved', 'rejected', 'cancelled'].includes(l.status))
  );

  const activeApproved = leaveRequests.filter(
    (l) => ['approved', 'approved_by_team_leader'].includes(l.status) && isAdminOrManager
  );

  const employee = detail ? getUserById(detail.employeeId) : undefined;
  const balances = detail ? (leaveBalances[detail.employeeId] || []).filter((b) => CORE_LEAVE_TYPES.includes(b.leaveType as typeof CORE_LEAVE_TYPES[number])) : [];

  const takeAction = (action: 'approved' | 'rejected') => {
    if (!detail || !user) return;
    if (action === 'approved') approveLeave(detail.id, user, comment);
    else rejectLeave(detail.id, user, comment);
    setDetail(null);
    setComment('');
    setCancelMode(false);
  };

  const handleCancelLeave = () => {
    if (!detail || !user || !returnDate || !cancelReason.trim()) return;
    cancelLeaveByAdmin(detail.id, user, cancelReason.trim(), returnDate);
    setDetail(null);
    setCancelMode(false);
    setReturnDate('');
    setCancelReason('');
  };

  const openReview = (l: LeaveRequest, cancel = false) => {
    setDetail(l);
    setCancelMode(cancel);
    setComment('');
    setReturnDate('');
    setCancelReason('');
  };

  const list = tab === 'pending' ? pending : tab === 'active' ? activeApproved : history;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">Review leave requests and manage active leaves.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          { key: 'pending' as const, label: `Pending (${pending.length})` },
          ...(isAdminOrManager ? [{ key: 'active' as const, label: `Active Leaves (${activeApproved.length})` }] : []),
          { key: 'history' as const, label: 'History' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Dates</th>
                <th className="px-5 py-3 font-medium">Days</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No records.</td></tr>
              )}
              {list.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50 animate-fade-in">
                  <td className="px-5 py-3 text-gray-900">{l.employeeName}</td>
                  <td className="px-5 py-3 capitalize text-gray-600">{l.leaveType}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                  <td className="px-5 py-3 text-gray-600">{l.totalDaysRequested}</td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3">
                    {tab === 'pending' && (
                      <button onClick={() => openReview(l)} className="text-sm font-medium text-blue-600 hover:text-blue-700">Review</button>
                    )}
                    {tab === 'active' && (
                      <button onClick={() => openReview(l, true)} className="text-sm font-medium text-rose-600 hover:text-rose-700">Stop / Cancel</button>
                    )}
                    {tab === 'history' && (
                      <button onClick={() => openReview(l)} className="text-sm font-medium text-blue-600 hover:text-blue-700">View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setComment(''); setCancelMode(false); }}
        title={cancelMode ? 'Stop / Cancel Leave' : tab === 'pending' ? 'Review Leave Request' : 'Leave Details'}
        size="lg"
        footer={
          cancelMode ? (
            <>
              <Button variant="secondary" onClick={() => setCancelMode(false)}>Back</Button>
              <Button variant="danger" onClick={handleCancelLeave} disabled={!returnDate || !cancelReason.trim()}>Confirm Cancel</Button>
            </>
          ) : tab === 'pending' ? (
            <>
              <Button variant="danger" onClick={() => takeAction('rejected')}>Reject</Button>
              <Button variant="success" onClick={() => takeAction('approved')}>Approve</Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4 text-sm">
            {employee && isAdminOrManager && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Employee details</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div><p className="text-xs text-gray-500">Joining date</p><p className="font-medium text-gray-900">{formatDate(employee.dateOfJoining)}</p></div>
                  <div><p className="text-xs text-gray-500">Designation</p><p className="font-medium text-gray-900">{employee.designation}</p></div>
                  <div><p className="text-xs text-gray-500">Grade</p><p className="font-medium text-gray-900">{employee.grade}</p></div>
                  <div><p className="text-xs text-gray-500">Department</p><p className="font-medium text-gray-900">{employee.department}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {balances.map((b) => (
                    <div key={b.leaveType} className="rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-gray-200">
                      <p className="text-[10px] uppercase text-gray-400">{b.leaveType}</p>
                      <p className="text-sm font-semibold text-gray-900">{b.used} used · {b.remaining} balance</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">Employee</p><p className="font-medium text-gray-900">{detail.employeeName}</p></div>
              <div><p className="text-gray-500">Department</p><p className="font-medium text-gray-900">{detail.department}</p></div>
              <div><p className="text-gray-500">Type</p><p className="font-medium capitalize text-gray-900">{detail.leaveType}</p></div>
              <div><p className="text-gray-500">Days requested</p><p className="font-medium text-gray-900">{detail.totalDaysRequested}</p></div>
              <div><p className="text-gray-500">Start</p><p className="font-medium text-gray-900">{formatDate(detail.startDate)}</p></div>
              <div><p className="text-gray-500">End</p><p className="font-medium text-gray-900">{formatDate(detail.endDate)}</p></div>
            </div>
            <div><p className="text-gray-500">Reason</p><p className="mt-1 text-gray-900">{detail.reason}</p></div>
            {detail.attachmentUrl && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-gray-500">Attached document</p>
                <a href={detail.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
                  {detail.attachmentName || 'View attachment'}
                </a>
              </div>
            )}

            {cancelMode ? (
              <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50/50 p-4">
                <p className="text-xs text-rose-700">Employee is returning early. Only days up to the return date will be counted against their balance.</p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Return / join date</label>
                  <input type="date" value={returnDate} min={detail.startDate} max={detail.endDate} onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason for cancellation</label>
                  <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} required
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            ) : tab === 'pending' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Comment (optional)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            )}

            {detail.approvalHistory.length > 0 && (
              <div>
                <p className="text-gray-500">Approval history</p>
                <div className="mt-2 space-y-2">
                  {detail.approvalHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Badge variant={h.action === 'approved' ? 'green' : h.action === 'rejected' ? 'red' : 'gray'}>{h.action}</Badge>
                      <span className="text-xs text-gray-600">{h.approverName} · {formatDate(h.actionDate)} {h.comment && `— ${h.comment}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
