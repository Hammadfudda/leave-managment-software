import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  Bug,
  Lightbulb,
  MessageSquareText,
  Send,
} from 'lucide-react';

import Button from '../components/ui/Button';
import {
  getApiErrorMessage,
} from '../services/api';
import {
  getMyFeedback,
  submitFeedback,
  type FeedbackRequest,
  type FeedbackType,
} from '../services/feedback';

const options: Array<{
  value: FeedbackType;
  label: string;
  description: string;
  icon: typeof Bug;
}> = [
  {
    value: 'feedback',
    label: 'Feedback',
    description: 'Share general feedback or an idea.',
    icon: MessageSquareText,
  },
  {
    value: 'change_request',
    label: 'Change Request',
    description: 'Request a UI, workflow or software change.',
    icon: Lightbulb,
  },
  {
    value: 'issue',
    label: 'Issue',
    description: 'Report something that is not working.',
    icon: Bug,
  },
];

export default function Feedback() {
  const [type, setType] =
    useState<FeedbackType>('feedback');
  const [subject, setSubject] =
    useState('');
  const [message, setMessage] =
    useState('');
  const [saving, setSaving] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [items, setItems] =
    useState<FeedbackRequest[]>([]);
  const [notice, setNotice] =
    useState<{
      kind: 'success' | 'error';
      text: string;
    } | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      setItems(
        await getMyFeedback()
      );
    } catch (error) {
      setNotice({
        kind: 'error',
        text: getApiErrorMessage(
          error,
          'Unable to load support requests.'
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !subject.trim() ||
      !message.trim()
    ) {
      setNotice({
        kind: 'error',
        text: 'Subject and details are required.',
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const result =
        await submitFeedback({
          type,
          subject: subject.trim(),
          message: message.trim(),
        });

      setSubject('');
      setMessage('');

      setNotice({
        kind: 'success',
        text: result.emailSent
          ? 'Request submitted successfully. Nedd Consultant was also notified by email.'
          : 'Request saved successfully. Email delivery failed, but Super Admin can still see it.',
      });

      await load();
    } catch (error) {
      setNotice({
        kind: 'error',
        text: getApiErrorMessage(
          error,
          'Unable to submit this request.'
        ),
      });
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
          Send feedback, request a software change, or report an issue directly to Nedd Consultant.
        </p>
      </div>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {options.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setType(item.value)
                }
                className={`rounded-xl border p-4 text-left transition ${
                  type === item.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon
                  size={18}
                  className={
                    type === item.value
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }
                />

                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {item.label}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value
                )
              }
              maxLength={160}
              placeholder="Short summary"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Details
            </label>
            <textarea
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              maxLength={5000}
              rows={6}
              placeholder="Explain the feedback, requested change, or issue."
              className="w-full resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
            >
              <Send size={16} />
              {saving
                ? 'Sending...'
                : 'Send Request'}
            </Button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Previous Requests
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No feedback or support requests yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.subject}
                    </p>
                    <p className="mt-1 text-xs capitalize text-gray-500">
                      {item.type.replace(
                        /_/g,
                        ' '
                      )}{' '}
                      ·{' '}
                      {new Date(
                        item.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-600">
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {item.message}
                </p>

                {item.superAdminNote && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    <strong>
                      Nedd Consultant:
                    </strong>{' '}
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
