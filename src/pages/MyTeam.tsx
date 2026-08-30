import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Briefcase,
  Building2,
  CheckCircle2,
  Circle,
  Users,
  XCircle,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  useAppData,
} from '../context/AppDataContext';

import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import LeaveAttachmentButton from '../components/leave/LeaveAttachmentButton';

import {
  getEmployeeLeaveBalance,
} from '../services/leaveBalances';

import {
  approveLeaveRequest,
  rejectLeaveRequest,
  actOnBehalfOfApprover,
  adminOverrideFinalDecision,
  adminStopApprovedLeave,
} from '../services/leaveApprovalActions';

import {
  getApiErrorMessage,
} from '../services/api';

import {
  formatDate,
} from '../utils/formatDate';

import type {
  LeaveBalance,
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

export default function MyTeam() {
  const {
    user,
  } =
    useAuth();

  const {
    users,
    grades,
    departments,
    leaveRequests,
    getUserById,
    refreshEmployees,
    refreshLeaveRequests,
  } =
    useAppData();

  const isAdmin =
    user?.role ===
    'admin';

  const [
    departmentFilter,
    setDepartmentFilter,
  ] =
    useState(
      'All Departments'
    );

  const [
    selectedManagerId,
    setSelectedManagerId,
  ] =
    useState('');

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      | 'team'
      | 'requests'
    >(
      'team'
    );

  const [
    requestStatusFilter,
    setRequestStatusFilter,
  ] =
    useState<
      | 'all'
      | 'pending'
      | 'approved'
      | 'rejected'
    >(
      'all'
    );

  const [
    requestSearchQuery,
    setRequestSearchQuery,
  ] =
    useState('');

  const [
    teamBalances,
    setTeamBalances,
  ] =
    useState<
      Record<
        string,
        LeaveBalance[]
      >
    >({});

  const [
    balancesLoading,
    setBalancesLoading,
  ] =
    useState(false);

  const [
    balancesError,
    setBalancesError,
  ] =
    useState('');

  const [
    actionRequestId,
    setActionRequestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    rejectRequestId,
    setRejectRequestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    adminRejectTargetApproverId,
    setAdminRejectTargetApproverId,
  ] =
    useState<string | null>(
      null
    );

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState('');

  const [
    actionError,
    setActionError,
  ] =
    useState('');

  const [
    actionSuccess,
    setActionSuccess,
  ] =
    useState('');

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

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
    manageDecisionTarget,
    setManageDecisionTarget,
  ] =
    useState<LeaveRequest | null>(
      null
    );

  useEffect(
    () => {
      if (
        !user
      ) {
        return;
      }

      if (
        user.role !==
        'admin'
      ) {
        setSelectedManagerId(
          user.id
        );
      }
    },
    [
      user?.id,
      user?.role,
    ]
  );

  useEffect(
    () => {
      if (
        !user
      ) {
        return;
      }

      const loadPage =
        async () => {
          try {
            await Promise.all([
              refreshEmployees(),
              refreshLeaveRequests(),
            ]);
          } catch (
            error
          ) {
            console.error(
              'Unable to load team data:',
              error
            );
          }
        };

      void loadPage();
    },
    [
      user?.id,
      refreshEmployees,
      refreshLeaveRequests,
    ]
  );

  const allManagers =
    useMemo(
      () =>
        users.filter(
          (
            candidate
          ) =>
            candidate.role ===
              'manager' &&
            candidate.status ===
              'active'
        ),
      [
        users,
      ]
    );

  const managers =
    useMemo(
      () =>
        departmentFilter ===
        'All Departments'
          ? allManagers
          : allManagers.filter(
              (
                manager
              ) =>
                manager.department ===
                departmentFilter
            ),
      [
        allManagers,
        departmentFilter,
      ]
    );

  const activeManagerId =
    isAdmin
      ? selectedManagerId
      : user?.id ||
        '';

  const team =
    useMemo(
      () =>
        users.filter(
          (
            candidate
          ) =>
            candidate.managerId ===
              activeManagerId &&
            candidate.status ===
              'active'
        ),
      [
        users,
        activeManagerId,
      ]
    );

  useEffect(
    () => {
      if (
        !user ||
        !activeManagerId
      ) {
        setTeamBalances(
          {}
        );

        return;
      }

      let cancelled =
        false;

      const loadBalances =
        async () => {
          setBalancesLoading(
            true
          );

          setBalancesError(
            ''
          );

          try {
            const entries =
              await Promise.all(
                team.map(
                  async (
                    member
                  ) => {
                    const balances =
                      await getEmployeeLeaveBalance(
                        member.id
                      );

                    return [
                      member.id,
                      balances,
                    ] as const;
                  }
                )
              );

            if (
              !cancelled
            ) {
              setTeamBalances(
                Object.fromEntries(
                  entries
                )
              );
            }
          } catch (
            error
          ) {
            console.error(
              'Unable to load team leave balances:',
              error
            );

            if (
              !cancelled
            ) {
              setBalancesError(
                'Unable to load leave balances from the database.'
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setBalancesLoading(
                false
              );
            }
          }
        };

      void loadBalances();

      return () => {
        cancelled =
          true;
      };
    },
    [
      user?.id,
      activeManagerId,
      team,
    ]
  );

  const teamIds =
    useMemo(
      () =>
        team.map(
          (
            member
          ) =>
            member.id
        ),
      [
        team,
      ]
    );

  const teamRequests =
    useMemo(
      () => {
        const idSet =
          new Set(
            teamIds
          );

        return leaveRequests
          .filter(
            (
              request
            ) =>
              idSet.has(
                request.employeeId
              )
          )
          .filter(
            (
              request
            ) =>
              request.status ===
                'pending' ||
              request.status ===
                'approved' ||
              request.status ===
                'rejected'
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          );
      },
      [
        leaveRequests,
        teamIds,
      ]
    );

  const pendingCount =
    useMemo(
      () =>
        teamRequests.filter(
          (
            request
          ) =>
            request.status ===
            'pending'
        ).length,
      [
        teamRequests,
      ]
    );

  const filteredTeamRequests =
    useMemo(
      () =>
        teamRequests.filter(
          (
            request
          ) => {
            if (
              requestStatusFilter !==
                'all' &&
              request.status !==
                requestStatusFilter
            ) {
              return false;
            }

            if (
              requestSearchQuery.trim()
            ) {
              const employee =
                getUserById(
                  request.employeeId
                );

              const query =
                requestSearchQuery
                  .trim()
                  .toLowerCase();

              if (
                !employee?.fullName
                  .toLowerCase()
                  .includes(
                    query
                  ) &&
                !request.leaveType
                  .toLowerCase()
                  .includes(
                    query
                  )
              ) {
                return false;
              }
            }

            return true;
          }
        ),
      [
        teamRequests,
        requestStatusFilter,
        requestSearchQuery,
        getUserById,
      ]
    );

  if (
    !user
  ) {
    return null;
  }

  const handleApprove =
    async (
      requestId:
        string
    ) => {
      if (
        actionLoading
      ) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setActionRequestId(
          requestId
        );

        setActionError(
          ''
        );

        await approveLeaveRequest(
          requestId
        );

        await refreshLeaveRequests();

        setActionSuccess(
          'Leave request approved successfully.'
        );
      } catch (
        error:
          any
      ) {
        setActionError(
          error?.response?.data
            ?.message ||
          error?.message ||
          'Unable to approve this leave request.'
        );
      } finally {
        setActionLoading(
          false
        );

        setActionRequestId(
          null
        );
      }
    };

  const openRejectModal =
    (
      requestId:
        string,
      adminTargetApproverId?:
        string
    ) => {
      setRejectRequestId(
        requestId
      );

      setAdminRejectTargetApproverId(
        adminTargetApproverId ||
          null
      );

      setRejectionReason(
        ''
      );

      setActionError(
        ''
      );
    };

  const closeRejectModal =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setRejectRequestId(
        null
      );

      setAdminRejectTargetApproverId(
        null
      );

      setRejectionReason(
        ''
      );
    };

  const handleRejectSubmit =
    async () => {
      if (
        !rejectRequestId ||
        actionLoading
      ) {
        return;
      }

      const comment =
        rejectionReason.trim();

      if (
        !comment
      ) {
        setActionError(
          'Please enter a reason for rejection.'
        );

        return;
      }

      try {
        setActionLoading(
          true
        );

        setActionRequestId(
          rejectRequestId
        );

        setActionError(
          ''
        );

        if (
          adminRejectTargetApproverId
        ) {
          await actOnBehalfOfApprover(
            rejectRequestId,
            adminRejectTargetApproverId,
            'rejected',
            comment
          );
        } else {
          await rejectLeaveRequest(
            rejectRequestId,
            comment
          );
        }

        await refreshLeaveRequests();

        setRejectRequestId(
          null
        );

        setAdminRejectTargetApproverId(
          null
        );

        setRejectionReason(
          ''
        );

        setActionSuccess(
          'Leave request rejected successfully.'
        );
      } catch (
        error:
          any
      ) {
        setActionError(
          error?.response?.data
            ?.message ||
          error?.message ||
          'Unable to reject this leave request.'
        );
      } finally {
        setActionLoading(
          false
        );

        setActionRequestId(
          null
        );
      }
    };

  const handleActOnBehalf =
    async (
      requestId:
        string,
      targetApproverId:
        string,
      action:
        | 'approved'
        | 'rejected'
    ) => {
      if (
        actionLoading
      ) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setActionRequestId(
          requestId
        );

        setActionError(
          ''
        );

        await actOnBehalfOfApprover(
          requestId,
          targetApproverId,
          action
        );

        await refreshLeaveRequests();

        setActionSuccess(
          action ===
            'approved'
            ? 'Leave request approved successfully.'
            : 'Leave request rejected successfully.'
        );
      } catch (
        error:
          any
      ) {
        setActionError(
          error?.response?.data
            ?.message ||
          error?.message ||
          'Unable to update this leave request.'
        );
      } finally {
        setActionLoading(
          false
        );

        setActionRequestId(
          null
        );
      }
    };

  const openManageDecision =
    (
      request:
        LeaveRequest
    ) => {
      setManageDecisionTarget(
        request
      );

      setFinalError(
        ''
      );
    };

  const closeManageDecision =
    () => {
      if (
        finalBusy
      ) {
        return;
      }

      setManageDecisionTarget(
        null
      );
    };

  const openFinalAction =
    (
      request:
        LeaveRequest,
      action:
        Exclude<
          FinalAction,
          null
        >
    ) => {
      setManageDecisionTarget(
        null
      );

      setFinalTarget(
        request
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

        setActionSuccess(
          finalAction ===
            'stop'
            ? 'Approved leave stopped successfully.'
            : 'Final leave decision updated successfully.'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isAdmin
            ? 'Managers'
            : 'My Team'}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {isAdmin
            ? 'Browse all managers, then select one to view their team.'
            : 'People reporting to you, their database leave balances, and leave requests.'}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Filter by Department
            </label>

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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {managers.length ===
          0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
              No managers found for this filter.
            </div>
          ) : (
            <div
              className={
                selectedManagerId
                  ? 'flex w-full flex-nowrap gap-3 overflow-x-auto pb-3 pr-2'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
              }
            >
              {managers.map(
                (
                  manager
                ) => {
                  const isSelected =
                    manager.id ===
                    activeManagerId;

                  const reportsCount =
                    users.filter(
                      (
                        candidate
                      ) =>
                        candidate.managerId ===
                          manager.id &&
                        candidate.status ===
                          'active'
                    ).length;

                  return (
                    <button
                      key={
                        manager.id
                      }
                      type="button"
                      onClick={() => {
                        setSelectedManagerId(
                          manager.id
                        );

                        setActiveTab(
                          'team'
                        );
                      }}
                      className={`rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                        selectedManagerId
                          ? 'w-[280px] min-w-[280px] shrink-0 '
                          : ''
                      }${
                        isSelected
                          ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-100'
                          : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <Users
                            size={
                              18
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-gray-900">
                            {
                              manager.fullName
                            }
                          </h3>

                          <Badge variant="blue">
                            Manager
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p className="flex items-center gap-1.5">
                          <Briefcase
                            size={
                              12
                            }
                          />

                          {
                            manager.designation
                          }
                        </p>

                        <p className="flex items-center gap-1.5">
                          <Building2
                            size={
                              12
                            }
                          />

                          {
                            manager.department
                          }
                        </p>

                        <p className="text-gray-400">
                          {
                            reportsCount
                          }{' '}
                          report
                          {reportsCount !==
                          1
                            ? 's'
                            : ''}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </>
      )}

      {(
        !isAdmin ||
        selectedManagerId
      ) && (
        <>
          <div className="flex gap-1.5 border-b border-gray-100">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'team'
                )
              }
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab ===
                'team'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Team
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'requests'
                )
              }
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab ===
                'requests'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Leave Requests

              {pendingCount >
                0 && (
                <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                  {
                    pendingCount
                  }
                </span>
              )}
            </button>
          </div>

          {team.length ===
          0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
              {isAdmin
                ? 'This manager has no one assigned to them yet.'
                : 'No one is currently assigned to you as their manager.'}
            </div>
          ) : (
            <>
              {activeTab ===
                'team' && (
                <>
                  {balancesError && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {
                        balancesError
                      }
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {team.map(
                      (
                        member
                      ) => {
                        const balances =
                          teamBalances[
                            member.id
                          ] ||
                          [];

                        const grade =
                          grades.find(
                            (
                              candidate
                            ) =>
                              candidate.name ===
                              member.grade
                          );

                        return (
                          <div
                            key={
                              member.id
                            }
                            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                  <Users
                                    size={
                                      18
                                    }
                                  />
                                </div>

                                <div>
                                  <h3 className="text-sm font-semibold text-gray-900">
                                    {
                                      member.fullName
                                    }
                                  </h3>

                                  <p className="text-xs text-gray-500">
                                    {
                                      member.designation
                                    }{' '}
                                    ·{' '}
                                    {
                                      member.department
                                    }
                                  </p>
                                </div>
                              </div>

                              {grade && (
                                <Badge variant="teal">
                                  {
                                    grade.name
                                  }
                                </Badge>
                              )}
                            </div>

                            <div className="mt-4 space-y-2">
                              {balancesLoading &&
                                balances.length ===
                                  0 && (
                                  <p className="text-xs text-gray-400">
                                    Loading leave balances...
                                  </p>
                                )}

                              {!balancesLoading &&
                                balances.length ===
                                  0 && (
                                  <p className="text-xs text-amber-600">
                                    No balance records returned. Check that this employee has a valid Grade assigned.
                                  </p>
                                )}

                              {balances.map(
                                (
                                  balance
                                ) => (
                                  <div
                                    key={
                                      balance.leaveType
                                    }
                                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                                  >
                                    <span className="font-medium capitalize text-gray-700">
                                      {String(
                                        balance.leaveType
                                      ).replace(
                                        /_/g,
                                        ' '
                                      )}
                                    </span>

                                    <span className="text-gray-500">
                                      Granted:{' '}
                                      <span className="font-semibold text-gray-800">
                                        {
                                          balance.quota
                                        }
                                      </span>
                                      {' · '}
                                      Used:{' '}
                                      <span className="font-semibold text-gray-800">
                                        {
                                          balance.used
                                        }
                                      </span>
                                      {' · '}
                                      Remaining:{' '}
                                      <span className="font-semibold text-emerald-700">
                                        {
                                          balance.remaining
                                        }
                                      </span>
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              )}

              {activeTab ===
                'requests' && (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="flex gap-1.5">
                      {(
                        [
                          'all',
                          'pending',
                          'approved',
                          'rejected',
                        ] as const
                      ).map(
                        (
                          status
                        ) => {
                          const count =
                            status ===
                            'all'
                              ? teamRequests.length
                              : teamRequests.filter(
                                  (
                                    request
                                  ) =>
                                    request.status ===
                                    status
                                ).length;

                          return (
                            <button
                              key={
                                status
                              }
                              type="button"
                              onClick={() =>
                                setRequestStatusFilter(
                                  status
                                )
                              }
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                                requestStatusFilter ===
                                status
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {
                                status
                              }{' '}
                              (
                              {
                                count
                              }
                              )
                            </button>
                          );
                        }
                      )}
                    </div>

                    <input
                      value={
                        requestSearchQuery
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setRequestSearchQuery(
                            event.target.value
                          )
                      }
                      placeholder="Search by employee name or leave type..."
                      className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {filteredTeamRequests.length ===
                  0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
                      No leave requests match this filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTeamRequests.map(
                        (
                          request
                        ) => {
                          const employee =
                            getUserById(
                              request.employeeId
                            );

                          const required =
                            request.requiredApproverIds ||
                            [];

                          const approved =
                            request.approvedByIds ||
                            [];

                          const rejected =
                            request.rejectedByIds ||
                            [];

                          const currentTurnIds =
                            getCurrentTurnApproverIds(
                              request
                            );

                          const isManagersTurn =
                            !isAdmin &&
                            currentTurnIds.includes(
                              user.id
                            );

                          const conflictDetected =
                            request.status ===
                              'pending' &&
                            required.length >
                              1 &&
                            approved.includes(
                              required[0]
                            ) &&
                            required
                              .slice(
                                1
                              )
                              .some(
                                (
                                  id
                                ) =>
                                  rejected.includes(
                                    id
                                  )
                              );

                          return (
                            <div
                              key={
                                request.id
                              }
                              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {employee?.fullName ||
                                      'Unknown'}{' '}
                                    —{' '}
                                    <span className="capitalize">
                                      {
                                        request.leaveType
                                      }
                                    </span>{' '}
                                    leave

                                    {request.isExtension && (
                                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-indigo-700">
                                        Extend
                                        {request.isPaidOverride ===
                                        false
                                          ? ' · Unpaid'
                                          : ''}
                                      </span>
                                    )}

                                    {request.isStopRequest && (
                                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-700">
                                        Stop
                                      </span>
                                    )}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    {formatDate(
                                      request.startDate
                                    )}{' '}
                                    to{' '}
                                    {formatDate(
                                      request.endDate
                                    )}{' '}
                                    ·{' '}
                                    {
                                      request.totalWorkingDays
                                    }{' '}
                                    working day(s)
                                  </p>
                                </div>

                                <Badge
                                  variant={
                                    request.status ===
                                    'approved'
                                      ? 'teal'
                                      : request.status ===
                                          'rejected'
                                        ? 'rose'
                                        : conflictDetected
                                          ? 'orange'
                                          : 'gray'
                                  }
                                >
                                  {conflictDetected
                                    ? 'Conflict — needs Admin'
                                    : request.status}
                                </Badge>
                              </div>

                              <p className="mt-2 text-xs text-gray-600">
                                <span className="text-gray-400">
                                  Reason:
                                </span>{' '}
                                {
                                  request.reason
                                }
                              </p>

                              {request.hasAttachment && (
                                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                  <p className="mb-2 text-xs font-medium text-gray-500">
                                    Attached document
                                  </p>

                                  <LeaveAttachmentButton
                                    leaveRequestId={
                                      request.id
                                    }
                                    hasAttachment={
                                      request.hasAttachment
                                    }
                                    attachmentName={
                                      request.attachmentName
                                    }
                                  />
                                </div>
                              )}

                              {required.length >
                                0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {required.map(
                                    (
                                      id,
                                      index
                                    ) => {
                                      const approver =
                                        getUserById(
                                          id
                                        );

                                      const isApproved =
                                        approved.includes(
                                          id
                                        );

                                      const isRejected =
                                        rejected.includes(
                                          id
                                        );

                                      return (
                                        <div
                                          key={
                                            id
                                          }
                                          className="flex items-center gap-2"
                                        >
                                          <div
                                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                                              isApproved
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : isRejected
                                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                  : 'border-gray-200 bg-gray-50 text-gray-500'
                                            }`}
                                          >
                                            {isApproved ? (
                                              <CheckCircle2
                                                size={
                                                  13
                                                }
                                              />
                                            ) : isRejected ? (
                                              <XCircle
                                                size={
                                                  13
                                                }
                                              />
                                            ) : (
                                              <Circle
                                                size={
                                                  13
                                                }
                                              />
                                            )}

                                            <span>
                                              {approver?.fullName ||
                                                'Unknown'}
                                              {approver?.designation
                                                ? ` — ${approver.designation}`
                                                : ''}
                                            </span>
                                          </div>

                                          {index <
                                            required.length -
                                              1 && (
                                            <span className="text-gray-300">
                                              →
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}

                              {isManagersTurn && (
                                <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                                  <button
                                    type="button"
                                    disabled={
                                      actionLoading &&
                                      actionRequestId ===
                                        request.id
                                    }
                                    onClick={() =>
                                      void handleApprove(
                                        request.id
                                      )
                                    }
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {actionLoading &&
                                    actionRequestId ===
                                      request.id
                                      ? 'Approving...'
                                      : 'Approve'}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      actionLoading &&
                                      actionRequestId ===
                                        request.id
                                    }
                                    onClick={() =>
                                      openRejectModal(
                                        request.id
                                      )
                                    }
                                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}

                              {isAdmin &&
                                request.status ===
                                  'pending' &&
                                currentTurnIds.length >
                                  0 && (
                                  <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                                    {currentTurnIds.map(
                                      (
                                        id
                                      ) => {
                                        const person =
                                          getUserById(
                                            id
                                          );

                                        return (
                                          <div
                                            key={
                                              id
                                            }
                                            className="flex items-center gap-2"
                                          >
                                            <span className="text-xs text-gray-500">
                                              On behalf of{' '}
                                              {
                                                person?.fullName
                                              }
                                              {person?.designation
                                                ? ` (${person.designation})`
                                                : ''}
                                              :
                                            </span>

                                            <button
                                              type="button"
                                              disabled={
                                                actionLoading &&
                                                actionRequestId ===
                                                  request.id
                                              }
                                              onClick={() =>
                                                void handleActOnBehalf(
                                                  request.id,
                                                  id,
                                                  'approved'
                                                )
                                              }
                                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              {actionLoading &&
                                              actionRequestId ===
                                                request.id
                                                ? 'Approving...'
                                                : 'Approve'}
                                            </button>

                                            <button
                                              type="button"
                                              disabled={
                                                actionLoading &&
                                                actionRequestId ===
                                                  request.id
                                              }
                                              onClick={() =>
                                                openRejectModal(
                                                  request.id,
                                                  id
                                                )
                                              }
                                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                )}

                              {isAdmin &&
                                !request.isStopRequest &&
                                (
                                  request.status ===
                                    'approved' ||
                                  request.status ===
                                    'rejected'
                                ) && (
                                  <div className="mt-3 border-t border-gray-50 pt-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openManageDecision(
                                          request
                                        )
                                      }
                                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100"
                                    >
                                      Manage Decision
                                    </button>
                                  </div>
                                )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      <Modal
        open={
          Boolean(
            manageDecisionTarget
          )
        }
        onClose={
          closeManageDecision
        }
        title="Manage Final Decision"
        size="sm"
        footer={
          <Button
            variant="secondary"
            onClick={
              closeManageDecision
            }
          >
            Close
          </Button>
        }
      >
        {manageDecisionTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">
                {
                  manageDecisionTarget.employeeName
                }{' '}
                ·{' '}
                {
                  manageDecisionTarget.leaveType
                }
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Current status:{' '}
                <span className="font-semibold capitalize">
                  {
                    manageDecisionTarget.status
                  }
                </span>
              </p>
            </div>

            <p className="text-xs leading-5 text-gray-500">
              The Manager's original decision is preserved in approval history.
              Admin action creates a new audited final decision.
            </p>

            <div className="flex flex-wrap gap-2">
              {manageDecisionTarget.status ===
                'approved' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      openFinalAction(
                        manageDecisionTarget,
                        'reject'
                      )
                    }
                    className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
                  >
                    Reject Leave
                  </button>

                  {!manageDecisionTarget.cancelledBy &&
                    !manageDecisionTarget.actualEndDate && (
                      <button
                        type="button"
                        onClick={() =>
                          openFinalAction(
                            manageDecisionTarget,
                            'stop'
                          )
                        }
                        className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
                      >
                        Stop Leave
                      </button>
                    )}
                </>
              )}

              {manageDecisionTarget.status ===
                'rejected' && (
                <button
                  type="button"
                  onClick={() =>
                    openFinalAction(
                      manageDecisionTarget,
                      'approve'
                    )
                  }
                  className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                >
                  Approve Leave
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={
          Boolean(
            rejectRequestId
          )
        }
        onClose={
          closeRejectModal
        }
        title="Reject Leave Request"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                actionLoading
              }
              onClick={
                closeRejectModal
              }
            >
              Cancel
            </Button>

            <button
              type="button"
              disabled={
                actionLoading ||
                !rejectionReason.trim()
              }
              onClick={() =>
                void handleRejectSubmit()
              }
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading
                ? 'Rejecting...'
                : 'Reject Leave'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {adminRejectTargetApproverId
              ? 'Enter the reason for rejecting this leave request on behalf of the selected approver.'
              : 'Enter the reason for rejecting this leave request.'}
          </p>

          <textarea
            value={
              rejectionReason
            }
            onChange={
              (
                event
              ) => {
                setRejectionReason(
                  event.target.value
                );

                if (
                  actionError
                ) {
                  setActionError(
                    ''
                  );
                }
              }
            }
            rows={
              4
            }
            autoFocus
            placeholder="Reason for rejection..."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          {actionError && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {
                actionError
              }
            </div>
          )}
        </div>
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
        size="sm"
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
                The Manager's original decision remains in approval history.
              </p>
            </div>

            {finalError && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
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

      <Modal
        open={
          Boolean(
            actionError
          ) &&
          !rejectRequestId &&
          !finalTarget
        }
        onClose={() =>
          setActionError(
            ''
          )
        }
        title="Action Failed"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setActionError(
                ''
              )
            }
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {
            actionError
          }
        </p>
      </Modal>

      <Modal
        open={
          Boolean(
            actionSuccess
          )
        }
        onClose={() =>
          setActionSuccess(
            ''
          )
        }
        title="Leave Request Updated"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setActionSuccess(
                ''
              )
            }
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {
            actionSuccess
          }
        </p>
      </Modal>
    </div>
  );
}
