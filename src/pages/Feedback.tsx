import { useEffect, useState, type FormEvent } from 'react';
import { MessageSquareText, Send } from 'lucide-react';

import Button from '../components/ui/Button';
import { getApiErrorMessage } from '../services/api';
import {
  getMyFeedback,
  submitFeedback,
  type FeedbackRequest,
  type FeedbackType,
} from '../services/feedback';

export default function Feedback() {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<FeedbackRequest[]>([]);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      setItems(await getMyFeedback());
    } catch (error) {
      setNotice(getApiErrorMessage(error, 'Unable to load requests.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setNotice('Subject and message are required.');
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      const result = await submitFeedback({
        type,
        subject: subject.trim(),
        message: message.trim(),
      });

      setSubject('');
      setMessage('');
      setNotice(
        result.emailSent
          ? 'Request sent successfully. Nedd Consultant was notified by email.'
          : 'Request saved successfully. Email could not be delivered, but Super Admin can see it.'
      );
      await load();
    } catch (error) {
      setNotice(getApiErrorMessage(error, 'Unable to send request.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Feedback & Support
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Send feedback, request a change, or report an issue to Nedd Consultant.
        </p>
      </div>

      {notice && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {notice}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ['feedback', 'Feedback'],
            ['change_request', 'Change Request'],
            ['issue', 'Issue'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                type === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          placeholder="Subject"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        />

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="Explain the feedback, requested change, or issue."
          className="mt-4 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        />

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            <Send size={16} />
            {saving ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <MessageSquareText size={18} />
          <h2 className="font-semibold text-gray-900">
            Previous Requests
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No requests yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.subject}
                    </p>
                    <p className="mt-1 text-xs capitalize text-gray-500">
                      {item.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-600">
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                  {item.message}
                </p>

                {item.superAdminNote && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    <strong>Nedd Consultant:</strong>{' '}
                    {item.superAdminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
