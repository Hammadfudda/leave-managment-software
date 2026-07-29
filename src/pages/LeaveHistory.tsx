import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { formatDate } from '../utils/formatDate';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import type { LeaveStatus, LeaveRequest } from '../types';

export default function LeaveHistory() {
  const { user } = useAuth();
  const { leaveRequests, getUserById, extendLeave, requestStopLeave } = useAppData();
  const [filter, setFilter] = useState<LeaveStatus | 'all'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState<{ type: 'extend' | 'stop'; request: LeaveRequest } | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formReason, setFormReason] = useState('');

  if (!user) return null;
  const myLeaves = leaveRequests.filter((l) => l.employeeId === user.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = filter === 'all' ? myLeaves : myLeaves.filter((l) => l.status === filter);

  // Derived live from leaveRequests on every render — never a frozen local copy —
  // so the modal always reflects true current data.
  const detail = detailId ? leaveRequests.find((l) => l.id === detailId) || null : null;

  const filters: { value: LeaveStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const openExtend = (req: LeaveRequest) => {
    setFormDate('');
    setFormReason('');
    setActionForm({ type: 'extend', request: req });
  };

  const openStop = (req: LeaveRequest) => {
    setFormDate('');
    setFormReason('');
    setActionForm({ type: 'stop', request: req });
  };

  const closeActionForm = () => {
    setActionForm(null);
    setFormDate('');
    setFormReason('');
  };

  const handleSubmitExtend = () => {
    if (!actionForm || !user || !formDate || !formReason.trim()) return;
    extendLeave(actionForm.request, user, formDate, formReason.trim(), true);
    closeActionForm();
  };

  const handleSubmitStop = () => {
    if (!actionForm || !user || !formDate || !formReason.trim()) return;
    requestStopLeave(actionForm.request, user, formDate, formReason.trim());
    closeActionForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Leaves</h1>
          <p className="mt-1 text-sm text-gray-500">Track all your leave requests.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const count = f.value === 'all' ? myLeaves.length : myLeaves.filter((l) => l.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
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
                  <td className="px-5 py-3 capitalize text-gray-900">
                    {l.leaveType}
                    {l.isExtension && <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 normal-case">Extend</span>}
                    {l.isStopRequest && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 normal-case">Stop</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(l.startDate)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(l.actualEndDate || l.endDate)}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {l.daysUsedBeforeCancel != null ? `${l.daysUsedBeforeCancel} / ${l.totalDaysRequested}` : l.totalDaysRequested}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button onClick={() => setDetailId(l.id)} className="text-sm font-medium text-blue-600 hover:text-blue-700">View</button>
                      {l.status === 'approved' && !l.isExtension && !l.isStopRequest && l.endDate >= todayStr && (
                        <>
                          <button onClick={() => openExtend(l)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Extend</button>
                          <button onClick={() => openStop(l)} className="text-sm font-medium text-amber-600 hover:text-amber-700">Stop</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal — view only, plus the approval chain */}
      <Modal open={!!detail && !actionForm} onClose={() => setDetailId(null)} title="Leave Request Details" size="md">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">Type</p><p className="font-medium capitalize text-gray-900">
                {detail.leaveType}
                {detail.isExtension && <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 normal-case">Extend</span>}
                {detail.isStopRequest && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 normal-case">Stop</span>}
              </p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} /></div>
              <div><p className="text-gray-500">Start date</p><p className="font-medium text-gray-900">{formatDate(detail.startDate)}</p></div>
              <div><p className="text-gray-500">End date</p><p className="font-medium text-gray-900">{formatDate(detail.actualEndDate || detail.endDate)}</p></div>
              <div><p className="text-gray-500">Total days requested</p><p className="font-medium text-gray-900">{detail.totalDaysRequested}</p></div>
              <div><p className="text-gray-500">Days counted</p><p className="font-medium text-gray-900">{detail.daysUsedBeforeCancel ?? detail.totalWorkingDays}</p></div>
            </div>

            <div><p className="text-gray-500">Reason</p><p className="mt-1 text-gray-900">{detail.reason}</p></div>

            {/* Who needs to approve this, and where each of them stands right now. */}
            {detail.requiredApproverIds && detail.requiredApproverIds.length > 0 && (
              <div>
                <p className="text-gray-500 mb-2">Approvers</p>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.requiredApproverIds.map((id, idx) => {
                    const approver = getUserById(id);
                    const isApproved = detail.approvedByIds?.includes(id);
                    const isRejected = detail.rejectedByIds?.includes(id);
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                          isApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          isRejected ? 'border-rose-200 bg-rose-50 text-rose-700' :
                          'border-gray-200 bg-gray-50 text-gray-500'
                        }`}>
                          {isApproved ? <CheckCircle2 size={13} /> : isRejected ? <XCircle size={13} /> : <Circle size={13} />}
                          <span>{approver?.fullName || 'Unknown'}{approver?.designation ? <span className="opacity-60"> — {approver.designation}</span> : null}</span>
                        </div>
                        {idx < detail.requiredApproverIds!.length - 1 && <span className="text-gray-300">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-gray-500">Approval notes</p>
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
          </div>
        )}
      </Modal>

      {/* Extend / Stop form modal — separate from the details view */}
      <Modal
        open={!!actionForm}
        onClose={closeActionForm}
        title={actionForm?.type === 'extend' ? 'Request Leave Extension' : 'Request to Stop Leave Early'}
        footer={
          <>
            <Button variant="secondary" onClick={closeActionForm}>Cancel</Button>
            {actionForm?.type === 'extend' ? (
              <Button onClick={handleSubmitExtend} disabled={!formDate || !formReason.trim()}>Submit Extension Request</Button>
            ) : (
              <Button onClick={handleSubmitStop} disabled={!formDate || !formReason.trim()}>Submit Stop Request</Button>
            )}
          </>
        }
      >
        {actionForm?.type === 'extend' && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Requesting an extension to your {actionForm.request.leaveType} leave, currently approved through <span className="font-medium">{formatDate(actionForm.request.endDate)}</span>.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Extend until</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                min={actionForm.request.endDate}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={3}
                placeholder="Why do you need to extend this leave?"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>
          </div>
        )}

        {actionForm?.type === 'stop' && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Your {actionForm.request.leaveType} leave was approved through <span className="font-medium">{formatDate(actionForm.request.endDate)}</span>. Pick the date you actually want to return.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Returning on</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={actionForm.request.endDate}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-xs text-gray-400">Choose any date between today and your original end date ({formatDate(actionForm.request.endDate)}).</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={3}
                placeholder="Why are you ending this leave early?"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
