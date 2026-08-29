import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useAppData,
} from '../../context/AppDataContext';

import {
  getApiErrorMessage,
} from '../../services/api';

import {
  adminOverrideFinalDecision,
  adminStopApprovedLeave,
} from '../../services/leaveApprovalActions';

type Action =
  | 'approved'
  | 'rejected';

export default function ApprovalAdminEnhancer() {
  const {
    user,
  } =
    useAuth();

  const {
    leaveRequests,
    refreshLeaveRequests,
  } =
    useAppData();

  const [
    mount,
    setMount,
  ] =
    useState<HTMLElement | null>(
      null
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState('');

  const [
    action,
    setAction,
  ] =
    useState<Action | ''>(
      ''
    );

  const [
    reason,
    setReason,
  ] =
    useState('');

  const [
    returnDate,
    setReturnDate,
  ] =
    useState('');

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  useEffect(
    () => {
      if (
        window.location.pathname !==
          '/approvals' ||
        user?.role !==
          'admin'
      ) {
        return;
      }

      let host:
        HTMLDivElement | null =
        null;

      const install =
        () => {
          if (
            host?.isConnected
          ) {
            return;
          }

          const pageRoot =
            document.querySelector(
              'main .mx-auto.max-w-7xl'
            );

          if (!pageRoot) {
            return;
          }

          host =
            document.createElement(
              'div'
            );

          host.setAttribute(
            'data-admin-final-controls',
            'true'
          );

          pageRoot.appendChild(
            host
          );

          setMount(
            host
          );
        };

      const observer =
        new MutationObserver(
          install
        );

      observer.observe(
        document.body,
        {
          childList:
            true,
          subtree:
            true,
        }
      );

      install();

      return () => {
        observer.disconnect();
        host?.remove();
        setMount(
          null
        );
      };
    },
    [
      user?.role,
    ]
  );

  const finalized =
    useMemo(
      () =>
        leaveRequests.filter(
          (
            request
          ) =>
            !request.isStopRequest &&
            (
              request.status ===
                'approved' ||
              request.status ===
                'rejected'
            )
        ),
      [
        leaveRequests,
      ]
    );

  const selected =
    finalized.find(
      (
        request
      ) =>
        request.id ===
        selectedId
    );

  if (
    !mount ||
    user?.role !==
      'admin'
  ) {
    return null;
  }

  const saveOverride =
    async () => {
      if (
        !selected ||
        !action ||
        !reason.trim()
      ) {
        setMessage(
          'Select a finalized request, choose the new decision and enter a reason.'
        );

        return;
      }

      setBusy(
        true
      );

      setMessage(
        ''
      );

      try {
        await adminOverrideFinalDecision(
          selected.id,
          action,
          reason
        );

        await refreshLeaveRequests();

        setMessage(
          'Final decision overridden. Original Manager history is preserved.'
        );

        setAction(
          ''
        );

        setReason(
          ''
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to override this decision.'
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  const saveStop =
    async () => {
      if (
        !selected ||
        selected.status !==
          'approved' ||
        !returnDate ||
        !reason.trim()
      ) {
        setMessage(
          'Select an approved leave and enter Effective Return / Join Date plus a reason.'
        );

        return;
      }

      setBusy(
        true
      );

      setMessage(
        ''
      );

      try {
        await adminStopApprovedLeave(
          selected.id,
          returnDate,
          reason
        );

        await refreshLeaveRequests();

        setMessage(
          'Approved leave stopped and unused working days restored.'
        );

        setReturnDate(
          ''
        );

        setReason(
          ''
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to stop this leave.'
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  return createPortal(
    <section className="mt-8 space-y-4 border-t border-gray-200 pt-7">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Admin Final Decision Controls
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Existing approval flow stays unchanged. These controls append a separate Admin action after a request has been finalized.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-2">
          <select
            value={
              selectedId
            }
            onChange={
              (
                event
              ) => {
                setSelectedId(
                  event.target.value
                );

                setAction(
                  ''
                );

                setReturnDate(
                  ''
                );

                setReason(
                  ''
                );
              }
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">
              Select finalized leave
            </option>

            {finalized.map(
              (
                request
              ) => (
                <option
                  key={
                    request.id
                  }
                  value={
                    request.id
                  }
                >
                  {request.employeeName} · {request.leaveType} · {request.status}
                </option>
              )
            )}
          </select>

          <textarea
            value={
              reason
            }
            onChange={
              (
                event
              ) =>
                setReason(
                  event.target.value
                )
            }
            rows={
              2
            }
            placeholder="Mandatory reason"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {selected && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Override Final Decision
              </p>

              <select
                value={
                  action
                }
                onChange={
                  (
                    event
                  ) =>
                    setAction(
                      event.target.value as
                        Action |
                        ''
                    )
                }
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">
                  Select new decision
                </option>

                {selected.status !==
                  'approved' && (
                  <option value="approved">
                    Approved
                  </option>
                )}

                {selected.status !==
                  'rejected' && (
                  <option value="rejected">
                    Rejected
                  </option>
                )}
              </select>

              <button
                type="button"
                disabled={
                  busy ||
                  !action
                }
                onClick={() =>
                  void saveOverride()
                }
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirm Override
              </button>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Stop Approved Leave
              </p>

              <input
                type="date"
                disabled={
                  selected.status !==
                  'approved'
                }
                value={
                  returnDate
                }
                min={
                  selected.startDate
                }
                max={
                  selected.endDate
                }
                onChange={
                  (
                    event
                  ) =>
                    setReturnDate(
                      event.target.value
                    )
                }
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
              />

              <button
                type="button"
                disabled={
                  busy ||
                  selected.status !==
                    'approved' ||
                  !returnDate
                }
                onClick={() =>
                  void saveStop()
                }
                className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirm Stop Leave
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {message}
          </div>
        )}
      </div>
    </section>,
    mount
  );
}
