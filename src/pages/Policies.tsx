import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Pencil, Plus, Lock, Trash2 } from 'lucide-react';
import type { LeavePolicy } from '../types';

/*
 * Temporary extension for the new final-manager setting.
 *
 * We keep this local for now so the existing LeavePolicy type
 * and the rest of the project are not broken.
 *
 * Next step:
 * add finalApprovalMode to the shared LeavePolicy type and wire
 * AppDataContext so employee.managerId becomes the only approver.
 */
type ExtendedLeavePolicy = LeavePolicy & {
  finalApprovalMode?: boolean;
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

    // New fixed final-manager mode
    finalApprovalMode: false,

    documentRequirement: 'optional' as
      | 'optional'
      | 'required'
      | 'not_required',
  });

  /*
   * Existing normal approval-chain candidates.
   * This logic stays unchanged.
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

      documentRequirement: 'optional',
    });
  };

  const openEdit = (policy: LeavePolicy) => {
    const p = policy as ExtendedLeavePolicy;

    setEditing(p);

    setForm({
      leaveTypeName:
        p.leaveType.replace(/_/g, ' '),

      role:
        p.role || 'All Employees',

      isPaid:
        p.isPaid,

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

    const leaveTypeKey = form.leaveTypeName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    /*
     * Current LeavePolicy type still contains
     * minDaysNoticeRequired.
     *
     * We no longer show or edit it in the UI.
     *
     * Existing policies keep their existing value.
     * New policies get 0.
     */
    const preservedMinNotice =
      editing?.minDaysNoticeRequired ?? 0;

    const policyPayload: ExtendedLeavePolicy = {
      ...(editing || {}),

      id: editing
        ? editing.id
        : `lp${Date.now()}`,

      leaveType:
        leaveTypeKey,

      role:
        form.role,

      requiresApprovalFrom:
        'manager',

      /*
       * NORMAL MODE:
       * Existing approval chain remains exactly the same.
       *
       * FINAL MANAGER MODE:
       * Fixed approvers are not stored here.
       *
       * AppDataContext will dynamically use:
       *
       * employee.managerId
       *
       * as the one and only required approver.
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

      finalApprovalMode:
        form.finalApprovalMode,

      requiresDocumentUpload:
        form.documentRequirement ===
        'required',

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
            p.approvalRouting?.approverIds || [];

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in"
            >

              <div className="flex items-center justify-between gap-2 flex-wrap">

                <h3 className="text-base font-semibold capitalize text-gray-900">
                  {p.leaveType.replace(/_/g, ' ')} leave
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
                          Final Manager
                        </Badge>

                        <Badge variant="blue">
                          Employee's Manager
                        </Badge>
                      </>
                    ) : (
                      <>
                        {approversList.length === 0 && (
                          <span className="text-xs text-gray-400">
                            Not set
                          </span>
                        )}

                        {approversList.map((id) => {
                          const approver =
                            users.find(
                              (u) => u.id === id
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
                        })}
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
                    {p.role || 'All Employees'}
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
                      e.target.value === 'paid',
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

            {/* FINAL MANAGER TOGGLE */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={
                    form.finalApprovalMode
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      finalApprovalMode:
                        e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />

                <div>

                  <span className="block text-sm font-semibold text-gray-800">
                    Employee's Manager makes the final decision
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Enable this when the employee's
                    assigned Manager should make the
                    final approve or reject decision.
                    The request will not continue to
                    another approver.
                  </span>

                </div>

              </label>

            </div>

            {/* FINAL MANAGER INFORMATION */}
            {form.finalApprovalMode && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">

                <p className="text-sm font-medium text-blue-800">
                  Employee's Assigned Manager
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  The leave request will automatically
                  go to the Manager assigned to that
                  employee.
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-600">
                  Example: if Hammad reports to Manager A,
                  Manager A's approve or reject decision
                  will be final.
                </p>

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
                        value={form.designation}
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
                              key={designation}
                              value={designation}
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
                        value={form.department}
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
                              key={department}
                              value={department}
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
                  {form.approverIds.length > 0 && (
                    <div className="mb-3 space-y-1.5">

                      {form.approverIds.map((id) => {
                        const approver =
                          users.find(
                            (u) => u.id === id
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
                              {approver.fullName}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,

                                  approverIds:
                                    form.approverIds.filter(
                                      (approverId) =>
                                        approverId !== id
                                    ),
                                })
                              }
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 size={14} />
                            </button>

                          </div>
                        );
                      })}

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

                    {availableApprovers.length === 0 && (
                      <p className="py-2 text-center text-xs text-gray-400">
                        No matching people for this filter.
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
                value={form.documentRequirement}
                onChange={(e) =>
                  setForm({
                    ...form,

                    documentRequirement:
                      e.target.value as
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