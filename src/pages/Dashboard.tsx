import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/formatDate';
import { CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Role } from '../types';

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof CalendarDays; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { leaveRequests, leaveBalances, users } = useAppData();
  if (!user) return null;

  const role: Role = user.role;
  const balances = (leaveBalances[user.id] || []).filter((b) => ['annual', 'sick', 'casual'].includes(b.leaveType));
  const myLeaves = leaveRequests.filter((l) => l.employeeId === user.id);

  const teamLeaves = leaveRequests.filter((l) => {
    const emp = users.find((u) => u.id === l.employeeId);
    return emp?.managerId === user.id || emp?.teamLeaderId === user.id;
  });

  const pendingApprovals = leaveRequests.filter(
    (l) => l.currentApproverRole === role && l.status !== 'approved' && l.status !== 'rejected' && l.status !== 'cancelled'
  );

  const onLeaveToday = leaveRequests.filter((l) => {
    const today = '2026-07-18';
    return l.startDate <= today && l.endDate >= today && (l.status === 'approved' || l.status === 'approved_by_team_leader');
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user.fullName.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {role === 'employee'
            ? 'Here is your leave overview.'
            : 'Here is what is happening with your team today.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="On leave today" value={onLeaveToday.length} tone="bg-blue-50 text-blue-600" />
        <StatCard icon={Clock} label="Pending approvals" value={pendingApprovals.length} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Approved this month" value={leaveRequests.filter((l) => l.status === 'approved').length} tone="bg-emerald-50 text-emerald-600" />
        <StatCard icon={XCircle} label="Rejected" value={leaveRequests.filter((l) => l.status === 'rejected').length} tone="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
                {(role === 'employee' ? myLeaves : teamLeaves.concat(leaveRequests)).slice(0, 6).map((l) => (
                  <tr key={l.id} className="animate-fade-in">
                    <td className="py-3 text-gray-900">{l.employeeName}</td>
                    <td className="py-3 capitalize text-gray-600">{l.leaveType}</td>
                    <td className="py-3 text-gray-600">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                    <td className="py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Your leave balance</h2>
          <div className="mt-4 space-y-4">
            {balances.length === 0 && <p className="text-sm text-gray-400">No balance data.</p>}
            {balances.map((b) => {
              const pct = b.quota > 0 ? (b.used / b.quota) * 100 : 0;
              return (
                <div key={b.leaveType}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{b.leaveType}</span>
                    <span className="font-medium text-gray-900">{b.remaining}/{b.quota}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
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
