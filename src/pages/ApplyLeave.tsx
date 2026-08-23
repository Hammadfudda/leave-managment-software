import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Upload,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

import api, {
  getApiErrorMessage,
} from '../services/api';

import {
  createLeaveRequest,
} from '../services/leaveRequests';

import {
  calcWorkingDays,
  formatDate,
  getExcludedWeekendDates,
} from '../utils/formatDate';

import type {
  LeaveBalance,
  LeaveType,
} from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

interface PolicyInfo {
  _id: string;
  leaveType: string;

  applicableRole?:
    | 'All Employees'
    | 'employee'
    | 'manager'
    | 'admin';

  documentRequirement?:
    | 'required'
    | 'optional'
    | 'not_required';

  approvalRouting?: {
    grade?: string | null;
    department?: string | null;
    designation?: string | null;
  };

  finalApprovalMode?: boolean;
  adminOnlyApproval?: boolean;
}

function normalizeBalances(data: unknown): LeaveBalance[] {
  if (Array.isArray(data)) {
    return data as LeaveBalance[];
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  return Object.entries(
    data as Record<string, any>
  ).map(([leaveType, value]) => ({
    leaveType: leaveType as LeaveType,
    quota: Number(value?.quota ?? 0),
    used: Number(value?.used ?? 0),
    remaining: Number(value?.remaining ?? 0),
  }));
}

export default function ApplyLeave() {
  const { user } = useAuth();
  const { refreshLeaveRequests } = useAppData();
  const navigate = useNavigate();

  const [
    leaveType,
    setLeaveType,
  ] = useState<LeaveType | ''>('');

  const [
    leaveTypes,
    setLeaveTypes,
  ] = useState<LeaveType[]>([]);

  const [
    policies,
    setPolicies,
  ] = useState<PolicyInfo[]>([]);

  const [
    balances,
    setBalances,
  ] = useState<LeaveBalance[]>([]);

  const [
    saturdayOff,
    setSaturdayOff,
  ] = useState(true);

  const [
    startDate,
    setStartDate,
  ] = useState('');

  const [
    endDate,
    setEndDate,
  ] = useState('');

  const [
    reason,
    setReason,
  ] = useState('');

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingData,
    setLoadingData,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      try {
        setLoadingData(true);
        setErrorMessage(null);

        const [
          typeResponse,
          balanceResponse,
          policyResponse,
          departmentResponse,
        ] = await Promise.all([
          api.get(
            '/leave-requests/available-types'
          ),

          api.get(
            `/leave-requests/balance/${user.id}`
          ),

          api.get(
            '/leave-requests/available-policies'
          ),

          api.get(
            '/departments'
          ),
        ]);

        const availableTypes =
          (
            typeResponse.data?.data || []
          ) as LeaveType[];

        setLeaveTypes(
          availableTypes
        );

        if (
          availableTypes.length > 0
        ) {
          setLeaveType(
            (current) =>
              current &&
              availableTypes.includes(
                current as LeaveType
              )
                ? current
                : availableTypes[0]
          );
        } else {
          setLeaveType('');
        }

        /*
         * Backend may return balances as:
         *
         * {
         *   annual: { quota, used, remaining },
         *   sick:   { quota, used, remaining },
         *   casual: { quota, used, remaining }
         * }
         *
         * or as an array.
         *
         * Normalize both forms so the UI always receives LeaveBalance[].
         */
        setBalances(
          normalizeBalances(
            balanceResponse.data?.data
          )
        );

        setPolicies(
          policyResponse.data?.data || []
        );

        const departments =
          departmentResponse.data?.data || [];

        const department =
          departments.find(
            (item: any) =>
              item.name === user.department
          );

        setSaturdayOff(
          department?.saturdayOff ?? true
        );
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            'Unable to load leave information.'
          )
        );
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, [user]);

  const policy =
    policies.find(
      (item) =>
        item.leaveType === leaveType
    );

  const isDocRequired =
    policy?.documentRequirement ===
    'required';

  const isDocNotRequired =
    policy?.documentRequirement ===
    'not_required';

  const calcDays = () => {
    if (!startDate || !endDate) {
      return 0;
    }

    return calcWorkingDays(
      startDate,
      endDate,
      saturdayOff
    );
  };

  const excludedDates =
    startDate && endDate
      ? getExcludedWeekendDates(
          startDate,
          endDate,
          saturdayOff
        )
      : [];

  const relevantBalances =
    useMemo(
      () =>
        balances.filter(
          (balance) =>
            leaveTypes.includes(
              balance.leaveType
            )
        ),
      [balances, leaveTypes]
    );

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      event.target.value = '';
      setSelectedFile(null);

      setErrorMessage(
        'Only PDF, JPG, JPEG and PNG files are allowed.'
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      event.target.value = '';
      setSelectedFile(null);

      setErrorMessage(
        'Attachment must be 5 MB or smaller.'
      );

      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!leaveType) {
      setErrorMessage(
        'Please select a leave type.'
      );
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage(
        'Please select start and end dates.'
      );
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(
        'Please enter the reason for leave.'
      );
      return;
    }

    if (calcDays() <= 0) {
      setErrorMessage(
        'The selected range contains no working days.'
      );
      return;
    }

    if (
      isDocRequired &&
      !selectedFile
    ) {
      setErrorMessage(
        'A supporting document is required for this leave type.'
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      await createLeaveRequest({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        attachment: selectedFile,
      });

      /*
       * Keep AppDataContext in sync with the real backend before
       * navigating to My Leaves. Without this refresh, the request
       * is saved in MongoDB but My Leaves can still render the old
       * in-memory leaveRequests array.
       */
      await refreshLeaveRequests();

      setSuccessMessage(
        'Leave request submitted successfully.'
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Unable to submit leave request.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessMessage(null);
    navigate('/leave/history');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Apply for Leave
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Submit a new leave request for approval.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {loadingData ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading leave information...
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-700">
            No leave policy is currently available for your account.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Leave type
              </label>

              <select
                value={leaveType}
                onChange={(event) =>
                  setLeaveType(
                    event.target.value as LeaveType
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {leaveTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                    className="capitalize"
                  >
                    {String(type).replace(
                      /_/g,
                      ' '
                    )}
                  </option>
                ))}
              </select>

              {policy && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Document upload:{' '}
                  {policy.documentRequirement ===
                  'required'
                    ? 'Required'
                    : policy.documentRequirement ===
                        'not_required'
                      ? 'Not required'
                      : 'Optional'}
                  .
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Start date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  End date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                  required
                  min={startDate}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {startDate && endDate && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3.5 py-2.5 text-sm text-blue-700">
                  <CalendarDays size={16} />

                  {formatDate(startDate)}
                  {' → '}
                  {formatDate(endDate)}
                  {' · Working days: '}

                  <strong className="font-semibold">
                    {calcDays()}
                  </strong>
                </div>

                {excludedDates.length > 0 && (
                  <p className="px-1 text-xs text-amber-600">
                    Sat/Sun included —{' '}
                    {excludedDates.length}{' '}
                    day(s) excluded.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value
                  )
                }
                required
                rows={3}
                placeholder="Briefly describe the reason for your leave..."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {!isDocNotRequired && (
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>
                      Document Attachment
                    </span>

                    {isDocRequired ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        Required
                      </span>
                    ) : (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                        Optional
                      </span>
                    )}
                  </label>

                  <p className="mb-2 text-xs text-gray-500">
                    PDF, JPG, JPEG or PNG. Maximum 5 MB.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-3 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                  <Upload size={16} />

                  {selectedFile?.name ||
                    'Click to select supporting document'}

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {selectedFile && (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
                    File selected:{' '}
                    {selectedFile.name}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() =>
                  navigate('/leave/history')
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Submitting...'
                  : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          Your current balances
        </h2>

        {relevantBalances.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No leave balances available.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {relevantBalances.map(
              (balance) => (
                <div
                  key={balance.leaveType}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="text-xs capitalize text-gray-500">
                    {String(
                      balance.leaveType
                    ).replace(
                      /_/g,
                      ' '
                    )}
                  </p>

                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {balance.remaining}

                    <span className="text-xs font-normal text-gray-400">
                      /
                      {balance.quota}
                    </span>
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!errorMessage}
        onClose={() =>
          setErrorMessage(null)
        }
        title="Unable to Submit Leave"
        size="sm"
        footer={
          <Button
            onClick={() =>
              setErrorMessage(null)
            }
          >
            OK
          </Button>
        }
      >
        <p className="whitespace-pre-line text-sm text-gray-600">
          {errorMessage}
        </p>
      </Modal>

      <Modal
        open={!!successMessage}
        onClose={handleSuccessClose}
        title="Leave Submitted"
        size="sm"
        footer={
          <Button
            onClick={handleSuccessClose}
          >
            OK
          </Button>
        }
      >
        <p className="text-sm text-gray-600">
          {successMessage}
        </p>
      </Modal>
    </div>
  );
}
