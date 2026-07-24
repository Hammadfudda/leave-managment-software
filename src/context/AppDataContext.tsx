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
  leavePolicies: LeavePolicy[];
  leaveRequests: LeaveRequest[];
  auditLogs: AuditLog[];
  leaveBalances: Record<string, LeaveBalance[]>;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  addDesignation: (name: string) => void;
  addDepartment: (name: string) => void;
  addRole: (name: string) => void;
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
  approveLeave: (requestId: string, approver: User, comment?: string) => void;
  rejectLeave: (requestId: string, approver: User, comment?: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => [...mockUsers]);
  const [grades, setGrades] = useState<Grade[]>(() => [...mockGrades]);
  const [designations, setDesignations] = useState<string[]>(() => [...initialDesignations]);
  const [departments, setDepartments] = useState<string[]>(() => [...initialDepartments]);
  const [roles, setRoles] = useState<string[]>(() => ['Employee', 'Manager', 'Admin']);
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

    // Add this approver to the approved-by list (avoid duplicates)
    const updatedApprovedByIds = Array.from(new Set([...(request.approvedByIds || []), approver.id]));

    // Request is fully approved only once every required approver has signed off.
    // If no specific approvers were set on the policy, fall back to a single admin/manager approval.
    const required = request.requiredApproverIds || [];
    const allRequiredHaveApproved =
      required.length > 0
        ? required.every((id) => updatedApprovedByIds.includes(id))
        : true;

    const newStatus: LeaveRequest['status'] = allRequiredHaveApproved ? 'approved' : 'pending';

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: newStatus,
              approvedByIds: updatedApprovedByIds,
              approvalHistory: [...r.approvalHistory, entry],
            }
          : r
      )
    );

    if (allRequiredHaveApproved && request.totalWorkingDays > 0) {
      updateBalanceUsed(request.employeeId, request.leaveType as LeaveType, request.totalWorkingDays);
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

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rejected' as const, approvalHistory: [...r.approvalHistory, entry] }
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

  return (
    <AppDataContext.Provider
      value={{
        users,
        grades,
        designations,
        departments,
        roles,
        leavePolicies,
        leaveRequests,
        auditLogs,
        leaveBalances,
        addUser,
        updateUser,
        addDesignation,
        addDepartment,
        addRole,
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
        approveLeave,
        rejectLeave,
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
