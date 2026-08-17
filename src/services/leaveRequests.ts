import api from './api';
import type { LeaveRequest } from '../types';

type BackendId =
  | string
  | { _id?: string; fullName?: string }
  | null
  | undefined;

interface BackendLeaveRequest {
  _id: string;
  employeeId: BackendId;
  employeeName?: string;
  department?: string;
  leaveType: LeaveRequest['leaveType'];
  startDate: string;
  endDate: string;
  totalDaysRequested?: number;
  totalWorkingDays?: number;
  excludedWeekendDates?: string[];
  reason?: string;
  status: LeaveRequest['status'];
  requiredApproverIds?: BackendId[];
  approvedByIds?: BackendId[];
  rejectedByIds?: BackendId[];
  approvalHistory?: LeaveRequest['approvalHistory'];
  isAdminOnlyDecision?: boolean;
  isExtension?: boolean;
  originalRequestId?: string | null;
  isPaidOverride?: boolean | null;
  isStopRequest?: boolean;
  cancelledBy?: string | null;
  createdAt: string;
}

function getId(value: BackendId): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || '';
}

function dateOnly(value?: string): string {
  if (!value) return '';
  return value.split('T')[0];
}

export function mapBackendLeaveRequest(
  leave: BackendLeaveRequest
): LeaveRequest {
  const employee =
    typeof leave.employeeId === 'object'
      ? leave.employeeId
      : null;

  return {
    id: leave._id,
    employeeId: getId(leave.employeeId),
    employeeName:
      leave.employeeName ||
      employee?.fullName ||
      '',
    department: leave.department || '',
    leaveType: leave.leaveType,
    startDate: dateOnly(leave.startDate),
    endDate: dateOnly(leave.endDate),
    totalDaysRequested:
      leave.totalDaysRequested ?? 0,
    totalWorkingDays:
      leave.totalWorkingDays ?? 0,
    excludedWeekendDates:
      leave.excludedWeekendDates || [],
    reason: leave.reason || '',
    status: leave.status,
    requiredApproverIds:
      (leave.requiredApproverIds || []).map(getId),
    approvedByIds:
      (leave.approvedByIds || []).map(getId),
    rejectedByIds:
      (leave.rejectedByIds || []).map(getId),
    approvalHistory:
      leave.approvalHistory || [],
    isAdminOnlyDecision:
      leave.isAdminOnlyDecision ?? false,
    isExtension:
      leave.isExtension ?? false,
    originalRequestId:
      leave.originalRequestId || undefined,
    isPaidOverride:
      leave.isPaidOverride ?? undefined,
    isStopRequest:
      leave.isStopRequest ?? false,
    cancelledBy:
      leave.cancelledBy || undefined,
    createdAt: leave.createdAt,
  } as LeaveRequest;
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await api.get('/leave-requests', {
    params: { page: 1, limit: 500 },
  });

  const rows = response.data?.data || [];
  return rows.map(mapBackendLeaveRequest);
}
