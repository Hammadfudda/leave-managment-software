import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';

import Button from '../components/ui/Button';
import superAdminApi, { getSuperAdminError } from './superAdminApi';

interface Organization {
  id: string;
  name: string;
  admin: {
    id: string;
    fullName: string;
    email: string;
    status: string;
  } | null;
}

export default function SuperAdminEditCompanyButton({
  organization,
  onUpdated,
}: {
  organization: Organization;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState(organization.name);
  const [adminName, setAdminName] = useState(organization.admin?.fullName || '');
  const [adminEmail, setAdminEmail] = useState(organization.admin?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError('Company name, Client Admin name and email are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await superAdminApi.patch(
        `/super-admin/organizations/${organization.id}`,
        {
          companyName: companyName.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
        }
      );

      setOpen(false);
      await onUpdated();
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
    <>
      <button
        type="button"
        onClick={() => {
          setCompanyName(organization.name);
          setAdminName(organization.admin?.fullName || '');
          setAdminEmail(organization.admin?.email || '');
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-blue-800 bg-blue-950/40 px-2.5 py-1.5 text-xs text-blue-300"
      >
        <Pencil size={14} />
        Edit Company
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={submit}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5"
          >
            <h3 className="font-semibold text-white">
              Edit Company — {organization.name}
            </h3>

            {error && (
              <div className="rounded-lg bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <Field label="Company Name" value={companyName} onChange={setCompanyName} />
            <Field label="Client Admin Name" value={adminName} onChange={setAdminName} />
            <Field label="Client Admin Email" value={adminEmail} onChange={setAdminEmail} type="email" />

            <p className="text-xs text-slate-500">
              Password, organization ID and tenant data are not changed.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
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
  onChange: (value: string) => void;
  type?: 'text' | 'email';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
      />
    </div>
  );
}
