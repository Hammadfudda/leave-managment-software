import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/formatDate';
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import type { Role } from '../types';

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
  tone: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-gray-400">{helper}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { leaveRequests, leaveBalances, users, auditLogs } = useAppData();

  if (!user) return null;

  const role: Role = user.role;
  const today = new Date().toISOString().split('T')[0];

  if (role === 'admin') {
    const activeEmployees = users.filter((u) => u.role === 'employee' && u.status === 'active');
    const activeManagers = users.filter((u) => u.role === 'manager' && u.status === 'active');
    const pendingRequests = leaveRequests.filter((l) => l.status === 'pending');
    const approvedRequests = leaveRequests.filter((l) => l.status === 'approved');
    const rejectedRequests = leaveRequests.filter((l) => l.status === 'rejected');
    const onLeaveToday = approvedRequests.filter((l) => l.startDate <= today && l.endDate >= today);
    const upcomingLeave = approvedRequests
      .filter((l) => l.startDate > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const recentRequests = [...leaveRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 7);

    const recentAudit = [...auditLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    const totalCompanyPeople = activeEmployees.length + activeManagers.length;

    const departmentRows = Object.entries(
      users
        .filter((u) => u.status === 'active' && u.role !== 'admin' && Boolean(u.department))
        .reduce<Record<string, number>>((acc, employee) => {
          acc[employee.department] = (acc[employee.department] || 0) + 1;
          return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Company-wide workforce and leave management overview.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-800">{user.fullName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Active Employees"
            value={activeEmployees.length}
            helper={`${totalCompanyPeople} active people incl. managers`}
            tone="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={UserCog}
            label="Active Managers"
            value={activeManagers.length}
            helper="Current management team"
            tone="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={Clock}
            label="Pending Requests"
            value={pendingRequests.length}
            helper="Awaiting an approval decision"
            tone="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={CalendarDays}
            label="On Leave Today"
            value={onLeaveToday.length}
            helper="Approved leave active today"
            tone="bg-emerald-50 text-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={CheckCircle2}
            label="Approved Leaves"
            value={approvedRequests.length}
            tone="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={XCircle}
            label="Rejected Leaves"
            value={rejectedRequests.length}
            tone="bg-rose-50 text-rose-600"
          />
          <StatCard
            icon={Activity}
            label="Total Leave Requests"
            value={leaveRequests.length}
            tone="bg-sky-50 text-sky-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Recent Leave Requests</h2>
                <p className="mt-1 text-xs text-gray-400">Latest requests across the company.</p>
              </div>
              <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
                {leaveRequests.length} total
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-medium">Employee</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Dates</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                        No leave requests found.
                      </td>
                    </tr>
                  )}

                  {recentRequests.map((leave) => (
                    <tr key={leave.id}>
                      <td className="py-3 font-medium text-gray-900">{leave.employeeName}</td>
                      <td className="py-3 text-gray-600">{leave.department || '—'}</td>
                      <td className="py-3 capitalize text-gray-600">
                        {leave.leaveType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 whitespace-nowrap text-gray-600">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={leave.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-gray-400" />
              <div>
                <h2 className="text-base font-semibold text-gray-900">Employees by Department</h2>
                <p className="mt-0.5 text-xs text-gray-400">Active employees and managers.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {departmentRows.length === 0 && (
                <p className="py-5 text-center text-sm text-gray-400">No department data.</p>
              )}

              {departmentRows.map(([department, count]) => {
                const pct = totalCompanyPeople > 0 ? (count / totalCompanyPeople) * 100 : 0;

                return (
                  <div key={department}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-gray-700">{department}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">On Leave Today</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Employees with an approved leave active today.
                </p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-600">
                {onLeaveToday.length}
              </span>
            </div>

            <div className="mt-4 divide-y divide-gray-50">
              {onLeaveToday.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">Nobody is on leave today.</p>
              )}

              {onLeaveToday.slice(0, 6).map((leave) => (
                <div key={leave.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{leave.employeeName}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {leave.department} · {leave.leaveType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-gray-500">
                    Until {formatDate(leave.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Upcoming Leave</h2>
                <p className="mt-1 text-xs text-gray-400">Next approved leaves scheduled to start.</p>
              </div>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-600">
                {upcomingLeave.length}
              </span>
            </div>

            <div className="mt-4 divide-y divide-gray-50">
              {upcomingLeave.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">No upcoming approved leave.</p>
              )}

              {upcomingLeave.slice(0, 6).map((leave) => (
                <div key={leave.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{leave.employeeName}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {leave.department} · {leave.leaveType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-gray-600">
                    {formatDate(leave.startDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-gray-400" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Audit Activity</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Latest administrative and leave activity recorded by the system.
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-gray-50">
            {recentAudit.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">No recent audit activity.</p>
            )}

            {recentAudit.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{log.actorName}</span> — {log.details}
                  </p>
                  {(log.department || log.affectedPerson) && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {[log.affectedPerson, log.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-gray-400">{formatDate(log.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Existing Employee / Manager dashboard behavior is kept separate.
  const balances = (leaveBalances[user.id] || []).filter((b) =>
    ['annual', 'sick', 'casual'].includes(b.leaveType)
  );

  const myLeaves = leaveRequests.filter((l) => l.employeeId === user.id);

  const teamLeaves = leaveRequests.filter((l) => {
    const emp = users.find((u) => u.id === l.employeeId);
    return emp?.managerId === user.id;
  });

  const isCurrentApprover = (l: (typeof leaveRequests)[number]) => {
    if (l.status !== 'pending') return false;

    const required = l.requiredApproverIds || [];
    if (required.length === 0) return false;

    const approved = l.approvedByIds || [];
    const rejected = l.rejectedByIds || [];
    const gatekeeperId = required[0];

    if (!approved.includes(gatekeeperId) && !rejected.includes(gatekeeperId)) {
      return gatekeeperId === user.id;
    }

    return required
      .slice(1)
      .some(
        (id) =>
          id === user.id &&
          !approved.includes(id) &&
          !rejected.includes(id)
      );
  };

  const pendingApprovals = leaveRequests.filter(isCurrentApprover);

  const onLeaveToday = leaveRequests.filter(
    (l) =>
      l.startDate <= today &&
      l.endDate >= today &&
      l.status === 'approved'
  );

  const visibleActivity =
    role === 'employee'
      ? myLeaves
      : [...teamLeaves]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {user.fullName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {role === 'employee'
            ? 'Here is your leave overview.'
            : 'Here is what is happening with your team today.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="On leave today"
          value={onLeaveToday.length}
          tone="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Pending approvals"
          value={pendingApprovals.length}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={leaveRequests.filter((l) => l.status === 'approved').length}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={leaveRequests.filter((l) => l.status === 'rejected').length}
          tone="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Recent leave activity</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleActivity.slice(0, 6).map((leave) => (
                  <tr key={leave.id}>
                    <td className="py-3 text-gray-900">{leave.employeeName}</td>
                    <td className="py-3 capitalize text-gray-600">
                      {leave.leaveType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 text-gray-600">
                      {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={leave.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Your leave balance</h2>

          <div className="mt-4 space-y-4">
            {balances.length === 0 && (
              <p className="text-sm text-gray-400">No balance data.</p>
            )}

            {balances.map((balance) => {
              const pct =
                balance.quota > 0
                  ? (balance.used / balance.quota) * 100
                  : 0;

              return (
                <div key={balance.leaveType}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{balance.leaveType}</span>
                    <span className="font-medium text-gray-900">
                      {balance.remaining}/{balance.quota}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
