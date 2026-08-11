import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Pencil, Plus, Lock, Trash2 } from 'lucide-react';
import type { LeavePolicy } from '../types';

/*
 * These fields are intentionally defined locally for now.
 *
 * This lets us update Policies.tsx without breaking the existing
 * LeavePolicy interface or any of the old approval-chain code.
 *
 * In the next step these fields will be moved into src/types/index.ts
 * and AppDataContext will use them while submitting leave requests.
 */
type FinalApprovalTarget = 'employee_manager' | 'department';

type ExtendedLeavePolicy = LeavePolicy & {
  finalApprovalMode?: boolean;
  finalApprovalTarget?: FinalApprovalTarget;
  finalApprovalDepartment?: string;
};

export default function Policies() {
  const { user } = useAuth();

  const {
    leavePolicies,
    addLeavePolicy,
    updateLeavePolicy,
    designations,
    departments,
    users,
  } = useAppData();

  const isAdmin = user?.role === 'admin';

  const [showAdd, setShowAdd] = useState(false);

  const [editing, setEditing] =
    useState<ExtendedLeavePolicy | null>(null);

  const [form, setForm] = useState({
    leaveTypeName: '',
    role: 'All Employees',
    isPaid: true,

    // Existing approval routing
    designation: 'All Designations',
    department: 'All Departments',
    approverIds: [] as string[],

    // New final approval routing
    finalApprovalMode: false,
    finalApprovalTarget:
      'employee_manager' as FinalApprovalTarget,
    finalApprovalDepartment: '',

    documentRequirement: 'optional' as
      | 'optional'
      | 'required'
      | 'not_required',
  });

  /*
   * Existing approval-chain candidates.
   *
   * Nothing changed here.
   *
   * Manager/Admin filtering continues to work exactly
   * like the currently pushed version.
   */
  const availableApprovers = useMemo(() => {
    return users
      .filter((u) => u.role !== 'employee')

      .filter(
        (u) =>
          form.designation === 'All Designations' ||
          u.designation === form.designation
      )

      .filter(
        (u) =>
          u.role === 'admin' ||
          form.department === 'All Departments' ||
          u.department === form.department ||
          u.canApproveOtherDepartments
      )

      .filter(
        (u) => !form.approverIds.includes(u.id)
      );
  }, [
    users,
    form.designation,
    form.department,
    form.approverIds,
  ]);

  const resetForm = () => {
    setForm({
      leaveTypeName: '',
      role: 'All Employees',
      isPaid: true,

      designation: 'All Designations',
      department: 'All Departments',
      approverIds: [],

      finalApprovalMode: false,
      finalApprovalTarget: 'employee_manager',
      finalApprovalDepartment: '',

      documentRequirement: 'optional',
    });
  };

  const openEdit = (policy: LeavePolicy) => {
    const p = policy as ExtendedLeavePolicy;

    setEditing(p);

    setForm({
      leaveTypeName: p.leaveType.replace(/_/g, ' '),

      role: p.role || 'All Employees',

      isPaid: p.isPaid,

      designation:
        p.approvalRouting?.designation ||
        'All Designations',

      department:
        p.approvalRouting?.department ||
        'All Departments',

      approverIds:
        p.approvalRouting?.approverIds || [],

      finalApprovalMode:
        p.finalApprovalMode || false,

      finalApprovalTarget:
        p.finalApprovalTarget ||
        'employee_manager',

      finalApprovalDepartment:
        p.finalApprovalDepartment || '',

      documentRequirement:
        p.documentRequirement ||
        (p.requiresDocumentUpload
          ? 'required'
          : 'optional'),
    });
  };

  const handleSave = () => {
    if (!form.leaveTypeName.trim()) {
      window.alert(
        'Please enter a leave type name.'
      );
      return;
    }

    /*
     * When Department is selected as the final route,
     * Admin must choose a department.
     */
    if (
      form.finalApprovalMode &&
      form.finalApprovalTarget === 'department' &&
      !form.finalApprovalDepartment
    ) {
      window.alert(
        'Please select a department for final approval.'
      );
      return;
    }

    const leaveTypeKey = form.leaveTypeName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    /*
     * IMPORTANT:
     *
     * We preserve minDaysNoticeRequired internally
     * because the current LeavePolicy TypeScript interface
     * still requires it.
     *
     * It is NOT displayed in this UI anymore.
     *
     * Existing policies keep their old value.
     * New policies use 0.
     */
    const preservedMinNotice =
      editing?.minDaysNoticeRequired ?? 0;

    /*
     * Preserve existing policy fields when editing.
     * This helps avoid accidentally deleting fields that
     * other parts of the project may already depend on.
     */
    const policyPayload: ExtendedLeavePolicy = {
      ...(editing || {}),

      id: editing
        ? editing.id
        : `lp${Date.now()}`,

      leaveType: leaveTypeKey,

      role: form.role,

      requiresApprovalFrom: 'manager',

      /*
       * IMPORTANT:
       *
       * Normal mode:
       * Keep the current approval chain exactly as configured.
       *
       * Final Approval mode:
       * approverIds are intentionally empty at policy level.
       *
       * AppDataContext will later resolve the correct person
       * dynamically:
       *
       * Employee's Manager
       *      -> employee.managerId
       *
       * Department
       *      -> selected department's approval route
       */
      approvalRouting: form.finalApprovalMode
        ? {
            approverIds: [],
          }
        : {
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
              form.approverIds,
          },

      /*
       * This is NOT Admin-only approval.
       *
       * We explicitly disable the old Admin-only mode
       * when saving through this new final-manager UI.
       */
      adminOnlyApproval: false,

      /*
       * New configuration.
       */
      finalApprovalMode:
        form.finalApprovalMode,

      finalApprovalTarget:
        form.finalApprovalMode
          ? form.finalApprovalTarget
          : undefined,

      finalApprovalDepartment:
        form.finalApprovalMode &&
        form.finalApprovalTarget === 'department'
          ? form.finalApprovalDepartment
          : undefined,

      requiresDocumentUpload:
        form.documentRequirement === 'required',

      documentRequirement:
        form.documentRequirement,

      minDaysNoticeRequired:
        preservedMinNotice,

      isPaid:
        form.isPaid,
    };

    if (editing) {
      updateLeavePolicy(policyPayload);
    } else {
      addLeavePolicy(policyPayload);
    }

    resetForm();

    setEditing(null);
    setShowAdd(false);
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Policies
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Configure rules for each leave type. Core types: annual, sick, casual. Add more below.'
              : 'View the rules that apply to each leave type.'}
          </p>
        </div>

        {isAdmin ? (
          <Button
            onClick={() => {
              setEditing(null);
              resetForm();
              setShowAdd(true);
            }}
          >
            <Plus size={16} />
            Add Leave Type
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
            <Lock size={12} />
            Read-only
          </span>
        )}

      </div>

      {/* POLICY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {leavePolicies.map((policy) => {
          const p =
            policy as ExtendedLeavePolicy;

          const approversList =
            p.approvalRouting?.approverIds ||
            [];

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in"
            >

              <div className="flex items-center justify-between gap-2 flex-wrap">

                <h3 className="text-base font-semibold capitalize text-gray-900">
                  {p.leaveType.replace(/_/g, ' ')}{' '}
                  leave
                </h3>

                {isAdmin && (
                  <button
                    onClick={() => {
                      openEdit(p);
                      setShowAdd(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil size={14} />
                  </button>
                )}

              </div>

              <div className="mt-4 space-y-2.5 text-sm">

                {/* APPROVAL */}
                <div className="flex items-start justify-between gap-3">

                  <span className="text-gray-500">
                    Approval from
                  </span>

                  <div className="flex max-w-[65%] flex-wrap justify-end gap-1">

                    {p.finalApprovalMode ? (
                      <>
                        <Badge variant="green">
                          Final Decision
                        </Badge>

                        {p.finalApprovalTarget ===
                        'department' ? (
                          <Badge variant="blue">
                            {p.finalApprovalDepartment ||
                              'Department'}
                          </Badge>
                        ) : (
                          <Badge variant="blue">
                            Employee's Manager
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        {approversList.length ===
                          0 && (
                          <span className="text-xs text-gray-400">
                            Not set
                          </span>
                        )}

                        {approversList.map(
                          (id) => {
                            const approver =
                              users.find(
                                (u) =>
                                  u.id === id
                              );

                            return (
                              <Badge
                                key={id}
                                variant="blue"
                              >
                                {approver?.fullName ||
                                  'Unknown'}
                              </Badge>
                            );
                          }
                        )}
                      </>
                    )}

                  </div>

                </div>

                {/* ROLE */}
                <div className="flex items-center justify-between">

                  <span className="text-gray-500">
                    Role
                  </span>

                  <span className="font-medium text-gray-900">
                    {p.role ||
                      'All Employees'}
                  </span>

                </div>

                {/* DOCUMENT */}
                <div className="flex items-center justify-between">

                  <span className="text-gray-500">
                    Document upload
                  </span>

                  {p.documentRequirement ===
                  'required' ? (
                    <Badge variant="orange">
                      Required
                    </Badge>
                  ) : p.documentRequirement ===
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

                {/* PAID */}
                <div className="flex items-center justify-between">

                  <span className="text-gray-500">
                    Paid
                  </span>

                  {p.isPaid ? (
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
        })}

      </div>

      {/* ADD / EDIT MODAL */}
      {isAdmin && (
        <Modal
          open={showAdd}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
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
                onClick={() => {
                  setShowAdd(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>

              <Button onClick={handleSave}>
                {editing
                  ? 'Save Changes'
                  : 'Create Policy'}
              </Button>
            </>
          }
        >

          <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto px-1">

            {/* LEAVE TYPE */}
            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Leave Type Name
              </label>

              <input
                type="text"
                placeholder="e.g. Maternity"
                value={form.leaveTypeName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    leaveTypeName:
                      e.target.value,
                  })
                }
                className={inputCls}
                required
              />

            </div>

            {/* APPLICABLE ROLE */}
            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Applicable Role
              </label>

              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                  })
                }
                className={inputCls}
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

            {/* PAY TYPE */}
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    isPaid:
                      e.target.value ===
                      'paid',
                  })
                }
                className={inputCls}
              >

                <option value="paid">
                  Paid Leave
                </option>

                <option value="unpaid">
                  Unpaid Leave
                </option>

              </select>

            </div>

            {/* FINAL DECISION TOGGLE */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={
                    form.finalApprovalMode
                  }
                  onChange={(e) => {
                    const checked =
                      e.target.checked;

                    setForm({
                      ...form,
                      finalApprovalMode:
                        checked,

                      finalApprovalTarget:
                        checked
                          ? form.finalApprovalTarget
                          : 'employee_manager',

                      finalApprovalDepartment:
                        checked
                          ? form.finalApprovalDepartment
                          : '',
                    });
                  }}
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />

                <div>

                  <span className="block text-sm font-semibold text-gray-800">
                    Manager makes the final decision
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Enable this when this leave
                    should not go through the normal
                    approval chain.
                  </span>

                </div>

              </label>

            </div>

            {/* FINAL APPROVAL SETTINGS */}
            {form.finalApprovalMode && (
              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Final Approval Goes To
                  </label>

                  <select
                    value={
                      form.finalApprovalTarget
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        finalApprovalTarget:
                          e.target
                            .value as FinalApprovalTarget,

                        finalApprovalDepartment:
                          e.target.value ===
                          'department'
                            ? form.finalApprovalDepartment
                            : '',
                      })
                    }
                    className={inputCls}
                  >

                    <option value="employee_manager">
                      Employee's Manager
                    </option>

                    <option value="department">
                      Department
                    </option>

                  </select>

                </div>

                {/* EMPLOYEE MANAGER INFO */}
                {form.finalApprovalTarget ===
                  'employee_manager' && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">

                    <p className="text-xs leading-5 text-blue-700">
                      The leave request will
                      automatically go to the
                      Manager assigned to that
                      employee.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-600">
                      Example: if Hammad reports to
                      Manager A, Manager A's
                      approve/reject decision will
                      be final.
                    </p>

                  </div>
                )}

                {/* DEPARTMENT */}
                {form.finalApprovalTarget ===
                  'department' && (
                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Final Approval Department
                    </label>

                    <select
                      value={
                        form.finalApprovalDepartment
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,

                          finalApprovalDepartment:
                            e.target.value,
                        })
                      }
                      className={inputCls}
                    >

                      <option value="">
                        Select Department
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={department}
                            value={department}
                          >
                            {department}
                          </option>
                        )
                      )}

                    </select>

                    <p className="mt-1.5 text-xs leading-5 text-gray-500">
                      Example: select Finance when
                      this leave type must receive
                      its final decision from the
                      Finance department.
                    </p>

                  </div>
                )}

              </div>
            )}

            {/* NORMAL APPROVAL ROUTING */}
            {!form.finalApprovalMode && (
              <>

                {/* ROUTING FILTERS */}
                <div>

                  <label className="mb-1 block text-sm font-semibold text-gray-700 mt-2">
                    Approval Routing Filters
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    {/* DESIGNATION */}
                    <div>

                      <label className="mb-1 block text-xs text-gray-500">
                        Designation
                      </label>

                      <select
                        value={
                          form.designation
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            designation:
                              e.target.value,
                          })
                        }
                        className={inputCls}
                      >

                        <option value="All Designations">
                          All Designations
                        </option>

                        {designations.map(
                          (designation) => (
                            <option
                              key={
                                designation
                              }
                              value={
                                designation
                              }
                            >
                              {designation}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                    {/* DEPARTMENT */}
                    <div>

                      <label className="mb-1 block text-xs text-gray-500">
                        Department
                      </label>

                      <select
                        value={
                          form.department
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            department:
                              e.target.value,
                          })
                        }
                        className={inputCls}
                      >

                        <option value="All Departments">
                          All Departments
                        </option>

                        {departments.map(
                          (department) => (
                            <option
                              key={
                                department
                              }
                              value={
                                department
                              }
                            >
                              {department}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                  </div>

                </div>

                {/* REQUIRED APPROVERS */}
                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Required Approvers
                  </label>

                  {/* SELECTED APPROVERS */}
                  {form.approverIds.length >
                    0 && (
                    <div className="mb-3 space-y-1.5">

                      {form.approverIds.map(
                        (id) => {
                          const approver =
                            users.find(
                              (u) =>
                                u.id === id
                            );

                          if (!approver) {
                            return null;
                          }

                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm"
                            >

                              <span className="text-gray-800">
                                {
                                  approver.fullName
                                }
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

                  {/* AVAILABLE APPROVERS */}
                  <div className="rounded-lg border border-gray-200 p-3 space-y-1 bg-gray-50/50 max-h-40 overflow-y-auto">

                    <p className="text-[11px] text-gray-500 mb-1">

                      {form.designation !==
                        'All Designations' ||
                      form.department !==
                        'All Departments'
                        ? 'Matching people (based on filters above) — click to add:'
                        : 'Click to add an approver:'}

                    </p>

                    {availableApprovers.map(
                      (approver) => (
                        <button
                          type="button"
                          key={approver.id}
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
                            {approver.fullName}
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
                        No matching people for
                        this filter.
                      </p>
                    )}

                  </div>

                </div>

              </>
            )}

            {/* DOCUMENT ATTACHMENT */}
            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Document Attachment
              </label>

              <select
                value={
                  form.documentRequirement
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    documentRequirement:
                      e.target
                        .value as
                        | 'optional'
                        | 'required'
                        | 'not_required',
                  })
                }
                className={inputCls}
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

    </div>
  );
}