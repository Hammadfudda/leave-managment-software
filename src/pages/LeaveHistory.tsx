import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { formatDate } from '../utils/formatDate';
import {
  CheckCircle2,
  XCircle,
  Circle,
  FileText,
} from 'lucide-react';

import type {
  LeaveStatus,
  LeaveRequest,
} from '../types';

import {
  openLeaveAttachment,
} from '../services/leaveRequests';

export default function LeaveHistory() {
  const { user } = useAuth();

  const {
    leaveRequests,
    getUserById,
    extendLeave,
    requestStopLeave,
  } = useAppData();

  const [
    filter,
    setFilter,
  ] = useState<
    LeaveStatus | 'all'
  >('all');

  const [
    detailId,
    setDetailId,
  ] = useState<
    string | null
  >(null);

  const [
    actionForm,
    setActionForm,
  ] = useState<{
    type:
      | 'extend'
      | 'stop';
    request:
      LeaveRequest;
  } | null>(null);

  const [
    formDate,
    setFormDate,
  ] = useState('');

  const [
    formReason,
    setFormReason,
  ] = useState('');

  /*
  |--------------------------------------------------------------------------
  | PRIVATE ATTACHMENT STATE
  |--------------------------------------------------------------------------
  */

  const [
    attachmentLoading,
    setAttachmentLoading,
  ] = useState(false);

  const [
    attachmentError,
    setAttachmentError,
  ] = useState<
    string | null
  >(null);

  if (!user) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | EMPLOYEE LEAVES
  |--------------------------------------------------------------------------
  */

  const myLeaves =
    leaveRequests.filter(
      (leave) =>
        leave.employeeId ===
        user.id
    );

  const filtered =
    filter === 'all'
      ? myLeaves
      : myLeaves.filter(
          (leave) =>
            leave.status ===
            filter
        );

  /*
   * Derived directly from current
   * leaveRequests so details always
   * stay up to date.
   */
  const detail =
    detailId
      ? leaveRequests.find(
          (leave) =>
            leave.id ===
            detailId
        ) || null
      : null;

  const filters: {
    value:
      | LeaveStatus
      | 'all';

    label: string;
  }[] = [
    {
      value: 'all',
      label: 'All',
    },
    {
      value: 'pending',
      label: 'Pending',
    },
    {
      value: 'approved',
      label: 'Approved',
    },
    {
      value: 'rejected',
      label: 'Rejected',
    },
    {
      value: 'cancelled',
      label: 'Cancelled',
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | EXTEND / STOP
  |--------------------------------------------------------------------------
  */

  const openExtend = (
    request: LeaveRequest
  ) => {
    setFormDate('');
    setFormReason('');

    setActionForm({
      type: 'extend',
      request,
    });
  };

  const openStop = (
    request: LeaveRequest
  ) => {
    setFormDate('');
    setFormReason('');

    setActionForm({
      type: 'stop',
      request,
    });
  };

  const closeActionForm =
    () => {
      setActionForm(null);
      setFormDate('');
      setFormReason('');
    };

  const handleSubmitExtend =
    () => {
      if (
        !actionForm ||
        !user ||
        !formDate ||
        !formReason.trim()
      ) {
        return;
      }

      extendLeave(
        actionForm.request,
        user,
        formDate,
        formReason.trim(),
        true
      );

      closeActionForm();
    };

  const handleSubmitStop =
    () => {
      if (
        !actionForm ||
        !user ||
        !formDate ||
        !formReason.trim()
      ) {
        return;
      }

      requestStopLeave(
        actionForm.request,
        user,
        formDate,
        formReason.trim()
      );

      closeActionForm();
    };

  /*
  |--------------------------------------------------------------------------
  | PRIVATE CLOUDINARY DOCUMENT
  |--------------------------------------------------------------------------
  */

  const handleViewAttachment =
    async () => {
      if (!detail) {
        return;
      }

      try {
        setAttachmentLoading(
          true
        );

        setAttachmentError(
          null
        );

        /*
         * This does NOT directly
         * open a permanent
         * Cloudinary URL.
         *
         * Backend checks ownership
         * first and then returns
         * temporary signed URL.
         */
        await openLeaveAttachment(
          detail.id
        );
      } catch (
        error: any
      ) {
        const message =
          error?.response
            ?.data
            ?.message ||
          error?.response
            ?.data
            ?.error ||
          'Unable to open the attached document.';

        setAttachmentError(
          message
        );
      } finally {
        setAttachmentLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | OPEN DETAILS
  |--------------------------------------------------------------------------
  */

  const openDetails = (
    id: string
  ) => {
    setAttachmentError(
      null
    );

    setDetailId(id);
  };

  const closeDetails =
    () => {
      setDetailId(null);

      setAttachmentError(
        null
      );
    };

  return (
    <div className="space-y-6">
      {/* =========================================
          HEADER
      ========================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            My Leaves
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track all your
            leave requests.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map(
            (item) => {
              const count =
                item.value ===
                'all'
                  ? myLeaves.length
                  : myLeaves.filter(
                      (
                        leave
                      ) =>
                        leave.status ===
                        item.value
                    ).length;

              return (
                <button
                  key={
                    item.value
                  }
                  onClick={() =>
                    setFilter(
                      item.value
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter ===
                    item.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {
                    item.label
                  }{' '}
                  ({count})
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* =========================================
          TABLE
      ========================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Type
                </th>

                <th className="px-5 py-3 font-medium">
                  Start
                </th>

                <th className="px-5 py-3 font-medium">
                  End
                </th>

                <th className="px-5 py-3 font-medium">
                  Days
                </th>

                <th className="px-5 py-3 font-medium">
                  Status
                </th>

                <th className="px-5 py-3 font-medium">
                  Document
                </th>

                <th className="px-5 py-3 font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filtered.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      7
                    }
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    No leave
                    requests
                    found.
                  </td>
                </tr>
              )}

              {filtered.map(
                (leave) => (
                  <tr
                    key={
                      leave.id
                    }
                    className="animate-fade-in hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 capitalize text-gray-900">
                      {
                        leave.leaveType
                      }

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
                      )}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {formatDate(
                        leave.actualEndDate ||
                          leave.endDate
                      )}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {leave.daysUsedBeforeCancel !=
                      null
                        ? `${leave.daysUsedBeforeCancel} / ${leave.totalDaysRequested}`
                        : leave.totalDaysRequested}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          leave.status
                        }
                      />
                    </td>

                    {/* DOCUMENT INDICATOR */}

                    <td className="px-5 py-3">
                      {leave.hasAttachment ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                          <FileText
                            size={
                              15
                            }
                          />

                          <span>
                            Attached
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() =>
                            openDetails(
                              leave.id
                            )
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View
                        </button>

                        {leave.status ===
                          'approved' &&
                          !leave.isExtension &&
                          !leave.isStopRequest && (
                            <>
                              <button
                                onClick={() =>
                                  openExtend(
                                    leave
                                  )
                                }
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                Extend
                              </button>

                              <button
                                onClick={() =>
                                  openStop(
                                    leave
                                  )
                                }
                                className="text-sm font-medium text-amber-600 hover:text-amber-700"
                              >
                                Stop
                              </button>
                            </>
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

      {/* =========================================
          LEAVE DETAILS MODAL
      ========================================== */}

      <Modal
        open={
          !!detail &&
          !actionForm
        }
        onClose={
          closeDetails
        }
        title="Leave Request Details"
        size="md"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">
                  Type
                </p>

                <p className="font-medium capitalize text-gray-900">
                  {
                    detail.leaveType
                  }

                  {detail.isExtension && (
                    <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-indigo-700">
                      Extend
                    </span>
                  )}

                  {detail.isStopRequest && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-amber-700">
                      Stop
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Status
                </p>

                <StatusBadge
                  status={
                    detail.status
                  }
                />
              </div>

              <div>
                <p className="text-gray-500">
                  Start date
                </p>

                <p className="font-medium text-gray-900">
                  {formatDate(
                    detail.startDate
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  End date
                </p>

                <p className="font-medium text-gray-900">
                  {formatDate(
                    detail.actualEndDate ||
                      detail.endDate
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Total days
                  requested
                </p>

                <p className="font-medium text-gray-900">
                  {
                    detail.totalDaysRequested
                  }
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Days counted
                </p>

                <p className="font-medium text-gray-900">
                  {detail.daysUsedBeforeCancel ??
                    detail.totalWorkingDays}
                </p>
              </div>
            </div>

            {/* REASON */}

            <div>
              <p className="text-gray-500">
                Reason
              </p>

              <p className="mt-1 text-gray-900">
                {detail.reason}
              </p>
            </div>

            {/* =====================================
                PRIVATE CLOUDINARY ATTACHMENT
            ====================================== */}

            {detail.hasAttachment && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                      <FileText
                        size={20}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Supporting
                        Document
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {detail.attachmentName ||
                          'Attached document'}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-500">
                        Private
                        attachment
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={
                      handleViewAttachment
                    }
                    disabled={
                      attachmentLoading
                    }
                  >
                    {attachmentLoading
                      ? 'Opening...'
                      : 'View Document'}
                  </Button>
                </div>
              </div>
            )}

            {/* =====================================
                APPROVER CHAIN
            ====================================== */}

            {detail.requiredApproverIds &&
              detail
                .requiredApproverIds
                .length >
                0 && (
                <div>
                  <p className="mb-2 text-gray-500">
                    Approvers
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {detail.requiredApproverIds.map(
                      (
                        id,
                        index
                      ) => {
                        const approver =
                          getUserById(
                            id
                          );

                        const isApproved =
                          detail.approvedByIds?.includes(
                            id
                          );

                        const isRejected =
                          detail.rejectedByIds?.includes(
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

                                {approver?.designation ? (
                                  <span className="opacity-60">
                                    {' '}
                                    —{' '}
                                    {
                                      approver.designation
                                    }
                                  </span>
                                ) : null}
                              </span>
                            </div>

                            {index <
                              detail
                                .requiredApproverIds!
                                .length -
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
                </div>
              )}

            {/* =====================================
                APPROVAL HISTORY
            ====================================== */}

            <div>
              <p className="text-gray-500">
                Approval notes
              </p>

              <div className="mt-2 space-y-2">
                {detail
                  .approvalHistory
                  .length ===
                  0 && (
                  <p className="text-gray-400">
                    No approvals
                    yet.
                  </p>
                )}

                {detail.approvalHistory.map(
                  (
                    history,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <p className="font-medium text-gray-900">
                        {
                          history.approverName
                        }{' '}

                        <span className="text-xs font-normal text-gray-500">
                          (
                          {
                            history.approverRole
                          }
                          )
                        </span>
                      </p>

                      <p className="text-xs text-gray-500">
                        {
                          history.action
                        }{' '}
                        on{' '}
                        {formatDate(
                          history.actionDate
                        )}{' '}

                        {history.comment &&
                          `— "${history.comment}"`}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================
          EXTEND / STOP MODAL
      ========================================== */}

      <Modal
        open={
          !!actionForm
        }
        onClose={
          closeActionForm
        }
        title={
          actionForm?.type ===
          'extend'
            ? 'Request Leave Extension'
            : 'Request to Stop Leave Early'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={
                closeActionForm
              }
            >
              Cancel
            </Button>

            {actionForm?.type ===
            'extend' ? (
              <Button
                onClick={
                  handleSubmitExtend
                }
                disabled={
                  !formDate ||
                  !formReason.trim()
                }
              >
                Submit
                Extension
                Request
              </Button>
            ) : (
              <Button
                onClick={
                  handleSubmitStop
                }
                disabled={
                  !formDate ||
                  !formReason.trim()
                }
              >
                Submit Stop
                Request
              </Button>
            )}
          </>
        }
      >
        {actionForm?.type ===
          'extend' && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Requesting an
              extension to your{' '}
              {
                actionForm
                  .request
                  .leaveType
              }{' '}
              leave, currently
              approved through{' '}

              <span className="font-medium">
                {formatDate(
                  actionForm
                    .request
                    .endDate
                )}
              </span>
              .
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Extend until
              </label>

              <input
                type="date"
                value={
                  formDate
                }
                onChange={(
                  event
                ) =>
                  setFormDate(
                    event.target
                      .value
                  )
                }
                min={
                  actionForm
                    .request
                    .endDate
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason
              </label>

              <textarea
                value={
                  formReason
                }
                onChange={(
                  event
                ) =>
                  setFormReason(
                    event.target
                      .value
                  )
                }
                rows={3}
                placeholder="Why do you need to extend this leave?"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>
          </div>
        )}

        {actionForm?.type ===
          'stop' && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Your{' '}
              {
                actionForm
                  .request
                  .leaveType
              }{' '}
              leave runs{' '}

              <span className="font-medium">
                {formatDate(
                  actionForm
                    .request
                    .startDate
                )}{' '}
                to{' '}
                {formatDate(
                  actionForm
                    .request
                    .endDate
                )}
              </span>
              . Pick the date
              you actually want
              to return.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Returning on
              </label>

              <input
                type="date"
                value={
                  formDate
                }
                onChange={(
                  event
                ) =>
                  setFormDate(
                    event.target
                      .value
                  )
                }
                min={
                  actionForm
                    .request
                    .startDate
                }
                max={
                  actionForm
                    .request
                    .endDate
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <p className="mt-1 text-xs text-gray-400">
                Choose any date
                between the
                leave's start (
                {formatDate(
                  actionForm
                    .request
                    .startDate
                )}
                ) and its
                original end
                date (
                {formatDate(
                  actionForm
                    .request
                    .endDate
                )}
                ).
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason
              </label>

              <textarea
                value={
                  formReason
                }
                onChange={(
                  event
                ) =>
                  setFormReason(
                    event.target
                      .value
                  )
                }
                rows={3}
                placeholder="Why are you ending this leave early?"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================
          DOCUMENT ERROR POPUP
      ========================================== */}

      <Modal
        open={
          !!attachmentError
        }
        onClose={() =>
          setAttachmentError(
            null
          )
        }
        title="Unable to Open Document"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setAttachmentError(
                null
              )
            }
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {
            attachmentError
          }
        </p>
      </Modal>
    </div>
  );
}