import { useAuth } from '../context/AuthContext';
import { useAppData, getReportingChain } from '../context/AppDataContext';
import Badge from '../components/ui/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import { Mail, Phone, Building2, CalendarDays, CreditCard, Briefcase, UserCircle, BadgeCheck, Users } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

const roleLabel: Record<string, string> = {
  admin: 'Administrator', manager: 'Manager', team_leader: 'Team Leader', employee: 'Employee',
};

export default function Profile() {
  const { user } = useAuth();
  const { leaveBalances, leaveRequests, getUserById } = useAppData();
  if (!user) return null;

  const balances = (leaveBalances[user.id] || []).filter((b) => ['annual', 'sick', 'casual'].includes(b.leaveType));
  const myLeaves = leaveRequests.filter((l) => l.employeeId === user.id);
  const { teamLeader, manager } = getReportingChain(user, getUserById);

  const fields = [
    { icon: CreditCard, label: 'Employee ID', value: user.employeeId, mono: true },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: CreditCard, label: 'CNIC', value: user.cnic, mono: true },
    { icon: Phone, label: 'Phone', value: user.phone },
    { icon: Briefcase, label: 'Designation', value: user.designation },
    { icon: BadgeCheck, label: 'Grade', value: user.grade },
    { icon: Building2, label: 'Department', value: user.department },
    { icon: CalendarDays, label: 'Date of Joining', value: formatDate(user.dateOfJoining) },
    { icon: Users, label: 'Team Leader', value: teamLeader?.fullName || '—' },
    { icon: UserCircle, label: 'Manager', value: manager?.fullName || '— (Top level)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Your employment and leave information.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-fade-in">
        <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-semibold text-blue-600 ring-4 ring-white">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-xl font-semibold text-gray-900">{user.fullName}</h2>
              <p className="text-sm text-gray-500">{user.designation}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="blue">{roleLabel[user.role]}</Badge>
                <Badge variant="teal">{user.grade}</Badge>
                {user.status === 'active' ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Inactive</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-fade-in">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{f.label}</p>
                <p className={`mt-0.5 truncate text-sm font-medium text-gray-900 ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Leave balances</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {balances.length === 0 && <p className="text-sm text-gray-400">No balance data.</p>}
          {balances.map((b) => (
            <div key={b.leaveType} className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs capitalize text-gray-500">{b.leaveType} leave</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{b.remaining}<span className="text-sm font-normal text-gray-400"> / {b.quota}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${b.quota > 0 ? (b.used / b.quota) * 100 : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{b.used} used</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Recent leave requests</h2>
        <div className="mt-3 space-y-2">
          {myLeaves.length === 0 && <p className="text-sm text-gray-400">No leave requests yet.</p>}
          {myLeaves.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm animate-fade-in">
              <div>
                <p className="font-medium capitalize text-gray-900">{l.leaveType} leave</p>
                <p className="text-xs text-gray-500">{formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.daysUsedBeforeCancel ?? l.totalDaysRequested} day(s)</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
