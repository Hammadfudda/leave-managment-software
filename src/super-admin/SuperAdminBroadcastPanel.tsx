import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

import Button from '../components/ui/Button';
import superAdminApi, { getSuperAdminError } from './superAdminApi';

export default function SuperAdminBroadcastPanel() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setNotice('Subject and message are required.');
      return;
    }

    setSending(true);
    setNotice('');

    try {
      const response = await superAdminApi.post(
        '/super-admin/broadcast',
        {
          subject: subject.trim(),
          message: message.trim(),
        }
      );

      const data = response.data.data;
      setNotice(`Sent ${data.sent}; failed ${data.failed}; total ${data.total}.`);
      setSubject('');
      setMessage('');
    } catch (requestError) {
      setNotice(
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="font-semibold">
        Send Software Update
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Email all active Client Admins about UI changes, fixes or new features.
      </p>

      {notice && (
        <div className="mt-4 rounded-lg bg-slate-950 px-4 py-3 text-sm text-slate-300">
          {notice}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          placeholder="Email subject"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
        />

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="What changed?"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={sending}>
            <Send size={16} />
            {sending
              ? 'Sending...'
              : 'Send to All Client Admins'}
          </Button>
        </div>
      </form>
    </section>
  );
}
