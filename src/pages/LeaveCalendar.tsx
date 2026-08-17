import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function LeaveCalendar() {
  const {
    leaveRequests,
    users,
  } = useAppData();

  const today = new Date();

  const [
    viewDate,
    setViewDate,
  ] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const [query, setQuery] =
    useState('');

  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const cells:
    (number | null)[] = [];

  for (
    let index = 0;
    index < firstDay;
    index += 1
  ) {
    cells.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    cells.push(day);
  }

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .filter(
              (user) =>
                user.role !==
                  'admin' &&
                user.department
            )
            .map(
              (user) =>
                user.department
            )
        )
      ).sort(),
    [users]
  );

  const leaveTypes = useMemo(
    () =>
      Array.from(
        new Set(
          leaveRequests.map(
            (leave) =>
              leave.leaveType
          )
        )
      ).sort(),
    [leaveRequests]
  );

  const filteredLeaves =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      return leaveRequests.filter(
        (leave) => {
          const employee =
            users.find(
              (user) =>
                user.id ===
                leave.employeeId
            );

          const matchesSearch =
            !search ||
            leave.employeeName
              .toLowerCase()
              .includes(search) ||
            (
              employee?.employeeId ||
              ''
            )
              .toLowerCase()
              .includes(search);

          const matchesDepartment =
            !departmentFilter ||
            leave.department ===
              departmentFilter;

          const matchesType =
            !typeFilter ||
            leave.leaveType ===
              typeFilter;

          const matchesStatus =
            !statusFilter ||
            leave.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesType &&
            matchesStatus
          );
        }
      );
    }, [
      leaveRequests,
      users,
      query,
      departmentFilter,
      typeFilter,
      statusFilter,
    ]);

  const leavesForDay = (
    day: number
  ) => {
    const dateStr =
      `${year}-${String(
        month + 1
      ).padStart(
        2,
        '0'
      )}-${String(day).padStart(
        2,
        '0'
      )}`;

    return filteredLeaves.filter(
      (leave) =>
        leave.startDate <=
          dateStr &&
        leave.endDate >=
          dateStr &&
        leave.status !==
          'cancelled' &&
        leave.status !==
          'rejected'
    );
  };

  const prevMonth = () =>
    setViewDate(
      new Date(
        year,
        month - 1,
        1
      )
    );

  const nextMonth = () =>
    setViewDate(
      new Date(
        year,
        month + 1,
        1
      )
    );

  const monthLeaves =
    filteredLeaves.filter(
      (leave) => {
        const monthStart =
          `${year}-${String(
            month + 1
          ).padStart(2, '0')}-01`;

        const monthEnd =
          `${year}-${String(
            month + 1
          ).padStart(
            2,
            '0'
          )}-${String(
            daysInMonth
          ).padStart(2, '0')}`;

        return (
          leave.endDate >=
            monthStart &&
          leave.startDate <=
            monthEnd
        );
      }
    );

  const clearFilters = () => {
    setQuery('');
    setDepartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Calendar
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            See who is on leave across
            the team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="min-w-32 text-center text-sm font-medium text-gray-900">
            {monthNames[month]}{' '}
            {year}
          </span>

          <button
            onClick={nextMonth}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight
              size={16}
            />
          </button>
        </div>
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
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search employee or ID"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={
              departmentFilter
            }
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

            {leaveTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type.replace(
                    /_/g,
                    ' '
                  )}
                </option>
              )
            )}
          </select>

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
            <option value="pending">
              Pending
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

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-gray-400">
          {[
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
          ].map((day) => (
            <div
              key={day}
              className="py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map(
            (day, index) => {
              if (day === null) {
                return (
                  <div
                    key={index}
                  />
                );
              }

              const leaves =
                leavesForDay(day);

              const isToday =
                day ===
                  today.getDate() &&
                month ===
                  today.getMonth() &&
                year ===
                  today.getFullYear();

              return (
                <div
                  key={index}
                  className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors ${
                    isToday
                      ? 'border-blue-400 bg-blue-50/40'
                      : 'border-gray-100 bg-gray-50/40'
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </span>

                  <div className="mt-1 space-y-1">
                    {leaves
                      .slice(0, 2)
                      .map((leave) => {
                        const employee =
                          users.find(
                            (user) =>
                              user.id ===
                              leave.employeeId
                          );

                        return (
                          <div
                            key={leave.id}
                            className="truncate rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-700 ring-1 ring-inset ring-gray-100"
                            title={`${leave.employeeName} - ${leave.leaveType}`}
                          >
                            {employee?.fullName.split(
                              ' '
                            )[0] ||
                              leave.employeeName.split(
                                ' '
                              )[0]}{' '}
                            ·{' '}
                            <span className="capitalize">
                              {
                                leave.leaveType
                              }
                            </span>
                          </div>
                        );
                      })}

                    {leaves.length >
                      2 && (
                      <p className="text-[10px] text-gray-400">
                        +
                        {leaves.length -
                          2}{' '}
                        more
                      </p>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">
            On leave this month
          </h2>

          <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
            {monthLeaves.length}{' '}
            result(s)
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {monthLeaves.length ===
            0 && (
            <p className="py-6 text-center text-sm text-gray-400">
              No leave records match
              the selected filters.
            </p>
          )}

          {monthLeaves.map(
            (leave) => (
              <div
                key={leave.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm animate-fade-in"
              >
                <span className="font-medium text-gray-900">
                  {
                    leave.employeeName
                  }
                </span>

                <span className="capitalize text-gray-500">
                  {leave.department ||
                    '—'}{' '}
                  ·{' '}
                  {leave.leaveType.replace(
                    /_/g,
                    ' '
                  )}
                </span>

                <span className="text-gray-500">
                  {leave.startDate}{' '}
                  → {leave.endDate}
                </span>

                <StatusBadge
                  status={
                    leave.status
                  }
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
