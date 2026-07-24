import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Users, Briefcase, Building2 } from 'lucide-react';
import Badge from '../components/ui/Badge';

export default function MyTeam() {
  const { user } = useAuth();
  const { users, leaveBalances, grades, departments } = useAppData();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const allManagers = users.filter((u) => u.role === 'manager' && u.status === 'active');

  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [selectedManagerId, setSelectedManagerId] = useState<string>(isAdmin ? '' : user.id);

  const managers = departmentFilter === 'All Departments'
    ? allManagers
    : allManagers.filter((m) => m.department === departmentFilter);

  const activeManagerId = isAdmin ? selectedManagerId : user.id;
  const selectedManager = users.find((u) => u.id === activeManagerId);
  const team = users.filter((u) => u.managerId === activeManagerId && u.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{isAdmin ? 'Managers' : 'My Team'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? 'Browse all managers, then select one to view their team and leave balances.' : 'People reporting to you, with the leave balances Admin has granted them.'}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="flex flex-wrap items-center gap-3">
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
                    onClick={() => setSelectedManagerId(m.id)}
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

      {isAdmin && selectedManager && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm text-blue-800">
          Showing team reporting to <span className="font-semibold">{selectedManager.fullName}</span> ({selectedManager.designation})
        </div>
      )}

      {(!isAdmin || selectedManagerId) && (
        team.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            {isAdmin ? 'This manager has no one assigned to them yet.' : 'No one is currently assigned to you as their manager.'}
          </div>
        ) : (
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
        )
      )}
    </div>
  );
}
