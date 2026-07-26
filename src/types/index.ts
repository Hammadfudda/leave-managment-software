export type Role = 'admin' | 'manager' | 'employee';

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

export const CORE_LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'casual'];

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
  canApproveOtherDepartments?: boolean; // Manager/Admin ke liye — kya yeh apne department se bahar bhi approver ban sakta hai
  profilePhotoUrl?: string;
}

export interface Grade {
  id: string;
  name: string;
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
  role?: string; // Role applicable to this leave type (Requirement 1)
  requiresApprovalFrom: 'manager' | 'admin';
  approvalRouting?: {
    designation?: string;
    department?: string;
    approverIds: string[]; // specific employee IDs required to approve this leave type
  };
  requiresDocumentUpload: boolean;
  documentRequirement?: 'optional' | 'required'; // Document attachment (Requirement 3)
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
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDaysRequested: number;
  totalWorkingDays: number;
  reason: string;
  status: LeaveStatus;
  currentApproverRole: 'manager' | 'admin';
  approvalHistory: ApprovalHistoryEntry[];
  requiredApproverIds?: string[]; // copied from policy at submission time
  approvedByIds?: string[]; // who has approved so far
  rejectedByIds?: string[]; // who has rejected (non-gatekeeper stage — tracks conflicts)
  excludedWeekendDates?: string[]; // dates dropped from the day count due to weekend
  isExtension?: boolean; // true if this request extends an already-approved leave
  originalRequestId?: string; // the LeaveRequest this one extends, if isExtension is true
  isPaidOverride?: boolean; // set by Manager/Admin when creating an extension — paid or unpaid, independent of the policy default
  isExtension?: boolean; // true if this request is an extension of an already-approved leave
  originalRequestId?: string; // the LeaveRequest this extends, if isExtension is true
  isPaid?: boolean; // for extensions only — Manager/Admin can override; Employee-initiated defaults to the policy's isPaid
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledReason?: string;
  daysUsedBeforeCancel?: number;
  actualEndDate?: string;
  attachmentUrl?: string;
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
