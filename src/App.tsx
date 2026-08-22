import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AppDataProvider } from "./context/AppDataContext";
import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveHistory from "./pages/LeaveHistory";
import Approvals from "./pages/Approvals";
import LeaveCalendar from "./pages/LeaveCalendar";
import Notifications from "./pages/Notifications";
import Employees from "./pages/Employees";
import Grades from "./pages/Grades";
import Policies from "./pages/Policies";
import AuditLogs from "./pages/AuditLogs";
import Profile from "./pages/Profile";
import MasterData from "./pages/MasterData";
import MyTeam from "./pages/MyTeam";
import SuperAdminApp from "./super-admin/SuperAdminApp";
import type { Role } from "./types";

function Protected({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (
    roles &&
    !roles.includes(user.role)
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <>{children}</>;
}

function PublicOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">
          Loading...
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AppDataProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* LOGIN */}
            <Route
              path="/"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />

            {/* AUTHENTICATED AREA */}
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              {/* ADMIN DOES NOT HAVE EMPLOYEE PROFILE */}
              <Route
                path="/profile"
                element={
                  <Protected
                    roles={[
                      "manager",
                      "employee",
                    ]}
                  >
                    <Profile />
                  </Protected>
                }
              />

              <Route
                path="/leave/apply"
                element={
                  <Protected
                    roles={[
                      "manager",
                      "employee",
                    ]}
                  >
                    <ApplyLeave />
                  </Protected>
                }
              />

              <Route
                path="/leave/history"
                element={
                  <Protected
                    roles={[
                      "manager",
                      "employee",
                    ]}
                  >
                    <LeaveHistory />
                  </Protected>
                }
              />

              <Route
                path="/approvals"
                element={
                  <Protected
                    roles={["manager"]}
                  >
                    <Approvals />
                  </Protected>
                }
              />

              <Route
                path="/calendar"
                element={
                  <Protected
                    roles={[
                      "admin",
                      "manager",
                    ]}
                  >
                    <LeaveCalendar />
                  </Protected>
                }
              />

              <Route
                path="/notifications"
                element={
                  <Protected
                    roles={[
                      "admin",
                      "manager",
                      "employee",
                    ]}
                  >
                    <Notifications />
                  </Protected>
                }
              />

              <Route
                path="/employees"
                element={
                  <Protected
                    roles={["admin"]}
                  >
                    <Employees />
                  </Protected>
                }
              />

              <Route
                path="/grades"
                element={
                  <Protected
                    roles={["admin"]}
                  >
                    <Grades />
                  </Protected>
                }
              />

              <Route
                path="/my-team"
                element={
                  <Protected
                    roles={[
                      "manager",
                      "admin",
                    ]}
                  >
                    <MyTeam />
                  </Protected>
                }
              />

              <Route
                path="/policies"
                element={
                  <Protected
                    roles={["admin"]}
                  >
                    <Policies />
                  </Protected>
                }
              />

              <Route
                path="/create"
                element={
                  <Protected
                    roles={["admin"]}
                  >
                    <MasterData />
                  </Protected>
                }
              />

              <Route
                path="/audit"
                element={
                  <Protected
                    roles={["admin"]}
                  >
                    <AuditLogs />
                  </Protected>
                }
              />
            </Route>

            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
               
<Route
  path="/super-admin"
  element={<SuperAdminApp />}
/>              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppDataProvider>
  );
}