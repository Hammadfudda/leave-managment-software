import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplyLeave from './pages/ApplyLeave';
import LeaveHistory from './pages/LeaveHistory';
import Approvals from './pages/Approvals';
import LeaveCalendar from './pages/LeaveCalendar';
import Notifications from './pages/Notifications';
import Employees from './pages/Employees';
import Grades from './pages/Grades';
import Policies from './pages/Policies';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import MasterData from './pages/MasterData';
import type { Role } from './types';

function Protected({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppDataProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leave/apply" element={<ApplyLeave />} />
              <Route path="/leave/history" element={<LeaveHistory />} />
              <Route path="/approvals" element={<Protected roles={['manager', 'team_leader', 'admin']}><Approvals /></Protected>} />
              <Route path="/calendar" element={<LeaveCalendar />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/employees" element={<Protected roles={['admin']}><Employees /></Protected>} />
              <Route path="/grades" element={<Protected roles={['admin']}><Grades /></Protected>} />
              <Route path="/policies" element={<Protected roles={['admin']}><Policies /></Protected>} />
              <Route path="/master-data" element={<Protected roles={['admin']}><MasterData /></Protected>} />
              <Route path="/audit" element={<Protected roles={['admin']}><AuditLogs /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppDataProvider>
  );
}
