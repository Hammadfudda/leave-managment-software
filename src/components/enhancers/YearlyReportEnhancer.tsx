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
  exportYearlyLeaveReport,
  getYearlyLeaveReport,
  type YearlyLeaveSnapshot,
} from '../../services/yearlyReports';

import {
  getApiErrorMessage,
} from '../../services/api';

interface EmployeeYearGroup {
  key: string;
  employeeName: string;
  employeeCode: string;
  division: string;
  department: string;
  designation: string;
  grade: string;
  rows: YearlyLeaveSnapshot[];
  totalGranted: number;
  totalUsed: number;
  totalRemaining: number;
}

export default function YearlyReportEnhancer() {
  const location =
    useLocation();

  const [
    mount,
    setMount,
  ] =
    useState<HTMLElement | null>(
      null
    );

  const [
    year,
    setYear,
  ] =
    useState(
      new Date().getFullYear()
    );

  const [
    rows,
    setRows,
  ] =
    useState<YearlyLeaveSnapshot[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(
    () => {
      if (
        location.pathname !==
        '/approvals'
      ) {
        setMount(
          null
        );

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
            'data-yearly-report',
            'true'
          );

          /*
           * Put yearly reporting at the TOP of Approvals. Audit Logs stays focused on
           * audit events only.
           */
          pageRoot.prepend(
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
      location.pathname,
    ]
  );

  useEffect(
    () => {
      if (!mount) {
        return;
      }

      let active =
        true;

      setLoading(
        true
      );

      setError(
        ''
      );

      void getYearlyLeaveReport(
        year
      )
        .then(
          (
            nextRows
          ) => {
            if (
              active
            ) {
              setRows(
                nextRows
              );
            }
          }
        )
        .catch(
          (
            requestError
          ) => {
            if (
              active
            ) {
              setRows(
                []
              );

              setError(
                getApiErrorMessage(
                  requestError,
                  'Unable to load yearly leave report.'
                )
              );
            }
          }
        )
        .finally(
          () => {
            if (
              active
            ) {
              setLoading(
                false
              );
            }
          }
        );

      return () => {
        active =
          false;
      };
    },
    [
      mount,
      year,
    ]
  );

  const groups =
    useMemo<
      EmployeeYearGroup[]
    >(
      () => {
        const byEmployee =
          new Map<
            string,
            EmployeeYearGroup
          >();

        for (
          const row
          of rows
        ) {
          const key =
            row.employeeId ||
            row.employeeCode ||
            row.employeeName;

          let group =
            byEmployee.get(
              key
            );

          if (!group) {
            group = {
              key,
              employeeName:
                row.employeeName,
              employeeCode:
                row.employeeCode,
              division:
                row.division,
              department:
                row.department,
              designation:
                row.designation,
              grade:
                row.grade,
              rows:
                [],
              totalGranted:
                0,
              totalUsed:
                0,
              totalRemaining:
                0,
            };

            byEmployee.set(
              key,
              group
            );
          }

          group.rows.push(
            row
          );

          group.totalGranted +=
            Number(
              row.granted ||
              0
            );

          group.totalUsed +=
            Number(
              row.used ||
              0
            );

          group.totalRemaining +=
            Number(
              row.remaining ||
              0
            );
        }

        return Array.from(
          byEmployee.values()
        ).sort(
          (
            a,
            b
          ) =>
            a.employeeName.localeCompare(
              b.employeeName
            )
        );
      },
      [
        rows,
      ]
    );

  if (!mount) {
    return null;
  }

  const years =
    Array.from(
      {
        length:
          8,
      },
      (
        _,
        index
      ) =>
        new Date().getFullYear() -
        5 +
        index
    );

  return createPortal(
    <section className="mb-8 space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Historical Yearly Leave Report
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select a leave year to see each employee's preserved Division,
              Department, Designation, Grade and leave-wise Granted / Used /
              Remaining balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={
                year
              }
              onChange={
                (
                  event
                ) =>
                  setYear(
                    Number(
                      event.target.value
                    )
                  )
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {years.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {
                      item
                    }
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void exportYearlyLeaveReport(
                  year
                )
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {
              error
            }
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-400 shadow-sm">
          Loading yearly report...
        </div>
      )}

      {!loading &&
        !error &&
        groups.length ===
          0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-400 shadow-sm">
            No preserved snapshot data is available for {year}.
          </div>
        )}

      {!loading &&
        groups.map(
          (
            group
          ) => (
            <article
              key={
                group.key
              }
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {
                        group.employeeName
                      }
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      ID: {group.employeeCode || '—'} · Division:{' '}
                      {group.division || '—'} · Department:{' '}
                      {group.department || '—'}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Designation: {group.designation || '—'} · Grade:{' '}
                      {group.grade || '—'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700">
                      Granted {group.totalGranted}
                    </span>

                    <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                      Used {group.totalUsed}
                    </span>

                    <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                      Remaining {group.totalRemaining}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                {group.rows.map(
                  (
                    row
                  ) => (
                    <div
                      key={`${group.key}-${row.leaveType}`}
                      className="rounded-xl border border-gray-100 p-4"
                    >
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {
                          row.leaveType.replace(
                            /_/g,
                            ' '
                          )
                        }
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-blue-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-blue-500">
                            Granted
                          </p>

                          <p className="mt-1 text-base font-semibold text-blue-700">
                            {
                              row.granted
                            }
                          </p>
                        </div>

                        <div className="rounded-lg bg-amber-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-amber-500">
                            Used
                          </p>

                          <p className="mt-1 text-base font-semibold text-amber-700">
                            {
                              row.used
                            }
                          </p>
                        </div>

                        <div className="rounded-lg bg-emerald-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-emerald-500">
                            Left
                          </p>

                          <p className="mt-1 text-base font-semibold text-emerald-700">
                            {
                              row.remaining
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </article>
          )
        )}
    </section>,
    mount
  );
}
