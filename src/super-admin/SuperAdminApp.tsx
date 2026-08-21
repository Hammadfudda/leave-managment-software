import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  Building2,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';

import Button from '../components/ui/Button';

import superAdminApi, {
  clearSuperAdminToken,
  getSuperAdminError,
  getSuperAdminToken,
  setSuperAdminToken,
} from './superAdminApi';

interface SuperAdminUser {
  id: string;
  fullName: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  admin: {
    id: string;
    fullName: string;
    email: string;
    status: string;
  } | null;
}

const emptyClient = {
  companyName: '',
  adminName: '',
  adminEmail: '',
  password: '',
};

export default function SuperAdminApp() {
  const [user, setUser] =
    useState<SuperAdminUser | null>(null);

  const [loading, setLoading] =
    useState(Boolean(getSuperAdminToken()));

  useEffect(() => {
    const token = getSuperAdminToken();

    if (!token) {
      setLoading(false);
      return;
    }

    superAdminApi
      .get('/super-admin/me')
      .then((response) => {
        setUser(response.data.user);
      })
      .catch(() => {
        clearSuperAdminToken();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Loading SaaS Admin...
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onSuccess={setUser}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearSuperAdminToken();
        setUser(null);
      }}
    />
  );
}

function Login({
  onSuccess,
}: {
  onSuccess: (user: SuperAdminUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError(
        'Email and password are required.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response =
        await superAdminApi.post(
          '/super-admin/login',
          {
            email: email.trim(),
            password,
          }
        );

      setSuperAdminToken(
        response.data.accessToken
      );

      onSuccess(
        response.data.user
      );

      window.history.replaceState(
        {},
        '',
        '/super-admin/dashboard'
      );
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to sign in.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck size={28} />
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-white">
            SaaS Owner
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Leave Management Control Panel
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-white">
            Super Admin Login
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Separate from Client Admin / Manager / Employee login.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 pr-10 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full"
            >
              {saving
                ? 'Signing in...'
                : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: SuperAdminUser;
  onLogout: () => void;
}) {
  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [form, setForm] =
    useState(emptyClient);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [credentials, setCredentials] =
    useState<{
      email: string;
      password: string;
    } | null>(null);

  const [resetTarget, setResetTarget] =
    useState<Organization | null>(
      null
    );

  const [newPassword, setNewPassword] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response =
        await superAdminApi.get(
          '/super-admin/organizations'
        );

      setOrganizations(
        response.data.data || []
      );
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to load clients.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createClient = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !form.companyName.trim() ||
      !form.adminName.trim() ||
      !form.adminEmail.trim() ||
      form.password.length < 8
    ) {
      setError(
        'Complete all fields. Password must be at least 8 characters.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response =
        await superAdminApi.post(
          '/super-admin/organizations',
          form
        );

      setCredentials(
        response.data.credentials
      );

      setForm(emptyClient);
      setShowCreate(false);

      await load();
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to create client.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (
    organization: Organization
  ) => {
    const status =
      organization.status ===
      'active'
        ? 'suspended'
        : 'active';

    try {
      await superAdminApi.patch(
        `/super-admin/organizations/${organization.id}/status`,
        { status }
      );

      await load();
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to update client status.'
        )
      );
    }
  };

  const resetPassword = async () => {
    if (
      !resetTarget ||
      newPassword.length < 8
    ) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await superAdminApi.patch(
          `/super-admin/organizations/${resetTarget.id}/reset-admin-password`,
          {
            password:
              newPassword,
          }
        );

      setCredentials(
        response.data.credentials
      );

      setResetTarget(null);
      setNewPassword('');
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to reset password.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const active =
    organizations.filter(
      (item) =>
        item.status === 'active'
    ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div>
            <h1 className="font-semibold">
              SaaS Control Panel
            </h1>

            <p className="text-xs text-slate-400">
              {user.fullName} · {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">
              Clients
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Create Client Organizations and Admin credentials.
            </p>
          </div>

          <Button
            onClick={() =>
              setShowCreate(true)
            }
          >
            <Plus size={16} />
            Create Client
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Total Clients"
            value={
              organizations.length
            }
          />

          <Metric
            label="Active"
            value={active}
          />

          <Metric
            label="Suspended"
            value={
              organizations.length -
              active
            }
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <Building2
                size={18}
                className="text-blue-400"
              />
              <h3 className="font-semibold">
                Organizations
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                void load()
              }
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Loading clients...
            </div>
          ) : organizations.length ===
            0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No clients yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/60 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Company
                    </th>
                    <th className="px-5 py-3">
                      Client Admin
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {organizations.map(
                    (
                      organization
                    ) => (
                      <tr
                        key={
                          organization.id
                        }
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-white">
                            {organization.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {organization.slug}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-200">
                            {organization.admin?.fullName ||
                              '—'}
                          </p>

                          <p className="text-xs text-slate-500">
                            {organization.admin?.email ||
                              '—'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              organization.status ===
                              'active'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {organization.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setResetTarget(
                                  organization
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300"
                            >
                              <UserRoundCog
                                size={14}
                              />
                              Reset Password
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void toggleStatus(
                                  organization
                                )
                              }
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                                organization.status ===
                                'active'
                                  ? 'bg-rose-950 text-rose-300'
                                  : 'bg-emerald-950 text-emerald-300'
                              }`}
                            >
                              {organization.status ===
                              'active'
                                ? 'Suspend'
                                : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <Overlay
          title="Create Client"
          onClose={() =>
            !saving &&
            setShowCreate(
              false
            )
          }
        >
          <form
            onSubmit={createClient}
            className="space-y-4"
          >
            <Field
              label="Company Name"
              value={
                form.companyName
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  companyName:
                    value,
                })
              }
            />

            <Field
              label="Client Admin Name"
              value={
                form.adminName
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  adminName:
                    value,
                })
              }
            />

            <Field
              label="Client Admin Email"
              type="email"
              value={
                form.adminEmail
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  adminEmail:
                    value,
                })
              }
            />

            <Field
              label="Client Admin Password"
              type="password"
              value={
                form.password
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  password:
                    value,
                })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  setShowCreate(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Creating...'
                  : 'Create Client'}
              </Button>
            </div>
          </form>
        </Overlay>
      )}

      {resetTarget && (
        <Overlay
          title={`Reset Admin Password — ${resetTarget.name}`}
          onClose={() => {
            if (saving) return;
            setResetTarget(null);
            setNewPassword('');
          }}
        >
          <div className="space-y-4">
            <Field
              label="New Password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>

              <Button
                disabled={saving}
                onClick={() =>
                  void resetPassword()
                }
              >
                {saving
                  ? 'Saving...'
                  : 'Reset Password'}
              </Button>
            </div>
          </div>
        </Overlay>
      )}

      {credentials && (
        <Overlay
          title="Client Admin Credentials"
          onClose={() =>
            setCredentials(null)
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              Client Admin access created successfully.
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Login URL
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {window.location.origin}/
              </p>

              <p className="mt-4 text-xs text-slate-500">
                Email
              </p>

              <p className="mt-1 select-all text-sm font-medium text-white">
                {credentials.email}
              </p>

              <p className="mt-4 text-xs text-slate-500">
                Password
              </p>

              <p className="mt-1 select-all break-all text-sm font-medium text-white">
                {credentials.password}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  setCredentials(
                    null
                  )
                }
              >
                Done
              </Button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: 'text' | 'email' | 'password';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

function Overlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="font-semibold text-white">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
