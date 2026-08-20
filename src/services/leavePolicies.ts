import api from './api';

import type {
  GradeQuota,
  LeavePolicy,
} from '../types';

type BackendGrade =
  | string
  | {
      _id?: string;
      name?: string;
    };

type BackendApprover =
  | string
  | {
      _id?: string;
    };

interface BackendLeavePolicy {
  _id: string;
  leaveType: string;

  applicableRole?: string;

  gradeQuotas?: Array<{
    gradeId: BackendGrade;
    yearlyQuota: number;
  }>;

  isPaid?: boolean;

  documentRequirement?:
    | 'required'
    | 'optional'
    | 'not_required';

  finalApprovalMode?: boolean;

  approvalRouting?: {
    designation?: string | null;
    department?: string | null;
    approverIds?: BackendApprover[];
  };
}

function getId(
  value:
    | BackendGrade
    | BackendApprover
) {
  if (
    typeof value ===
    'string'
  ) {
    return value;
  }

  return value._id || '';
}

function mapGradeQuota(
  row: {
    gradeId: BackendGrade;
    yearlyQuota: number;
  }
): GradeQuota {
  const populated =
    typeof row.gradeId ===
    'object'
      ? row.gradeId
      : null;

  return {
    gradeId:
      getId(
        row.gradeId
      ),

    gradeName:
      populated?.name,

    yearlyQuota:
      Number(
        row.yearlyQuota ||
        0
      ),
  };
}

export function mapLeavePolicy(
  policy:
    BackendLeavePolicy
): LeavePolicy {
  return {
    id:
      policy._id,

    leaveType:
      policy.leaveType,

    role:
      policy.applicableRole ||
      'All Employees',

    gradeQuotas:
      (
        policy.gradeQuotas ||
        []
      ).map(
        mapGradeQuota
      ),

    requiresApprovalFrom:
      'manager',

    approvalRouting: {
      designation:
        policy
          .approvalRouting
          ?.designation ||
        undefined,

      department:
        policy
          .approvalRouting
          ?.department ||
        undefined,

      approverIds:
        (
          policy
            .approvalRouting
            ?.approverIds ||
          []
        )
          .map(
            getId
          )
          .filter(Boolean),
    },

    requiresDocumentUpload:
      policy
        .documentRequirement ===
      'required',

    documentRequirement:
      policy
        .documentRequirement ||
      'optional',

    finalApprovalMode:
      Boolean(
        policy
          .finalApprovalMode
      ),

    minDaysNoticeRequired:
      0,

    isPaid:
      policy.isPaid ??
      true,
  };
}

function makePayload(
  policy:
    LeavePolicy
) {
  return {
    leaveType:
      policy.leaveType,

    applicableRole:
      policy.role ||
      'All Employees',

    gradeQuotas:
      policy.gradeQuotas
        .map(
          (row) => ({
            gradeId:
              row.gradeId,

            yearlyQuota:
              Number(
                row.yearlyQuota
              ),
          })
        ),

    isPaid:
      Boolean(
        policy.isPaid
      ),

    minDaysNoticeRequired:
      0,

    documentRequirement:
      policy
        .documentRequirement ||
      (
        policy
          .requiresDocumentUpload
          ? 'required'
          : 'optional'
      ),

    finalApprovalMode:
      Boolean(
        policy
          .finalApprovalMode
      ),

    approvalRouting: {
      designation:
        policy
          .approvalRouting
          ?.designation ||
        null,

      department:
        policy
          .approvalRouting
          ?.department ||
        null,

      approverIds:
        policy
          .finalApprovalMode
          ? []
          : (
              policy
                .approvalRouting
                ?.approverIds ||
              []
            ),
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

  return (
    response.data?.data ||
    []
  ).map(
    mapLeavePolicy
  );
}

export async function createLeavePolicy(
  policy:
    LeavePolicy
) {
  const response =
    await api.post(
      '/leave-policies',
      makePayload(
        policy
      )
    );

  return mapLeavePolicy(
    response.data.data
  );
}

export async function updateLeavePolicy(
  policy:
    LeavePolicy
) {
  const response =
    await api.patch(
      `/leave-policies/${policy.id}`,
      makePayload(
        policy
      )
    );

  return mapLeavePolicy(
    response.data.data
  );
}

export async function deleteLeavePolicy(
  policyId: string
) {
  await api.delete(
    `/leave-policies/${policyId}`
  );
}
