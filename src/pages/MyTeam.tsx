import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Users, Briefcase, Building2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import Badge from '../components/ui/Badge';
import type { LeaveRequest } from '../types';

function getCurrentTurnApproverIds(req: LeaveRequest): string[] {
  if (req.status !== 'pending') return [];
  const required = req.requiredApproverIds || [];
  if (required.length === 0) return [];
  const approved = req.approvedByIds || [];
  const rejected = req.rejectedByIds || [];
  const gatekeeperId = required[0];

  if (!approved.includes(gatekeeperId) && !rejected.includes(gatekeeperId)) {
    return [gatekeeperId]; // gatekeeper's turn
  }
  // gatekeeper has approved (rejected case would have already set status to 'rejected') — parallel tier's turn
  return required.slice(1).filter((id) => !approved.includes(id) && !rejected.includes(id));
}

export default function MyTeam() {
  const { user } = useAuth();
  const { users, leaveBalances, grades, departments, leaveRequests, getUserById, approveLeave, rejectLeave, cancelLeaveByAdmin, actOnBehalf } = useAppData();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const allManagers = users.filter((u) => u.role === 'manager' && u.status === 'active');

  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [selectedManagerId, setSelectedManagerId] = useState<string>(isAdmin ? '' : user.id);
  const [activeTab, setActiveTab] = useState<'team' | 'requests'>('team');

  const managers = departmentFilter === 'All Departments'
    ? allManagers
    : allManagers.filter((m) => m.department === departmentFilter);

  const activeManagerId = isAdmin ? selectedManagerId : user.id;
  const selectedManager = users.find((u) => u.id === activeManagerId);
  const team = users.filter((u) => u.managerId === activeManagerId && u.status === 'active');
  const teamIds = team.map((t) => t.id);

  const teamRequests = leaveRequests
    .filter((r) => teamIds.includes(r.employeeId))
    .filter((r) => r.status === 'pending' || r.status === 'approved' || r.status === 'rejected')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = teamRequests.filter((r) => r.status === 'pending').length;

  const handleApprove = (requestId: string) => {
    if (!user) return;
    approveLeave(requestId, user);
  };

  const handleReject = (requestId: string) => {
    if (!user) return;
    const comment = window.prompt('Reason for rejection (optional):') || undefined;
    rejectLeave(requestId, user, comment);
  };

  const handleActOnBehalf = (requestId: string, targetApproverId: string, action: 'approved' | 'rejected') => {
    if (!user) return;
    actOnBehalf(requestId, user, targetApproverId, action);
  };

  const handleStop = (req: LeaveRequest) => {
    if (!user) return;
    const reason = window.prompt('Reason for stopping this leave:');
    if (!reason) return;
    const returnDate = new Date().toISOString().split('T')[0];
    cancelLeaveByAdmin(req.id, user, reason, returnDate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{isAdmin ? 'Managers' : 'My Team'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? 'Browse all managers, then select one to view their team.' : 'People reporting to you, and their leave requests.'}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Filter by Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All Departments">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {managers.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
              No managers found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {managers.map((m) => {
                const isSelected = m.id === activeManagerId;
                const reportsCount = users.filter((u) => u.managerId === m.id && u.status === 'active').length;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedManagerId(m.id); setActiveTab('team'); }}
                    className={`text-left rounded-2xl border p-4 shadow-sm transition-colors ${
                      isSelected ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-100' : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 shrink-0">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{m.fullName}</h3>
                        <Badge variant="blue">Manager</Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <p className="flex items-center gap-1.5"><Briefcase size={12} /> {m.designation}</p>
                      <p className="flex items-center gap-1.5"><Building2 size={12} /> {m.department}</p>
                      <p className="text-gray-400">{reportsCount} report{reportsCount !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {(!isAdmin || selectedManagerId) && (
        <>
          {isAdmin && selectedManager && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm text-blue-800">
              Showing team reporting to <span className="font-semibold">{selectedManager.fullName}</span> ({selectedManager.designation})
            </div>
          )}

          {team.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
              {isAdmin ? 'This manager has no one assigned to them yet.' : 'No one is currently assigned to you as their manager.'}
            </div>
          ) : (
            <>
              <div className="flex gap-1.5 border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('team')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'team' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Team
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'requests' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Leave Requests {pendingCount > 0 && <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">{pendingCount}</span>}
                </button>
              </div>

              {activeTab === 'team' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {team.map((member) => {
                    const balances = leaveBalances[member.id] || [];
                    const grade = grades.find((g) => g.name === member.grade);
                    return (
                      <div key={member.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <Users size={18} />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{member.fullName}</h3>
                              <p className="text-xs text-gray-500">{member.designation} · {member.department}</p>
                            </div>
                          </div>
                          {grade && <Badge variant="teal">{grade.name}</Badge>}
                        </div>

                        <div className="mt-4 space-y-2">
                          {balances.length === 0 && (
                            <p className="text-xs text-gray-400">No leave balance set up yet.</p>
                          )}
                          {balances.map((b) => (
                            <div key={b.leaveType} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                              <span className="capitalize font-medium text-gray-700">{b.leaveType}</span>
                              <span className="text-gray-500">
                                Granted: <span className="font-semibold text-gray-800">{b.quota}</span>
                                {' · '}Used: <span className="font-semibold text-gray-800">{b.used}</span>
                                {' · '}Remaining: <span className="font-semibold text-emerald-700">{b.remaining}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'requests' && (
                teamRequests.length === 0 ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
                    No leave requests from this team yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamRequests.map((req) => {
                      const employee = getUserById(req.employeeId);
                      const required = req.requiredApproverIds || [];
                      const approved = req.approvedByIds || [];
                      const rejected = req.rejectedByIds || [];
                      const currentTurnIds = getCurrentTurnApproverIds(req);
                      const isManagersTurn = !isAdmin && currentTurnIds.includes(user.id);
                      const conflictDetected = req.status === 'pending' && required.length > 1 && approved.includes(required[0]) && required.slice(1).some((id) => rejected.includes(id));

                      return (
                        <div key={req.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{employee?.fullName || 'Unknown'} — <span className="capitalize">{req.leaveType}</span> leave</p>
                              <p className="text-xs text-gray-500">{req.startDate} to {req.endDate} · {req.totalWorkingDays} working day(s)</p>
                            </div>
                            <Badge variant={req.status === 'approved' ? 'teal' : req.status === 'rejected' ? 'rose' : conflictDetected ? 'orange' : 'gray'}>
                              {conflictDetected ? 'Conflict — needs Admin' : req.status}
                            </Badge>
                          </div>

                          {required.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {required.map((id, idx) => {
                                const approver = getUserById(id);
                                const isApproved = approved.includes(id);
                                const isRejected = rejected.includes(id);
                                return (
                                  <div key={id} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                                      isApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                      isRejected ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                      'border-gray-200 bg-gray-50 text-gray-500'
                                    }`}>
                                      {isApproved ? <CheckCircle2 size={13} /> : isRejected ? <XCircle size={13} /> : <Circle size={13} />}
                                      <span>{approver?.fullName || 'Unknown'}</span>
                                      {idx === 0 && <span className="text-[10px] opacity-70">(Gatekeeper)</span>}
                                    </div>
                                    {idx < required.length - 1 && <span className="text-gray-300">→</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isManagersTurn && (
                            <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                              <button onClick={() => handleApprove(req.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button>
                              <button onClick={() => handleReject(req.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Reject</button>
                            </div>
                          )}

                          {isAdmin && req.status === 'pending' && currentTurnIds.length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                              {currentTurnIds.map((id) => {
                                const person = getUserById(id);
                                return (
                                  <div key={id} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">On behalf of {person?.fullName}:</span>
                                    <button onClick={() => handleActOnBehalf(req.id, id, 'approved')} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button>
                                    <button onClick={() => handleActOnBehalf(req.id, id, 'rejected')} className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700">Reject</button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isAdmin && req.status === 'rejected' && (
                            <div className="mt-3 border-t border-gray-50 pt-3">
                              <p className="text-xs text-rose-600 mb-1.5">Rejected — you can override and approve on behalf of the gatekeeper:</p>
                              <button onClick={() => handleActOnBehalf(req.id, (req.requiredApproverIds || [])[0], 'approved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Approve on behalf of Gatekeeper</button>
                            </div>
                          )}

                          {isAdmin && req.status === 'approved' && (
                            <div className="mt-3 border-t border-gray-50 pt-3">
                              <button onClick={() => handleStop(req)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Stop Leave</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
