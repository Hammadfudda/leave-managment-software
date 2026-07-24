import type { User, Grade, LeavePolicy, LeaveRequest, Notification, AuditLog, LeaveBalance } from '../types';

export const mockGrades: Grade[] = [
  {
    id: 'g1', name: 'Grade A',
    annualLeaveQuota: 25, sickLeaveQuota: 14, casualLeaveQuota: 10,
    carryForwardAllowed: true, maxCarryForwardDays: 10,
    description: 'Senior leadership & executives',
  },
  {
    id: 'g2', name: 'Grade B',
    annualLeaveQuota: 21, sickLeaveQuota: 12, casualLeaveQuota: 8,
    carryForwardAllowed: true, maxCarryForwardDays: 7,
    description: 'Managers, team leads & senior professionals',
  },
  {
    id: 'g3', name: 'Grade C',
    annualLeaveQuota: 18, sickLeaveQuota: 10, casualLeaveQuota: 6,
    carryForwardAllowed: true, maxCarryForwardDays: 5,
    description: 'Mid-level professionals',
  },
  {
    id: 'g4', name: 'Grade D',
    annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5,
    carryForwardAllowed: false, maxCarryForwardDays: 0,
    description: 'Junior & entry-level employees',
  },
];

export const mockUsers: User[] = [
  {
    id: 'u1',
    employeeId: 'NDD-001',
    fullName: 'Sarah Mitchell',
    email: 'admin@nutrilov.com',
    role: 'admin',
    designation: 'Chief Operating Officer',
    grade: 'Grade A',
    department: 'Management',
    dateOfJoining: '2021-01-10',
    cnic: '42201-1234567-1',
    phone: '+92-321-1234567',
    status: 'active',
  },
  {
    id: 'u2',
    employeeId: 'NDD-002',
    fullName: 'James Carter',
    email: 'manager@nutrilov.com',
    role: 'manager',
    designation: 'Engineering Manager',
    grade: 'Grade B',
    department: 'Engineering',
    dateOfJoining: '2021-03-15',
    cnic: '42201-2345678-2',
    phone: '+92-322-2345678',
    status: 'active',
    managerId: 'u1',
  },
  {
    id: 'u3',
    employeeId: 'NDD-003',
    fullName: 'Priya Sharma',
    email: 'tl@nutrilov.com',
    role: 'manager',
    designation: 'Senior Software Engineer',
    grade: 'Grade B',
    department: 'Engineering',
    dateOfJoining: '2022-01-20',
    cnic: '42201-3456789-3',
    phone: '+92-333-3456789',
    status: 'active',
    managerId: 'u2',
  },
  {
    id: 'u4',
    employeeId: 'NDD-004',
    fullName: 'Alex Thompson',
    email: 'employee@nutrilov.com',
    role: 'employee',
    designation: 'Software Engineer',
    grade: 'Grade C',
    department: 'Engineering',
    dateOfJoining: '2023-06-01',
    cnic: '42201-4567890-4',
    phone: '+92-300-4567890',
    status: 'active',
    managerId: 'u2',
  },
  {
    id: 'u5',
    employeeId: 'NDD-005',
    fullName: 'Maria Santos',
    email: 'maria@nutrilov.com',
    role: 'employee',
    designation: 'Marketing Specialist',
    grade: 'Grade D',
    department: 'Marketing',
    dateOfJoining: '2024-02-12',
    cnic: '42201-5678901-5',
    phone: '+92-301-5678901',
    status: 'active',
    managerId: 'u2',
  },
  {
    id: 'u6',
    employeeId: 'NDD-006',
    fullName: 'David Kim',
    email: 'david@nutrilov.com',
    role: 'employee',
    designation: 'UI/UX Designer',
    grade: 'Grade C',
    department: 'Design',
    dateOfJoining: '2022-09-05',
    cnic: '42201-6789012-6',
    phone: '+92-302-6789012',
    status: 'active',
    managerId: 'u2',
  },
  {
    id: 'u7',
    employeeId: 'NDD-007',
    fullName: 'Emma Wilson',
    email: 'emma@nutrilov.com',
    role: 'employee',
    designation: 'Junior Developer',
    grade: 'Grade D',
    department: 'Engineering',
    dateOfJoining: '2024-01-15',
    cnic: '42201-7890123-7',
    phone: '+92-303-7890123',
    status: 'active',
    managerId: 'u2',
  },
  {
    id: 'u8',
    employeeId: 'NDD-008',
    fullName: 'Noah Brown',
    email: 'noah@nutrilov.com',
    role: 'employee',
    designation: 'QA Engineer',
    grade: 'Grade C',
    department: 'Engineering',
    dateOfJoining: '2021-07-01',
    cnic: '42201-8901234-8',
    phone: '+92-304-8901234',
    status: 'inactive',
    managerId: 'u2',
  },
];

