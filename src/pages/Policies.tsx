import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';

import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

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
  | 'manager_approval'
  | 'manual_chain';

export default function Policies() {
  const { user } = useAuth();

  const {
    grades,
    departments,
    designations,
    users,
  } = useAppData();

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [error, setError] = useState('');

  const [leaveType, setLeaveType] = useState('');
  const [role, setRole] = useState('All Employees');
  const [department, setDepartment] = useState('All Departments');
  const [designation, setDesignation] = useState('All Designations');
  const [isPaid, setIsPaid] = useState(true);
  const [documentRequirement, setDocumentRequirement] =
    useState<'optional' | 'required' | 'not_required'>('optional');
  const [approvalMode, setApprovalMode] =
    useState<ApprovalMode>('assigned_manager_final');
  const [approverIds, setApproverIds] = useState<string[]>([]);

  const [gradeRows, setGradeRows] = useState<
    Array<{
      gradeId: string;
      selected: boolean;
      yearlyQuota: string;
    }>
  >([]);

  const managers = useMemo(
    () =>
      users.filter(
        (item) =>
          item.role === 'manager' &&
          item.status === 'active'
      ),
    [users]
  );

  const load = async () => {
    try {
      setPolicies(await getLeavePolicies());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load leave policies.'
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reset = () => {
    setEditing(null);
    setLeaveType('');
    setRole('All Employees');
    setDepartment('All Departments');
    setDesignation('All Designations');
    setIsPaid(true);
    setDocumentRequirement('optional');
    setApprovalMode('assigned_manager_final');
    setApproverIds([]);
    setGradeRows(
      grades.map((grade) => ({
        gradeId: grade.id,
        selected: false,
        yearlyQuota: '',
      }))
    );
    setError('');
  };

  const openCreate = () => {
    reset();
    setShowForm(true);
  };

  const openEdit = (policy: LeavePolicy) => {
    setEditing(policy);
    setLeaveType(policy.leaveType.replace(/_/g, ' '));
    setRole(policy.role || 'All Employees');
    setDepartment(
      policy.approvalRouting?.department ||
        'All Departments'
    );
    setDesignation(
      policy.approvalRouting?.designation ||
        'All Designations'
    );
    setIsPaid(policy.isPaid);
    setDocumentRequirement(
      policy.documentRequirement || 'optional'
    );

    const ids =
      policy.approvalRouting?.approverIds || [];

    setApprovalMode(
      policy.finalApprovalMode
        ? 'assigned_manager_final'
        : ids.length === 1
          ? 'manager_approval'
          : 'manual_chain'
    );

    setApproverIds(ids);

    setGradeRows(
      grades.map((grade) => {
        const current =
          policy.gradeQuotas.find(
            (item) => item.gradeId === grade.id
          );

        return {
          gradeId: grade.id,
          selected: Boolean(current),
          yearlyQuota: current
            ? String(current.yearlyQuota)
            : '',
        };
      })
    );

    setError('');
    setShowForm(true);
  };

  const save = async () => {
    const selected =
      gradeRows.filter((row) => row.selected);

    if (!leaveType.trim()) {
      setError('Leave type is required.');
      return;
    }

    if (selected.length === 0) {
      setError('Select at least one grade.');
      return;
    }

    if (
      selected.some(
        (row) =>
          Number(row.yearlyQuota) <= 0
      )
    ) {
      setError('Every selected grade needs a yearly quota greater than 0.');
      return;
    }

    if (
      approvalMode === 'manager_approval' &&
      approverIds.length !== 1
    ) {
      setError('Manager Approval requires exactly one manager.');
      return;
    }

    if (
      approvalMode === 'manual_chain' &&
      approverIds.length === 0
    ) {
      setError('Manual Approval Chain requires at least one manager.');
      return;
    }

    const finalApprovalMode =
      approvalMode === 'assigned_manager_final';

    const payload: LeavePolicy = {
      id: editing?.id || '',
      leaveType: leaveType
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_'),
      role,
      gradeQuotas: selected.map((row) => ({
        gradeId: row.gradeId,
        yearlyQuota: Number(row.yearlyQuota),
      })),
      requiresApprovalFrom: 'manager',
      approvalRouting: {
        department:
          department === 'All Departments'
            ? undefined
            : department,
        designation:
          designation === 'All Designations'
            ? undefined
            : designation,
        approverIds:
          finalApprovalMode
            ? []
            : approverIds,
      },
      requiresDocumentUpload:
        documentRequirement === 'required',
      documentRequirement,
      finalApprovalMode,
      minDaysNoticeRequired: 0,
      isPaid,
    };

    try {
      if (editing) {
        await updateLeavePolicy(payload);
      } else {
        await createLeavePolicy(payload);
      }

      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save leave policy.'
      );
    }
  };

  const removePolicy = async (
    policy: LeavePolicy
  ) => {
    try {
      await deleteLeavePolicy(policy.id);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete leave policy.'
      );
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Policies
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Multiple grades and yearly quotas can be configured inside one leave policy.
          </p>
        </div>

        {user?.role === 'admin' && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add Leave Policy
          </Button>
        )}
      </div>

      {error && !showForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold capitalize text-gray-900">
                  {policy.leaveType.replace(/_/g, ' ')}
                </h3>

                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {policy.gradeQuotas.map((row) => (
                    <div key={row.gradeId}>
                      {row.gradeName ||
                        grades.find(
                          (grade) =>
                            grade.id === row.gradeId
                        )?.name ||
                        'Grade'}
                      {' — '}
                      {row.yearlyQuota} days/year
                    </div>
                  ))}
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(policy)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void removePolicy(policy)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Leave Policy' : 'Create Leave Policy'}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>

            <Button onClick={() => void save()}>
              {editing ? 'Save Changes' : 'Create Policy'}
            </Button>
          </>
        }
      >
        <div className="max-h-[70vh] space-y-5 overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Leave Type
            </label>

            <input
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className={inputClass}
              placeholder="e.g. Annual"
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
                                  yearlyQuota: item.selected
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
                      onChange={(e) =>
                        setGradeRows((previous) =>
                          previous.map((item) =>
                            item.gradeId === row.gradeId
                              ? {
                                  ...item,
                                  yearlyQuota: e.target.value,
                                }
                              : item
                          )
                        )
                      }
                      placeholder="Days/year"
                      className={inputClass}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
            >
              <option value="All Employees">All Employees</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={isPaid ? 'paid' : 'unpaid'}
              onChange={(e) =>
                setIsPaid(e.target.value === 'paid')
              }
              className={inputClass}
            >
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputClass}
            >
              <option value="All Departments">
                All Departments
              </option>

              {departments.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className={inputClass}
            >
              <option value="All Designations">
                All Designations
              </option>

              {designations.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={documentRequirement}
              onChange={(e) =>
                setDocumentRequirement(
                  e.target.value as
                    | 'optional'
                    | 'required'
                    | 'not_required'
                )
              }
              className={inputClass}
            >
              <option value="optional">Document Optional</option>
              <option value="required">Document Required</option>
              <option value="not_required">Document Not Required</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              Approval Routing
            </p>

            <div className="space-y-2">
              {(
                [
                  ['assigned_manager_final', 'Assigned Manager Final'],
                  ['manager_approval', 'Manager Approval'],
                  ['manual_chain', 'Manual Approval Chain'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    checked={approvalMode === value}
                    onChange={() => {
                      setApprovalMode(value);

                      if (value === 'assigned_manager_final') {
                        setApproverIds([]);
                      } else if (
                        value === 'manager_approval' &&
                        approverIds.length > 1
                      ) {
                        setApproverIds(approverIds.slice(0, 1));
                      }
                    }}
                  />

                  {label}
                </label>
              ))}
            </div>
          </div>

          {approvalMode !== 'assigned_manager_final' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Select Manager
              </label>

              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;

                  if (!id) {
                    return;
                  }

                  if (approvalMode === 'manager_approval') {
                    setApproverIds([id]);
                  } else if (!approverIds.includes(id)) {
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
                      !approverIds.includes(manager.id)
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
                      {approvalMode === 'manual_chain'
                        ? `${index + 1}. `
                        : ''}
                      {manager?.fullName || 'Manager'} ×
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
