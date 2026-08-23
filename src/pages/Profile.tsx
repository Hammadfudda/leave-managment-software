import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData, getReportingChain } from '../context/AppDataContext';
import Badge from '../components/ui/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import {
  Mail,
  Phone,
  Building2,
  CalendarDays,
  CreditCard,
  Briefcase,
  UserCircle,
  BadgeCheck,
} from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import api, { getApiErrorMessage } from '../services/api';
import type { LeaveBalance } from '../types';

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
};

interface GradeObject {
  _id?: string;
  name?: string;
  gradeName?: string;
  title?: string;
  code?: string;
}

interface ProfileApiUser {
  _id?: string;
  id?: string;
  employeeId?: string;
  fullName?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'employee';
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  cnic?: string;
  nationalId?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  managerId?: string | null;

  gradeId?: string | GradeObject;
  grade?: string | GradeObject;
  gradeName?: string;

  balances?:
    | Record<
        string,
        {
          quota?: number;
          used?: number;
          remaining?: number;
          leaveType?: string;
        }
      >
    | Array<{
        quota?: number;
        used?: number;
        remaining?: number;
        leaveType?: string;
      }>;
}

function getGradeName(data?: ProfileApiUser | null) {
  if (!data) return '';

  if (
    data.gradeId &&
    typeof data.gradeId === 'object'
  ) {
    return (
      data.gradeId.name ||
      data.gradeId.gradeName ||
      data.gradeId.title ||
      data.gradeId.code ||
      ''
    );
  }

  if (
    data.grade &&
    typeof data.grade === 'object'
  ) {
    return (
      data.grade.name ||
      data.grade.gradeName ||
      data.grade.title ||
      data.grade.code ||
      ''
    );
  }

  if (
    typeof data.grade === 'string' &&
    data.grade.trim()
  ) {
    return data.grade.trim();
  }

  return data.gradeName?.trim() || '';
}

function normalizeBalances(
  rawBalances: ProfileApiUser['balances']
): LeaveBalance[] {
  if (!rawBalances) return [];

  if (Array.isArray(rawBalances)) {
    return rawBalances.map((balance, index) => ({
      ...(balance as LeaveBalance),
      leaveType:
        (balance.leaveType as LeaveBalance['leaveType']) ||
        (`leave-${index}` as LeaveBalance['leaveType']),
      quota: Number(balance.quota ?? 0),
      used: Number(balance.used ?? 0),
      remaining: Number(balance.remaining ?? 0),
    }));
  }

  return Object.entries(rawBalances).map(
    ([leaveType, balance]) =>
      ({
        leaveType,
        quota: Number(balance?.quota ?? 0),
        used: Number(balance?.used ?? 0),
        remaining: Number(balance?.remaining ?? 0),
      }) as LeaveBalance
  );
}