export const mockLeavePolicies: LeavePolicy[] = [
  {
    id: 'lp1',
    leaveType: 'annual',
    role: 'All Employees',
    requiresApprovalFrom: 'manager',
    approvalRouting: { approverIds: ['u3', 'u2'] },
    requiresDocumentUpload: false,
    documentRequirement: 'optional',
    minDaysNoticeRequired: 3,
    isPaid: true,
  },
  {
    id: 'lp2',
    leaveType: 'sick',
    role: 'All Employees',
    requiresApprovalFrom: 'manager',
    approvalRouting: { approverIds: ['u3'] },
    requiresDocumentUpload: true,
    documentRequirement: 'required',
    minDaysNoticeRequired: 0,
    isPaid: true,
  },
  {
    id: 'lp3',
    leaveType: 'casual',
    role: 'All Employees',
    requiresApprovalFrom: 'manager',
    approvalRouting: { approverIds: ['u3'] },
    requiresDocumentUpload: false,
    documentRequirement: 'optional',
    minDaysNoticeRequired: 1,
    isPaid: true,
  },
];

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr1', employeeId: 'u4', employeeName: 'Alex Thompson', department: 'Engineering',
    leaveType: 'annual', startDate: '2026-07-21', endDate: '2026-07-25',
    totalDaysRequested: 5, totalWorkingDays: 5, reason: 'Family vacation planned',
    status: 'pending', currentApproverRole: 'manager',
    requiredApproverIds: ['u3', 'u2'], approvedByIds: [],
    approvalHistory: [], createdAt: '2026-07-17T09:00:00Z',
  },
  {
    id: 'lr2', employeeId: 'u5', employeeName: 'Maria Santos', department: 'Marketing',
    leaveType: 'sick', startDate: '2026-07-14', endDate: '2026-07-15',
    totalDaysRequested: 2, totalWorkingDays: 2, reason: 'Flu and fever',
    status: 'pending', currentApproverRole: 'manager',
    requiredApproverIds: ['u3'], approvedByIds: ['u3'],
    approvalHistory: [
      { approverId: 'u3', approverName: 'Priya Sharma', approverRole: 'manager', action: 'approved', comment: 'Approved, get well soon.', actionDate: '2026-07-13T14:00:00Z' },
    ],
    createdAt: '2026-07-13T08:30:00Z',
  },
  {
    id: 'lr3', employeeId: 'u6', employeeName: 'David Kim', department: 'Design',
    leaveType: 'casual', startDate: '2026-07-18', endDate: '2026-07-18',
    totalDaysRequested: 1, totalWorkingDays: 1, reason: 'Personal errand',
    status: 'approved', currentApproverRole: 'manager',
    requiredApproverIds: ['u3'], approvedByIds: ['u3'],
    approvalHistory: [
      { approverId: 'u3', approverName: 'Priya Sharma', approverRole: 'manager', action: 'approved', comment: 'Approved.', actionDate: '2026-07-17T10:00:00Z' },
    ],
    createdAt: '2026-07-16T11:00:00Z',
  },
  {
    id: 'lr4', employeeId: 'u7', employeeName: 'Emma Wilson', department: 'Engineering',
    leaveType: 'annual', startDate: '2026-07-28', endDate: '2026-08-01',
    totalDaysRequested: 5, totalWorkingDays: 5, reason: 'Visiting family abroad',
    status: 'rejected', currentApproverRole: 'manager',
    requiredApproverIds: ['u3', 'u2'], approvedByIds: [],
    approvalHistory: [
      { approverId: 'u3', approverName: 'Priya Sharma', approverRole: 'manager', action: 'rejected', comment: 'Critical sprint deadline that week. Please reschedule.', actionDate: '2026-07-16T15:00:00Z' },
    ],
    createdAt: '2026-07-15T09:00:00Z',
  },
  {
    id: 'lr5', employeeId: 'u4', employeeName: 'Alex Thompson', department: 'Engineering',
    leaveType: 'sick', startDate: '2026-06-05', endDate: '2026-06-06',
    totalDaysRequested: 2, totalWorkingDays: 2, reason: 'Medical appointment',
    status: 'approved', currentApproverRole: 'manager',
    requiredApproverIds: ['u3'], approvedByIds: ['u3'],
    approvalHistory: [
      { approverId: 'u3', approverName: 'Priya Sharma', approverRole: 'manager', action: 'approved', actionDate: '2026-06-04T09:00:00Z' },
    ],
    createdAt: '2026-06-04T08:00:00Z',
  },
  {
    id: 'lr7', employeeId: 'u4', employeeName: 'Alex Thompson', department: 'Engineering',
    leaveType: 'annual', startDate: '2026-07-01', endDate: '2026-07-12',
    totalDaysRequested: 12, totalWorkingDays: 10, reason: 'Extended family visit',
    status: 'approved', currentApproverRole: 'manager',
    requiredApproverIds: ['u3', 'u2'], approvedByIds: ['u3', 'u2'],
    approvalHistory: [
      { approverId: 'u3', approverName: 'Priya Sharma', approverRole: 'manager', action: 'approved', actionDate: '2026-06-28T10:00:00Z' },
      { approverId: 'u2', approverName: 'James Carter', approverRole: 'manager', action: 'approved', comment: 'Approved.', actionDate: '2026-06-29T11:00:00Z' },
    ],
    createdAt: '2026-06-27T09:00:00Z',
  },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'u4', type: 'leave_submitted', message: 'Your annual leave request (Jul 21–25) has been submitted and is awaiting approval.', relatedLeaveRequestId: 'lr1', isRead: false, createdAt: '2026-07-17T09:00:00Z' },
  { id: 'n2', userId: 'u3', type: 'leave_pending_approval', message: 'Alex Thompson has submitted a leave request for Jul 21–25. Action required.', relatedLeaveRequestId: 'lr1', isRead: false, createdAt: '2026-07-17T09:00:00Z' },
  { id: 'n3', userId: 'u4', type: 'leave_approved', message: 'Your sick leave request (Jun 5–6) has been approved by Priya Sharma.', relatedLeaveRequestId: 'lr5', isRead: true, createdAt: '2026-06-04T09:05:00Z' },
  { id: 'n5', userId: 'u2', type: 'leave_pending_approval', message: 'Maria Santos leave request has been escalated to you for approval.', relatedLeaveRequestId: 'lr2', isRead: false, createdAt: '2026-07-13T14:05:00Z' },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'al1', actorId: 'u1', actorName: 'Sarah Mitchell', action: 'CREATE_EMPLOYEE', targetType: 'User', targetId: 'u7', details: 'Created employee Emma Wilson (NDD-007)', affectedPerson: 'Emma Wilson', department: 'Engineering', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'al2', actorId: 'u1', actorName: 'Sarah Mitchell', action: 'EDIT_GRADE', targetType: 'Grade', targetId: 'g2', details: 'Updated Grade B annual quota from 18 to 21 days', createdAt: '2026-02-01T14:30:00Z' },
  { id: 'al3', actorId: 'u3', actorName: 'Priya Sharma', action: 'APPROVE_LEAVE', targetType: 'LeaveRequest', targetId: 'lr5', details: 'Approved sick leave for Alex Thompson (5 Jun – 6 Jun)', affectedPerson: 'Alex Thompson', department: 'Engineering', leaveType: 'sick', comment: 'Approved.', createdAt: '2026-06-04T09:00:00Z' },
  { id: 'al4', actorId: 'u3', actorName: 'Priya Sharma', action: 'REJECT_LEAVE', targetType: 'LeaveRequest', targetId: 'lr4', details: 'Rejected annual leave for Emma Wilson (28 Jul – 1 Aug)', affectedPerson: 'Emma Wilson', department: 'Engineering', leaveType: 'annual', comment: 'Critical sprint deadline that week.', createdAt: '2026-07-16T15:00:00Z' },
  { id: 'al5', actorId: 'u1', actorName: 'Sarah Mitchell', action: 'CREATE_LEAVE_POLICY', targetType: 'LeavePolicy', targetId: 'lp1', details: 'Created annual leave policy', leaveType: 'annual', createdAt: '2026-01-10T09:00:00Z' },
  { id: 'al6', actorId: 'u1', actorName: 'Sarah Mitchell', action: 'DEACTIVATE_EMPLOYEE', targetType: 'User', targetId: 'u8', details: 'Deactivated Noah Brown (NDD-008)', affectedPerson: 'Noah Brown', department: 'Engineering', createdAt: '2026-07-01T11:00:00Z' },
  { id: 'al7', actorId: 'u2', actorName: 'James Carter', action: 'APPROVE_LEAVE', targetType: 'LeaveRequest', targetId: 'lr7', details: 'Approved annual leave for Alex Thompson (1 Jul – 12 Jul)', affectedPerson: 'Alex Thompson', department: 'Engineering', leaveType: 'annual', comment: 'Approved.', createdAt: '2026-06-29T11:00:00Z' },
];

