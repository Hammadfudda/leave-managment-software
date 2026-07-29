  import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  User, Grade, LeavePolicy, LeaveRequest, AuditLog, LeaveBalance, LeaveType, Role,
} from '../types';
import { CORE_LEAVE_TYPES } from '../types';
import {
  mockUsers, mockGrades, mockLeavePolicies, mockLeaveRequests,
  mockAuditLogs, mockLeaveBalances, initialDesignations, initialDepartments,
} from '../data/mockData';
import { calcWorkingDays } from '../utils/formatDate';

interface AppDataContextType {
  users: User[];
  grades: Grade[];
  designations: string[];
  departments: string[];
  roles: string[];
  departmentSaturdayOff: Record<string, boolean>;
  leavePolicies: LeavePolicy[];
  leaveRequests: LeaveRequest[];
  auditLogs: AuditLog[];
  leaveBalances: Record<string, LeaveBalance[]>;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  addDesignation: (name: string) => void;
  addDepartment: (name: string) => void;
  addRole: (name: string) => void;
  updateDesignation: (oldName: string, newName: string) => void;
  deleteDesignation: (name: string) => void;
  updateDepartment: (oldName: string, newName: string) => void;
  deleteDepartment: (name: string) => void;
  updateRole: (oldName: string, newName: string) => void;
  deleteRole: (name: string) => void;
  deleteGrade: (id: string) => void;
  toggleDepartmentSaturday: (department: string) => void;
  addGrade: (grade: Grade) => void;
  updateGrade: (grade: Grade) => void;
  addLeavePolicy: (policy: LeavePolicy) => void;
  updateLeavePolicy: (policy: LeavePolicy) => void;
  getUserById: (id: string) => User | undefined;
  getManager: (user: User) => User | undefined;
  getActiveLeaveTypes: () => LeaveType[];
  cancelLeaveByAdmin: (
    requestId: string,
    cancelledBy: User,
    reason: string,
    returnDate: string,
  ) => void;
  cancelPendingLeave: (requestId: string, userId: string) => void;
  submitLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalHistory'>) => void;
  extendLeave: (originalRequest: LeaveRequest, initiator: User, newEndDate: string, reason: string, isPaid: boolean) => void;
  requestStopLeave: (originalRequest: LeaveRequest, employee: User, newReturnDate: string, reason: string) => void;
  approveLeave: (requestId: string, approver: User, comment?: string) => void;
  rejectLeave: (requestId: string, approver: User, comment?: string) => void;
  actOnBehalf: (requestId: string, admin: User, targetApproverId: string, action: 'approved' | 'rejected', comment?: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => [...mockUsers]);
  const [grades, setGrades] = useState<Grade[]>(() => [...mockGrades]);
  const [designations, setDesignations] = useState<string[]>(() => [...initialDesignations]);
  const [departments, setDepartments] = useState<string[]>(() => [...initialDepartments]);
  const [roles, setRoles] = useState<string[]>(() => ['Employee', 'Manager', 'Admin']);
  const [departmentSaturdayOff, setDepartmentSaturdayOff] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialDepartments.map((d) => [d, true]))
  );
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>(() => [...mockLeavePolicies]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => [...mockLeaveRequests]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => [...mockAuditLogs]);
  const [leaveBalances, setLeaveBalances] = useState<Record<string, LeaveBalance[]>>(() => ({ ...mockLeaveBalances }));

  const getUserById = useCallback((id: string) => users.find((u) => u.id === id), [users]);

  const getManager = useCallback((user: User) => {
    if (user.managerId) return users.find((u) => u.id === user.managerId);
    return undefined;
  }, [users]);

  const getActiveLeaveTypes = useCallback((): LeaveType[] => {
    const fromPolicies = leavePolicies.map((p) => p.leaveType);
    const combined = [...CORE_LEAVE_TYPES];
    fromPolicies.forEach((t) => {
      if (!combined.includes(t)) combined.push(t);
    });
    return combined;
  }, [leavePolicies]);

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const entry: AuditLog = {
      ...log,
      id: `al${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  }, []);

  const updateBalanceUsed = (employeeId: string, leaveType: LeaveType, daysToAdd: number) => {
    setLeaveBalances((prev) => {
      const balances = prev[employeeId];
      if (!balances) return prev;
      return {
        ...prev,
        [employeeId]: balances.map((b) => {
          if (b.leaveType !== leaveType) return b;
          const used = b.used + daysToAdd;
          return { ...b, used, remaining: Math.max(0, b.quota - used) };
        }),
      };
    });
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
    const grade = grades.find((g) => g.name === user.grade);
    if (grade) {
      setLeaveBalances((prev) => ({
        ...prev,
        [user.id]: [
          { leaveType: 'annual', quota: grade.annualLeaveQuota, used: 0, remaining: grade.annualLeaveQuota },
          { leaveType: 'sick', quota: grade.sickLeaveQuota, used: 0, remaining: grade.sickLeaveQuota },
          { leaveType: 'casual', quota: grade.casualLeaveQuota, used: 0, remaining: grade.casualLeaveQuota },
        ],
      }));
    }
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'CREATE_EMPLOYEE',
      targetType: 'User',
      targetId: user.id,
      details: `Created employee ${user.fullName} (${user.employeeId})`,
      affectedPerson: user.fullName,
      department: user.department,
    });
  };

  const updateUser = (user: User) => {
    setUsers((prev) => prev.map((existing) => (existing.id === user.id ? user : existing)));
    const grade = grades.find((g) => g.name === user.grade);
    setLeaveBalances((prev) => {
      const next = { ...prev };
      if (grade && !next[user.id]) {
        next[user.id] = [
          { leaveType: 'annual', quota: grade.annualLeaveQuota, used: 0, remaining: grade.annualLeaveQuota },
          { leaveType: 'sick', quota: grade.sickLeaveQuota, used: 0, remaining: grade.sickLeaveQuota },
          { leaveType: 'casual', quota: grade.casualLeaveQuota, used: 0, remaining: grade.casualLeaveQuota },
        ];
      }
      return next;
    });
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'EDIT_EMPLOYEE',
      targetType: 'User',
      targetId: user.id,
      details: `Updated employee ${user.fullName} (${user.employeeId})`,
      affectedPerson: user.fullName,
      department: user.department,
    });
  };

  const addDesignation = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || designations.includes(trimmed)) return;
    setDesignations((prev) => [...prev, trimmed].sort());
  };

  const addDepartment = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || departments.includes(trimmed)) return;
    setDepartments((prev) => [...prev, trimmed].sort());
  };

  const addRole = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles((prev) => [...prev, trimmed]);
  };

  const updateDesignation = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDesignations((prev) => prev.map((d) => (d === oldName ? trimmed : d)).sort());
  };

  const deleteDesignation = (name: string) => {
    setDesignations((prev) => prev.filter((d) => d !== name));
  };

  const updateDepartment = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDepartments((prev) => prev.map((d) => (d === oldName ? trimmed : d)).sort());
  };

  const deleteDepartment = (name: string) => {
    setDepartments((prev) => prev.filter((d) => d !== name));
  };

  const updateRole = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setRoles((prev) => prev.map((r) => (r === oldName ? trimmed : r)));
  };

  const deleteRole = (name: string) => {
    setRoles((prev) => prev.filter((r) => r !== name));
  };

  const deleteGrade = (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
  };

  const toggleDepartmentSaturday = (department: string) => {
    setDepartmentSaturdayOff((prev) => ({ ...prev, [department]: !prev[department] }));
  };

  const addGrade = (grade: Grade) => {
    setGrades((prev) => [...prev, grade]);
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'CREATE_GRADE',
      targetType: 'Grade',
      targetId: grade.id,
      details: `Created ${grade.name}`,
    });
  };

  const updateGrade = (grade: Grade) => {
    setGrades((prev) => prev.map((g) => (g.id === grade.id ? grade : g)));
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'EDIT_GRADE',
      targetType: 'Grade',
      targetId: grade.id,
      details: `Updated ${grade.name}`,
    });
  };

  const addLeavePolicy = (policy: LeavePolicy) => {
    setLeavePolicies((prev) => [...prev, policy]);
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'CREATE_LEAVE_POLICY',
      targetType: 'LeavePolicy',
      targetId: policy.id,
      details: `Created ${policy.leaveType} leave policy`,
      leaveType: policy.leaveType,
    });
  };

  const updateLeavePolicy = (policy: LeavePolicy) => {
    setLeavePolicies((prev) => prev.map((p) => (p.id === policy.id ? policy : p)));
    addAuditLog({
      actorId: 'u1',
      actorName: 'Admin',
      action: 'EDIT_LEAVE_POLICY',
      targetType: 'LeavePolicy',
      targetId: policy.id,
      details: `Updated ${policy.leaveType} leave policy`,
      leaveType: policy.leaveType,
    });
  };

  const cancelPendingLeave = (requestId: string, userId: string) => {
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId && r.employeeId === userId && r.status === 'pending'
          ? { ...r, status: 'cancelled' as const, cancelledReason: 'Cancelled by employee' }
          : r
      )
    );
  };

  const submitLeaveRequest = (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalHistory'>) => {
    const policy = leavePolicies.find((p) => p.leaveType === request.leaveType);
    const newRequest: LeaveRequest = {
      ...request,
      id: `lr${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      approvalHistory: [],
      totalWorkingDays: request.totalWorkingDays || request.totalDaysRequested,
      requiredApproverIds: policy?.approvalRouting?.approverIds || [],
      approvedByIds: [],
      rejectedByIds: [],
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    addAuditLog({
      actorId: request.employeeId,
      actorName: request.employeeName,
      action: 'SUBMIT_LEAVE',
      targetType: 'LeaveRequest',
      targetId: newRequest.id,
      details: `Submitted ${request.leaveType} leave request`,
      affectedPerson: request.employeeName,
      department: request.department,
      leaveType: request.leaveType,
      comment: request.reason,
    });
  };

  // Manager/Admin-initiated — extends an already-approved leave. This creates a brand
  // new LeaveRequest (tagged isExtension + originalRequestId) rather than mutating the
  // original, so it flows through the exact same approval chain, balance deduction, and
  // My Team / Approvals visibility rules as any normal request — no special-casing needed
  // for "where does this show up for approval."
  const extendLeave = (
    originalRequest: LeaveRequest,
    initiator: User,
    newEndDate: string,
    reason: string,
    isPaid: boolean
  ) => {
    const policy = leavePolicies.find((p) => p.leaveType === originalRequest.leaveType);
    const extensionStart = new Date(originalRequest.endDate);
    extensionStart.setDate(extensionStart.getDate() + 1);
    const startDateStr = extensionStart.toISOString().split('T')[0];

    const workingDays = calcWorkingDays(startDateStr, newEndDate);

    const newRequest: LeaveRequest = {
      id: `lr${Date.now()}`,
      createdAt: new Date().toISOString(),
      employeeId: originalRequest.employeeId,
      employeeName: originalRequest.employeeName,
      department: originalRequest.department,
      leaveType: originalRequest.leaveType,
      startDate: startDateStr,
      endDate: newEndDate,
      totalDaysRequested: workingDays,
      totalWorkingDays: workingDays,
      reason,
      status: 'pending',
      requiredApproverIds: policy?.approvalRouting?.approverIds || [],
      approvedByIds: [],
      rejectedByIds: [],
      approvalHistory: [],
      isExtension: true,
      originalRequestId: originalRequest.id,
      isPaidOverride: isPaid,
      currentApproverRole: policy?.requiresApprovalFrom === 'admin' ? 'admin' : 'manager',
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    addAuditLog({
      actorId: initiator.id,
      actorName: initiator.fullName,
      action: 'EXTEND_LEAVE',
      targetType: 'LeaveRequest',
      targetId: newRequest.id,
      details: `Extended ${originalRequest.employeeName}'s ${originalRequest.leaveType} leave through ${newEndDate} (${isPaid ? 'paid' : 'unpaid'})`,
      affectedPerson: originalRequest.employeeName,
      department: originalRequest.department,
      leaveType: originalRequest.leaveType,
      comment: reason,
    });
  };

  // Employee-initiated only — asks to end an already-approved leave early (e.g. approved
  // through 30 July, but they want to come back on 25 July instead). This is a REQUEST,
  // not an immediate action: it goes through the exact same approval chain as the leave
  // itself. Admin never initiates this on someone's behalf — Admin's only role here is
  // approving/acting-on-behalf-of a required approver, same as any other request.
  const requestStopLeave = (
    originalRequest: LeaveRequest,
    employee: User,
    newReturnDate: string,
    reason: string
  ) => {
    const policy = leavePolicies.find((p) => p.leaveType === originalRequest.leaveType);

    const newRequest: LeaveRequest = {
      id: `lr${Date.now()}`,
      createdAt: new Date().toISOString(),
      employeeId: originalRequest.employeeId,
      employeeName: originalRequest.employeeName,
      department: originalRequest.department,
      leaveType: originalRequest.leaveType,
      startDate: originalRequest.startDate,
      endDate: newReturnDate, // the proposed earlier end date
      totalDaysRequested: 0,
      totalWorkingDays: 0,
      reason,
      status: 'pending',
      requiredApproverIds: policy?.approvalRouting?.approverIds || [],
      approvedByIds: [],
      rejectedByIds: [],
      approvalHistory: [],
      isStopRequest: true,
      originalRequestId: originalRequest.id,
      currentApproverRole: policy?.requiresApprovalFrom === 'admin' ? 'admin' : 'manager',
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    addAuditLog({
      actorId: employee.id,
      actorName: employee.fullName,
      action: 'REQUEST_STOP_LEAVE',
      targetType: 'LeaveRequest',
      targetId: newRequest.id,
      details: `Requested to end ${originalRequest.leaveType} leave early, returning ${newReturnDate}`,
      affectedPerson: employee.fullName,
      department: originalRequest.department,
      leaveType: originalRequest.leaveType,
      comment: reason,
    });
  };

  const cancelLeaveByAdmin = (
    requestId: string,
    cancelledBy: User,
    reason: string,
    returnDate: string,
  ) => {
    const request = leaveRequests.find((r) => r.id === requestId);
    if (!request || request.status !== 'approved') return;

    const daysUsed = calcWorkingDays(request.startDate, returnDate);
    const entry = {
      approverId: cancelledBy.id,
      approverName: cancelledBy.fullName,
      approverRole: cancelledBy.role,
      action: 'cancelled' as const,
      comment: reason,
      actionDate: new Date().toISOString(),
    };

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'cancelled' as const,
              cancelledBy: cancelledBy.id,
              cancelledByName: cancelledBy.fullName,
              cancelledReason: reason,
              daysUsedBeforeCancel: daysUsed,
              actualEndDate: returnDate,
              approvalHistory: [...r.approvalHistory, entry],
            }
          : r
      )
    );

    if (daysUsed > 0) {
      updateBalanceUsed(request.employeeId, request.leaveType, daysUsed);
    }

    addAuditLog({
      actorId: cancelledBy.id,
      actorName: cancelledBy.fullName,
      action: 'CANCEL_LEAVE',
      targetType: 'LeaveRequest',
      targetId: requestId,
      details: `Cancelled ${request.leaveType} leave for ${request.employeeName}. ${daysUsed} day(s) counted before return.`,
      affectedPerson: request.employeeName,
      department: request.department,
      leaveType: request.leaveType,
      comment: reason,
    });
  };

  // Sequential approval status computation:
  // requiredApproverIds[0] = gatekeeper (must approve first, reject = immediate stop)
  // requiredApproverIds[1..] = parallel tier (all must approve after gatekeeper; any reject = conflict/pending)
  const computeLeaveStatus = (
    requiredApproverIds: string[],
    approvedByIds: string[],
    rejectedByIds: string[]
  ): LeaveRequest['status'] => {
    if (requiredApproverIds.length === 0) return 'approved';

    const gatekeeperId = requiredApproverIds[0];
    const restIds = requiredApproverIds.slice(1);

    if (rejectedByIds.includes(gatekeeperId)) return 'rejected';
    if (!approvedByIds.includes(gatekeeperId)) return 'pending';

    if (restIds.length === 0) return 'approved';

    const allRestApproved = restIds.every((id) => approvedByIds.includes(id));
    if (allRestApproved) return 'approved';

    return 'pending';
  };

  const approveLeave = (requestId: string, approver: User, comment?: string) => {
    const request = leaveRequests.find((r) => r.id === requestId);
    if (!request) return;

    const entry = {
      approverId: approver.id,
      approverName: approver.fullName,
      approverRole: approver.role,
      action: 'approved' as const,
      comment,
      actionDate: new Date().toISOString(),
    };

    const updatedApprovedByIds = Array.from(new Set([...(request.approvedByIds || []), approver.id]));
    const rejectedByIds = request.rejectedByIds || [];
    const required = request.requiredApproverIds || [];

    const newStatus: LeaveRequest['status'] =
      approver.role === 'admin' ? 'approved' : computeLeaveStatus(required, updatedApprovedByIds, rejectedByIds);

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: newStatus, approvedByIds: updatedApprovedByIds, approvalHistory: [...r.approvalHistory, entry] }
          : r
      )
    );

    if (newStatus === 'approved') {
      if (request.isStopRequest && request.originalRequestId) {
        const original = leaveRequests.find((r) => r.id === request.originalRequestId);
        if (original) {
          const daysActuallyUsed = calcWorkingDays(original.startDate, request.endDate);
          const daysRestored = Math.max(0, original.totalWorkingDays - daysActuallyUsed);

          setLeaveRequests((prev) =>
            prev.map((r) =>
              r.id === original.id
                ? { ...r, actualEndDate: request.endDate, daysUsedBeforeCancel: daysActuallyUsed }
                : r
            )
          );

          if (daysRestored > 0) {
            updateBalanceUsed(original.employeeId, original.leaveType as LeaveType, -daysRestored);
          }
        }
      } else if (request.totalWorkingDays > 0) {
        updateBalanceUsed(request.employeeId, request.leaveType as LeaveType, request.totalWorkingDays);
      }
    }

    addAuditLog({
      actorId: approver.id,
      actorName: approver.fullName,
      action: 'APPROVE_LEAVE',
      targetType: 'LeaveRequest',
      targetId: requestId,
      details: `Approved ${request.leaveType} leave for ${request.employeeName}`,
      affectedPerson: request.employeeName,
      department: request.department,
      leaveType: request.leaveType,
      comment,
    });
  };

  const rejectLeave = (requestId: string, approver: User, comment?: string) => {
    const request = leaveRequests.find((r) => r.id === requestId);
    if (!request) return;

    const entry = {
      approverId: approver.id,
      approverName: approver.fullName,
      approverRole: approver.role,
      action: 'rejected' as const,
      comment,
      actionDate: new Date().toISOString(),
    };

    const updatedRejectedByIds = Array.from(new Set([...(request.rejectedByIds || []), approver.id]));
    const approvedByIds = request.approvedByIds || [];
    const required = request.requiredApproverIds || [];

    const newStatus: LeaveRequest['status'] =
      approver.role === 'admin' ? 'rejected' : computeLeaveStatus(required, approvedByIds, updatedRejectedByIds);

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: newStatus, rejectedByIds: updatedRejectedByIds, approvalHistory: [...r.approvalHistory, entry] }
          : r
      )
    );

    addAuditLog({
      actorId: approver.id,
      actorName: approver.fullName,
      action: 'REJECT_LEAVE',
      targetType: 'LeaveRequest',
      targetId: requestId,
      details: `Rejected ${request.leaveType} leave for ${request.employeeName}`,
      affectedPerson: request.employeeName,
      department: request.department,
      leaveType: request.leaveType,
      comment,
    });
  };

  // Admin acts as a substitute for whoever's current turn it is (e.g., Manager rejected
  // by mistake and it's now resolved) — this fills that specific person's slot and lets
  // the chain continue normally to the next required approver, rather than skipping everyone.
  const actOnBehalf = (
    requestId: string,
    admin: User,
    targetApproverId: string,
    action: 'approved' | 'rejected',
    comment?: string
  ) => {
    const request = leaveRequests.find((r) => r.id === requestId);
    if (!request) return;

    const targetApprover = getUserById(targetApproverId);
    const entry = {
      approverId: targetApproverId,
      approverName: targetApprover?.fullName || 'Unknown',
      approverRole: targetApprover?.role || 'manager',
      action,
      comment: comment ? `${comment} (approved by Admin on behalf of ${targetApprover?.fullName})` : `Approved by Admin on behalf of ${targetApprover?.fullName}`,
      actionDate: new Date().toISOString(),
    };

    const required = request.requiredApproverIds || [];
    const updatedApprovedByIds = action === 'approved'
      ? Array.from(new Set([...(request.approvedByIds || []), targetApproverId]))
      : (request.approvedByIds || []);
    const updatedRejectedByIds = action === 'rejected'
      ? Array.from(new Set([...(request.rejectedByIds || []), targetApproverId]))
      : (request.rejectedByIds || []);

    const newStatus = computeLeaveStatus(required, updatedApprovedByIds, updatedRejectedByIds);

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: newStatus, approvedByIds: updatedApprovedByIds, rejectedByIds: updatedRejectedByIds, approvalHistory: [...r.approvalHistory, entry] }
          : r
      )
    );

    if (newStatus === 'approved') {
      if (request.isStopRequest && request.originalRequestId) {
        const original = leaveRequests.find((r) => r.id === request.originalRequestId);
        if (original) {
          const daysActuallyUsed = calcWorkingDays(original.startDate, request.endDate);
          const daysRestored = Math.max(0, original.totalWorkingDays - daysActuallyUsed);

          setLeaveRequests((prev) =>
            prev.map((r) =>
              r.id === original.id
                ? { ...r, actualEndDate: request.endDate, daysUsedBeforeCancel: daysActuallyUsed }
                : r
            )
          );

          if (daysRestored > 0) {
            updateBalanceUsed(original.employeeId, original.leaveType as LeaveType, -daysRestored);
          }
        }
      } else if (request.totalWorkingDays > 0) {
        updateBalanceUsed(request.employeeId, request.leaveType as LeaveType, request.totalWorkingDays);
      }
    }

    addAuditLog({
      actorId: admin.id,
      actorName: admin.fullName,
      action: action === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      targetType: 'LeaveRequest',
      targetId: requestId,
      details: `Admin ${action} ${request.leaveType} leave for ${request.employeeName} on behalf of ${targetApprover?.fullName}`,
      affectedPerson: request.employeeName,
      department: request.department,
      leaveType: request.leaveType,
      comment,
    });
  };

  return (
    <AppDataContext.Provider
      value={{
        users,
        grades,
        designations,
        departments,
        roles,
        departmentSaturdayOff,
        leavePolicies,
        leaveRequests,
        auditLogs,
        leaveBalances,
        addUser,
        updateUser,
        addDesignation,
        addDepartment,
        addRole,
        updateDesignation,
        deleteDesignation,
        updateDepartment,
        deleteDepartment,
        updateRole,
        deleteRole,
        deleteGrade,
        toggleDepartmentSaturday,
        addGrade,
        updateGrade,
        addLeavePolicy,
        updateLeavePolicy,
        getUserById,
        getManager,
        getActiveLeaveTypes,
        cancelLeaveByAdmin,
        cancelPendingLeave,
        submitLeaveRequest,
        extendLeave,
        requestStopLeave,
        approveLeave,
        rejectLeave,
        actOnBehalf,
        addAuditLog,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export function getReportingChain(user: User, getUserById: (id: string) => User | undefined) {
  const manager = user.managerId ? getUserById(user.managerId) : undefined;
  return { manager };
}
