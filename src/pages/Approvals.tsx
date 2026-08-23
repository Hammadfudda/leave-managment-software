import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import LeaveAttachmentButton from '../components/leave/LeaveAttachmentButton';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatDate } from '../utils/formatDate';
import { CORE_LEAVE_TYPES } from '../types';
import type { LeaveRequest } from '../types';

function getCurrentTurnApproverIds(req: LeaveRequest): string[] {
  if (req.status !== 'pending') return [];

  const required = req.requiredApproverIds || [];
  if (required.length === 0) return [];

  const approved = req.approvedByIds || [];
  const rejected = req.rejectedByIds || [];
  const gatekeeperId = required[0];

  if (
    !approved.includes(gatekeeperId) &&
    !rejected.includes(gatekeeperId)
  ) {
    return [gatekeeperId];
  }

  return required
    .slice(1)
    .filter(
      (id) =>
        !approved.includes(id) &&
        !rejected.includes(id)
    );
}

export default function Approvals() {
  const { user } = useAuth();

  const {
    leaveRequests,
    leaveBalances,
    getUserById,
    approveLeave,
    rejectLeave,
    cancelLeaveByAdmin,
    refreshLeaveRequests,
    refreshEmployees,
  } = useAppData();

  const [tab, setTab] =
    useState<'pending' | 'history'>('pending');

  const [detail, setDetail] =
    useState<LeaveRequest | null>(null);

  const [comment, setComment] = useState('');
  const [cancelMode, setCancelMode] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      try {
        await Promise.all([
          refreshLeaveRequests(),
          refreshEmployees(),
        ]);
      } catch (error) {
        console.error(
          'Unable to refresh approvals:',
          error
        );
      }
    };

    void load();
  }, [
    user?.id,
    refreshLeaveRequests,
    refreshEmployees,
  ]);

  if (!user) return null;

  const isAdminOrManager =
    user.role === 'admin' ||
    user.role === 'manager';

  const pending = leaveRequests.filter((leave) => {
    if (
      leave.status === 'approved' ||
      leave.status === 'rejected' ||
      leave.status === 'cancelled'
    ) {
      return false;
    }

    if (user.role === 'admin') return true;

    return getCurrentTurnApproverIds(leave).includes(user.id);
  });

  const history = leaveRequests.filter(
    (leave) =>
      leave.approvalHistory.some(
        (historyItem) =>
          historyItem.approverId === user.id
      ) ||
      (
        user.role === 'admin' &&
        ['approved', 'rejected', 'cancelled'].includes(
          leave.status
        )
      )
  );

  const baseList =
    tab === 'pending'
      ? pending
      : history;

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          leaveRequests
            .map((leave) => leave.department)
            .filter(Boolean)
        )
      ).sort(),
    [leaveRequests]
  );

  const leaveTypes = useMemo(
    () =>
      Array.from(
        new Set(
          leaveRequests.map(
            (leave) => leave.leaveType
          )
        )
      ).sort(),
    [leaveRequests]
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();

    return baseList.filter((leave) => {
      const employee =
        getUserById(leave.employeeId);

      const matchesSearch =
        !q ||
        leave.employeeName
          .toLowerCase()
          .includes(q) ||
        (employee?.employeeId || '')
          .toLowerCase()
          .includes(q) ||
        (leave.department || '')
          .toLowerCase()
          .includes(q) ||
        leave.leaveType
          .toLowerCase()
          .includes(q);

      const matchesDepartment =
        !departmentFilter ||
        leave.department === departmentFilter;

      const matchesType =
        !typeFilter ||
        leave.leaveType === typeFilter;

      const matchesStatus =
        !statusFilter ||
        leave.status === statusFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    baseList,
    query,
    departmentFilter,
    typeFilter,
    statusFilter,
    getUserById,
  ]);

  const employee =
    detail
      ? getUserById(detail.employeeId)
      : undefined;

  const isMyTurnOnDetail =
    !!detail &&
    (
      user.role === 'admin' ||
      getCurrentTurnApproverIds(detail).includes(
        user.id
      )
    );

  const balances = detail
    ? (
        leaveBalances[detail.employeeId] ||
        []
      ).filter((balance) =>
        CORE_LEAVE_TYPES.includes(
          balance.leaveType as
            typeof CORE_LEAVE_TYPES[number]
        )
      )
    : [];

  const takeAction = (
    action: 'approved' | 'rejected'
  ) => {
    if (!detail || !user) return;

    if (action === 'approved') {
      approveLeave(
        detail.id,
        user,
        comment
      );
    } else {
      rejectLeave(
        detail.id,
        user,
        comment
      );
    }

    setDetail(null);
    setComment('');
    setCancelMode(false);
  };

  const handleCancelLeave = () => {
    if (
      !detail ||
      !user ||
      !returnDate ||
      !cancelReason.trim()
    ) {
      return;
    }

    cancelLeaveByAdmin(
      detail.id,
      user,
      cancelReason.trim(),
      returnDate
    );

    setDetail(null);
    setCancelMode(false);
    setReturnDate('');
    setCancelReason('');
  };

  const openReview = (
    leave: LeaveRequest,
    cancel = false
  ) => {
    setDetail(leave);
    setCancelMode(cancel);
    setComment('');
    setReturnDate('');
    setCancelReason('');
  };

  const clearFilters = () => {
    setQuery('');
    setDepartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Approvals
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review pending leave requests. Your own team's active
          leaves and history live in My Team.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          {
            key: 'pending' as const,
            label: `Pending (${pending.length})`,
          },
          {
            key: 'history' as const,
            label: `History (${history.length})`,
          },
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search employee, ID or leave type"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">
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

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm capitalize"
          >
            <option value="">
              All Leave Types
            </option>
            {leaveTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {tab === 'history' && (
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All Status
              </option>
              <option value="approved">
                Approved
              </option>
              <option value="rejected">
                Rejected
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>
          )}

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Employee
                </th>
                <th className="px-5 py-3 font-medium">
                  Type
                </th>
                <th className="px-5 py-3 font-medium">
                  Dates
                </th>
                <th className="px-5 py-3 font-medium">
                  Days
                </th>
                <th className="px-5 py-3 font-medium">
                  Status
                </th>
                <th className="px-5 py-3 font-medium">
                  Approvals
                </th>
                <th className="px-5 py-3 font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    No records match the selected filters.
                  </td>
                </tr>
              )}

              {list.map((leave) => (
                <tr
                  key={leave.id}
                  className="animate-fade-in hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 text-gray-900">
                    {leave.employeeName}
                  </td>

                  <td className="px-5 py-3 capitalize text-gray-600">
                    {leave.leaveType}

                    {leave.isExtension && (
                      <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-indigo-700">
                        Extend
                      </span>
                    )}

                    {leave.isStopRequest && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-amber-700">
                        Stop
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3 text-gray-600">
                    {formatDate(
                      leave.startDate
                    )}{' '}
                    →{' '}
                    {formatDate(
                      leave.endDate
                    )}

                    {leave.excludedWeekendDates &&
                      leave.excludedWeekendDates
                        .length > 0 && (
                        <p className="mt-0.5 text-[10px] text-amber-600">
                          Sat/Sun included —{' '}
                          {
                            leave
                              .excludedWeekendDates
                              .length
                          }{' '}
                          day(s) excluded
                        </p>
                      )}
                  </td>

                  <td className="px-5 py-3 text-gray-600">
                    {
                      leave.totalDaysRequested
                    }
                  </td>

                  <td className="px-5 py-3">
                    <StatusBadge
                      status={leave.status}
                    />
                  </td>

                  <td className="px-5 py-3">
                    {leave.requiredApproverIds &&
                    leave.requiredApproverIds
                      .length > 0 ? (
                      <div className="space-y-1">
                        {leave.requiredApproverIds.map(
                          (id) => {
                            const approver =
                              getUserById(id);

                            const hasApproved =
                              leave.approvedByIds?.includes(
                                id
                              );

                            const hasRejected =
                              leave.rejectedByIds?.includes(
                                id
                              );

                            return (
                              <div
                                key={id}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <span
                                  className={
                                    hasApproved
                                      ? 'text-emerald-600'
                                      : hasRejected
                                        ? 'text-rose-600'
                                        : 'text-gray-400'
                                  }
                                >
                                  {hasApproved
                                    ? '✓'
                                    : hasRejected
                                      ? '✗'
                                      : '○'}
                                </span>

                                <span
                                  className={
                                    hasApproved
                                      ? 'text-gray-700'
                                      : hasRejected
                                        ? 'text-rose-600'
                                        : 'text-gray-400'
                                  }
                                >
                                  {approver?.fullName ||
                                    'Unknown'}{' '}
                                  (
                                  {approver?.role}
                                  )
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        —
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    <button
                      onClick={() =>
                        openReview(leave)
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {tab === 'pending'
                        ? 'Review'
                        : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setComment('');
          setCancelMode(false);
        }}
        title={
          cancelMode
            ? 'Stop Leave'
            : isMyTurnOnDetail
              ? 'Review Leave Request'
              : 'Leave Details'
        }
        size="lg"
        footer={
          cancelMode ? (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  setCancelMode(false)
                }
              >
                Back
              </Button>

              <Button
                variant="danger"
                onClick={handleCancelLeave}
                disabled={
                  !returnDate ||
                  !cancelReason.trim()
                }
              >
                Confirm Cancel
              </Button>
            </>
          ) : isMyTurnOnDetail ? (
            <>
              <Button
                variant="danger"
                onClick={() =>
                  takeAction('rejected')
                }
              >
                Reject
              </Button>

              <Button
                variant="success"
                onClick={() =>
                  takeAction('approved')
                }
              >
                Approve
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4 text-sm">
            {employee &&
              isAdminOrManager && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Employee details
                  </h4>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Joining date
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatDate(
                          employee.dateOfJoining
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Designation
                      </p>
                      <p className="font-medium text-gray-900">
                        {
                          employee.designation
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Grade
                      </p>
                      <p className="font-medium text-gray-900">
                        {employee.grade}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Department
                      </p>
                      <p className="font-medium text-gray-900">
                        {
                          employee.department
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {balances.map(
                      (balance) => (
                        <div
                          key={
                            balance.leaveType
                          }
                          className="rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-gray-200"
                        >
                          <p className="text-[10px] uppercase text-gray-400">
                            {
                              balance.leaveType
                            }
                          </p>

                          <p className="text-sm font-semibold text-gray-900">
                            {balance.used}{' '}
                            used ·{' '}
                            {
                              balance.remaining
                            }{' '}
                            balance
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">
                  Employee
                </p>
                <p className="font-medium text-gray-900">
                  {
                    detail.employeeName
                  }
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Department
                </p>
                <p className="font-medium text-gray-900">
                  {detail.department}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Type
                </p>
                <p className="font-medium capitalize text-gray-900">
                  {detail.leaveType}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Days requested
                </p>
                <p className="font-medium text-gray-900">
                  {
                    detail.totalDaysRequested
                  }
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Start
                </p>
                <p className="font-medium text-gray-900">
                  {formatDate(
                    detail.startDate
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  End
                </p>
                <p className="font-medium text-gray-900">
                  {formatDate(
                    detail.endDate
                  )}
                </p>
              </div>
            </div>

            <div>
              <p className="text-gray-500">
                Reason
              </p>
              <p className="mt-1 text-gray-900">
                {detail.reason}
              </p>
            </div>

            {detail.hasAttachment && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="mb-2 text-gray-500">
                  Attached document
                </p>

                <LeaveAttachmentButton
                  leaveRequestId={detail.id}
                  hasAttachment={detail.hasAttachment}
                  attachmentName={detail.attachmentName}
                />
              </div>
            )}

            {cancelMode ? (
              <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50/50 p-4">
                <p className="text-xs text-rose-700">
                  Employee is returning early.
                  Only days up to the return
                  date will be counted against
                  their balance.
                </p>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Return / join date
                  </label>

                  <input
                    type="date"
                    value={returnDate}
                    min={detail.startDate}
                    max={detail.endDate}
                    onChange={(event) =>
                      setReturnDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Reason for cancellation
                  </label>

                  <textarea
                    value={cancelReason}
                    onChange={(event) =>
                      setCancelReason(
                        event.target.value
                      )
                    }
                    rows={2}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ) : (
              tab === 'pending' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Comment (optional)
                  </label>

                  <textarea
                    value={comment}
                    onChange={(event) =>
                      setComment(
                        event.target.value
                      )
                    }
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )
            )}

            {detail.approvalHistory.length >
              0 && (
              <div>
                <p className="text-gray-500">
                  Approval history
                </p>

                <div className="mt-2 space-y-2">
                  {detail.approvalHistory.map(
                    (
                      historyItem,
                      index
                    ) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <Badge
                          variant={
                            historyItem.action ===
                            'approved'
                              ? 'green'
                              : historyItem.action ===
                                  'rejected'
                                ? 'red'
                                : 'gray'
                          }
                        >
                          {
                            historyItem.action
                          }
                        </Badge>

                        <span className="text-xs text-gray-600">
                          {
                            historyItem.approverName
                          }{' '}
                          ·{' '}
                          {formatDate(
                            historyItem.actionDate
                          )}{' '}
                          {historyItem.comment &&
                            `— ${historyItem.comment}`}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
