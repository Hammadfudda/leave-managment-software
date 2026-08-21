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

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMessage('');
    setShowAdd(true);
  };

  const openEdit = (grade: Grade) => {
    setEditing(grade);
    setForm({
      name: grade.name,
      description: grade.description || '',
    });
    setErrorMessage('');
    setShowAdd(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowAdd(false);
    setEditing(null);
    setErrorMessage('');
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name) {
      setErrorMessage('Grade name is required.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const grade: Grade = {
        id: editing?.id || '',
        name,
        description: form.description.trim(),
      };

      if (editing) {
        await updateGrade(grade);
        setSuccessMessage('Grade updated successfully.');
      } else {
        await addGrade(grade);
        setSuccessMessage('Grade created successfully.');
      }

      setShowAdd(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          editing
            ? 'Unable to update grade.'
            : 'Unable to create grade.'
        )
      );
    } finally {
      setSaving(false);
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
            Grades define employee level only. Leave quotas are configured inside Leave Policies.
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
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in"
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

            {grade.description ? (
              <p className="mt-2 text-sm text-gray-500">
                {grade.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No description
              </p>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={showAdd}
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
          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Grade name
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              className={inputClass}
              placeholder="e.g. Grade A"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>

            <input
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(successMessage)}
        onClose={() => setSuccessMessage('')}
        title="Success"
        size="sm"
        footer={
          <Button onClick={() => setSuccessMessage('')}>
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {successMessage}
        </p>
      </Modal>
    </div>
  );
}
