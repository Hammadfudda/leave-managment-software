import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  Clock3,
  History,
  RotateCcw,
  Square,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  useAppData,
} from '../context/AppDataContext';

import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

import {
  formatDate,
} from '../utils/formatDate';

import {
  getApiErrorMessage,
} from '../services/api';

import type {
  LeaveRequest,
} from '../types';

type ActionMode =
  | 'extend'
  | 'stop'
  | null;

type ViewTab =
  | 'current'
  | 'history';

function dateOnly(
  value: string
) {
  return String(
    value ||
    ''
  ).split('T')[0];
}

function asDay(
  value:
    | string
    | Date
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function todayOnly() {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return today;
}

function addOneDay(
  value: string
) {
  const date =
    new Date(
      `${dateOnly(
        value
      )}T00:00:00`
    );

  date.setDate(
    date.getDate() +
      1
  );

  return date
    .toISOString()
    .split('T')[0];
}

function isOriginalLeave(
  leave:
    LeaveRequest
) {
  return (
    !leave.isExtension &&
    !leave.isStopRequest
  );
}

function isActiveToday(
  leave:
    LeaveRequest
) {
  if (
    !isOriginalLeave(
      leave
    ) ||
    leave.status !==
      'approved'
  ) {
    return false;
  }

  const start =
    asDay(
      leave.startDate
    );

  const end =
    asDay(
      leave.actualEndDate ||
        leave.endDate
    );

  const today =
    todayOnly();

  return Boolean(
    start &&
      end &&
      start <=
        today &&
      end >=
        today
  );
}

export default function LeaveHistory() {
  const {
    user,
  } = useAuth();

  const {
    leaveRequests,
    refreshLeaveRequests,
    extendLeave,
    requestStopLeave,
  } = useAppData();

  const [
    viewTab,
    setViewTab,
  ] = useState<ViewTab>(
    'current'
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    apiError,
    setApiError,
  ] = useState('');

  const [
    selected,
    setSelected,
  ] = useState<
    LeaveRequest | null
  >(null);

  const [
    actionMode,
    setActionMode,
  ] = useState<ActionMode>(
    null
  );

  const [
    actionDate,
    setActionDate,
  ] = useState('');

  const [
    reason,
    setReason,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setLoading(
          true
        );

        setApiError(
          ''
        );

        try {
          await refreshLeaveRequests();
        } catch (
          error
        ) {
          if (
            !cancelled
          ) {
            setApiError(
              getApiErrorMessage(
                error,
                'Unable to load your leave requests.'
              )
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    user?.id,
    refreshLeaveRequests,
  ]);

  const myLeaves =
    useMemo(() => {
      if (!user) {
        return [];
      }

      return leaveRequests
        .filter(
          (leave) =>
            String(
              leave.employeeId
            ) ===
            String(
              user.id
            )
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );
    }, [
      leaveRequests,
      user?.id,
    ]);

  /*
   * Keep original leave modification state separate:
   *
   * stopRequestedEver:
   *   preserves the old one-stop-request rule.
   *
   * stopBlocksExtend:
   *   pending or approved Stop request makes Extend unavailable.
   *   A rejected Stop request does not block Extend.
   */
  const modificationState =
    useMemo(() => {
      const byOriginal =
        new Map<
          string,
          {
            extended:
              boolean;
            stopRequestedEver:
              boolean;
            stopBlocksExtend:
              boolean;
            approvedStop:
              boolean;
          }
        >();

      for (
        const leave of
        myLeaves
      ) {
        if (
          !leave.originalRequestId
        ) {
          continue;
        }

        const key =
          String(
            leave.originalRequestId
          );

        const current =
          byOriginal.get(
            key
          ) || {
            extended:
              false,
            stopRequestedEver:
              false,
            stopBlocksExtend:
              false,
            approvedStop:
              false,
          };

        if (
          leave.isExtension
        ) {
          current.extended =
            true;
        }

        if (
          leave.isStopRequest
        ) {
          current.stopRequestedEver =
            true;

          if (
            leave.status ===
              'pending' ||
            leave.status ===
              'approved'
          ) {
            current.stopBlocksExtend =
              true;
          }

          if (
            leave.status ===
            'approved'
          ) {
            current.approvedStop =
              true;
          }
        }

        byOriginal.set(
          key,
          current
        );
      }

      return byOriginal;
    }, [myLeaves]);

  const currentLeaves =
    useMemo(
      () =>
        myLeaves.filter(
          isActiveToday
        ),
      [myLeaves]
    );

  /*
   * History intentionally shows ALL requests, including the current leave,
   * extensions and stop requests. This matches the requested "History mai
   * saara show ho" behavior.
   */
  const visibleLeaves =
    viewTab ===
    'current'
      ? currentLeaves
      : myLeaves;

  if (!user) {
    return null;
  }

  const closeAction =
    () => {
      if (
        submitting
      ) {
        return;
      }

      setSelected(
        null
      );
      setActionMode(
        null
      );
      setActionDate(
        ''
      );
      setReason('');
    };

  const openExtend = (
    leave:
      LeaveRequest
  ) => {
    setSelected(
      leave
    );
    setActionMode(
      'extend'
    );
    setActionDate(
      ''
    );
    setReason('');
    setApiError(
      ''
    );
  };

  const openStop = (
    leave:
      LeaveRequest
  ) => {
    setSelected(
      leave
    );
    setActionMode(
      'stop'
    );
    setActionDate(
      ''
    );
    setReason('');
    setApiError(
      ''
    );
  };

  const submitAction =
    async () => {
      if (
        !selected ||
        !actionMode ||
        !actionDate ||
        !reason.trim()
      ) {
        setApiError(
          'Please enter the required date and reason.'
        );
        return;
      }

      setSubmitting(
        true
      );
      setApiError('');

      try {
        if (
          actionMode ===
          'extend'
        ) {
          await extendLeave(
            selected,
            user,
            actionDate,
            reason.trim()
          );
        } else {
          await requestStopLeave(
            selected,
            user,
            actionDate,
            reason.trim()
          );
        }

        await refreshLeaveRequests();

        closeAction();
      } catch (
        error
      ) {
        setApiError(
          getApiErrorMessage(
            error,
            actionMode ===
              'extend'
              ? 'Unable to submit the extension request.'
              : 'Unable to submit the stop-leave request.'
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          My Leaves
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View your current active leave and complete leave history.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setViewTab(
              'current'
            )
          }
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewTab ===
            'current'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          <Clock3
            size={15}
          />
          Current
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              viewTab ===
              'current'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {
              currentLeaves.length
            }
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setViewTab(
              'history'
            )
          }
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewTab ===
            'history'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          <History
            size={15}
          />
          History
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              viewTab ===
              'history'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {
              myLeaves.length
            }
          </span>
        </button>
      </div>

      {apiError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiError}
        </div>
      )}

      {viewTab ===
        'current' &&
        !loading &&
        currentLeaves.length >
          0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
            You currently have an active approved leave. While this leave is active, a new normal leave request cannot be submitted.
          </div>
        )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
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
                  Reason
                </th>
                <th className="px-5 py-3 font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    Loading leave requests...
                  </td>
                </tr>
              )}

              {!loading &&
                visibleLeaves.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      {viewTab ===
                      'current'
                        ? 'You do not have an active leave today.'
                        : 'No leave requests yet.'}
                    </td>
                  </tr>
                )}

              {!loading &&
                visibleLeaves.map(
                  (
                    leave
                  ) => {
                    const isOriginal =
                      isOriginalLeave(
                        leave
                      );

                    const modifications =
                      modificationState.get(
                        String(
                          leave.id
                        )
                      );

                    const hasExtended =
                      Boolean(
                        modifications
                          ?.extended
                      );

                    const stopRequestedEver =
                      Boolean(
                        modifications
                          ?.stopRequestedEver
                      );

                    const stopBlocksExtend =
                      Boolean(
                        modifications
                          ?.stopBlocksExtend
                      );

                    const approvedStop =
                      Boolean(
                        modifications
                          ?.approvedStop
                      );

                    /*
                     * Extension / Stop actions only make sense while the
                     * original leave is actually active today.
                     */
                    const canModify =
                      isOriginal &&
                      leave.status ===
                        'approved' &&
                      isActiveToday(
                        leave
                      );

                    const extendDisabled =
                      hasExtended ||
                      stopBlocksExtend;

                    const extendTitle =
                      hasExtended
                        ? 'This leave has already been extended once.'
                        : approvedStop
                          ? 'This leave has been stopped. It can no longer be extended.'
                          : stopBlocksExtend
                            ? 'A stop-leave request is pending. Extension is unavailable.'
                            : 'Extend leave';

                    return (
                      <tr
                        key={
                          leave.id
                        }
                        className="hover:bg-gray-50/50"
                      >
                        <td className="px-5 py-3 capitalize text-gray-700">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>
                              {String(
                                leave.leaveType
                              ).replace(
                                /_/g,
                                ' '
                              )}
                            </span>

                            {leave.isExtension && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-indigo-700">
                                Extend
                              </span>
                            )}

                            {leave.isStopRequest && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-amber-700">
                                Stop
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {formatDate(
                            leave.startDate
                          )}{' '}
                          →{' '}
                          {formatDate(
                            leave.actualEndDate ||
                              leave.endDate
                          )}
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {leave.isStopRequest
                            ? '—'
                            : leave.daysUsedBeforeCancel ??
                              leave.totalWorkingDays ??
                              leave.totalDaysRequested}
                        </td>

                        <td className="px-5 py-3">
                          <StatusBadge
                            status={
                              leave.status
                            }
                          />
                        </td>

                        <td className="max-w-[280px] px-5 py-3 text-gray-600">
                          <span className="line-clamp-2">
                            {leave.reason ||
                              '—'}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          {canModify ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openExtend(
                                    leave
                                  )
                                }
                                disabled={
                                  extendDisabled
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                                title={
                                  extendTitle
                                }
                              >
                                <RotateCcw
                                  size={
                                    13
                                  }
                                />

                                {hasExtended
                                  ? 'Extended'
                                  : stopBlocksExtend
                                    ? 'Extend unavailable'
                                    : 'Extend'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openStop(
                                    leave
                                  )
                                }
                                disabled={
                                  stopRequestedEver
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                                title={
                                  stopRequestedEver
                                    ? 'A stop request has already been submitted for this leave.'
                                    : 'Stop leave early'
                                }
                              >
                                <Square
                                  size={
                                    13
                                  }
                                />

                                {stopRequestedEver
                                  ? approvedStop
                                    ? 'Stopped'
                                    : 'Stop requested'
                                  : 'Stop'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-blue-700">
        Current shows only the original approved leave that is active today. History shows all leave, extension and stop requests. A pending or approved Stop request prevents extension of that leave.
      </div>

      <Modal
        open={Boolean(
          selected &&
            actionMode
        )}
        onClose={
          closeAction
        }
        title={
          actionMode ===
          'extend'
            ? 'Extend Leave'
            : 'Stop Leave Early'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={
                closeAction
              }
              disabled={
                submitting
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                submitAction
              }
              loading={
                submitting
              }
              loadingText="Submitting..."
            >
              {actionMode ===
              'extend'
                ? 'Submit Extension'
                : 'Submit Stop Request'}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-medium capitalize text-gray-900">
                {String(
                  selected.leaveType
                ).replace(
                  /_/g,
                  ' '
                )}{' '}
                leave
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarDays
                  size={
                    14
                  }
                />

                {formatDate(
                  selected.startDate
                )}{' '}
                →{' '}
                {formatDate(
                  selected.actualEndDate ||
                    selected.endDate
                )}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {actionMode ===
                'extend'
                  ? 'New end date'
                  : 'Return date'}
              </label>

              <input
                type="date"
                disabled={
                  submitting
                }
                value={
                  actionDate
                }
                min={
                  actionMode ===
                  'extend'
                    ? addOneDay(
                        selected.actualEndDate ||
                          selected.endDate
                      )
                    : dateOnly(
                        selected.startDate
                      )
                }
                max={
                  actionMode ===
                  'stop'
                    ? dateOnly(
                        selected.actualEndDate ||
                          selected.endDate
                      )
                    : undefined
                }
                onChange={(
                  event
                ) =>
                  setActionDate(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400"
              />

              {actionMode ===
                'stop' && (
                <p className="mt-1 text-xs text-gray-400">
                  Choose a date within the current leave period. The return date must be before the current end date.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason
              </label>

              <textarea
                value={
                  reason
                }
                disabled={
                  submitting
                }
                onChange={(
                  event
                ) =>
                  setReason(
                    event
                      .target
                      .value
                  )
                }
                rows={3}
                placeholder={
                  actionMode ===
                  'extend'
                    ? 'Why do you need to extend this leave?'
                    : 'Why are you returning early?'
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {actionMode ===
              'extend' && (
              <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
                <Clock3
                  size={
                    14
                  }
                  className="mt-0.5 shrink-0"
                />
                The extension will be sent through the configured approval route.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
