export type Role =
  | 'admin'
  | 'manager'
  | 'employee';

export type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

/*
 * Dynamic leave types.
 * Admin may create any leave type through Leave Policies.
 */
export type LeaveType =
  string;

/*
 * Kept only for compatibility with older UI code.
 * Balance logic no longer depends on these three types.
 */
export const CORE_LEAVE_TYPES:
  LeaveType[] = [
    'annual',
    'sick',
    'casual',
  ];

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: Role;
  designation: string;
  grade: string;
  department: string;
  dateOfJoining: string;
  cnic: string;
  phone: string;
  status:
    | 'active'
    | 'inactive';
  managerId?: string;
  canApproveOtherDepartments?: boolean;
  profilePhotoUrl?: string;
}

export interface Grade {
  id: string;
  name: string;

  /*
   * Legacy fields retained for Grade Master compatibility.
   * Leave balances now come from LeavePolicy.yearlyQuota.
   */
  annualLeaveQuota: number;
  sickLeaveQuota: number;
  casualLeaveQuota: number;

  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  description?: string;
}

export interface LeavePolicy {
  id: string;
  leaveType: string;
  role?: string;

  /*
   * Yearly entitlement for the matching applicant scope.
   */
  yearlyQuota: number;

  requiresApprovalFrom:
    | 'manager'
    | 'admin';

  approvalRouting?: {
    designation?: string;
    department?: string;
    grade?: string;
    approverIds: string[];
  };

  requiresDocumentUpload:
    boolean;

  documentRequirement?:
    | 'optional'
    | 'required'
    | 'not_required';

  adminOnlyApproval?: boolean;
  finalApprovalMode?: boolean;

  minDaysNoticeRequired:
    number;

  isPaid: boolean;
}

export interface ApprovalHistoryEntry {
  approverId: string;
  approverName: string;
  approverRole: string;

  action:
    | 'approved'
    | 'rejected'
    | 'cancelled';

  comment?: string;
  actionDate: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;

  leaveType: string;

  startDate: string;
  endDate: string;

  totalDaysRequested:
    number;

  totalWorkingDays:
    number;

  reason: string;

  status: LeaveStatus;

  currentApproverRole:
    | 'manager'
    | 'admin';

  approvalHistory:
    ApprovalHistoryEntry[];

  requiredApproverIds?:
    string[];

  approvedByIds?:
    string[];

  rejectedByIds?:
    string[];

  excludedWeekendDates?:
    string[];

  isExtension?: boolean;
  originalRequestId?: string;
  isPaidOverride?: boolean;

  isStopRequest?: boolean;

  isAdminOnlyDecision?:
    boolean;

  isPaid?: boolean;

  cancelledBy?: string;
  cancelledByName?: string;
  cancelledReason?: string;

  daysUsedBeforeCancel?:
    number;

  actualEndDate?: string;

  hasAttachment?: boolean;
  attachmentName?: string;

  createdAt: string;
}

export interface Notification {
  id: string;

  userId: string;

  type:
    | 'leave_submitted'
    | 'leave_approved'
    | 'leave_rejected'
    | 'leave_cancelled'
    | 'leave_pending_approval';

  message: string;

  relatedLeaveRequestId?:
    string;

  isRead: boolean;

  createdAt: string;
}

export interface LeaveBalance {
  leaveType:
    LeaveType;

  quota: number;
  used: number;
  remaining: number;

  year?: number;
}

export interface AuditLog {
  id: string;

  actorId: string;
  actorName: string;

  action: string;

  targetType: string;
  targetId: string;

  details: string;

  createdAt: string;

  department?: string;
  leaveType?: string;
  comment?: string;
  affectedPerson?: string;
}