export default function Profile() {
  const { user } = useAuth();
  const {
    leaveRequests,
    getUserById,
  } = useAppData();

  const [
    profileData,
    setProfileData,
  ] = useState<ProfileApiUser | null>(
    null
  );

  const [
    balances,
    setBalances,
  ] = useState<LeaveBalance[]>([]);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(true);

  const [
    profileError,
    setProfileError,
  ] = useState('');

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response =
          await api.get('/employees/me');

        const data =
          response.data?.data || {};

        if (cancelled) return;

        setProfileData(data);

        setBalances(
          normalizeBalances(
            data.balances
          )
        );
      } catch (error) {
        if (cancelled) return;

        setProfileError(
          getApiErrorMessage(
            error,
            'Unable to load profile information.'
          )
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const displayUser = {
    ...user,
    ...profileData,

    id:
      profileData?._id ||
      profileData?.id ||
      user.id,

    fullName:
      profileData?.fullName ||
      user.fullName,

    email:
      profileData?.email ||
      user.email,

    role:
      profileData?.role ||
      user.role,

    employeeId:
      profileData?.employeeId ||
      user.employeeId,

    designation:
      profileData?.designation ||
      user.designation,

    department:
      profileData?.department ||
      user.department,

    dateOfJoining:
      profileData?.dateOfJoining ||
      user.dateOfJoining,

    cnic:
      profileData?.cnic ||
      profileData?.nationalId ||
      user.cnic,

    phone:
      profileData?.phone ||
      user.phone,

    status:
      profileData?.status ||
      user.status,

    managerId:
      profileData?.managerId ??
      user.managerId,
  };

  const gradeDisplay =
    getGradeName(profileData) ||
    user.grade ||
    '—';

  const myLeaves =
    leaveRequests.filter(
      (leave) =>
        leave.employeeId ===
        user.id
    );

  const { manager } =
    getReportingChain(
      {
        ...user,
        managerId:
          displayUser.managerId ||
          undefined,
      },
      getUserById
    );

  const fields = [
    {
      icon: CreditCard,
      label: 'Employee ID',
      value:
        displayUser.employeeId ||
        '—',
      mono: true,
    },
    {
      icon: Mail,
      label: 'Email',
      value:
        displayUser.email ||
        '—',
    },
    {
      icon: CreditCard,
      label: 'CNIC',
      value:
        displayUser.cnic ||
        '—',
      mono: true,
    },
    {
      icon: Phone,
      label: 'Phone',
      value:
        displayUser.phone ||
        '—',
    },
    {
      icon: Briefcase,
      label: 'Designation',
      value:
        displayUser.designation ||
        '—',
    },
    {
      icon: BadgeCheck,
      label: 'Grade',
      value: gradeDisplay,
    },
    {
      icon: Building2,
      label: 'Department',
      value:
        displayUser.department ||
        '—',
    },
    {
      icon: CalendarDays,
      label: 'Date of Joining',
      value:
        displayUser.dateOfJoining
          ? formatDate(
              displayUser.dateOfJoining
            )
          : '—',
    },
    {
      icon: UserCircle,
      label: 'Manager',
      value:
        manager?.fullName || '—',
    },
  ];

  const sortedBalances =
    useMemo(
      () =>
        [...balances].sort(
          (a, b) =>
            String(
              a.leaveType
            ).localeCompare(
              String(
                b.leaveType
              )
            )
        ),
      [balances]
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your employment and leave information.
        </p>
      </div>

      {profileError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {profileError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-fade-in">
        <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-500" />

        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-semibold text-blue-600 ring-4 ring-white">
              {displayUser.fullName?.charAt(
                0
              ) || '?'}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {displayUser.fullName}
              </h2>

              <p className="text-sm text-gray-500">
                {displayUser.designation}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="blue">
                  {
                    roleLabel[
                      displayUser.role
                    ]
                  }
                </Badge>

                {gradeDisplay !== '—' && (
                  <Badge variant="teal">
                    {gradeDisplay}
                  </Badge>
                )}

                {displayUser.status ===
                'active' ? (
                  <Badge variant="green">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const Icon =
            field.icon;

          return (
            <div
              key={field.label}
              className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-fade-in"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-gray-500">
                  {field.label}
                </p>

                <p
                  className={`mt-0.5 truncate text-sm font-medium text-gray-900 ${
                    field.mono
                      ? 'font-mono'
                      : ''
                  }`}
                >
                  {field.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Leave balances
          </h2>

          {profileLoading && (
            <span className="text-xs text-gray-400">
              Loading...
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!profileLoading &&
            sortedBalances.length ===
              0 && (
              <p className="text-sm text-gray-400">
                No balance data.
              </p>
            )}

          {sortedBalances.map(
            (balance) => {
              const used =
                Number(
                  balance.used || 0
                );

              const quota =
                Number(
                  balance.quota || 0
                );

              const remaining =
                Number(
                  balance.remaining ??
                    Math.max(
                      0,
                      quota - used
                    )
                );

              const percentage =
                quota > 0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (used / quota) *
                          100
                      )
                    )
                  : 0;

              return (
                <div
                  key={String(
                    balance.leaveType
                  )}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <p className="text-xs capitalize text-gray-500">
                    {String(
                      balance.leaveType
                    ).replace(
                      /[_-]/g,
                      ' '
                    )}{' '}
                    leave
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {remaining}
                    <span className="text-sm font-normal text-gray-400">
                      {' '}
                      / {quota}
                    </span>
                  </p>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {used} used
                    </span>
                    <span>
                      {remaining}{' '}
                      remaining
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Recent leave requests
        </h2>

        <div className="mt-3 space-y-2">
          {myLeaves.length === 0 && (
            <p className="text-sm text-gray-400">
              No leave requests yet.
            </p>
          )}

          {myLeaves
            .slice(0, 5)
            .map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm animate-fade-in"
              >
                <div>
                  <p className="font-medium capitalize text-gray-900">
                    {leave.leaveType}{' '}
                    leave
                  </p>

                  <p className="text-xs text-gray-500">
                    {formatDate(
                      leave.startDate
                    )}{' '}
                    →{' '}
                    {formatDate(
                      leave.endDate
                    )}{' '}
                    ·{' '}
                    {leave.daysUsedBeforeCancel ??
                      leave.totalDaysRequested}{' '}
                    day(s)
                  </p>
                </div>

                <StatusBadge
                  status={
                    leave.status
                  }
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
