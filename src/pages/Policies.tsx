import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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

type DocumentRequirement =
  | 'optional'
  | 'required'
  | 'not_required';

interface PolicyForm {
  leaveTypeName: string;
  yearlyQuota: string;
  role: string;
  isPaid: boolean;
  gradeId: string;
  designation: string;
  department: string;
  approverIds: string[];
  finalApprovalMode: boolean;
  adminOnlyApproval: boolean;
  documentRequirement:
    DocumentRequirement;
}

const EMPTY_FORM: PolicyForm = {
  leaveTypeName: '',
  yearlyQuota: '',
  role: 'All Employees',
  isPaid: true,
  gradeId: '',
  designation:
    'All Designations',
  department:
    'All Departments',
  approverIds: [],
  finalApprovalMode: true,
  adminOnlyApproval: false,
  documentRequirement:
    'optional',
};

function titleCase(
  value: string
) {
  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

export default function Policies() {
  const { user } =
    useAuth();

  const {
    grades,
    designations,
    departments,
    users,
    refreshLookups,
    refreshEmployees,
  } = useAppData();

  const isAdmin =
    user?.role ===
    'admin';

  const [
    policies,
    setPolicies,
  ] = useState<
    LeavePolicy[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<LeavePolicy | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<PolicyForm>(
      EMPTY_FORM
    );

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<LeavePolicy | null>(
      null
    );

  const [
    apiError,
    setApiError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const activeApprovers =
    useMemo(
      () =>
        users.filter(
          (candidate) =>
            candidate.status ===
              'active' &&
            (
              candidate.role ===
                'manager' ||
              candidate.role ===
                'admin'
            )
        ),
      [users]
    );

  const loadPolicies =
    async () => {
      try {
        setLoading(true);
        setApiError('');

        const rows =
          await getLeavePolicies();

        setPolicies(
          rows
        );
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

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
    });

    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setApiError('');
    setShowForm(true);
  };

  const openEdit = (
    policy: LeavePolicy
  ) => {
    setEditing(policy);

    setForm({
      leaveTypeName:
        policy.leaveType,

      yearlyQuota:
        String(
          policy.yearlyQuota ??
            ''
        ),

      role:
        policy.role ||
        'All Employees',

      isPaid:
        policy.isPaid,

      gradeId:
        policy
          .approvalRouting
          ?.grade ||
        '',

      designation:
        policy
          .approvalRouting
          ?.designation ||
        'All Designations',

      department:
        policy
          .approvalRouting
          ?.department ||
        'All Departments',

      approverIds:
        policy
          .approvalRouting
          ?.approverIds ||
        [],

      finalApprovalMode:
        Boolean(
          policy
            .finalApprovalMode
        ),

      adminOnlyApproval:
        Boolean(
          policy
            .adminOnlyApproval
        ),

      documentRequirement:
        policy
          .documentRequirement ||
        'optional',
    });

    setApiError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  const handleSave =
    async () => {
      const leaveType =
        form.leaveTypeName
          .trim()
          .toLowerCase();

      const yearlyQuota =
        Number(
          form.yearlyQuota
        );

      if (!leaveType) {
        setApiError(
          'Leave type is required.'
        );
        return;
      }

      if (
        !Number.isFinite(
          yearlyQuota
        ) ||
        yearlyQuota <= 0
      ) {
        setApiError(
          'Yearly quota must be greater than 0.'
        );
        return;
      }

      if (
        form.adminOnlyApproval &&
        form.finalApprovalMode
      ) {
        setApiError(
          'Admin Only and Assigned Manager Final cannot both be enabled.'
        );
        return;
      }

      if (
        !form.adminOnlyApproval &&
        !form.finalApprovalMode &&
        form.approverIds
          .length === 0
      ) {
        setApiError(
          'Select at least one approver or use Assigned Manager Final/Admin Only.'
        );
        return;
      }

      const payload:
        LeavePolicy = {
        id:
          editing?.id ||
          '',

        leaveType,

        yearlyQuota,

        role:
          form.role,

        requiresApprovalFrom:
          form.adminOnlyApproval
            ? 'admin'
            : 'manager',

        approvalRouting: {
          grade:
            form.gradeId ||
            undefined,

          designation:
            form.designation !==
            'All Designations'
              ? form.designation
              : undefined,

          department:
            form.department !==
            'All Departments'
              ? form.department
              : undefined,

          approverIds:
            form.finalApprovalMode ||
            form.adminOnlyApproval
              ? []
              : form
                  .approverIds,
        },

        adminOnlyApproval:
          form
            .adminOnlyApproval,

        finalApprovalMode:
          form
            .finalApprovalMode,

        documentRequirement:
          form
            .documentRequirement,

        requiresDocumentUpload:
          form
            .documentRequirement ===
          'required',

        minDaysNoticeRequired:
          0,

        isPaid:
          form.isPaid,
      };

      try {
        setSaving(true);
        setApiError('');

        if (editing) {
          await updateLeavePolicy(
            payload
          );

          setSuccessMessage(
            'Leave policy updated. Current-year employee balances were synchronized.'
          );
        } else {
          await createLeavePolicy(
            payload
          );

          setSuccessMessage(
            'Leave policy created. Matching employees received the yearly quota.'
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

  const handleDelete =
    async () => {
      if (!deleteTarget) {
        return;
      }

      try {
        setSaving(true);

        await deleteLeavePolicy(
          deleteTarget.id
        );

        setDeleteTarget(
          null
        );

        setSuccessMessage(
          'Leave policy deleted and current-year balances synchronized.'
        );

        await loadPolicies();
      } catch (error) {
        setDeleteTarget(
          null
        );

        setApiError(
          getApiErrorMessage(
            error,
            'Unable to delete leave policy.'
          )
        );
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
            Each policy defines a yearly quota for the matching grade, department, designation and role.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={
              openCreate
            }
          >
            <Plus size={16} />
            Create Leave Policy
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Leave balances are policy-driven and reset by calendar year. Only approved working days are deducted.
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          Loading policies...
        </div>
      ) : policies.length ===
        0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
          No leave policies found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {policies.map(
            (policy) => {
              const grade =
                grades.find(
                  (candidate) =>
                    candidate.id ===
                    policy
                      .approvalRouting
                      ?.grade
                );

              return (
                <div
                  key={
                    policy.id
                  }
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {titleCase(
                          policy.leaveType
                        )}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Leave Policy
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              policy
                            )
                          }
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Pencil
                            size={
                              16
                            }
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              policy
                            )
                          }
                          className="text-gray-400 hover:text-rose-600"
                        >
                          <Trash2
                            size={
                              16
                            }
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2.5 text-sm">
                    <Row
                      label="Yearly Quota"
                      value={
                        <Badge variant="blue">
                          {policy.yearlyQuota}{' '}
                          days / year
                        </Badge>
                      }
                    />

                    <Row
                      label="Grade"
                      value={
                        grade
                          ? grade.name
                          : 'All Grades'
                      }
                    />

                    <Row
                      label="Role"
                      value={
                        policy.role ||
                        'All Employees'
                      }
                    />

                    <Row
                      label="Department"
                      value={
                        policy
                          .approvalRouting
                          ?.department ||
                        'All Departments'
                      }
                    />

                    <Row
                      label="Designation"
                      value={
                        policy
                          .approvalRouting
                          ?.designation ||
                        'All Designations'
                      }
                    />

                    <Row
                      label="Approval"
                      value={
                        policy
                          .adminOnlyApproval
                          ? (
                            <Badge variant="orange">
                              Admin Only
                            </Badge>
                          )
                          : policy
                              .finalApprovalMode
                            ? (
                              <Badge variant="green">
                                Assigned Manager Final
                              </Badge>
                            )
                            : (
                              <Badge variant="gray">
                                Approval Chain
                              </Badge>
                            )
                      }
                    />

                    <Row
                      label="Document"
                      value={
                        policy.documentRequirement ===
                        'required'
                          ? 'Required'
                          : policy.documentRequirement ===
                              'not_required'
                            ? 'Not Required'
                            : 'Optional'
                      }
                    />

                    <Row
                      label="Pay"
                      value={
                        policy.isPaid
                          ? (
                            <Badge variant="green">
                              Paid
                            </Badge>
                          )
                          : (
                            <Badge variant="gray">
                              Unpaid
                            </Badge>
                          )
                      }
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {isAdmin && (
        <Modal
          open={
            showForm
          }
          onClose={
            closeForm
          }
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
                disabled={
                  saving
                }
                onClick={
                  closeForm
                }
              >
                Cancel
              </Button>

              <Button
                disabled={
                  saving
                }
                onClick={() =>
                  void handleSave()
                }
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Leave Type">
              <input
                value={
                  form.leaveTypeName
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    leaveTypeName:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="e.g. Marriage Leave"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Yearly Quota (Days)">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={
                  form.yearlyQuota
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    yearlyQuota:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="e.g. 15"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Grade">
              <select
                value={
                  form.gradeId
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    gradeId:
                      event
                        .target
                        .value,
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  All Grades
                </option>

                {grades.map(
                  (grade) => (
                    <option
                      key={
                        grade.id
                      }
                      value={
                        grade.id
                      }
                    >
                      {
                        grade.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Role">
              <select
                value={
                  form.role
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    role:
                      event
                        .target
                        .value,
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="All Employees">
                  All Employees
                </option>
                <option value="employee">
                  Employees
                </option>
                <option value="manager">
                  Managers
                </option>
                <option value="admin">
                  Admin
                </option>
              </select>
            </Field>

            <Field label="Department">
              <select
                value={
                  form.department
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    department:
                      event
                        .target
                        .value,
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="All Departments">
                  All Departments
                </option>

                {departments.map(
                  (
                    department
                  ) => (
                    <option
                      key={
                        department
                      }
                      value={
                        department
                      }
                    >
                      {
                        department
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Designation">
              <select
                value={
                  form.designation
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    designation:
                      event
                        .target
                        .value,
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="All Designations">
                  All Designations
                </option>

                {designations.map(
                  (
                    designation
                  ) => (
                    <option
                      key={
                        designation
                      }
                      value={
                        designation
                      }
                    >
                      {
                        designation
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Document">
              <select
                value={
                  form
                    .documentRequirement
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    documentRequirement:
                      event
                        .target
                        .value as
                        DocumentRequirement,
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="optional">
                  Optional
                </option>
                <option value="required">
                  Required
                </option>
                <option value="not_required">
                  Not Required
                </option>
              </select>
            </Field>

            <Field label="Pay">
              <select
                value={
                  form.isPaid
                    ? 'paid'
                    : 'unpaid'
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    isPaid:
                      event
                        .target
                        .value ===
                      'paid',
                  })
                }
                className={
                  inputClass
                }
              >
                <option value="paid">
                  Paid
                </option>
                <option value="unpaid">
                  Unpaid
                </option>
              </select>
            </Field>

            <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">
                Approval Method
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={
                      form.finalApprovalMode
                    }
                    onChange={() =>
                      setForm({
                        ...form,
                        finalApprovalMode:
                          true,
                        adminOnlyApproval:
                          false,
                        approverIds:
                          [],
                      })
                    }
                  />
                  Assigned Manager Final
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={
                      form.adminOnlyApproval
                    }
                    onChange={() =>
                      setForm({
                        ...form,
                        finalApprovalMode:
                          false,
                        adminOnlyApproval:
                          true,
                        approverIds:
                          [],
                      })
                    }
                  />
                  Admin Only
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={
                      !form.finalApprovalMode &&
                      !form.adminOnlyApproval
                    }
                    onChange={() =>
                      setForm({
                        ...form,
                        finalApprovalMode:
                          false,
                        adminOnlyApproval:
                          false,
                      })
                    }
                  />
                  Manual Approval Chain
                </label>
              </div>
            </div>

            {!form.finalApprovalMode &&
              !form.adminOnlyApproval && (
                <div className="sm:col-span-2">
                  <Field label="Approvers">
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                      {activeApprovers.map(
                        (
                          approver
                        ) => {
                          const checked =
                            form
                              .approverIds
                              .includes(
                                approver.id
                              );

                          return (
                            <label
                              key={
                                approver.id
                              }
                              className="flex items-center gap-2 text-sm text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    approverIds:
                                      checked
                                        ? form.approverIds.filter(
                                            (
                                              id
                                            ) =>
                                              id !==
                                              approver.id
                                          )
                                        : [
                                            ...form.approverIds,
                                            approver.id,
                                          ],
                                  })
                                }
                              />

                              {approver.fullName}
                              {' — '}
                              {approver.designation}
                            </label>
                          );
                        }
                      )}
                    </div>
                  </Field>
                </div>
              )}

            <div className="sm:col-span-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Example: Annual Leave + Grade B + Yearly Quota 15 means every matching Grade B employee receives 15 Annual Leave days for the current year. Approved days reduce that balance.
            </div>

            {apiError && (
              <div className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {apiError}
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        open={
          Boolean(
            deleteTarget
          )
        }
        onClose={() =>
          !saving &&
          setDeleteTarget(
            null
          )
        }
        title="Delete Leave Policy"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                saving
              }
              onClick={() =>
                setDeleteTarget(
                  null
                )
              }
            >
              Cancel
            </Button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void handleDelete()
              }
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete{' '}
          <strong>
            {deleteTarget
              ? titleCase(
                  deleteTarget.leaveType
                )
              : ''}
          </strong>
          ? Matching current-year entitlement will be removed.
        </p>
      </Modal>

      <Modal
        open={
          Boolean(
            successMessage
          )
        }
        onClose={() =>
          setSuccessMessage('')
        }
        title="Saved"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setSuccessMessage('')
            }
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {successMessage}
        </p>
      </Modal>

      <Modal
        open={
          Boolean(
            apiError
          ) &&
          !showForm
        }
        onClose={() =>
          setApiError('')
        }
        title="Unable to Complete Action"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setApiError('')
            }
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {apiError}
        </p>
      </Modal>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children:
    ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value:
    ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="text-right font-medium text-gray-800">
        {value}
      </span>
    </div>
  );
}
