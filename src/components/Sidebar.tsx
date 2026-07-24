import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  CheckSquare,
  CalendarDays,
  Bell,
  Users,
  FileText,
  ScrollText,
  LogOut,
  X,
  UserCircle,
  Settings2,
} from 'lucide-react';
import type { Role } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
  { to: '/profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'manager', 'employee'] },
  { to: '/leave/apply', label: 'Apply Leave', icon: CalendarPlus, roles: ['admin', 'manager', 'employee'] },
  { to: '/leave/history', label: 'My Leaves', icon: History, roles: ['admin', 'manager', 'employee'] },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['manager', 'admin'] },
  { to: '/calendar', label: 'Leave Calendar', icon: CalendarDays, roles: ['admin', 'manager'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'manager', 'employee'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['admin'] },
{ to: '/create', label: 'Create', icon: Settings2, roles: ['admin'] },
  { to: '/policies', label: 'Leave Policies', icon: FileText, roles: ['admin'] },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['admin'] },
];

const roleLabel: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
};

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const items = navItems.filter((i) => i.roles.includes(user.role));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-gray-900/30 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <img src="/Nutrilov_Logo.webp" alt="Nutrilov" className="h-9 w-9 rounded-lg object-contain" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Nutrilov</p>
                <p className="text-[11px] text-gray-500">Leave Management Software</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-gray-100 p-3">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {user.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="truncate text-xs text-gray-500">{roleLabel[user.role]}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
