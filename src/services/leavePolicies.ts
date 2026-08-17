import api from './api';

import type {
  LeavePolicy,
} from '../types';

type BackendApprover =
  | string
  | {
      _id?: string;
    };

interface BackendLeavePolicy {
  _id: string;

  leaveType: string;

  applicableRole?:
    | 'All Employees'
    | 'employee'
    | 'manager'
    | 'admin';

  isPaid?: boolean;

  minDaysNoticeRequired?: number;

  documentRequirement?:
    | 'required'
    | 'optional'
    | 'not_required';

  adminOnlyApproval?: boolean;

  finalApprovalMode?: boolean;

  approvalRouting?: {
    designation?: string | null;
    department?: string | null;
    grade?: string | null;

    approverIds?:
      BackendApprover[];
  };
}

function getApproverId(
  approver: BackendApprover
): string {
  if (
    typeof approver ===
    'string'
  ) {
    return approver;
  }

  return approver._id || '';
}

export function mapLeavePolicy(
  policy: BackendLeavePolicy
): LeavePolicy {
  return {
    id:
      policy._id,

    leaveType:
      policy.leaveType,

    role:
      policy.applicableRole ||
      'All Employees',

    requiresApprovalFrom:
      policy.adminOnlyApproval
        ? 'admin'
        : 'manager',

    approvalRouting: {
      designation:
        policy.approvalRouting
          ?.designation ||
        undefined,

      department:
        policy.approvalRouting
          ?.department ||
        undefined,

      grade:
        policy.approvalRouting
          ?.grade ||
        undefined,

      approverIds:
        (
          policy.approvalRouting
            ?.approverIds || []
        )
          .map(
            getApproverId
          )
          .filter(Boolean),
    },

    requiresDocumentUpload:
      policy.documentRequirement ===
      'required',

    documentRequirement:
      policy.documentRequirement ||
      'optional',

    adminOnlyApproval:
      Boolean(
        policy.adminOnlyApproval
      ),

    finalApprovalMode:
      Boolean(
        policy.finalApprovalMode
      ),

    minDaysNoticeRequired:
      policy.minDaysNoticeRequired ??
      0,

    isPaid:
      policy.isPaid ??
      true,
  };
}

function toBackendPayload(
  policy: LeavePolicy
) {
  return {
    leaveType:
      policy.leaveType,

    applicableRole:
      policy.role ||
      'All Employees',

    isPaid:
      Boolean(
        policy.isPaid
      ),

    minDaysNoticeRequired:
      Number(
        policy.minDaysNoticeRequired ||
          0
      ),

    documentRequirement:
      policy.documentRequirement ||
      (
        policy.requiresDocumentUpload
          ? 'required'
          : 'optional'
      ),

    adminOnlyApproval:
      Boolean(
        policy.adminOnlyApproval
      ),

    finalApprovalMode:
      Boolean(
        policy.finalApprovalMode
      ),

    approvalRouting: {
      designation:
        policy.approvalRouting
          ?.designation ||
        null,

      department:
        policy.approvalRouting
          ?.department ||
        null,

      grade:
        policy.approvalRouting
          ?.grade ||
        null,

      approverIds:
        policy.approvalRouting
          ?.approverIds ||
        [],
    },
  };
}

export async function getLeavePolicies():
Promise<LeavePolicy[]> {
  const response =
    await api.get(
      '/leave-policies',
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
    mapLeavePolicy
  );
}

export async function createLeavePolicy(
  policy: LeavePolicy
): Promise<LeavePolicy> {
  const response =
    await api.post(
      '/leave-policies',
      toBackendPayload(
        policy
      )
    );

  return mapLeavePolicy(
    response.data.data
  );
}

export async function updateLeavePolicy(
  policy: LeavePolicy
): Promise<LeavePolicy> {
  const response =
    await api.patch(
      `/leave-policies/${policy.id}`,
      toBackendPayload(
        policy
      )
    );

  return mapLeavePolicy(
    response.data.data
  );
}