import api from './api';

import type {
  LeaveBalance,
  LeaveType,
} from '../types';

function normalizeBalances(
  data: unknown
): LeaveBalance[] {
  if (Array.isArray(data)) {
    return data as LeaveBalance[];
  }

  if (
    !data ||
    typeof data !== 'object'
  ) {
    return [];
  }

  return Object.entries(
    data as Record<
      string,
      {
        quota?: number;
        used?: number;
        remaining?: number;
      }
    >
  ).map(
    ([leaveType, value]) => ({
      leaveType:
        leaveType as LeaveType,

      quota:
        Number(
          value?.quota ?? 0
        ),

      used:
        Number(
          value?.used ?? 0
        ),

      remaining:
        Number(
          value?.remaining ??
            Math.max(
              0,
              Number(
                value?.quota ??
                  0
              ) -
                Number(
                  value?.used ??
                    0
                )
            )
        ),
    })
  );
}

export async function getEmployeeLeaveBalance(
  employeeId: string
): Promise<LeaveBalance[]> {
  if (!employeeId) {
    return [];
  }

  const response =
    await api.get(
      `/leave-requests/balance/${employeeId}`
    );

  return normalizeBalances(
    response.data?.data
  );
}
