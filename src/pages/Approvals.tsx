import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Search,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  useAppData,
} from '../context/AppDataContext';

import StatusBadge from '../components/ui/StatusBadge';
import LeaveAttachmentButton from '../components/leave/LeaveAttachmentButton';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import YearlyLeaveReport from '../components/reports/YearlyLeaveReport';

import {
  formatDate,
} from '../utils/formatDate';

import api, {
  getApiErrorMessage,
} from '../services/api';

import {
  approveLeaveRequest,
  rejectLeaveRequest,
  actOnBehalfOfApprover,
  adminOverrideFinalDecision,
  adminStopApprovedLeave,
} from '../services/leaveApprovalActions';

import {
  CORE_LEAVE_TYPES,
} from '../types';

import type {
  LeaveRequest,
} from '../types';

function getCurrentTurnApproverIds(
  req:
    LeaveRequest
):
  string[] {
  if (
    req.status !==
    'pending'
  ) {
    return [];
  }

  const required =
    req.requiredApproverIds ||
    [];

  if (
    required.length ===
    0
  ) {
    return [];
  }

  const approved =
    req.approvedByIds ||
    [];

  const rejected =
    req.rejectedByIds ||
    [];

  const gatekeeperId =
    required[0];

  if (
    !approved.includes(
      gatekeeperId
    ) &&
    !rejected.includes(
      gatekeeperId
    )
  ) {
    return [
      gatekeeperId,
    ];
  }

  return required
    .slice(
      1
    )
    .filter(
      (
        id
      ) =>
        !approved.includes(
          id
        ) &&
        !rejected.includes(
          id
        )
    );
}

type FinalAction =
  | 'approve'
  | 'reject'
  | 'stop'
  | null;

