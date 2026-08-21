import api from './api';
import type { LeavePolicy } from '../types';

type BackendApprover =
  | string
  | {
      _id?: string;
    };

interface BackendGradeQuota {
  gradeId:
    | string
    | {
        _id?: string;
        name?: string;
      };
  yearlyQuota: number;
}

interface BackendLeavePolicy {
  _id: string;
  leaveType: string;
  gradeQuotas?: BackendGradeQuota[];
  isPaid?: boolean;
  documentRequirement?:
    | 'required'
    | 'optional'
    | 'not_required';
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;
  finalApprovalMode?: boolean;
  approvalRouting?: {
    approverIds?: BackendApprover[];
  };
}

function getApproverId(approver: BackendApprover): string {
  if (typeof approver === 'string') return approver;
  return approver._id || '';
}

function getGradeId(
  value: BackendGradeQuota['gradeId']
): string {
  return typeof value === 'string'
    ? value
    : value?._id || '';
}

function getGradeName(
  value: BackendGradeQuota['gradeId']
): string | undefined {
  return typeof value === 'string'
    ? undefined
    : value?.name;
}

export function mapLeavePolicy(
  policy: BackendLeavePolicy
): LeavePolicy {
  return {
    id: policy._id,
    leaveType: policy.leaveType,
    gradeQuotas: (policy.gradeQuotas || []).map((item) => ({
      gradeId: getGradeId(item.gradeId),
      gradeName: getGradeName(item.gradeId),
      yearlyQuota: Number(item.yearlyQuota || 0),
    })),
    requiresApprovalFrom: 'manager',
    approvalRouting: {
      approverIds: (
        policy.approvalRouting?.approverIds || []
      )
        .map(getApproverId)
        .filter(Boolean),
    },
    requiresDocumentUpload:
      policy.documentRequirement === 'required',
    documentRequirement:
      policy.documentRequirement || 'optional',
    finalApprovalMode:
      policy.finalApprovalMode ?? true,
    carryForwardAllowed:
      Boolean(policy.carryForwardAllowed),
    maxCarryForwardDays:
      Number(policy.maxCarryForwardDays || 0),
    minDaysNoticeRequired: 0,
    isPaid: policy.isPaid ?? true,
  };
}

function toBackendPayload(policy: LeavePolicy) {
  return {
    leaveType: policy.leaveType,
    gradeQuotas: policy.gradeQuotas.map((item) => ({
      gradeId: item.gradeId,
      yearlyQuota: Number(item.yearlyQuota),
    })),
    isPaid: Boolean(policy.isPaid),
    documentRequirement:
      policy.documentRequirement ||
      (policy.requiresDocumentUpload
        ? 'required'
        : 'optional'),
    carryForwardAllowed:
      Boolean(policy.carryForwardAllowed),
    maxCarryForwardDays:
      policy.carryForwardAllowed
        ? Number(policy.maxCarryForwardDays || 0)
        : 0,
    finalApprovalMode:
      policy.finalApprovalMode !== false,
    approvalRouting: {
      approverIds:
        policy.finalApprovalMode !== false
          ? []
          : policy.approvalRouting?.approverIds || [],
    },
  };
}

export async function getLeavePolicies():
Promise<LeavePolicy[]> {
  const response = await api.get('/leave-policies', {
    params: {
      page: 1,
      limit: 500,
    },
  });

  return (response.data?.data || []).map(mapLeavePolicy);
}

export async function createLeavePolicy(
  policy: LeavePolicy
): Promise<LeavePolicy> {
  const response = await api.post(
    '/leave-policies',
    toBackendPayload(policy)
  );

  return mapLeavePolicy(response.data.data);
}

export async function updateLeavePolicy(
  policy: LeavePolicy
): Promise<LeavePolicy> {
  const response = await api.patch(
    `/leave-policies/${policy.id}`,
    toBackendPayload(policy)
  );

  return mapLeavePolicy(response.data.data);
}

export async function deleteLeavePolicy(
  policyId: string
): Promise<void> {
  await api.delete(`/leave-policies/${policyId}`);
}
