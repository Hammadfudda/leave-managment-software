export type Role = 'admin' | 'manager' | 'employee';

export type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveType = string;

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
  status: 'active' | 'inactive';
  managerId?: string;
  canApproveOtherDepartments?: boolean;
  profilePhotoUrl?: string;
  detailsStatus?: 'complete' | 'pending';
  pendingFields?: string[];
}

export interface Grade {
  id: string;
  name: string;
  description?: string;

  // Kept optional only for backward compatibility with older local data.
  // Leave entitlement no longer comes from Grade.
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;
}

export interface GradeQuota {
  gradeId: string;
  gradeName?: string;
  yearlyQuota: number;
}

export interface LeavePolicy {
  id: string;
  leaveType: LeaveType;
  gradeQuotas: GradeQuota[];

  requiresApprovalFrom: 'manager';

  approvalRouting?: {
    approverIds: string[];
  };

  requiresDocumentUpload: boolean;
  documentRequirement?:
    | 'optional'
    | 'required'
    | 'not_required';

  finalApprovalMode?: boolean;

  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;

  minDaysNoticeRequired: number;
  isPaid: boolean;
}

export interface ApprovalHistoryEntry {
  approverId: string;
  approverName: string;
  approverRole: string;
  action: 'approved' | 'rejected' | 'cancelled';
  comment?: string;
  actionDate: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDaysRequested: number;
  totalWorkingDays: number;
  reason: string;
  status: LeaveStatus;
  currentApproverRole: 'manager' | 'admin';
  approvalHistory: ApprovalHistoryEntry[];
  requiredApproverIds?: string[];
  approvedByIds?: string[];
  rejectedByIds?: string[];
  excludedWeekendDates?: string[];
  isExtension?: boolean;
  originalRequestId?: string;
  isPaidOverride?: boolean;
  isStopRequest?: boolean;
  isPaid?: boolean;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledReason?: string;
  daysUsedBeforeCancel?: number;
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
    | 'leave_pending_approval'
    | 'extension_requested'
    | 'stop_requested';
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
