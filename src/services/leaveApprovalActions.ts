import api from './api';

import type {
  LeaveRequest,
} from '../types';

import {
  mapBackendLeaveRequest,
} from './leaveRequests';

export async function approveLeaveRequest(
  requestId: string,
  comment?: string
): Promise<LeaveRequest> {
  const response =
    await api.patch(
      `/leave-requests/${requestId}/approve`,
      {
        comment:
          comment?.trim() ||
          undefined,
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}

export async function rejectLeaveRequest(
  requestId: string,
  comment: string
): Promise<LeaveRequest> {
  const cleanComment =
    comment.trim();

  if (!cleanComment) {
    throw new Error(
      'A reason is required when rejecting a leave request.'
    );
  }

  const response =
    await api.patch(
      `/leave-requests/${requestId}/reject`,
      {
        comment:
          cleanComment,
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}

export async function actOnBehalfOfApprover(
  requestId: string,
  approverId: string,
  action:
    | 'approved'
    | 'rejected',
  comment?: string
): Promise<LeaveRequest> {
  const response =
    await api.patch(
      `/leave-requests/${requestId}/act-on-behalf`,
      {
        approverId,
        action,
        comment:
          comment?.trim() ||
          undefined,
      }
    );

  return mapBackendLeaveRequest(
    response.data.data
  );
}