export const mockLeaveBalances: Record<string, LeaveBalance[]> = {
  u4: [
    { leaveType: 'annual', quota: 18, used: 5, remaining: 13 },
    { leaveType: 'sick', quota: 10, used: 2, remaining: 8 },
    { leaveType: 'casual', quota: 6, used: 0, remaining: 6 },
  ],
  u5: [
    { leaveType: 'annual', quota: 14, used: 0, remaining: 14 },
    { leaveType: 'sick', quota: 7, used: 2, remaining: 5 },
    { leaveType: 'casual', quota: 5, used: 0, remaining: 5 },
  ],
  u6: [
    { leaveType: 'annual', quota: 18, used: 3, remaining: 15 },
    { leaveType: 'sick', quota: 10, used: 0, remaining: 10 },
    { leaveType: 'casual', quota: 6, used: 1, remaining: 5 },
  ],
  u1: [
    { leaveType: 'annual', quota: 25, used: 2, remaining: 23 },
    { leaveType: 'sick', quota: 14, used: 0, remaining: 14 },
    { leaveType: 'casual', quota: 10, used: 1, remaining: 9 },
  ],
  u2: [
    { leaveType: 'annual', quota: 21, used: 3, remaining: 18 },
    { leaveType: 'sick', quota: 12, used: 1, remaining: 11 },
    { leaveType: 'casual', quota: 8, used: 0, remaining: 8 },
  ],
  u3: [
    { leaveType: 'annual', quota: 21, used: 1, remaining: 20 },
    { leaveType: 'sick', quota: 12, used: 0, remaining: 12 },
    { leaveType: 'casual', quota: 8, used: 2, remaining: 6 },
  ],
  u7: [
    { leaveType: 'annual', quota: 14, used: 0, remaining: 14 },
    { leaveType: 'sick', quota: 7, used: 0, remaining: 7 },
    { leaveType: 'casual', quota: 5, used: 0, remaining: 5 },
  ],
};

export const loginCredentials: Record<string, { password: string; userId: string }> = {
  'admin@nutrilov.com': { password: 'admin123', userId: 'u1' },
  'manager@nutrilov.com': { password: 'manager123', userId: 'u2' },
  'tl@nutrilov.com': { password: 'tl123', userId: 'u3' },
  'employee@nutrilov.com': { password: 'emp123', userId: 'u4' },
};

export const initialDesignations = [
  'Chief Executive Officer', 'Chief Operating Officer', 'Chief Technology Officer',
  'Engineering Manager', 'Product Manager', 'HR Manager', 'Finance Manager',
  'Senior Software Engineer', 'Software Engineer', 'Junior Developer',
  'Senior UI/UX Designer', 'UI/UX Designer', 'Marketing Manager',
  'Marketing Specialist', 'Sales Executive', 'Business Analyst',
  'QA Engineer', 'DevOps Engineer', 'Data Analyst', 'Content Writer',
];

export const initialDepartments = [
  'Management', 'Engineering', 'Design', 'Marketing',
  'Sales', 'Finance', 'HR', 'Operations',
];

// Backward compat exports
export const designations = initialDesignations;
export const departments = initialDepartments;
