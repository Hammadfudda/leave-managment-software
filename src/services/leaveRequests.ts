import api from './api';

import type {
  LeaveRequest,
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

  leaveType:
    LeaveRequest['leaveType'];

  startDate: string;
  endDate: string;

  totalDaysRequested?: number;
  totalWorkingDays?: number;

  excludedWeekendDates?: string[];

  reason?: string;

  status:
    LeaveRequest['status'];

  requiredApproverIds?: BackendId[];
  approvedByIds?: BackendId[];
  rejectedByIds?: BackendId[];

  approvalHistory?:
    LeaveRequest['approvalHistory'];

  isAdminOnlyDecision?: boolean;

  isExtension?: boolean;

  originalRequestId?:
    string | null;

  isPaidOverride?:
    boolean | null;

  isStopRequest?: boolean;

  cancelledBy?:
    string | null;

  cancelledByName?:
    string | null;

  cancelledReason?:
    string | null;

  daysUsedBeforeCancel?:
    number | null;

  actualEndDate?:
    string | null;

  /*
   * Private attachment metadata
   */
  hasAttachment?: boolean;

  attachmentName?:
    string | null;

  createdAt: string;
}

export interface CreateLeaveRequestPayload {
  leaveType: string;

  startDate: string;
  endDate: string;

  reason: string;

  attachment?:
    File | null;
}

export interface AttachmentUrlResponse {
  url: string;

  expiresAt: number;

  expiresInSeconds: number;

  name: string;
}

function getId(
  value: BackendId
): string {
  if (!value) {
    return '';
  }

  if (
    typeof value === 'string'
  ) {
    return value;
  }

  return value._id || '';
}

function dateOnly(
  value?:
    string | null
): string {
  if (!value) {
    return '';
  }

  return value.split('T')[0];
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
      ).map(getId),

    approvedByIds:
      (
        leave.approvedByIds ||
        []
      ).map(getId),

    rejectedByIds:
      (
        leave.rejectedByIds ||
        []
      ).map(getId),

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
      leave.daysUsedBeforeCancel ??
      undefined,

    actualEndDate:
      leave.actualEndDate
        ? dateOnly(
            leave.actualEndDate
          )
        : undefined,

    /*
     * IMPORTANT:
     * No permanent Cloudinary URL
     * comes to frontend.
     */
    hasAttachment:
      leave.hasAttachment ??
      false,

    attachmentName:
      leave.attachmentName ||
      undefined,

    createdAt:
      leave.createdAt,
  } as LeaveRequest;
}

/*
|--------------------------------------------------------------------------
| GET LEAVE REQUESTS
|--------------------------------------------------------------------------
*/

export async function getLeaveRequests():
Promise<LeaveRequest[]> {
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

/*
|--------------------------------------------------------------------------
| CREATE LEAVE REQUEST
|--------------------------------------------------------------------------
|
| Multipart is required because a
| document can be attached.
|
*/

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

  /*
   * Do not manually set
   * Content-Type here.
   *
   * Browser/Axios automatically adds
   * multipart boundary correctly.
   */
  const response =
    await api.post(
      '/leave-requests',
      formData
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}

/*
|--------------------------------------------------------------------------
| GET TEMPORARY PRIVATE ATTACHMENT URL
|--------------------------------------------------------------------------
|
| Backend checks authorization first.
|
| Allowed:
| - Employee's own leave
| - Required/assigned manager
| - Admin
|
*/

export async function getLeaveAttachmentUrl(
  leaveRequestId: string
): Promise<AttachmentUrlResponse> {
  const response =
    await api.get(
      `/leave-requests/${leaveRequestId}/attachment-url`
    );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| OPEN PRIVATE DOCUMENT
|--------------------------------------------------------------------------
*/

export async function openLeaveAttachment(
  leaveRequestId: string
): Promise<void> {
  /*
   * Open blank tab first so popup
   * blockers don't block the document
   * after the async API request.
   */
  const newWindow =
    window.open(
      '',
      '_blank'
    );

  try {
    const attachment =
      await getLeaveAttachmentUrl(
        leaveRequestId
      );

    if (newWindow) {
      newWindow.opener =
        null;

      newWindow.location.href =
        attachment.url;

      return;
    }

    /*
     * Fallback if browser blocked
     * the new tab.
     */
    window.location.href =
      attachment.url;
  } catch (error) {
    /*
     * Close empty tab if API failed.
     */
    if (newWindow) {
      newWindow.close();
    }

    throw error;
  }
}