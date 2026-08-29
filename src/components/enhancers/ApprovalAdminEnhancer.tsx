import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  useLocation,
} from 'react-router-dom';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useAppData,
} from '../../context/AppDataContext';

import Modal from '../ui/Modal';
import Button from '../ui/Button';

import {
  formatDate,
} from '../../utils/formatDate';

import {
  getApiErrorMessage,
} from '../../services/api';

import {
  adminOverrideFinalDecision,
  adminStopApprovedLeave,
} from '../../services/leaveApprovalActions';

import type {
  LeaveRequest,
} from '../../types';

type Mode =
  | 'override'
  | 'stop'
  | null;

type ActionMount = {
  request:
    LeaveRequest;
  element:
    HTMLElement;
};

function normalizeText(
  value:
    string
) {
  return value
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
    .toLowerCase();
}

function parseLocalDate(
  value:
    string
) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function isActiveApprovedLeave(
  request:
    LeaveRequest
) {
  if (
    request.status !==
    'approved'
  ) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const start =
    parseLocalDate(
      request.startDate
    );

  const end =
    parseLocalDate(
      request.actualEndDate ||
      request.endDate
    );

  return (
    today >=
      start &&
    today <=
      end
  );
}

function requestSignature(
  request:
    LeaveRequest
) {
  return normalizeText(
    [
      request.employeeName,
      request.leaveType,
      formatDate(
        request.startDate
      ),
      formatDate(
        request.endDate
      ),
    ].join(
      ' '
    )
  );
}

function findCardCandidates(
  request:
    LeaveRequest
) {
  const employeeToken =
    normalizeText(
      request.employeeName
    );

  const leaveToken =
    normalizeText(
      request.leaveType
    );

  const startToken =
    normalizeText(
      formatDate(
        request.startDate
      )
    );

  const endToken =
    normalizeText(
      formatDate(
        request.endDate
      )
    );

  const all =
    Array.from(
      document.querySelectorAll(
        'main div'
      )
    ) as HTMLElement[];

  const matches =
    all.filter(
      (
        element
      ) => {
        if (
          element.hasAttribute(
            'data-admin-request-actions'
          )
        ) {
          return false;
        }

        const text =
          normalizeText(
            element.textContent ||
            ''
          );

        return (
          text.includes(
            employeeToken
          ) &&
          text.includes(
            leaveToken
          ) &&
          text.includes(
            startToken
          ) &&
          text.includes(
            endToken
          )
        );
      }
    );

  /*
   * The card itself is normally the smallest matching container.
   * Sorting by text length prevents attaching controls to the whole page.
   */
  matches.sort(
    (
      a,
      b
    ) =>
      (
        a.textContent
          ?.length ||
        0
      ) -
      (
        b.textContent
          ?.length ||
        0
      )
  );

  return matches.filter(
    (
      element
    ) => {
      const classes =
        String(
          element.className ||
          ''
        );

      return (
        classes.includes(
          'rounded'
        ) ||
        classes.includes(
          'border'
        )
      );
    }
  );
}

