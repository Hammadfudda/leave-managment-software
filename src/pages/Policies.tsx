import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  Lock,
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

  role: string;

  isPaid: boolean;

  /*
   * IMPORTANT:
   * Grade MongoDB ID store hoga.
   * Grade name nahi.
   */
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

  role: 'All Employees',

  isPaid: true,

  gradeId: '',

  designation:
    'All Designations',

  department:
    'All Departments',

  approverIds: [],

  finalApprovalMode: false,

  adminOnlyApproval: false,

  documentRequirement:
    'optional',
};

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

  /*
  |--------------------------------------------------------------------------
  | DATABASE POLICIES
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState<
    LeavePolicy | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<PolicyForm>({
    ...EMPTY_FORM,
  });

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<
    LeavePolicy | null
  >(null);

  /*
  |--------------------------------------------------------------------------
  | POPUPS
  |--------------------------------------------------------------------------
  */

  const [
    validationError,
    setValidationError,
  ] = useState('');

  const [
    apiError,
    setApiError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  /*
  |--------------------------------------------------------------------------
  | LOAD POLICIES FROM DATABASE
  |--------------------------------------------------------------------------
  */

  const loadPolicies =
    async () => {
      try {
        setLoading(true);

        setApiError('');

        const result =
          await getLeavePolicies();

        setPolicies(
          result
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

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadPageData =
      async () => {
        try {
          await Promise.all([
            refreshLookups(),
            refreshEmployees(),
          ]);
        } catch (error) {
          console.error(
            'Unable to load policy master data:',
            error
          );
        }

        await loadPolicies();
      };

    void loadPageData();
  }, [
    refreshLookups,
    refreshEmployees,
  ]);

  /*
  |--------------------------------------------------------------------------
  | APPROVER FILTER
  |--------------------------------------------------------------------------
  */

  const availableApprovers =
    useMemo(() => {
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
    ]);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const resetForm =
    () => {
      setForm({
        ...EMPTY_FORM,
        approverIds: [],
      });

      setEditing(null);

      setValidationError('');
    };

  const closeForm =
    () => {
      if (saving) {
        return;
      }

      setShowForm(false);

      resetForm();
    };

  const openCreate =
    () => {
      resetForm();

      setShowForm(true);
    };

  /*
  |--------------------------------------------------------------------------
  | GET GRADE NAME FROM ID
  |--------------------------------------------------------------------------
  */

  const getGradeName = (
    gradeId?: string
  ) => {
    if (!gradeId) {
      return 'All Grades';
    }

    const grade =
      grades.find(
        (item) =>
          item.id ===
          gradeId
      );

    return (
      grade?.name ||
      'Unknown Grade'
    );
  };

  /*
  |--------------------------------------------------------------------------
  | EDIT
  |--------------------------------------------------------------------------
  */

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

      /*
       * Backend policy mein Grade ID.
       */
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
          policy.finalApprovalMode
        ),

      adminOnlyApproval:
        Boolean(
          policy.adminOnlyApproval
        ),

      documentRequirement:
        policy.documentRequirement ||
        (
          policy.requiresDocumentUpload
            ? 'required'
            : 'optional'
        ),
    });

    setValidationError('');

    setShowForm(true);
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE POLICY
  |--------------------------------------------------------------------------
  */

  const handleSave =
    async () => {
      if (
        !form.leaveTypeName
          .trim()
      ) {
        setValidationError(
          'Please enter a leave type name.'
        );

        return;
      }

      if (
        form.adminOnlyApproval &&
        form.finalApprovalMode
      ) {
        setValidationError(
          'Admin Only Approval and Manager Final Approval cannot both be enabled.'
        );

        return;
      }

      if (
        !form.finalApprovalMode &&
        !form.adminOnlyApproval &&
        form.approverIds
          .length === 0
      ) {
        setValidationError(
          'Please select at least one required approver.'
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

      const payload:
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

        /*
         * Applicant scope +
         * approval routing
         */
        approvalRouting: {
          /*
           * GRADE ID
           */
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

          /*
           * Manager Final / Admin Only
           * mein manual approvers nahi.
           */
          approverIds:
            form.finalApprovalMode ||
            form.adminOnlyApproval
              ? []
              : form.approverIds,
        },

        adminOnlyApproval:
          form.adminOnlyApproval,

        finalApprovalMode:
          form.finalApprovalMode,

        documentRequirement:
          form.documentRequirement,

        requiresDocumentUpload:
          form.documentRequirement ===
          'required',

        /*
         * Notice Period removed.
         * Type compatibility ke liye zero.
         */
        minDaysNoticeRequired:
          0,

        isPaid:
          form.isPaid,
      };

      try {
        setSaving(true);

        setValidationError('');

        if (editing) {
          await updateLeavePolicy(
            payload
          );

          setSuccessMessage(
            'Leave policy updated successfully.'
          );
        } else {
          await createLeavePolicy(
            payload
          );

          setSuccessMessage(
            'Leave policy created successfully.'
          );
        }

        setShowForm(false);

        resetForm();

        /*
         * Fresh database copy
         */
        await loadPolicies();
      } catch (error) {
        setValidationError(
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

  /*
  |--------------------------------------------------------------------------
  | DELETE POLICY
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (
        !deleteTarget
      ) {
        return;
      }

      try {
        setSaving(true);

        await deleteLeavePolicy(
          deleteTarget.id
        );

        setDeleteTarget(null);

        setSuccessMessage(
          'Leave policy deleted successfully.'
        );

        /*
         * Reload from MongoDB
         */
        await loadPolicies();
      } catch (error) {
        setDeleteTarget(null);

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

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Policies
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Create grade, role, department and designation specific leave policies.'
              : 'View leave policies.'}
          </p>
        </div>

        {isAdmin ? (
          <Button
            onClick={
              openCreate
            }
          >
            <Plus
              size={16}
            />

            Add Leave Policy
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
            <Lock
              size={12}
            />

            Read-only
          </span>
        )}
      </div>

      {/* LOADING */}

      {loading && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Loading leave
          policies...
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        policies.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="font-medium text-gray-700">
              No leave
              policies found.
            </p>

            {isAdmin && (
              <p className="mt-1 text-sm text-gray-400">
                Create the
                first leave
                policy.
              </p>
            )}
          </div>
        )}

      {/* POLICY CARDS */}

      {!loading &&
        policies.length >
          0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {policies.map(
              (policy) => {
                const approverIds =
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
                    {/* CARD HEADER */}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold capitalize text-gray-900">
                          {policy.leaveType.replace(
                            /_/g,
                            ' '
                          )}{' '}
                          Leave
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          Leave
                          Policy
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                policy
                              )
                            }
                            title="Edit policy"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil
                              size={
                                15
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
                            title="Delete policy"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}

                    <div className="mt-4 space-y-2.5 text-sm">
                      {/* GRADE */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Grade
                        </span>

                        <Badge variant="blue">
                          {getGradeName(
                            policy
                              .approvalRouting
                              ?.grade
                          )}
                        </Badge>
                      </div>

                      {/* ROLE */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Role
                        </span>

                        <span className="font-medium text-gray-900">
                          {policy.role ||
                            'All Employees'}
                        </span>
                      </div>

                      {/* DEPARTMENT */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Department
                        </span>

                        <span className="text-right font-medium text-gray-900">
                          {policy
                            .approvalRouting
                            ?.department ||
                            'All Departments'}
                        </span>
                      </div>

                      {/* DESIGNATION */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Designation
                        </span>

                        <span className="text-right font-medium text-gray-900">
                          {policy
                            .approvalRouting
                            ?.designation ||
                            'All Designations'}
                        </span>
                      </div>

                      {/* APPROVAL */}

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">
                          Approval
                        </span>

                        <div className="flex max-w-[68%] flex-wrap justify-end gap-1">
                          {policy.adminOnlyApproval ? (
                            <Badge variant="orange">
                              Admin
                              Only
                            </Badge>
                          ) : policy.finalApprovalMode ? (
                            <Badge variant="green">
                              Assigned
                              Manager
                              Final
                            </Badge>
                          ) : approverIds.length >
                            0 ? (
                            approverIds.map(
                              (
                                id
                              ) => {
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
                            )
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not
                              set
                            </span>
                          )}
                        </div>
                      </div>

                      {/* DOCUMENT */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Document
                        </span>

                        {policy.documentRequirement ===
                        'required' ? (
                          <Badge variant="orange">
                            Required
                          </Badge>
                        ) : policy.documentRequirement ===
                          'not_required' ? (
                          <Badge variant="gray">
                            Not
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="gray">
                            Optional
                          </Badge>
                        )}
                      </div>

                      {/* PAY */}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">
                          Pay
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
        )}

      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}

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
                onClick={
                  handleSave
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
          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1 text-left">
            {/* FORM ERROR */}

            {validationError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  {
                    validationError
                  }
                </span>
              </div>
            )}

            {/* LEAVE TYPE */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Leave Type
                Name
              </label>

              <input
                type="text"
                placeholder="e.g. Annual"
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
                className={
                  inputCls
                }
              />
            </div>

            {/* =============================================
                GRADE
            ============================================== */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Grade
              </label>

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
                  inputCls
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

              <p className="mt-1 text-xs text-gray-400">
                Example:
                Annual +
                Grade A and
                Annual +
                Grade B can
                have separate
                policies.
              </p>
            </div>

            {/* ROLE */}

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
                      event
                        .target
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

            {/* DEPARTMENT + DESIGNATION */}

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Policy Applies
                To
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          event
                            .target
                            .value,
                      })
                    }
                    className={
                      inputCls
                    }
                  >
                    <option value="All Departments">
                      All
                      Departments
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
                          event
                            .target
                            .value,
                      })
                    }
                    className={
                      inputCls
                    }
                  >
                    <option value="All Designations">
                      All
                      Designations
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
              </div>
            </div>

            {/* PAY */}

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
                      event
                        .target
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

            {/* =============================================
                MANAGER FINAL
            ============================================== */}

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    form.finalApprovalMode
                  }
                  onChange={(
                    event
                  ) => {
                    const checked =
                      event
                        .target
                        .checked;

                    setForm({
                      ...form,

                      finalApprovalMode:
                        checked,

                      adminOnlyApproval:
                        checked
                          ? false
                          : form.adminOnlyApproval,

                      approverIds:
                        checked
                          ? []
                          : form.approverIds,
                    });
                  }}
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Employee's
                    Manager makes
                    the final
                    decision
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Leave goes
                    automatically
                    to the
                    employee's
                    assigned
                    Manager.
                    Manager's
                    decision is
                    final.
                  </p>
                </div>
              </label>
            </div>

            {/* =============================================
                ADMIN ONLY
            ============================================== */}

            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    form.adminOnlyApproval
                  }
                  onChange={(
                    event
                  ) => {
                    const checked =
                      event
                        .target
                        .checked;

                    setForm({
                      ...form,

                      adminOnlyApproval:
                        checked,

                      finalApprovalMode:
                        checked
                          ? false
                          : form.finalApprovalMode,

                      approverIds:
                        checked
                          ? []
                          : form.approverIds,
                    });
                  }}
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Admin Only
                    Approval
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Admin makes
                    the final
                    approve or
                    reject
                    decision.
                  </p>
                </div>
              </label>
            </div>

            {/* =============================================
                MANUAL APPROVERS
            ============================================== */}

            {!form.finalApprovalMode &&
              !form.adminOnlyApproval && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Required
                    Approvers
                  </label>

                  {/* SELECTED */}

                  {form.approverIds
                    .length >
                    0 && (
                    <div className="mb-3 space-y-2">
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

                  {/* AVAILABLE */}

                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                    <p className="mb-1 text-[11px] text-gray-500">
                      Click a
                      Manager or
                      Admin to add
                      them to the
                      approval
                      chain.
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
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-white hover:shadow-sm"
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

                          <span className="text-xs font-medium text-blue-600">
                            + Add
                          </span>
                        </button>
                      )
                    )}

                    {availableApprovers.length ===
                      0 && (
                      <p className="py-3 text-center text-xs text-gray-400">
                        No matching
                        approvers.
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* DOCUMENT */}

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
                      event
                        .target
                        .value as DocumentRequirement,
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

            {/* NOTICE PERIOD REMOVED */}
          </div>
        </Modal>
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ====================================================== */}

      <Modal
        open={
          !!deleteTarget
        }
        onClose={() => {
          if (!saving) {
            setDeleteTarget(
              null
            );
          }
        }}
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

            <Button
              variant="danger"
              disabled={
                saving
              }
              onClick={
                handleDelete
              }
            >
              {saving
                ? 'Deleting...'
                : 'Delete Policy'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Are you sure
            you want to
            delete{' '}
            <strong className="capitalize text-gray-900">
              {deleteTarget?.leaveType.replace(
                /_/g,
                ' '
              )}
            </strong>{' '}
            leave policy?
          </p>

          {deleteTarget
            ?.approvalRouting
            ?.grade && (
            <p className="text-sm text-gray-600">
              Grade:{' '}
              <strong>
                {getGradeName(
                  deleteTarget
                    .approvalRouting
                    .grade
                )}
              </strong>
            </p>
          )}

          <p className="text-xs text-rose-600">
            Existing leave
            requests will not
            be deleted.
          </p>
        </div>
      </Modal>

      {/* =====================================================
          API ERROR
      ====================================================== */}

      <Modal
        open={
          !!apiError
        }
        onClose={() =>
          setApiError('')
        }
        title="Error"
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
        <p className="whitespace-pre-line text-sm text-gray-600">
          {
            apiError
          }
        </p>
      </Modal>

      {/* =====================================================
          SUCCESS
      ====================================================== */}

      <Modal
        open={
          !!successMessage
        }
        onClose={() =>
          setSuccessMessage('')
        }
        title="Success"
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
          {
            successMessage
          }
        </p>
      </Modal>
    </div>
  );
}