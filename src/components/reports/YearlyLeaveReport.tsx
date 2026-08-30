import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAppData,
} from '../../context/AppDataContext';

import {
  getYearlyLeaveReport,
  type YearlyLeaveSnapshot,
} from '../../services/yearlyReports';

import api, {
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
  managerId: string;
  managerName: string;
  rows: YearlyLeaveSnapshot[];
  totalGranted: number;
  totalUsed: number;
  totalRemaining: number;
}

export default function YearlyLeaveReport() {
  const {
    users,
  } =
    useAppData();

  const currentYear =
    new Date().getFullYear();

  const [
    year,
    setYear,
  ] =
    useState(
      currentYear
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
    managerFilter,
    setManagerFilter,
  ] =
    useState('');

  const [
    employeeFilter,
    setEmployeeFilter,
  ] =
    useState('');


  const [
    departmentDivisionByName,
    setDepartmentDivisionByName,
  ] =
    useState<
      Record<string, string>
    >({});

  useEffect(
    () => {
      let active =
        true;

      void api
        .get(
          '/departments'
        )
        .then(
          (
            response
          ) => {
            if (
              !active
            ) {
              return;
            }

            setDepartmentDivisionByName(
              Object.fromEntries(
                (
                  response.data?.data ||
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
          }
        )
        .catch(
          (
            hierarchyError
          ) => {
            console.warn(
              'Unable to load Department → Division fallback for yearly report.',
              hierarchyError
            );
          }
        );

      return () => {
        active =
          false;
      };
    },
    []
  );

  useEffect(
    () => {
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
      year,
    ]
  );

  useEffect(
    () => {
      setDivisionFilter(
        ''
      );
      setDepartmentFilter(
        ''
      );
      setManagerFilter(
        ''
      );
      setEmployeeFilter(
        ''
      );
    },
    [
      year,
    ]
  );

  const groups =
    useMemo<
      EmployeeYearGroup[]
    >(
      () => {
        const map =
          new Map<
            string,
            EmployeeYearGroup
          >();

        for (
          const row
          of rows
        ) {
          const employee =
            users.find(
              (
                candidate
              ) =>
                (
                  row.employeeId &&
                  candidate.id ===
                    row.employeeId
                ) ||
                (
                  row.employeeCode &&
                  candidate.employeeId ===
                    row.employeeCode
                )
            );

          const manager =
            employee?.managerId
              ? users.find(
                  (
                    candidate
                  ) =>
                    candidate.id ===
                    employee.managerId
                )
              : undefined;

          const key =
            row.employeeId ||
            row.employeeCode ||
            row.employeeName;

          let group =
            map.get(
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
                row.division ||
                (
                  year ===
                  currentYear
                    ? employee?.roleLabel ||
                      departmentDivisionByName[
                        row.department
                      ] ||
                      ''
                    : ''
                ),
              department:
                row.department,
              designation:
                row.designation,
              grade:
                row.grade,
              managerId:
                manager?.id ||
                '',
              managerName:
                manager?.fullName ||
                'Unassigned',
              rows:
                [],
              totalGranted:
                0,
              totalUsed:
                0,
              totalRemaining:
                0,
            };

            map.set(
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
          map.values()
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
        users,
        year,
        currentYear,
        departmentDivisionByName,
      ]
    );

  const divisions =
    useMemo(
      () =>
        Array.from(
          new Set(
            groups
              .map(
                (
                  group
                ) =>
                  group.division
              )
              .filter(
                Boolean
              )
          )
        ).sort(),
      [
        groups,
      ]
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            groups
              .filter(
                (
                  group
                ) =>
                  group.division ===
                  divisionFilter
              )
              .map(
                (
                  group
                ) =>
                  group.department
              )
              .filter(
                Boolean
              )
          )
        ).sort(),
      [
        groups,
        divisionFilter,
      ]
    );

  const managers =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            string
          >();

        for (
          const group
          of groups
        ) {
          if (
            group.division !==
              divisionFilter ||
            group.department !==
              departmentFilter ||
            !group.managerId
          ) {
            continue;
          }

          map.set(
            group.managerId,
            group.managerName
          );
        }

        return Array.from(
          map.entries()
        ).sort(
          (
            a,
            b
          ) =>
            a[1].localeCompare(
              b[1]
            )
        );
      },
      [
        groups,
        divisionFilter,
        departmentFilter,
      ]
    );

  const employees =
    useMemo(
      () =>
        groups.filter(
          (
            group
          ) =>
            group.division ===
              divisionFilter &&
            group.department ===
              departmentFilter &&
            group.managerId ===
              managerFilter
        ),
      [
        groups,
        divisionFilter,
        departmentFilter,
        managerFilter,
      ]
    );

  const selectedGroups =
    useMemo(
      () => {
        if (
          !divisionFilter ||
          !departmentFilter ||
          !managerFilter ||
          !employeeFilter
        ) {
          return [];
        }

        return groups.filter(
          (
            group
          ) =>
            group.division ===
              divisionFilter &&
            group.department ===
              departmentFilter &&
            group.managerId ===
              managerFilter &&
            group.key ===
              employeeFilter
        );
      },
      [
        groups,
        divisionFilter,
        departmentFilter,
        managerFilter,
        employeeFilter,
      ]
    );

  const exportYearCsv =
    () => {
      if (
        groups.length ===
        0
      ) {
        return;
      }

      /*
       * Screen stays intentionally filtered.
       * Export is year-wide and includes every employee/leave row,
       * ordered Division -> Department -> Manager -> Employee -> Leave Type.
       */
      const exportGroups =
        [...groups].sort(
          (
            a,
            b
          ) =>
            a.division.localeCompare(
              b.division
            ) ||
            a.department.localeCompare(
              b.department
            ) ||
            a.managerName.localeCompare(
              b.managerName
            ) ||
            a.employeeName.localeCompare(
              b.employeeName
            )
        );

      const csvRows = [
        [
          'Year',
          'Employee',
          'Employee ID',
          'Division',
          'Department',
          'Manager',
          'Designation',
          'Grade',
          'Leave Type',
          'Granted',
          'Used',
          'Remaining',
        ],
        ...exportGroups.flatMap(
          (
            group
          ) =>
            [...group.rows]
              .sort(
                (
                  a,
                  b
                ) =>
                  a.leaveType.localeCompare(
                    b.leaveType
                  )
              )
              .map(
              (
                row
              ) => [
                String(
                  year
                ),
                group.employeeName,
                group.employeeCode,
                group.division,
                group.department,
                group.managerName,
                group.designation,
                group.grade,
                row.leaveType,
                String(
                  row.granted
                ),
                String(
                  row.used
                ),
                String(
                  row.remaining
                ),
              ]
            )
        ),
      ];

      const escape =
        (
          value:
            string
        ) =>
          `"${String(
            value
          ).replace(
            /"/g,
            '""'
          )}"`;

      const csv =
        csvRows
          .map(
            (
              row
            ) =>
              row
                .map(
                  escape
                )
                .join(
                  ','
                )
          )
          .join(
            '\r\n'
          );

      const blob =
        new Blob(
          [
            csv,
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        `yearly-leave-report-${year}-all-employees.csv`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    };

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
        currentYear -
        5 +
        index
    );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Historical Yearly Leave Report
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select Year → Division → Department → Manager → Team Member.
          No employee leave details are shown before the complete filter path is selected. Export downloads the full selected year across all Divisions, Departments, Managers and employees.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
                setManagerFilter(
                  ''
                );
                setEmployeeFilter(
                  ''
                );
              }
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              Select Division
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
            disabled={
              !divisionFilter
            }
            onChange={
              (
                event
              ) => {
                setDepartmentFilter(
                  event.target.value
                );
                setManagerFilter(
                  ''
                );
                setEmployeeFilter(
                  ''
                );
              }
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
          >
            <option value="">
              Select Department
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

          <select
            value={
              managerFilter
            }
            disabled={
              !departmentFilter
            }
            onChange={
              (
                event
              ) => {
                setManagerFilter(
                  event.target.value
                );
                setEmployeeFilter(
                  ''
                );
              }
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
          >
            <option value="">
              Select Manager
            </option>

            {managers.map(
              ([
                id,
                name,
              ]) => (
                <option
                  key={
                    id
                  }
                  value={
                    id
                  }
                >
                  {
                    name
                  }
                </option>
              )
            )}
          </select>

          <select
            value={
              employeeFilter
            }
            disabled={
              !managerFilter
            }
            onChange={
              (
                event
              ) =>
                setEmployeeFilter(
                  event.target.value
                )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
          >
            <option value="">
              Select Team Member
            </option>

            {employees.map(
              (
                employee
              ) => (
                <option
                  key={
                    employee.key
                  }
                  value={
                    employee.key
                  }
                >
                  {
                    employee.employeeName
                  }
                </option>
              )
            )}
          </select>

          <button
            type="button"
            disabled={
              loading ||
              groups.length ===
                0
            }
            onClick={
              exportYearCsv
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Full Year CSV
          </button>
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
        (
          !divisionFilter ||
          !departmentFilter ||
          !managerFilter ||
          !employeeFilter
        ) && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
            Select Division, Department, Manager and Team Member to view leave data.
          </div>
        )}

      {!loading &&
        !error &&
        divisionFilter &&
        departmentFilter &&
        managerFilter &&
        employeeFilter &&
        selectedGroups.length ===
          0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-400 shadow-sm">
            No preserved data is available for this selection in {year}.
          </div>
        )}

      {!loading &&
        selectedGroups.map(
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
                      Manager: {group.managerName || '—'} · Designation:{' '}
                      {group.designation || '—'} · Grade: {group.grade || '—'}
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
    </section>
  );
}
