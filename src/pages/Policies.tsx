import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';

import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import {
  getApiErrorMessage,
} from '../services/api';

import {
  createLeavePolicy,
  deleteLeavePolicy,
  getLeavePolicies,
  updateLeavePolicy,
} from '../services/leavePolicies';

import type {
  LeavePolicy,
} from '../types';

type ApprovalMode =
  | 'assigned_manager_final'
  | 'manual_chain';

type DocumentRequirement =
  | 'optional'
  | 'required'
  | 'not_required';

interface GradeRow {
  gradeId: string;
  selected: boolean;
  yearlyQuota: string;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Policies() {
  const { user } = useAuth();

  const {
    grades,
    users,
    refreshLookups,
    refreshEmployees,
  } = useAppData();

  const isAdmin = user?.role === 'admin';

  const [policies, setPolicies] =
    useState<LeavePolicy[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] =
    useState<LeavePolicy | null>(null);

  const [leaveType, setLeaveType] = useState('');
  const [gradeRows, setGradeRows] =
    useState<GradeRow[]>([]);

  const [isPaid, setIsPaid] = useState(true);

  const [
    documentRequirement,
    setDocumentRequirement,
  ] =
    useState<DocumentRequirement>('optional');

  const [
    carryForwardAllowed,
    setCarryForwardAllowed,
  ] = useState(false);

  const [
    maxCarryForwardDays,
    setMaxCarryForwardDays,
  ] = useState('');

  const [
    approvalMode,
    setApprovalMode,
  ] =
    useState<ApprovalMode>(
      'assigned_manager_final'
    );

  const [approverIds, setApproverIds] =
    useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] =
    useState<LeavePolicy | null>(null);

  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] =
    useState('');

  const managers = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.role === 'manager' &&
          candidate.status === 'active'
      ),
    [users]
  );

  const buildEmptyGradeRows = () =>
    grades.map((grade) => ({
      gradeId: grade.id,
      selected: false,
      yearlyQuota: '',
    }));

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setApiError('');
      setPolicies(await getLeavePolicies());
    } catch (error) {
      setApiError(
        getApiErrorMessage(
          error,
          'Unable to load leave policies.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      refreshLookups(),
      refreshEmployees(),
      loadPolicies(),
    ]);
  }, []);

  useEffect(() => {
    if (!showForm || editing) return;

    setGradeRows((previous) => {
      if (
        previous.length === grades.length &&
        previous.every((row) =>
          grades.some(
            (grade) => grade.id === row.gradeId
          )
        )
      ) {
        return previous;
      }

      return buildEmptyGradeRows();
    });
  }, [grades, showForm, editing]);

  const resetForm = () => {
    setEditing(null);
    setLeaveType('');
    setGradeRows(buildEmptyGradeRows());
    setIsPaid(true);
    setDocumentRequirement('optional');
    setCarryForwardAllowed(false);
    setMaxCarryForwardDays('');
    setApprovalMode('assigned_manager_final');
    setApproverIds([]);
    setApiError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (policy: LeavePolicy) => {
    setEditing(policy);
    setLeaveType(
      policy.leaveType.replace(/_/g, ' ')
    );

    setGradeRows(
      grades.map((grade) => {
        const current =
          policy.gradeQuotas.find(
            (item) =>
              item.gradeId === grade.id
          );

        return {
          gradeId: grade.id,
          selected: Boolean(current),
          yearlyQuota:
            current
              ? String(current.yearlyQuota)
              : '',
        };
      })
    );

    setIsPaid(policy.isPaid);
    setDocumentRequirement(
      policy.documentRequirement || 'optional'
    );
    setCarryForwardAllowed(
      Boolean(policy.carryForwardAllowed)
    );
    setMaxCarryForwardDays(
      policy.carryForwardAllowed
        ? String(policy.maxCarryForwardDays || 0)
        : ''
    );

    const ids =
      policy.approvalRouting?.approverIds || [];

    setApprovalMode(
      policy.finalApprovalMode !== false
        ? 'assigned_manager_final'
        : 'manual_chain'
    );

    setApproverIds(ids);
    setApiError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    resetForm();
  };

  const save = async () => {
    const normalizedLeaveType =
      leaveType
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

    const selected =
      gradeRows.filter((row) => row.selected);

    if (!normalizedLeaveType) {
      setApiError('Leave type is required.');
      return;
    }

    if (selected.length === 0) {
      setApiError('Select at least one grade.');
      return;
    }

    if (
      selected.some(
        (row) =>
          !Number.isFinite(Number(row.yearlyQuota)) ||
          Number(row.yearlyQuota) <= 0
      )
    ) {
      setApiError(
        'Every selected grade needs a Days/year value greater than 0.'
      );
      return;
    }

    if (
      approvalMode === 'manual_chain' &&
      approverIds.length === 0
    ) {
      setApiError(
        'Select at least one manager for the manual approval chain.'
      );
      return;
    }

    if (
      carryForwardAllowed &&
      (
        !Number.isFinite(Number(maxCarryForwardDays)) ||
        Number(maxCarryForwardDays) < 0
      )
    ) {
      setApiError(
        'Max carry forward days must be 0 or greater.'
      );
      return;
    }

    const finalApprovalMode =
      approvalMode === 'assigned_manager_final';

    const payload: LeavePolicy = {
      id: editing?.id || '',
      leaveType: normalizedLeaveType,
      gradeQuotas: selected.map((row) => ({
        gradeId: row.gradeId,
        yearlyQuota: Number(row.yearlyQuota),
      })),
      requiresApprovalFrom: 'manager',
      approvalRouting: {
        approverIds:
          finalApprovalMode
            ? []
            : approverIds,
      },
      requiresDocumentUpload:
        documentRequirement === 'required',
      documentRequirement,
      finalApprovalMode,
      carryForwardAllowed,
      maxCarryForwardDays:
        carryForwardAllowed
          ? Number(maxCarryForwardDays || 0)
          : 0,
      minDaysNoticeRequired: 0,
      isPaid,
    };

    setSaving(true);
    setApiError('');

    try {
      if (editing) {
        await updateLeavePolicy(payload);
        setSuccessMessage(
          'Leave policy updated and employee balances synchronized.'
        );
      } else {
        await createLeavePolicy(payload);
        setSuccessMessage(
          'Leave policy created and matching grade balances synchronized.'
        );
      }

      setShowForm(false);
      resetForm();
      await loadPolicies();
    } catch (error) {
      setApiError(
        getApiErrorMessage(
          error,
          editing
            ? 'Unable to update leave policy.'
            : 'Unable to create leave policy.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const removePolicy = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setApiError('');

    try {
      await deleteLeavePolicy(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage(
        'Leave policy deleted and balances synchronized.'
      );
      await loadPolicies();
    } catch (error) {
      setApiError(
        getApiErrorMessage(
          error,
          'Unable to delete leave policy.'
        )
      );
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Policies
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Leave entitlement is grade-based. Department, designation and role do not control leave quota.
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Create Leave Policy
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Days/year means how many days of this leave type the selected grade receives in one calendar year.
      </div>

      {apiError && !showForm && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiError}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          Loading policies...
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
          No leave policies found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {titleCase(policy.leaveType)}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Grade-based Leave Policy
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(policy)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget(policy)
                      }
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {policy.gradeQuotas.map((row) => (
                  <div
                    key={row.gradeId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <span className="text-gray-600">
                      {row.gradeName ||
                        grades.find(
                          (grade) =>
                            grade.id === row.gradeId
                        )?.name ||
                        'Grade'}
                    </span>

                    <Badge variant="blue">
                      {row.yearlyQuota} days/year
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">
                    Pay
                  </span>
                  <span className="font-medium text-gray-900">
                    {policy.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">
                    Document
                  </span>
                  <span className="font-medium text-gray-900">
                    {policy.documentRequirement === 'required'
                      ? 'Required'
                      : policy.documentRequirement === 'not_required'
                        ? 'Not Required'
                        : 'Optional'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">
                    Carry Forward
                  </span>
                  <span className="font-medium text-gray-900">
                    {policy.carryForwardAllowed
                      ? `Yes (max ${policy.maxCarryForwardDays || 0})`
                      : 'No'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">
                    Approval
                  </span>
                  <span className="font-medium text-gray-900">
                    {policy.finalApprovalMode !== false
                      ? 'Assigned Manager Final'
                      : 'Manual Manager Chain'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editing
              ? 'Edit Leave Policy'
              : 'Create Leave Policy'
          }
          size="lg"
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
                onClick={() => void save()}
              >
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : 'Create Policy'}
              </Button>
            </>
          }
        >
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            {apiError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Leave Type
              </label>

              <input
                value={leaveType}
                onChange={(event) =>
                  setLeaveType(event.target.value)
                }
                placeholder="e.g. Annual"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Grades & Yearly Quota
              </label>

              <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                {gradeRows.map((row) => {
                  const grade =
                    grades.find(
                      (item) =>
                        item.id === row.gradeId
                    );

                  return (
                    <div
                      key={row.gradeId}
                      className="grid grid-cols-[auto_1fr_140px] items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() =>
                          setGradeRows((previous) =>
                            previous.map((item) =>
                              item.gradeId === row.gradeId
                                ? {
                                    ...item,
                                    selected: !item.selected,
                                    yearlyQuota:
                                      item.selected
                                        ? ''
                                        : item.yearlyQuota,
                                  }
                                : item
                            )
                          )
                        }
                      />

                      <span className="text-sm text-gray-700">
                        {grade?.name || 'Grade'}
                      </span>

                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        disabled={!row.selected}
                        value={row.yearlyQuota}
                        onChange={(event) =>
                          setGradeRows((previous) =>
                            previous.map((item) =>
                              item.gradeId === row.gradeId
                                ? {
                                    ...item,
                                    yearlyQuota:
                                      event.target.value,
                                  }
                                : item
                            )
                          )
                        }
                        placeholder="Days/year"
                        className={`${inputClass} disabled:bg-gray-100`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Pay
                </label>

                <select
                  value={isPaid ? 'paid' : 'unpaid'}
                  onChange={(event) =>
                    setIsPaid(
                      event.target.value === 'paid'
                    )
                  }
                  className={inputClass}
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Document
                </label>

                <select
                  value={documentRequirement}
                  onChange={(event) =>
                    setDocumentRequirement(
                      event.target.value as
                        DocumentRequirement
                    )
                  }
                  className={inputClass}
                >
                  <option value="optional">
                    Document Optional
                  </option>
                  <option value="required">
                    Document Required
                  </option>
                  <option value="not_required">
                    Document Not Required
                  </option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={carryForwardAllowed}
                  onChange={(event) => {
                    setCarryForwardAllowed(
                      event.target.checked
                    );

                    if (!event.target.checked) {
                      setMaxCarryForwardDays('');
                    }
                  }}
                />
                Carry forward allowed
              </label>

              {carryForwardAllowed && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Max carry forward days
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={maxCarryForwardDays}
                    onChange={(event) =>
                      setMaxCarryForwardDays(
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">
                Approval Routing
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={
                      approvalMode ===
                      'assigned_manager_final'
                    }
                    onChange={() => {
                      setApprovalMode(
                        'assigned_manager_final'
                      );
                      setApproverIds([]);
                    }}
                  />
                  Assigned employee's Manager makes the final decision
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={
                      approvalMode ===
                      'manual_chain'
                    }
                    onChange={() =>
                      setApprovalMode(
                        'manual_chain'
                      )
                    }
                  />
                  Manual Manager Approval Chain
                </label>
              </div>
            </div>

            {approvalMode === 'manual_chain' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Select Managers
                </label>

                <select
                  value=""
                  onChange={(event) => {
                    const id = event.target.value;

                    if (
                      id &&
                      !approverIds.includes(id)
                    ) {
                      setApproverIds([
                        ...approverIds,
                        id,
                      ]);
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">
                    Select active manager
                  </option>

                  {managers
                    .filter(
                      (manager) =>
                        !approverIds.includes(
                          manager.id
                        )
                    )
                    .map((manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.fullName} — {manager.department}
                      </option>
                    ))}
                </select>

                <div className="mt-2 flex flex-wrap gap-2">
                  {approverIds.map((id, index) => {
                    const manager =
                      managers.find(
                        (item) =>
                          item.id === id
                      );

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setApproverIds(
                            approverIds.filter(
                              (item) =>
                                item !== id
                            )
                          )
                        }
                        className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700"
                      >
                        {index + 1}. {manager?.fullName || 'Manager'} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) setDeleteTarget(null);
        }}
        title="Delete Leave Policy"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void removePolicy()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {saving ? 'Deleting...' : 'Delete Policy'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this policy?
        </p>
      </Modal>

      <Modal
        open={Boolean(successMessage)}
        onClose={() => setSuccessMessage('')}
        title="Success"
        size="sm"
        footer={
          <Button
            onClick={() => setSuccessMessage('')}
          >
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
