import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  Building2,
  Mail,
  MessageSquareText,
  Pencil,
  Send,
  Settings2,
  X,
} from 'lucide-react';

import Button from '../components/ui/Button';
import SuperAdminApp from './SuperAdminApp';
import superAdminApi, {
  getSuperAdminError,
  getSuperAdminToken,
} from './superAdminApi';

type ToolTab =
  | 'companies'
  | 'feedback'
  | 'broadcast';

type FeedbackStatus =
  | 'new'
  | 'reviewing'
  | 'resolved';

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

interface FeedbackItem {
  id: string;
  organizationName: string;
  submittedByName: string;
  submittedByEmail: string;
  type:
    | 'feedback'
    | 'change_request'
    | 'issue';
  subject: string;
  message: string;
  status: FeedbackStatus;
  superAdminNote: string;
  createdAt: string;
}

export default function SuperAdminPortal() {
  const [authorized, setAuthorized] =
    useState(false);
  const [open, setOpen] =
    useState(false);
  const [tab, setTab] =
    useState<ToolTab>('companies');

  useEffect(() => {
    let cancelled = false;
    let lastToken = '';

    const check = async () => {
      const token =
        getSuperAdminToken() || '';

      if (!token) {
        lastToken = '';
        if (!cancelled) {
          setAuthorized(false);
          setOpen(false);
        }
        return;
      }

      if (
        token === lastToken &&
        authorized
      ) {
        return;
      }

      lastToken = token;

      try {
        await superAdminApi.get(
          '/super-admin/me'
        );

        if (!cancelled) {
          setAuthorized(true);
        }
      } catch {
        if (!cancelled) {
          setAuthorized(false);
          setOpen(false);
        }
      }
    };

    void check();

    const interval =
      window.setInterval(
        () => void check(),
        1200
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, [authorized]);

  return (
    <>
      <SuperAdminApp />

      {authorized && (
        <>
          {/*
           * Keep the new SaaS controls visible on the Super Admin screen.
           * Previously they were hidden behind one small floating button,
           * which made Edit Company / Feedback / Broadcast look missing.
           */}
          <div className="fixed bottom-5 right-5 z-[70] w-[min(92vw,430px)] rounded-2xl border border-slate-700 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Settings2
                size={17}
                className="text-blue-400"
              />

              <div>
                <p className="text-sm font-semibold">
                  Super Admin Management
                </p>

                <p className="text-[11px] text-slate-400">
                  Edit clients, review feedback and send software updates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab('companies');
                  setOpen(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Building2 size={15} />
                Edit Companies
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('feedback');
                  setOpen(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <MessageSquareText size={15} />
                Client Feedback
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('broadcast');
                  setOpen(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Mail size={15} />
                Software Update
              </button>
            </div>
          </div>

          {open && (
            <ToolsDrawer
              tab={tab}
              setTab={setTab}
              onClose={() =>
                setOpen(false)
              }
            />
          )}
        </>
      )}
    </>
  );
}

function ToolsDrawer({
  tab,
  setTab,
  onClose,
}: {
  tab: ToolTab;
  setTab: (tab: ToolTab) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold">
              Super Admin Tools
            </h2>
            <p className="text-xs text-slate-400">
              Edit companies, review client feedback and send software updates.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-800 px-5 py-3">
          <ToolTabButton
            active={
              tab === 'companies'
            }
            onClick={() =>
              setTab('companies')
            }
            icon={<Building2 size={15} />}
          >
            Edit Companies
          </ToolTabButton>

          <ToolTabButton
            active={
              tab === 'feedback'
            }
            onClick={() =>
              setTab('feedback')
            }
            icon={
              <MessageSquareText
                size={15}
              />
            }
          >
            Client Feedback
          </ToolTabButton>

          <ToolTabButton
            active={
              tab === 'broadcast'
            }
            onClick={() =>
              setTab('broadcast')
            }
            icon={<Mail size={15} />}
          >
            Software Update
          </ToolTabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'companies' && (
            <CompaniesPanel />
          )}

          {tab === 'feedback' && (
            <FeedbackPanel />
          )}

          {tab === 'broadcast' && (
            <BroadcastPanel />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function CompaniesPanel() {
  const [organizations, setOrganizations] =
    useState<Organization[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [editing, setEditing] =
    useState<Organization | null>(null);
  const [companyName, setCompanyName] =
    useState('');
  const [adminName, setAdminName] =
    useState('');
  const [adminEmail, setAdminEmail] =
    useState('');
  const [saving, setSaving] =
    useState(false);

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
          'Unable to load companies.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openEdit = (
    organization: Organization
  ) => {
    setEditing(organization);
    setCompanyName(
      organization.name
    );
    setAdminName(
      organization.admin
        ?.fullName || ''
    );
    setAdminEmail(
      organization.admin
        ?.email || ''
    );
    setError('');
  };

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editing) {
      return;
    }

    if (
      !companyName.trim() ||
      !adminName.trim() ||
      !adminEmail.trim()
    ) {
      setError(
        'Company name, Client Admin name and email are required.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await superAdminApi.patch(
        `/super-admin/organizations/${editing.id}`,
        {
          companyName:
            companyName.trim(),
          adminName:
            adminName.trim(),
          adminEmail:
            adminEmail.trim(),
        }
      );

      setEditing(null);
      await load();
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to update company.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          Edit Companies
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Edit only the Company Name, Client Admin Name and Client Admin Email. Reset Password and Suspend/Activate remain in the existing panel.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Loading companies...
        </div>
      ) : (
        <div className="space-y-2">
          {organizations.map(
            (organization) => (
              <div
                key={organization.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div>
                  <p className="font-medium text-white">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {organization.admin
                      ?.fullName ||
                      'No Client Admin'}
                    {' · '}
                    {organization.admin
                      ?.email || '—'}
                    {' · '}
                    {organization.status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openEdit(
                      organization
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-800 bg-blue-950/40 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-900/40"
                >
                  <Pencil size={14} />
                  Edit Company
                </button>
              </div>
            )
          )}
        </div>
      )}

      {editing && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-blue-900 bg-slate-900 p-4"
        >
          <h4 className="font-medium text-white">
            Edit {editing.name}
          </h4>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <DarkField
              label="Company Name"
              value={companyName}
              onChange={setCompanyName}
            />
            <DarkField
              label="Client Admin Name"
              value={adminName}
              onChange={setAdminName}
            />
            <DarkField
              label="Client Admin Email"
              type="email"
              value={adminEmail}
              onChange={setAdminEmail}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                setEditing(null)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FeedbackPanel() {
  const [items, setItems] =
    useState<FeedbackItem[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [selected, setSelected] =
    useState<FeedbackItem | null>(null);
  const [status, setStatus] =
    useState<FeedbackStatus>('new');
  const [note, setNote] =
    useState('');
  const [saving, setSaving] =
    useState(false);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response =
        await superAdminApi.get(
          '/super-admin/feedback'
        );

      setItems(
        response.data.data || []
      );
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to load client feedback.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openItem = (
    item: FeedbackItem
  ) => {
    setSelected(item);
    setStatus(item.status);
    setNote(
      item.superAdminNote || ''
    );
  };

  const save = async () => {
    if (!selected) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await superAdminApi.patch(
        `/super-admin/feedback/${selected.id}`,
        {
          status,
          superAdminNote: note,
        }
      );

      setSelected(null);
      await load();
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to update feedback.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          Client Feedback & Support
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Feedback, requested changes and issues submitted by Client Admins.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Loading requests...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">
          No client feedback yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                openItem(item)
              }
              className="block w-full rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:bg-slate-800/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">
                    {item.subject}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.organizationName ||
                      'Unknown Organization'}
                    {' · '}
                    {item.submittedByName}
                    {' · '}
                    {item.submittedByEmail}
                  </p>
                </div>

                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">
                  {item.type.replace(
                    /_/g,
                    ' '
                  )}{' '}
                  · {item.status}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm text-slate-400">
                {item.message}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-blue-900 bg-slate-900 p-4">
          <h4 className="font-medium text-white">
            {selected.subject}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {selected.organizationName}{' '}
            · {selected.submittedByEmail}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">
            {selected.message}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as FeedbackStatus
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              >
                <option value="new">
                  New
                </option>
                <option value="reviewing">
                  Reviewing
                </option>
                <option value="resolved">
                  Resolved
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Note visible to Client Admin
              </label>
              <textarea
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value
                  )
                }
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                setSelected(null)
              }
            >
              Cancel
            </Button>
            <Button
              loading={saving}
              loadingText="Saving..."
              onClick={() =>
                void save()
              }
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BroadcastPanel() {
  const [subject, setSubject] =
    useState('');
  const [message, setMessage] =
    useState('');
  const [sending, setSending] =
    useState(false);
  const [notice, setNotice] =
    useState('');
  const [error, setError] =
    useState('');

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !subject.trim() ||
      !message.trim()
    ) {
      setError(
        'Subject and message are required.'
      );
      return;
    }

    setSending(true);
    setError('');
    setNotice('');

    try {
      const response =
        await superAdminApi.post(
          '/super-admin/broadcast',
          {
            subject:
              subject.trim(),
            message:
              message.trim(),
          }
        );

      const data =
        response.data.data;

      setNotice(
        `Sent: ${data.sent} · Failed: ${data.failed} · Total active Client Admins: ${data.total}`
      );

      setSubject('');
      setMessage('');
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to send software update.'
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          Send Software Update
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Sends only to active Client Admins in active organizations. Managers and Employees are excluded.
        </p>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <DarkField
          label="Email Subject"
          value={subject}
          onChange={setSubject}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Message
          </label>
          <textarea
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            rows={7}
            maxLength={5000}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
            placeholder="What changed in the software?"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={sending}
            loadingText="Sending..."
          >
            <Send size={16} />
            Send to Active Client Admins
          </Button>
        </div>
      </form>
    </div>
  );
}

function DarkField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">
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
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
      />
    </div>
  );
}
