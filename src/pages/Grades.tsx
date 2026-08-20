import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

import type { Grade } from '../types';

const EMPTY_FORM = {
  name: '',
  carryForwardAllowed: false,
  maxCarryForwardDays: 0,
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
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const openCreate = () => {
    setEditing(null);
    setError('');
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (grade: Grade) => {
    setEditing(grade);
    setError('');

    setForm({
      name: grade.name,
      carryForwardAllowed: Boolean(grade.carryForwardAllowed),
      maxCarryForwardDays: Number(grade.maxCarryForwardDays || 0),
      description: grade.description || '',
    });

    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Grade name is required.');
      return;
    }

    const payload: Grade = {
      id: editing?.id || '',
      name: form.name.trim(),
      carryForwardAllowed: form.carryForwardAllowed,
      maxCarryForwardDays: form.carryForwardAllowed
        ? Math.max(0, Number(form.maxCarryForwardDays || 0))
        : 0,
      description: form.description.trim(),
    };

    try {
      setError('');

      if (editing) {
        await updateGrade(payload);
      } else {
        await addGrade(payload);
      }

      setShowForm(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save grade.'
      );
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Grades
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Maintain employee grades. Leave quotas are configured in Leave Policies.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Grade
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((grade) => (
          <div
            key={grade.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {grade.name}
              </h3>

              <button
                type="button"
                onClick={() => openEdit(grade)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil size={14} />
              </button>
            </div>

            {grade.description && (
              <p className="mt-1 text-xs text-gray-500">
                {grade.description}
              </p>
            )}

            <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">
                  Carry forward
                </span>

                <span className="text-right font-medium text-gray-900">
                  {grade.carryForwardAllowed
                    ? `Yes (max ${grade.maxCarryForwardDays})`
                    : 'No'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Grade' : 'Add Grade'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>

            <Button onClick={() => void save()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Grade name
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="carryForwardAllowed"
              type="checkbox"
              checked={form.carryForwardAllowed}
              onChange={(e) =>
                setForm({
                  ...form,
                  carryForwardAllowed: e.target.checked,
                })
              }
            />

            <label
              htmlFor="carryForwardAllowed"
              className="text-sm text-gray-700"
            >
              Carry forward allowed
            </label>
          </div>

          {form.carryForwardAllowed && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Max carry forward days
              </label>

              <input
                type="number"
                min="0"
                value={form.maxCarryForwardDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxCarryForwardDays: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>

            <input
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className={inputClass}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
