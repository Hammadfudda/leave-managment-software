import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CalendarPlus, History, CheckSquare, CalendarDays, Bell,
  Users, FileText, ScrollText, LogOut, X, UserCircle, Settings2, MessageSquareText,
} from "lucide-react";
import type { Role } from "../types";
import { useAuth } from "../context/AuthContext";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[]; }
const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
  { to: "/profile", label: "My Profile", icon: UserCircle, roles: ["manager", "employee"] },
  { to: "/leave/apply", label: "Apply Leave", icon: CalendarPlus, roles: ["manager", "employee"] },
  { to: "/leave/history", label: "My Leaves", icon: History, roles: ["manager", "employee"] },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, roles: ["admin", "manager"] },
  { to: "/my-team", label: "My Team", icon: Users, roles: ["manager", "admin"] },
  { to: "/calendar", label: "Leave Calendar", icon: CalendarDays, roles: ["admin", "manager"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "manager", "employee"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["admin"] },
  { to: "/create", label: "Create", icon: Settings2, roles: ["admin"] },
  { to: "/policies", label: "Leave Policies", icon: FileText, roles: ["admin"] },
  { to: "/feedback", label: "Feedback & Support", icon: MessageSquareText, roles: ["admin"] },
  { to: "/audit", label: "Audit Logs", icon: ScrollText, roles: ["admin"] },
];
const roleLabel: Record<Role, string> = { admin: "Administrator", manager: "Manager", employee: "Employee" };

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const items = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-gray-900/30 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[#0d4270] bg-[#062b4f] transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/neddconsultantlogo.png" alt="Nedd Digital" className="h-12 w-auto max-w-[150px] shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Nedd Digital</p>
                <p className="truncate text-[11px] text-white/65">Leave Management Software</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"><X size={18} /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {items.map((item) => {
              const Icon = item.icon;
              const label = item.to === "/my-team" ? (user.role === "admin" ? "Managers" : "My Team") : item.label;
              return (
                <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-[#ffb703] text-[#062b4f] shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`
                }><Icon size={18} />{label}</NavLink>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffb703] text-sm font-semibold text-[#062b4f]">{user.fullName.charAt(0)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{user.fullName}</p><p className="truncate text-xs text-white/65">{roleLabel[user.role]}</p></div>
            </div>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#ffb703] transition-colors hover:bg-white/10"><LogOut size={18} />Sign Out</button>
          </div>
        </div>
      </aside>
    </>
  );
}
