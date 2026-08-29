export type Role =
  | 'admin'
  | 'manager'
  | 'employee';

export type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'casual'
  | 'unpaid'
  | 'maternity'
  | 'paternity';

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

  /*
   * Access-control role.
   * This remains employee / manager / admin only.
   */
  role: Role;

  /*
   * Backward-compatible database field for the new Division master-data value.
   * User-facing UI calls this Division; Portal Access remains separate.
   */
  roleLabel?: string;

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
  detailsStatus?:
    | 'complete'
    | 'pending';
  pendingFields?: string[];
  mustChangePassword?: boolean;
  passwordChangedFromDefault?: boolean;
}

export interface Grade {
  id: string;
  name: string;
  description?: string;
}

export interface LeavePolicy {
  id: string;
  leaveType: string;
  role?: string;
  gradeQuotas: Array<{
    gradeId: string;
    gradeName?: string;
    yearlyQuota: number;
  }>;
  requiresApprovalFrom:
    | 'manager'
    | 'admin';
  approvalRouting?: {
    designation?: string;
    department?: string;
    grade?: string;
    approverIds: string[];
  };
  requiresDocumentUpload: boolean;
  documentRequirement?:
    | 'optional'
    | 'required'
    | 'not_required';
  adminOnlyApproval?: boolean;
  finalApprovalMode?: boolean;
  minDaysNoticeRequired: number;
  isPaid: boolean;
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;
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

  /*
   * Optional metadata added by the confirmed Admin finalized-decision actions.
   */
  isAdminOverride?: boolean;
  isAdminStop?: boolean;
  previousStatus?:
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'pending';
  newStatus?:
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'pending';
  effectiveReturnDate?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDaysRequested: number;
  totalWorkingDays: number;
  reason: string;
  status: LeaveStatus;
  currentApproverRole:
    | 'manager'
    | 'admin';
  approvalHistory:
    ApprovalHistoryEntry[];
  requiredApproverIds?: string[];
  approvedByIds?: string[];
  rejectedByIds?: string[];
  excludedWeekendDates?: string[];
  isExtension?: boolean;
  originalRequestId?: string;
  isPaidOverride?: boolean;
  isStopRequest?: boolean;
  isAdminOnlyDecision?: boolean;
  isPaid?: boolean;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledReason?: string;
  daysUsedBeforeCancel?: number;
  actualEndDate?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  hasAttachment?: boolean;
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
  relatedLeaveRequestId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  quota: number;
  used: number;
  remaining: number;
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