export default function ApprovalAdminEnhancer() {
  const location =
    useLocation();

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
    mounts,
    setMounts,
  ] =
    useState<
      ActionMount[]
    >([]);

  const [
    selected,
    setSelected,
  ] =
    useState<
      LeaveRequest | null
    >(null);

  const [
    mode,
    setMode,
  ] =
    useState<Mode>(
      null
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
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState('');

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

  /*
   * Attach Admin controls DIRECTLY to the existing finalized leave cards.
   * This avoids a second duplicate table and keeps the action next to the
   * Manager's original request/decision.
   */
  useEffect(
    () => {
      if (
        location.pathname !==
          '/approvals' ||
        user?.role !==
          'admin'
      ) {
        setMounts(
          []
        );

        return;
      }

      let disposed =
        false;

      let lastMountKey =
        '';

      const scan =
        () => {
          if (
            disposed
          ) {
            return;
          }

          const next:
            ActionMount[] =
            [];

          const usedElements =
            new Set<
              HTMLElement
            >();

          const groupedBySignature =
            new Map<
              string,
              LeaveRequest[]
            >();

          for (
            const request
            of finalized
          ) {
            const signature =
              requestSignature(
                request
              );

            const group =
              groupedBySignature.get(
                signature
              ) ||
              [];

            group.push(
              request
            );

            groupedBySignature.set(
              signature,
              group
            );
          }

          for (
            const requests
            of groupedBySignature.values()
          ) {
            const candidates =
              findCardCandidates(
                requests[0]
              );

            let candidateIndex =
              0;

            for (
              const request
              of requests
            ) {
              while (
                candidates[
                  candidateIndex
                ] &&
                usedElements.has(
                  candidates[
                    candidateIndex
                  ]
                )
              ) {
                candidateIndex +=
                  1;
              }

              const card =
                candidates[
                  candidateIndex
                ];

              if (!card) {
                continue;
              }

              usedElements.add(
                card
              );

              candidateIndex +=
                1;

              let host =
                card.querySelector(
                  `[data-admin-request-actions="${request.id}"]`
                ) as
                  | HTMLElement
                  | null;

              if (!host) {
                host =
                  document.createElement(
                    'div'
                  );

                host.setAttribute(
                  'data-admin-request-actions',
                  request.id
                );

                host.className =
                  'mt-3 border-t border-gray-100 pt-3';

                card.appendChild(
                  host
                );
              }

              next.push({
                request,
                element:
                  host,
              });
            }
          }

          const mountKey =
            next
              .map(
                (
                  item
                ) =>
                  item.request.id
              )
              .join(
                '|'
              );

          if (
            mountKey !==
            lastMountKey
          ) {
            lastMountKey =
              mountKey;

            setMounts(
              next
            );
          }
        };

      const observer =
        new MutationObserver(
          scan
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

      scan();

      return () => {
        disposed =
          true;

        observer.disconnect();

        document
          .querySelectorAll(
            '[data-admin-request-actions]'
          )
          .forEach(
            (
              node
            ) =>
              node.remove()
          );

        setMounts(
          []
        );
      };
    },
    [
      finalized,
      location.pathname,
      user?.role,
    ]
  );

  if (
    location.pathname !==
      '/approvals' ||
    user?.role !==
      'admin'
  ) {
    return null;
  }

  const openOverride =
    (
      request:
        LeaveRequest
    ) => {
      setSelected(
        request
      );

      setMode(
        'override'
      );

      setReason(
        ''
      );

      setReturnDate(
        ''
      );

      setError(
        ''
      );
    };

  const openStop =
    (
      request:
        LeaveRequest
    ) => {
      setSelected(
        request
      );

      setMode(
        'stop'
      );

      setReason(
        ''
      );

      setReturnDate(
        ''
      );

      setError(
        ''
      );
    };

  const close =
    () => {
      if (
        busy
      ) {
        return;
      }

      setSelected(
        null
      );

      setMode(
        null
      );

      setReason(
        ''
      );

      setReturnDate(
        ''
      );

      setError(
        ''
      );
    };

  const confirmOverride =
    async () => {
      if (
        !selected ||
        !reason.trim()
      ) {
        setError(
          'Admin override reason is required.'
        );

        return;
      }

      const nextStatus =
        selected.status ===
        'approved'
          ? 'rejected'
          : 'approved';

      setBusy(
        true
      );

      setError(
        ''
      );

      try {
        await adminOverrideFinalDecision(
          selected.id,
          nextStatus,
          reason.trim()
        );

        await refreshLeaveRequests();

        setSelected(
          null
        );

        setMode(
          null
        );

        setReason(
          ''
        );
      } catch (
        requestError
      ) {
        setError(
          getApiErrorMessage(
            requestError,
            'Unable to override this finalized leave decision.'
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  const confirmStop =
    async () => {
      if (
        !selected ||
        !returnDate ||
        !reason.trim()
      ) {
        setError(
          'Return / Join Date and reason are required.'
        );

        return;
      }

      setBusy(
        true
      );

      setError(
        ''
      );

      try {
        await adminStopApprovedLeave(
          selected.id,
          returnDate,
          reason.trim()
        );

        await refreshLeaveRequests();

        setSelected(
          null
        );

        setMode(
          null
        );

        setReturnDate(
          ''
        );

        setReason(
          ''
        );
      } catch (
        requestError
      ) {
        setError(
          getApiErrorMessage(
            requestError,
            'Unable to stop this approved leave.'
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  return (
    <>
      {mounts.map(
        ({
          request,
          element,
        }) =>
          createPortal(
            <div
              key={
                request.id
              }
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-xs font-medium text-gray-500">
                Admin final decision
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openOverride(
                      request
                    )
                  }
                  className={
                    request.status ===
                    'approved'
                      ? 'rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100'
                      : 'rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
                  }
                >
                  {request.status ===
                  'approved'
                    ? 'Reject'
                    : 'Approve'}
                </button>

                {isActiveApprovedLeave(
                  request
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      openStop(
                        request
                      )
                    }
                    className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
                  >
                    Stop Leave
                  </button>
                )}
              </div>
            </div>,
            element,
            request.id
          )
      )}

      <Modal
        open={
          !!selected &&
          mode ===
            'override'
        }
        onClose={
          close
        }
        title={
          selected?.status ===
          'approved'
            ? 'Admin Reject Approved Leave'
            : 'Admin Approve Rejected Leave'
        }
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                busy
              }
              onClick={
                close
              }
            >
              Cancel
            </Button>

            <Button
              variant={
                selected?.status ===
                'approved'
                  ? 'danger'
                  : 'success'
              }
              disabled={
                busy ||
                !reason.trim()
              }
              onClick={() =>
                void confirmOverride()
              }
            >
              {busy
                ? 'Saving...'
                : selected?.status ===
                    'approved'
                  ? 'Reject Leave'
                  : 'Approve Leave'}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-medium text-gray-900">
                {
                  selected.employeeName
                }{' '}
                ·{' '}
                {
                  selected.leaveType
                }
              </p>

              <p className="mt-1 text-xs text-gray-500">
                The Manager's original decision stays in approval history.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {
                  error
                }
              </div>
            )}

            <div>
              <label className="mb-1.5 block font-medium text-gray-700">
                Mandatory reason
              </label>

              <textarea
                rows={
                  3
                }
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={
          !!selected &&
          mode ===
            'stop'
        }
        onClose={
          close
        }
        title="Admin Stop Approved Leave"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                busy
              }
              onClick={
                close
              }
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              disabled={
                busy ||
                !returnDate ||
                !reason.trim()
              }
              onClick={() =>
                void confirmStop()
              }
            >
              {busy
                ? 'Stopping...'
                : 'Stop Leave'}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
              Return / Join Date is the first day back at work. Unused working
              days will be restored automatically.
            </p>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {
                  error
                }
              </div>
            )}

            <div>
              <label className="mb-1.5 block font-medium text-gray-700">
                Return / Join Date
              </label>

              <input
                type="date"
                min={
                  selected.startDate
                }
                max={
                  selected.endDate
                }
                value={
                  returnDate
                }
                onChange={
                  (
                    event
                  ) =>
                    setReturnDate(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-medium text-gray-700">
                Mandatory reason
              </label>

              <textarea
                rows={
                  3
                }
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