export default function Approvals() {
  const {
    user,
  } =
    useAuth();

  const {
    leaveRequests,
    leaveBalances,
    getUserById,
    refreshLeaveRequests,
    refreshEmployees,
  } =
    useAppData();

  const [
    tab,
    setTab,
  ] =
    useState<
      'pending'
      | 'history'
    >(
      'pending'
    );

  const [
    detail,
    setDetail,
  ] =
    useState<LeaveRequest | null>(
      null
    );

  const [
    comment,
    setComment,
  ] =
    useState('');

  const [
    decisionAction,
    setDecisionAction,
  ] =
    useState<
      | 'approved'
      | 'rejected'
      | null
    >(
      null
    );

  const [
    decisionError,
    setDecisionError,
  ] =
    useState('');

  const [
    adminTargetApproverId,
    setAdminTargetApproverId,
  ] =
    useState('');

  const [
    finalTarget,
    setFinalTarget,
  ] =
    useState<LeaveRequest | null>(
      null
    );

  const [
    finalAction,
    setFinalAction,
  ] =
    useState<FinalAction>(
      null
    );

  const [
    finalReason,
    setFinalReason,
  ] =
    useState('');

  const [
    finalReturnDate,
    setFinalReturnDate,
  ] =
    useState('');

  const [
    finalBusy,
    setFinalBusy,
  ] =
    useState(false);

  const [
    finalError,
    setFinalError,
  ] =
    useState('');

  const [
    departmentDivisionByName,
    setDepartmentDivisionByName,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    query,
    setQuery,
  ] =
    useState('');

  const [
    divisionFilter,
    setDivisionFilter,
  ] =
    useState('');

  const [
    departmentFilter,
    setDepartmentFilter,
  ] =
    useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('');

  useEffect(
    () => {
      if (
        !user
      ) {
        return;
      }

      const load =
        async () => {
          try {
            const [
              ,
              ,
              departmentResponse,
            ] =
              await Promise.all([
                refreshLeaveRequests(),
                refreshEmployees(),
                api.get(
                  '/departments'
                ),
              ]);

            setDepartmentDivisionByName(
              Object.fromEntries(
                (
                  departmentResponse.data?.data ||
                  []
                ).map(
                  (
                    department:
                      {
                        name?: string;
                        divisionName?: string;
                      }
                  ) => [
                    String(
                      department.name ||
                      ''
                    ),
                    String(
                      department.divisionName ||
                      ''
                    ),
                  ]
                )
              )
            );
          } catch (
            error
          ) {
            console.error(
              'Unable to refresh approvals:',
              error
            );
          }
        };

      void load();
    },
    [
      user?.id,
      refreshLeaveRequests,
      refreshEmployees,
    ]
  );

  if (
    !user
  ) {
    return null;
  }

  const isAdminOrManager =
    user.role ===
      'admin' ||
    user.role ===
      'manager';

  const pending =
    leaveRequests.filter(
      (
        leave
      ) => {
        if (
          leave.status ===
            'approved' ||
          leave.status ===
            'rejected' ||
          leave.status ===
            'cancelled'
        ) {
          return false;
        }

        if (
          user.role ===
          'admin'
        ) {
          return true;
        }

        return getCurrentTurnApproverIds(
          leave
        ).includes(
          user.id
        );
      }
    );

  const history =
    leaveRequests.filter(
      (
        leave
      ) =>
        leave.approvalHistory.some(
          (
            historyItem
          ) =>
            historyItem.approverId ===
            user.id
        ) ||
        (
          user.role ===
            'admin' &&
          [
            'approved',
            'rejected',
            'cancelled',
          ].includes(
            leave.status
          )
        )
    );

  const baseList =
    tab ===
    'pending'
      ? pending
      : history;

  const getDivisionForLeave =
    (
      leave:
        LeaveRequest
    ) =>
      getUserById(
        leave.employeeId
      )?.roleLabel ||
      departmentDivisionByName[
        leave.department
      ] ||
      '';

  const divisions =
    useMemo(
      () =>
        Array.from(
          new Set(
            leaveRequests
              .map(
                (
                  leave
                ) =>
                  getDivisionForLeave(
                    leave
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort(),
      [
        leaveRequests,
        getUserById,
        departmentDivisionByName,
      ]
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            leaveRequests
              .map(
                (
                  leave
                ) =>
                  leave.department
              )
              .filter(
                Boolean
              )
          )
        ).sort(),
      [
        leaveRequests,
      ]
    );

  const leaveTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            leaveRequests.map(
              (
                leave
              ) =>
                leave.leaveType
            )
          )
        ).sort(),
      [
        leaveRequests,
      ]
    );

  const list =
    useMemo(
      () => {
        const q =
          query
            .trim()
            .toLowerCase();

        return baseList.filter(
          (
            leave
          ) => {
            const employee =
              getUserById(
                leave.employeeId
              );

            const matchesSearch =
              !q ||
              leave.employeeName
                .toLowerCase()
                .includes(
                  q
                ) ||
              (
                employee?.employeeId ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                ) ||
              (
                leave.department ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                ) ||
              leave.leaveType
                .toLowerCase()
                .includes(
                  q
                );

            return (
              matchesSearch &&
              (
                !divisionFilter ||
                getDivisionForLeave(
                  leave
                ) ===
                  divisionFilter
              ) &&
              (
                !departmentFilter ||
                leave.department ===
                  departmentFilter
              ) &&
              (
                !typeFilter ||
                leave.leaveType ===
                  typeFilter
              ) &&
              (
                !statusFilter ||
                leave.status ===
                  statusFilter
              )
            );
          }
        );
      },
      [
        baseList,
        query,
        divisionFilter,
        departmentFilter,
        typeFilter,
        statusFilter,
        getUserById,
        departmentDivisionByName,
      ]
    );

  const employee =
    detail
      ? getUserById(
          detail.employeeId
        )
      : undefined;

  const currentTurnIdsOnDetail =
    detail
      ? getCurrentTurnApproverIds(
          detail
        )
      : [];

  const isMyTurnOnDetail =
    !!detail &&
    (
      detail.isAdminOnlyDecision
        ? user.role ===
          'admin'
        : user.role ===
            'admin'
          ? currentTurnIdsOnDetail.length >
            0
          : currentTurnIdsOnDetail.includes(
              user.id
            )
    );

  const balances =
    detail
      ? (
          leaveBalances[
            detail.employeeId
          ] ||
          []
        ).filter(
          (
            balance
          ) =>
            CORE_LEAVE_TYPES.includes(
              balance.leaveType as
                typeof CORE_LEAVE_TYPES[number]
            )
        )
      : [];

  const takeAction =
    async (
      action:
        | 'approved'
        | 'rejected'
    ) => {
      if (
        !detail ||
        decisionAction
      ) {
        return;
      }

      if (
        action ===
          'rejected' &&
        !comment.trim()
      ) {
        setDecisionError(
          'Please enter a comment before rejecting the leave request.'
        );

        return;
      }

      if (
        user.role ===
          'admin' &&
        !detail.isAdminOnlyDecision &&
        !adminTargetApproverId
      ) {
        setDecisionError(
          'Select the Manager/approver you are acting on behalf of.'
        );

        return;
      }

      setDecisionAction(
        action
      );

      setDecisionError(
        ''
      );

      try {
        if (
          user.role ===
            'admin' &&
          !detail.isAdminOnlyDecision
        ) {
          await actOnBehalfOfApprover(
            detail.id,
            adminTargetApproverId,
            action,
            comment
          );
        } else if (
          action ===
          'approved'
        ) {
          await approveLeaveRequest(
            detail.id,
            comment
          );
        } else {
          await rejectLeaveRequest(
            detail.id,
            comment
          );
        }

        await refreshLeaveRequests();

        setDetail(
          null
        );

        setComment(
          ''
        );

        setDecisionError(
          ''
        );

        setAdminTargetApproverId(
          ''
        );
      } catch (
        error
      ) {
        setDecisionError(
          getApiErrorMessage(
            error,
            action ===
              'approved'
              ? 'Unable to approve this leave request.'
              : 'Unable to reject this leave request.'
          )
        );
      } finally {
        setDecisionAction(
          null
        );
      }
    };

  const openReview =
    (
      leave:
        LeaveRequest
    ) => {
      const currentTurnIds =
        getCurrentTurnApproverIds(
          leave
        );

      setDetail(
        leave
      );

      setComment(
        ''
      );

      setDecisionError(
        ''
      );

      setAdminTargetApproverId(
        user.role ===
          'admin' &&
        !leave.isAdminOnlyDecision
          ? currentTurnIds[0] ||
            ''
          : ''
      );
    };

  const openFinalAction =
    (
      leave:
        LeaveRequest,
      action:
        Exclude<
          FinalAction,
          null
        >
    ) => {
      setFinalTarget(
        leave
      );

      setFinalAction(
        action
      );

      setFinalReason(
        ''
      );

      setFinalReturnDate(
        ''
      );

      setFinalError(
        ''
      );
    };

  const closeFinalAction =
    () => {
      if (
        finalBusy
      ) {
        return;
      }

      setFinalTarget(
        null
      );

      setFinalAction(
        null
      );

      setFinalReason(
        ''
      );

      setFinalReturnDate(
        ''
      );

      setFinalError(
        ''
      );
    };

  const submitFinalAction =
    async () => {
      if (
        !finalTarget ||
        !finalAction ||
        !finalReason.trim()
      ) {
        setFinalError(
          'Reason is required.'
        );

        return;
      }

      if (
        finalAction ===
          'stop' &&
        !finalReturnDate
      ) {
        setFinalError(
          'Return / Join Date is required.'
        );

        return;
      }

      setFinalBusy(
        true
      );

      setFinalError(
        ''
      );

      try {
        if (
          finalAction ===
          'stop'
        ) {
          await adminStopApprovedLeave(
            finalTarget.id,
            finalReturnDate,
            finalReason.trim()
          );
        } else {
          await adminOverrideFinalDecision(
            finalTarget.id,
            finalAction ===
              'approve'
              ? 'approved'
              : 'rejected',
            finalReason.trim()
          );
        }

        await refreshLeaveRequests();

        setFinalTarget(
          null
        );

        setFinalAction(
          null
        );

        setFinalReason(
          ''
        );

        setFinalReturnDate(
          ''
        );
      } catch (
        error
      ) {
        setFinalError(
          getApiErrorMessage(
            error,
            'Unable to complete Admin final action.'
          )
        );
      } finally {
        setFinalBusy(
          false
        );
      }
    };

  const clearFilters =
    () => {
      setQuery(
        ''
      );

      setDivisionFilter(
        ''
      );

      setDepartmentFilter(
        ''
      );

      setTypeFilter(
        ''
      );

      setStatusFilter(
        ''
      );
    };

  return (
    <div className="space-y-6">
      {user.role ===
        'admin' && (
        <YearlyLeaveReport />
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Approvals
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review pending leave requests and manage finalized Manager decisions.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          {
            key:
              'pending' as const,
            label:
              `Pending (${pending.length})`,
          },
          {
            key:
              'history' as const,
            label:
              `History (${history.length})`,
          },
        ].map(
          (
            item
          ) => (
            <button
              key={
                item.key
              }
              type="button"
              onClick={() =>
                setTab(
                  item.key
                )
              }
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                tab ===
                item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {
                item.label
              }
            </button>
          )
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={
                16
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={
                query
              }
              onChange={
                (
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
              }
              placeholder="Search employee, ID or leave type"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={
              divisionFilter
            }
            onChange={
              (
                event
              ) => {
                setDivisionFilter(
                  event.target.value
                );

                setDepartmentFilter(
                  ''
                );
              }
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              All Divisions
            </option>

            {divisions.map(
              (
                division
              ) => (
                <option
                  key={
                    division
                  }
                  value={
                    division
                  }
                >
                  {
                    division
                  }
                </option>
              )
            )}
          </select>

          <select
            value={
              departmentFilter
            }
            onChange={
              (
                event
              ) =>
                setDepartmentFilter(
                  event.target.value
                )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              All Departments
            </option>

            {departments
              .filter(
                (
                  department
                ) =>
                  !divisionFilter ||
                  leaveRequests.some(
                    (
                      leave
                    ) =>
                      leave.department ===
                        department &&
                      getDivisionForLeave(
                        leave
                      ) ===
                        divisionFilter
                  )
              )
              .map(
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

          <select
            value={
              typeFilter
            }
            onChange={
              (
                event
              ) =>
                setTypeFilter(
                  event.target.value
                )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm capitalize"
          >
            <option value="">
              All Leave Types
            </option>

            {leaveTypes.map(
              (
                type
              ) => (
                <option
                  key={
                    type
                  }
                  value={
                    type
                  }
                >
                  {type.replace(
                    /_/g,
                    ' '
                  )}
                </option>
              )
            )}
          </select>

          {tab ===
            'history' && (
            <select
              value={
                statusFilter
              }
              onChange={
                (
                  event
                ) =>
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
            onClick={
              clearFilters
            }
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
                  Division
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
              {list.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      8
                    }
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    No records match the selected filters.
                  </td>
                </tr>
              )}

              {list.map(
                (
                  leave
                ) => (
                  <tr
                    key={
                      leave.id
                    }
                    className="hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {
                        leave.employeeName
                      }
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {getDivisionForLeave(
                        leave
                      ) ||
                        '—'}
                    </td>

                    <td className="px-5 py-3 capitalize text-gray-600">
                      {
                        leave.leaveType
                      }

                      {leave.isExtension && (
                        <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Extend
                        </span>
                      )}

                      {leave.isStopRequest && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
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
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {
                        leave.totalDaysRequested
                      }
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          leave.status
                        }
                      />
                    </td>

                    <td className="px-5 py-3">
                      {leave.requiredApproverIds &&
                      leave.requiredApproverIds.length >
                        0 ? (
                        <div className="space-y-1">
                          {leave.requiredApproverIds.map(
                            (
                              id
                            ) => {
                              const approver =
                                getUserById(
                                  id
                                );

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
                                  key={
                                    id
                                  }
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

                                  <span className="text-gray-600">
                                    {approver?.fullName ||
                                      'Unknown'}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openReview(
                              leave
                            )
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {tab ===
                          'pending'
                            ? 'Review'
                            : 'View'}
                        </button>

                        {user.role ===
                          'admin' &&
                          tab ===
                            'history' &&
                          !leave.isStopRequest &&
                          leave.status ===
                            'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openFinalAction(
                                    leave,
                                    'reject'
                                  )
                                }
                                className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200"
                              >
                                Reject
                              </button>

                              {!leave.cancelledBy &&
                                !leave.actualEndDate && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openFinalAction(
                                        leave,
                                        'stop'
                                      )
                                    }
                                    className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                                  >
                                    Stop Leave
                                  </button>
                                )}
                            </>
                          )}

                        {user.role ===
                          'admin' &&
                          tab ===
                            'history' &&
                          !leave.isStopRequest &&
                          leave.status ===
                            'rejected' && (
                            <button
                              type="button"
                              onClick={() =>
                                openFinalAction(
                                  leave,
                                  'approve'
                                )
                              }
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            >
                              Approve
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={
          Boolean(
            detail
          )
        }
        onClose={() => {
          setDetail(
            null
          );

          setComment(
            ''
          );

          setDecisionError(
            ''
          );

          setAdminTargetApproverId(
            ''
          );
        }}
        title={
          isMyTurnOnDetail
            ? 'Review Leave Request'
            : 'Leave Details'
        }
        size="lg"
        footer={
          isMyTurnOnDetail ? (
            <>
              {detail?.hasAttachment && (
                <LeaveAttachmentButton
                  leaveRequestId={
                    detail.id
                  }
                  hasAttachment={
                    detail.hasAttachment
                  }
                  attachmentName={
                    detail.attachmentName
                  }
                />
              )}

              <Button
                variant="danger"
                disabled={
                  Boolean(
                    decisionAction
                  )
                }
                onClick={() =>
                  void takeAction(
                    'rejected'
                  )
                }
              >
                {decisionAction ===
                'rejected'
                  ? 'Rejecting...'
                  : 'Reject'}
              </Button>

              <Button
                variant="success"
                disabled={
                  Boolean(
                    decisionAction
                  )
                }
                onClick={() =>
                  void takeAction(
                    'approved'
                  )
                }
              >
                {decisionAction ===
                'approved'
                  ? 'Approving...'
                  : 'Approve'}
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4 text-sm">
            {decisionError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {
                  decisionError
                }
              </div>
            )}

            {employee &&
              isAdminOrManager && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Employee details
                  </h4>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Info
                      label="Division"
                      value={
                        employee.roleLabel ||
                        '—'
                      }
                    />
                    <Info
                      label="Department"
                      value={
                        employee.department ||
                        '—'
                      }
                    />
                    <Info
                      label="Designation"
                      value={
                        employee.designation ||
                        '—'
                      }
                    />
                    <Info
                      label="Grade"
                      value={
                        employee.grade ||
                        '—'
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {balances.map(
                      (
                        balance
                      ) => (
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
                            {
                              balance.used
                            }{' '}
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
              <Info
                label="Employee"
                value={
                  detail.employeeName
                }
              />
              <Info
                label="Department"
                value={
                  detail.department
                }
              />
              <Info
                label="Type"
                value={
                  detail.leaveType
                }
              />
              <Info
                label="Days requested"
                value={
                  detail.totalDaysRequested
                }
              />
              <Info
                label="Start"
                value={
                  formatDate(
                    detail.startDate
                  )
                }
              />
              <Info
                label="End"
                value={
                  formatDate(
                    detail.endDate
                  )
                }
              />
            </div>

            <div>
              <p className="text-gray-500">
                Reason
              </p>

              <p className="mt-1 text-gray-900">
                {
                  detail.reason
                }
              </p>
            </div>

            {detail.hasAttachment && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="mb-2 text-gray-500">
                  Attached document
                </p>

                <LeaveAttachmentButton
                  leaveRequestId={
                    detail.id
                  }
                  hasAttachment={
                    detail.hasAttachment
                  }
                  attachmentName={
                    detail.attachmentName
                  }
                />
              </div>
            )}

            {user.role ===
              'admin' &&
              !detail.isAdminOnlyDecision &&
              isMyTurnOnDetail &&
              currentTurnIdsOnDetail.length >
                0 && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Act on behalf of
                  </label>

                  <select
                    value={
                      adminTargetApproverId
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setAdminTargetApproverId(
                          event.target.value
                        )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm"
                  >
                    {currentTurnIdsOnDetail.map(
                      (
                        id
                      ) => {
                        const approver =
                          getUserById(
                            id
                          );

                        return (
                          <option
                            key={
                              id
                            }
                            value={
                              id
                            }
                          >
                            {approver?.fullName ||
                              'Unknown'}
                            {approver?.designation
                              ? ` — ${approver.designation}`
                              : ''}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              )}

            {tab ===
              'pending' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Comment
                </label>

                <textarea
                  value={
                    comment
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setComment(
                        event.target.value
                      )
                  }
                  rows={
                    2
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
                />
              </div>
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
                        key={
                          index
                        }
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

      <Modal
        open={
          Boolean(
            finalTarget &&
            finalAction
          )
        }
        onClose={
          closeFinalAction
        }
        title={
          finalAction ===
            'approve'
            ? 'Admin Approve Rejected Leave'
            : finalAction ===
                'reject'
              ? 'Admin Reject Approved Leave'
              : 'Admin Stop Approved Leave'
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                finalBusy
              }
              onClick={
                closeFinalAction
              }
            >
              Cancel
            </Button>

            <Button
              variant={
                finalAction ===
                  'approve'
                  ? 'success'
                  : 'danger'
              }
              disabled={
                finalBusy ||
                !finalReason.trim() ||
                (
                  finalAction ===
                    'stop' &&
                  !finalReturnDate
                )
              }
              onClick={() =>
                void submitFinalAction()
              }
            >
              {finalBusy
                ? 'Saving...'
                : finalAction ===
                    'approve'
                  ? 'Approve Leave'
                  : finalAction ===
                      'reject'
                    ? 'Reject Leave'
                    : 'Stop Leave'}
            </Button>
          </>
        }
      >
        {finalTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">
                {
                  finalTarget.employeeName
                }{' '}
                ·{' '}
                {
                  finalTarget.leaveType
                }
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Manager's original decision remains in approval history.
              </p>
            </div>

            {finalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {
                  finalError
                }
              </div>
            )}

            {finalAction ===
              'stop' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Return / Join Date
                </label>

                <input
                  type="date"
                  min={
                    finalTarget.startDate
                  }
                  max={
                    finalTarget.endDate
                  }
                  value={
                    finalReturnDate
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setFinalReturnDate(
                        event.target.value
                      )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mandatory reason
              </label>

              <textarea
                rows={
                  3
                }
                value={
                  finalReason
                }
                onChange={
                  (
                    event
                  ) =>
                    setFinalReason(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label:
    string;
  value:
    string | number;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">
        {
          label
        }
      </p>

      <p className="font-medium text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}
