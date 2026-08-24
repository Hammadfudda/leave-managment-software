import { useEffect, useState } from 'react';

import Button from '../components/ui/Button';
import superAdminApi, { getSuperAdminError } from './superAdminApi';

type Status = 'new' | 'reviewing' | 'resolved';

interface Item {
  id: string;
  organizationName: string;
  submittedByName: string;
  submittedByEmail: string;
  type: 'feedback' | 'change_request' | 'issue';
  subject: string;
  message: string;
  status: Status;
  superAdminNote: string;
}

export default function SuperAdminFeedbackPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [status, setStatus] = useState<Status>('new');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await superAdminApi.get('/super-admin/feedback');
      setItems(response.data.data || []);
    } catch (requestError) {
      setError(
        getSuperAdminError(
          requestError,
          'Unable to load feedback.'
        )
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openItem = (item: Item) => {
    setSelected(item);
    setStatus(item.status);
    setNote(item.superAdminNote || '');
  };

  const save = async () => {
    if (!selected) return;

    setSaving(true);

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
    <section className="rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h3 className="font-semibold">
          Client Feedback & Support
        </h3>
      </div>

      {error && (
        <div className="m-4 rounded-lg bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          No requests yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              className="block w-full p-5 text-left hover:bg-slate-800/50"
            >
              <p className="font-medium text-white">
                {item.subject}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.organizationName || 'Unknown Organization'}
                {' · '}
                {item.submittedByName}
                {' · '}
                {item.submittedByEmail}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {item.message}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="font-semibold text-white">
              {selected.subject}
            </h3>

            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {selected.message}
            </p>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Status)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
            >
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Note visible to Client Admin"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
            />

            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={saving} onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
