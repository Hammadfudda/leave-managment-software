import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { getApiErrorMessage } from '../services/api';

import type { Grade } from '../types';

const EMPTY_FORM = {
  name: '',
  description: '',
};

export default function Grades() {
  const {
    grades,
    addGrade,
    updateGrade,
  } = useAppData();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (grade: Grade) => {
    setEditing(grade);
    setForm({
      name: grade.name,
      description: grade.description || '',
    });
    setMessage(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name) {
      setMessage({
        type: 'error',
        text: 'Grade name is required.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload: Grade = {
        id: editing?.id || '',
        name,
        description: form.description.trim(),
      };

      if (editing) {
        await updateGrade(payload);
        setMessage({
          type: 'success',
          text: 'Grade updated successfully.',
        });
      } else {
        await addGrade(payload);
        setMessage({
          type: 'success',
          text: 'Grade created successfully.',
        });
      }

      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(
          error,
          editing
            ? 'Unable to update grade.'
            : 'Unable to create grade.'
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Grades
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Grades define employee level only. Leave quotas and carry-forward rules are configured in Leave Policies.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Grade
        </Button>
      </div>

      {message && !showForm && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((grade) => (
          <div
            key={grade.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {grade.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {grade.description || 'No description'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openEdit(grade)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={`Edit ${grade.name}`}
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}

        {grades.length === 0 && (
          <div className="col-span-full rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
            No grades have been created yet.
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit Grade' : 'Add Grade'}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Create Grade'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {message?.type === 'error' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {message.text}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Grade name
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="e.g. Grade A"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              className={`${inputClass} min-h-24 resize-y`}
              placeholder="Optional"
            />
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
            Annual, Sick, Casual and other yearly leave quotas are configured grade-wise inside Leave Policies.
          </div>
        </div>
      </Modal>
    </div>
  );
}
