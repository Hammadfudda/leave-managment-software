import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pencil,
  Plus,
  Lock,
  Trash2,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  useAppData,
} from '../context/AppDataContext';

import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import {
  getApiErrorMessage,
} from '../services/api';

import type {
  LeavePolicy,
} from '../types';

const EMPTY_FORM = {
  leaveTypeName: '',
  role: 'All Employees',

  isPaid: true,

  designation:
    'All Designations',

  department:
    'All Departments',

  grade:
    'All Grades',

  approverIds:
    [] as string[],

  minDaysNoticeRequired:
    0,

  documentRequirement:
    'optional' as
      | 'optional'
      | 'required'
      | 'not_required',

  adminOnlyApproval:
    false,

  finalApprovalMode:
    false,
};

export default function Policies() {
  const { user } =
    useAuth();

  const {
    leavePolicies,
    refreshLeavePolicies,
    addLeavePolicy,
    updateLeavePolicy,

    designations,
    departments,
    grades,
    users,
  } = useAppData();

  const isAdmin =
    user?.role ===
    'admin';

  const [
    showAdd,
    setShowAdd,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState<
    LeavePolicy | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | null
  >(null);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  useEffect(() => {
    void refreshLeavePolicies().catch(
      (error) => {
        setErrorMessage(
          getApiErrorMessage(
            error,
            'Unable to load leave policies.'
          )
        );
      }
    );
  }, [
    refreshLeavePolicies,
  ]);

  const availableApprovers =
    useMemo(() => {
      if (
        form.adminOnlyApproval ||
        form.finalApprovalMode
      ) {
        return [];
      }

      return users
        .filter(
          (candidate) =>
            candidate.status ===
            'active'
        )
        .filter(
          (candidate) =>
            candidate.role ===
              'manager' ||
            candidate.role ===
              'admin'
        )
        .filter(
          (candidate) =>
            form.designation ===
              'All Designations' ||
            candidate.designation ===
              form.designation
        )
        .filter(
          (candidate) =>
            candidate.role ===
              'admin' ||
            form.department ===
              'All Departments' ||
            candidate.department ===
              form.department ||
            candidate.canApproveOtherDepartments
        )
        .filter(
          (candidate) =>
            !form.approverIds.includes(
              candidate.id
            )
        );
    }, [
      users,
      form.designation,
      form.department,
      form.approverIds,
      form.adminOnlyApproval,
      form.finalApprovalMode,
    ]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      approverIds: [],
    });

    setEditing(null);
  };

  const openCreate = () => {
    resetForm();

    setErrorMessage(
      null
    );

    setShowAdd(true);
  };

  const openEdit = (
    policy: LeavePolicy
  ) => {
    setEditing(
      policy
    );

    setForm({
      leaveTypeName:
        policy.leaveType.replace(
          /_/g,
          ' '
        ),

      role:
        policy.role ||
        'All Employees',

      isPaid:
        policy.isPaid,

      designation:
        policy.approvalRouting
          ?.designation ||
        'All Designations',

      department:
        policy.approvalRouting
          ?.department ||
        'All Departments',

      grade:
        policy.approvalRouting
          ?.grade ||
        'All Grades',

      approverIds:
        policy.approvalRouting
          ?.approverIds ||
        [],

      minDaysNoticeRequired:
        policy.minDaysNoticeRequired ??
        0,

      documentRequirement:
        policy.documentRequirement ||
        (
          policy.requiresDocumentUpload
            ? 'required'
            : 'optional'
        ),

      adminOnlyApproval:
        Boolean(
          policy.adminOnlyApproval
        ),

      finalApprovalMode:
        Boolean(
          policy.finalApprovalMode
        ),
    });

    setErrorMessage(
      null
    );

    setShowAdd(true);
  };

  const handleSave =
    async () => {
      if (
        !form.leaveTypeName
          .trim()
      ) {
        setErrorMessage(
          'Leave type name is required.'
        );

        return;
      }

      if (
        form.adminOnlyApproval &&
        form.finalApprovalMode
      ) {
        setErrorMessage(
          'Admin-only approval and Final Manager approval cannot both be enabled.'
        );

        return;
      }

      if (
        !form.adminOnlyApproval &&
        !form.finalApprovalMode &&
        form.approverIds
          .length === 0
      ) {
        setErrorMessage(
          'Please select at least one approver.'
        );

        return;
      }

      const leaveTypeKey =
        form.leaveTypeName
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            '_'
          );

      const policyPayload:
        LeavePolicy = {
        id:
          editing?.id ||
          '',

        leaveType:
          leaveTypeKey,

        role:
          form.role,

        requiresApprovalFrom:
          form.adminOnlyApproval
            ? 'admin'
            : 'manager',

        approvalRouting: {
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

          grade:
            form.grade !==
            'All Grades'
              ? form.grade
              : undefined,

          approverIds:
            form.adminOnlyApproval ||
            form.finalApprovalMode
              ? []
              : form.approverIds,
        },

        requiresDocumentUpload:
          form.documentRequirement ===
          'required',

        documentRequirement:
          form.documentRequirement,

        minDaysNoticeRequired:
          form.minDaysNoticeRequired,

        isPaid:
          form.isPaid,

        adminOnlyApproval:
          form.adminOnlyApproval,

        finalApprovalMode:
          form.finalApprovalMode,
      };

      try {
        setLoading(
          true
        );

        setErrorMessage(
          null
        );

        if (editing) {
          await updateLeavePolicy(
            policyPayload
          );

          setSuccessMessage(
            'Leave policy updated successfully.'
          );
        } else {
          await addLeavePolicy(
            policyPayload
          );

          setSuccessMessage(
            'Leave policy created successfully.'
          );
        }

        setShowAdd(
          false
        );

        resetForm();

        await refreshLeavePolicies();
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            editing
              ? 'Unable to update leave policy.'
              : 'Unable to create leave policy.'
          )
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Policies
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Create and manage leave policies stored in the database.'
              : 'View the leave policies available to you.'}
          </p>
        </div>

        {isAdmin ? (
          <Button
            onClick={
              openCreate
            }
          >
            <Plus
              size={
                16
              }
            />

            Add Leave Type
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
            <Lock
              size={
                12
              }
            />

            Read-only
          </span>
        )}
      </div>

      {leavePolicies.length ===
        0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            No leave
            policies found.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {isAdmin
              ? 'Create your first policy to start using database-based leave rules.'
              : 'No policy is currently available.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leavePolicies.map(
          (policy) => {
            const approvers =
              policy
                .approvalRouting
                ?.approverIds ||
              [];

            return (
              <div
                key={
                  policy.id
                }
                className="animate-fade-in rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold capitalize text-gray-900">
                    {policy.leaveType.replace(
                      /_/g,
                      ' '
                    )}{' '}
                    leave
                  </h3>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          policy
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil
                        size={
                          14
                        }
                      />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">
                      Approval
                    </span>

                    {policy.adminOnlyApproval ? (
                      <Badge variant="orange">
                        Admin Only
                      </Badge>
                    ) : policy.finalApprovalMode ? (
                      <Badge variant="green">
                        Employee Manager Final
                      </Badge>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-1">
                        {approvers.length ===
                          0 && (
                          <span className="text-xs text-gray-400">
                            Not set
                          </span>
                        )}

                        {approvers.map(
                          (id) => {
                            const approver =
                              users.find(
                                (
                                  candidate
                                ) =>
                                  candidate.id ===
                                  id
                              );

                            return (
                              <Badge
                                key={
                                  id
                                }
                                variant="blue"
                              >
                                {approver?.fullName ||
                                  'Unknown'}
                              </Badge>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Role
                    </span>

                    <span className="font-medium text-gray-900">
                      {policy.role ||
                        'All Employees'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Department
                    </span>

                    <span className="font-medium text-gray-900">
                      {policy
                        .approvalRouting
                        ?.department ||
                        'All Departments'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Designation
                    </span>

                    <span className="font-medium text-gray-900">
                      {policy
                        .approvalRouting
                        ?.designation ||
                        'All Designations'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Grade
                    </span>

                    <span className="font-medium text-gray-900">
                      {policy
                        .approvalRouting
                        ?.grade ||
                        'All Grades'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Document
                      upload
                    </span>

                    {policy.documentRequirement ===
                    'required' ? (
                      <Badge variant="orange">
                        Required
                      </Badge>
                    ) : policy.documentRequirement ===
                      'not_required' ? (
                      <Badge variant="gray">
                        Not Required
                      </Badge>
                    ) : (
                      <Badge variant="gray">
                        Optional
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Min notice
                    </span>

                    <span className="font-medium text-gray-900">
                      {policy.minDaysNoticeRequired ??
                        0}{' '}
                      day(s)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Paid
                    </span>

                    {policy.isPaid ? (
                      <Badge variant="green">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="gray">
                        Unpaid
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      {isAdmin && (
        <Modal
          open={
            showAdd
          }
          onClose={() => {
            if (loading) {
              return;
            }

            setShowAdd(
              false
            );

            resetForm();
          }}
          title={
            editing
              ? 'Edit Leave Policy'
              : 'Create Leave Type'
          }
          footer={
            <>
              <Button
                variant="secondary"
                disabled={
                  loading
                }
                onClick={() => {
                  setShowAdd(
                    false
                  );

                  resetForm();
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={
                  handleSave
                }
                disabled={
                  loading
                }
              >
                {loading
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : 'Create Policy'}
              </Button>
            </>
          }
        >
          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1 text-left">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Leave Type
                Name
              </label>

              <input
                type="text"
                value={
                  form.leaveTypeName
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    leaveTypeName:
                      event.target
                        .value,
                  })
                }
                placeholder="e.g. Maternity"
                className={
                  inputCls
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Applicable
                Role
              </label>

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
                      event.target
                        .value,
                  })
                }
                className={
                  inputCls
                }
              >
                <option value="All Employees">
                  All Employees
                </option>

                <option value="employee">
                  Employee
                </option>

                <option value="manager">
                  Manager
                </option>

                <option value="admin">
                  Administrator
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Pay Type
              </label>

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
                      event.target
                        .value ===
                      'paid',
                  })
                }
                className={
                  inputCls
                }
              >
                <option value="paid">
                  Paid Leave
                </option>

                <option value="unpaid">
                  Unpaid Leave
                </option>
              </select>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">
                Approval
                Method
              </p>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    form.finalApprovalMode
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      finalApprovalMode:
                        event.target
                          .checked,

                      adminOnlyApproval:
                        event.target
                          .checked
                          ? false
                          : form.adminOnlyApproval,

                      approverIds:
                        event.target
                          .checked
                          ? []
                          : form.approverIds,
                    })
                  }
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Employee's
                    Manager is
                    Final
                    Approver
                  </p>

                  <p className="text-xs text-gray-500">
                    Leave automatically
                    goes to the
                    employee's assigned
                    manager. Manager
                    decision is final.
                  </p>
                </div>
              </label>

              <label className="mt-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    form.adminOnlyApproval
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      adminOnlyApproval:
                        event.target
                          .checked,

                      finalApprovalMode:
                        event.target
                          .checked
                          ? false
                          : form.finalApprovalMode,

                      approverIds:
                        event.target
                          .checked
                          ? []
                          : form.approverIds,
                    })
                  }
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Admin Only
                    Approval
                  </p>

                  <p className="text-xs text-gray-500">
                    No manager
                    approval chain.
                    Admin makes the
                    final decision.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Policy Applies
                To
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Designation
                  </label>

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
                          event.target
                            .value,
                      })
                    }
                    className={
                      inputCls
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
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Department
                  </label>

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
                          event.target
                            .value,
                      })
                    }
                    className={
                      inputCls
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
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Grade
                  </label>

                  <select
                    value={
                      form.grade
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,

                        grade:
                          event.target
                            .value,
                      })
                    }
                    className={
                      inputCls
                    }
                  >
                    <option value="All Grades">
                      All Grades
                    </option>

                    {grades.map(
                      (grade) => (
                        <option
                          key={
                            grade.id
                          }
                          value={
                            grade.name
                          }
                        >
                          {
                            grade.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {!form.adminOnlyApproval &&
              !form.finalApprovalMode && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Required
                    Approvers
                  </label>

                  {form.approverIds
                    .length >
                    0 && (
                    <div className="mb-3 space-y-1.5">
                      {form.approverIds.map(
                        (
                          id,
                          index
                        ) => {
                          const approver =
                            users.find(
                              (
                                candidate
                              ) =>
                                candidate.id ===
                                id
                            );

                          if (
                            !approver
                          ) {
                            return null;
                          }

                          return (
                            <div
                              key={
                                id
                              }
                              className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm"
                            >
                              <span className="text-gray-800">
                                {index +
                                  1}
                                .{' '}
                                {
                                  approver.fullName
                                }{' '}
                                <span className="text-xs text-gray-500">
                                  (
                                  {
                                    approver.role
                                  }
                                  )
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setForm({
                                    ...form,

                                    approverIds:
                                      form.approverIds.filter(
                                        (
                                          approverId
                                        ) =>
                                          approverId !==
                                          id
                                      ),
                                  })
                                }
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2
                                  size={
                                    14
                                  }
                                />
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                    <p className="mb-1 text-[11px] text-gray-500">
                      First
                      selected person
                      becomes the
                      gatekeeper.
                    </p>

                    {availableApprovers.map(
                      (
                        approver
                      ) => (
                        <button
                          type="button"
                          key={
                            approver.id
                          }
                          onClick={() =>
                            setForm({
                              ...form,

                              approverIds: [
                                ...form.approverIds,
                                approver.id,
                              ],
                            })
                          }
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-white hover:shadow-sm"
                        >
                          <span>
                            {
                              approver.fullName
                            }{' '}

                            <span className="text-xs text-gray-400">
                              (
                              {
                                approver.role
                              }
                              )
                            </span>
                          </span>

                          <span className="text-xs text-blue-600">
                            + Add
                          </span>
                        </button>
                      )
                    )}

                    {availableApprovers.length ===
                      0 && (
                      <p className="py-2 text-center text-xs text-gray-400">
                        No matching
                        approvers.
                      </p>
                    )}
                  </div>
                </div>
              )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Minimum Notice
                Days
              </label>

              <input
                type="number"
                min={
                  0
                }
                value={
                  form.minDaysNoticeRequired
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    minDaysNoticeRequired:
                      Math.max(
                        0,

                        Number(
                          event.target
                            .value
                        )
                      ),
                  })
                }
                className={
                  inputCls
                }
              />

              <p className="mt-1 text-xs text-gray-400">
                Advisory only.
                It does not block
                leave submission.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Document
                Attachment
              </label>

              <select
                value={
                  form.documentRequirement
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    documentRequirement:
                      event.target
                        .value as
                        | 'optional'
                        | 'required'
                        | 'not_required',
                  })
                }
                className={
                  inputCls
                }
              >
                <option value="not_required">
                  Not Required
                </option>

                <option value="optional">
                  Optional
                </option>

                <option value="required">
                  Required
                </option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={
          !!errorMessage
        }
        onClose={() =>
          setErrorMessage(
            null
          )
        }
        title="Unable to Save Policy"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setErrorMessage(
                null
              )
            }
          >
            OK
          </Button>
        }
      >
        <p className="whitespace-pre-line text-sm text-gray-600">
          {errorMessage}
        </p>
      </Modal>

      <Modal
        open={
          !!successMessage
        }
        onClose={() =>
          setSuccessMessage(
            null
          )
        }
        title="Success"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setSuccessMessage(
                null
              )
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
    </div>
  );
}