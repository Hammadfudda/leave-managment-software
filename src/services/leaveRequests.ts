import api from './api';

import type {
  LeaveRequest,
  LeaveType,
} from '../types';

type BackendId =
  | string
  | {
      _id?: string;
      fullName?: string;
    }
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
  cancelledByName?: string;
  cancelledReason?: string;
  daysUsedBeforeCancel?: number;
  actualEndDate?: string | null;
  attachmentName?: string;
  attachmentUrl?: string;
  hasAttachment?: boolean;
  createdAt: string;
}

function getId(
  value: BackendId
): string {
  if (!value) {
    return '';
  }

  if (
    typeof value ===
    'string'
  ) {
    return value;
  }

  return value._id || '';
}

function dateOnly(
  value?: string | null
): string {
  if (!value) {
    return '';
  }

  return value.split(
    'T'
  )[0];
}

export function mapBackendLeaveRequest(
  leave: BackendLeaveRequest
): LeaveRequest {
  const employee =
    typeof leave.employeeId ===
    'object'
      ? leave.employeeId
      : null;

  return {
    id:
      leave._id,

    employeeId:
      getId(
        leave.employeeId
      ),

    employeeName:
      leave.employeeName ||
      employee?.fullName ||
      '',

    department:
      leave.department ||
      '',

    leaveType:
      leave.leaveType,

    startDate:
      dateOnly(
        leave.startDate
      ),

    endDate:
      dateOnly(
        leave.endDate
      ),

    totalDaysRequested:
      leave.totalDaysRequested ??
      0,

    totalWorkingDays:
      leave.totalWorkingDays ??
      0,

    excludedWeekendDates:
      leave.excludedWeekendDates ||
      [],

    reason:
      leave.reason ||
      '',

    status:
      leave.status,

    requiredApproverIds:
      (
        leave.requiredApproverIds ||
        []
      ).map(
        getId
      ),

    approvedByIds:
      (
        leave.approvedByIds ||
        []
      ).map(
        getId
      ),

    rejectedByIds:
      (
        leave.rejectedByIds ||
        []
      ).map(
        getId
      ),

    approvalHistory:
      leave.approvalHistory ||
      [],

    isAdminOnlyDecision:
      leave.isAdminOnlyDecision ??
      false,

    isExtension:
      leave.isExtension ??
      false,

    originalRequestId:
      leave.originalRequestId ||
      undefined,

    isPaidOverride:
      leave.isPaidOverride ??
      undefined,

    isStopRequest:
      leave.isStopRequest ??
      false,

    cancelledBy:
      leave.cancelledBy ||
      undefined,

    cancelledByName:
      leave.cancelledByName ||
      undefined,

    cancelledReason:
      leave.cancelledReason ||
      undefined,

    daysUsedBeforeCancel:
      leave.daysUsedBeforeCancel,

    actualEndDate:
      dateOnly(
        leave.actualEndDate
      ) ||
      undefined,

    attachmentName:
      leave.attachmentName,

    attachmentUrl:
      leave.attachmentUrl,

    createdAt:
      leave.createdAt,

    hasAttachment:
      leave.hasAttachment,
  } as LeaveRequest & {
    hasAttachment?: boolean;
  };
}

export async function getLeaveRequests(): Promise<
  LeaveRequest[]
> {
  const response =
    await api.get(
      '/leave-requests',
      {
        params: {
          page: 1,
          limit: 500,
        },
      }
    );

  const rows =
    response.data?.data ||
    [];

  return rows.map(
    mapBackendLeaveRequest
  );
}

export interface CreateLeaveRequestPayload {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: File | null;
}

export async function createLeaveRequest(
  payload:
    CreateLeaveRequestPayload
): Promise<LeaveRequest> {
  const formData =
    new FormData();

  formData.append(
    'leaveType',
    payload.leaveType
  );

  formData.append(
    'startDate',
    payload.startDate
  );

  formData.append(
    'endDate',
    payload.endDate
  );

  formData.append(
    'reason',
    payload.reason
  );

  if (
    payload.attachment
  ) {
    formData.append(
      'attachment',
      payload.attachment
    );
  }

  const response =
    await api.post(
      '/leave-requests',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}

export async function getLeaveAttachmentUrl(
  leaveRequestId:
    string
): Promise<{
  url: string;
  expiresAt: number;
  expiresInSeconds: number;
  name: string;
}> {
  const response =
    await api.get(
      `/leave-requests/${leaveRequestId}/attachment-url`
    );

  return response.data.data;
}

export async function extendLeaveRequest(
  leaveRequestId:
    string,
  newEndDate:
    string,
  reason:
    string
): Promise<LeaveRequest> {
  const response =
    await api.post(
      `/leave-requests/${leaveRequestId}/extend`,
      {
        newEndDate,
        reason,
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}

export async function requestStopLeaveRequest(
  leaveRequestId:
    string,
  returnDate:
    string,
  reason:
    string
): Promise<LeaveRequest> {
  const response =
    await api.post(
      `/leave-requests/${leaveRequestId}/request-stop`,
      {
        returnDate,
        reason,
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}
