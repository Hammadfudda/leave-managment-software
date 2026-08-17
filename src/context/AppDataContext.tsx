  import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
  } from 'react';

  import type {
    User,
    Grade,
    LeavePolicy,
    LeaveRequest,
    AuditLog,
    LeaveBalance,
    LeaveType,
  } from '../types';

  import { CORE_LEAVE_TYPES } from '../types';

  import {
    mockGrades,
    mockLeavePolicies,
    initialDesignations,
    initialDepartments,
  } from '../data/mockData';

  import { calcWorkingDays } from '../utils/formatDate';

  import api, {
    getApiErrorMessage,
  } from '../services/api';

  import {
    getEmployees as apiGetEmployees,
    createEmployee as apiCreateEmployee,
    updateEmployee as apiUpdateEmployee,
    removeEmployee as apiRemoveEmployee,
    restoreEmployee as apiRestoreEmployee,
    type CreateEmployeePayload,
    type UpdateEmployeePayload,
  } from '../services/employees';

  import {
    getLeaveRequests as apiGetLeaveRequests,
  } from '../services/leaveRequests';

  /* =========================================================
    TYPES
  ========================================================= */

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

    leaveBalances: Record<
      string,
      LeaveBalance[]
    >;

    employeesLoading: boolean;
    employeeApiError: string;

    refreshEmployees: () => Promise<void>;
    refreshLookups: () => Promise<void>;
    refreshLeaveRequests: () => Promise<void>;

    addUser: (
      user: User
    ) => Promise<User | undefined>;

    updateUser: (
      user: User
    ) => Promise<User | undefined>;

    removeUser: (
      id: string
    ) => Promise<boolean>;

    restoreUser: (
      id: string
    ) => Promise<User | undefined>;

    addDesignation: (
      name: string
    ) => Promise<void>;

    addDepartment: (
      name: string
    ) => Promise<void>;

    addRole: (
      name: string
    ) => Promise<void>;

    updateDesignation: (
      oldName: string,
      newName: string
    ) => Promise<void>;

    deleteDesignation: (
      name: string
    ) => Promise<void>;

    updateDepartment: (
      oldName: string,
      newName: string
    ) => Promise<void>;

    deleteDepartment: (
      name: string
    ) => Promise<void>;

    updateRole: (
      oldName: string,
      newName: string
    ) => Promise<void>;

    deleteRole: (
      name: string
    ) => Promise<void>;

    deleteGrade: (
      id: string
    ) => Promise<void>;

    toggleDepartmentSaturday: (
      department: string
    ) => Promise<void>;

    addGrade: (
      grade: Grade
    ) => Promise<void>;

    updateGrade: (
      grade: Grade
    ) => Promise<void>;

    addLeavePolicy: (
      policy: LeavePolicy
    ) => void;

    updateLeavePolicy: (
      policy: LeavePolicy
    ) => void;

    getUserById: (
      id: string
    ) => User | undefined;

    getManager: (
      user: User
    ) => User | undefined;

    getActiveLeaveTypes: () => LeaveType[];

    cancelLeaveByAdmin: (
      requestId: string,
      cancelledBy: User,
      reason: string,
      returnDate: string
    ) => void;

    cancelPendingLeave: (
      requestId: string,
      userId: string
    ) => void;

    submitLeaveRequest: (
      request: Omit<
        LeaveRequest,
        | 'id'
        | 'createdAt'
        | 'status'
        | 'approvalHistory'
      >
    ) => void;

    extendLeave: (
      originalRequest: LeaveRequest,
      initiator: User,
      newEndDate: string,
      reason: string,
      isPaid: boolean
    ) => void;

    requestStopLeave: (
      originalRequest: LeaveRequest,
      employee: User,
      newReturnDate: string,
      reason: string
    ) => void;

    approveLeave: (
      requestId: string,
      approver: User,
      comment?: string
    ) => void;

    rejectLeave: (
      requestId: string,
      approver: User,
      comment?: string
    ) => void;

    actOnBehalf: (
      requestId: string,
      admin: User,
      targetApproverId: string,
      action: 'approved' | 'rejected',
      comment?: string
    ) => void;

    addAuditLog: (
      log: Omit<
        AuditLog,
        'id' | 'createdAt'
      >
    ) => void;
  }

  const AppDataContext =
    createContext<
      AppDataContextType | undefined
    >(undefined);

  /* =========================================================
    PROVIDER
  ========================================================= */

  export function AppDataProvider({
    children,
  }: {
    children: ReactNode;
  }) {
    /*
    * Existing mock values are temporarily
    * retained so unfinished pages do not
    * break during API migration.
    *
    * Employees page will call
    * refreshEmployees() and replace users
    * with real MongoDB data.
    */

    const [users, setUsers] =
      useState<User[]>([]);

    const [grades, setGrades] =
      useState<Grade[]>(() => [
        ...mockGrades,
      ]);

    const [
      designations,
      setDesignations,
    ] = useState<string[]>(
      () => [...initialDesignations]
    );

    const [
      departments,
      setDepartments,
    ] = useState<string[]>(
      () => [...initialDepartments]
    );

    const [roles, setRoles] =
      useState<string[]>([
        'Employee',
        'Manager',
        'Admin',
      ]);

    const [
      departmentSaturdayOff,
      setDepartmentSaturdayOff,
    ] = useState<
      Record<string, boolean>
    >(() =>
      Object.fromEntries(
        initialDepartments.map(
          (department) => [
            department,
            true,
          ]
        )
      )
    );

    const [
      leavePolicies,
      setLeavePolicies,
    ] = useState<LeavePolicy[]>(
      () => [...mockLeavePolicies]
    );

    const [
      leaveRequests,
      setLeaveRequests,
    ] = useState<LeaveRequest[]>([]);

    const [auditLogs, setAuditLogs] =
      useState<AuditLog[]>([]);

    const [
      leaveBalances,
      setLeaveBalances,
    ] = useState<
      Record<string, LeaveBalance[]>
    >({});

    const [
      employeesLoading,
      setEmployeesLoading,
    ] = useState(false);

    const [
      employeeApiError,
      setEmployeeApiError,
    ] = useState('');

    /* =========================================================
      EMPLOYEE API
    ========================================================= */

    const refreshEmployees =
      useCallback(async () => {
        setEmployeesLoading(true);
        setEmployeeApiError('');

        try {
          const result =
            await apiGetEmployees();

          setUsers(result);
        } catch (error) {
          const message =
            getApiErrorMessage(
              error,
              'Unable to load employees.'
            );

          setEmployeeApiError(message);

          throw error;
        } finally {
          setEmployeesLoading(false);
        }
      }, []);

    /* =========================================================
      LEAVE REQUEST API
    ========================================================= */

    const refreshLeaveRequests =
      useCallback(async () => {
        try {
          const requests =
            await apiGetLeaveRequests();

          setLeaveRequests(requests);
        } catch (error) {
          console.error(
            'Unable to load leave requests:',
            getApiErrorMessage(
              error,
              'Unable to load leave requests.'
            )
          );

          throw error;
        }
      }, []);

    /* =========================================================
      LOOKUP / TAXONOMY API
    ========================================================= */

    const refreshLookups =
      useCallback(async () => {
        try {
          const [
            gradeResponse,
            departmentResponse,
            designationResponse,
            roleResponse,
          ] = await Promise.all([
            api.get('/grades'),
            api.get('/departments'),
            api.get('/designations'),
            api.get('/roles'),
          ]);

          const backendGrades =
            gradeResponse.data?.data || [];

          setGrades(
            backendGrades.map(
              (grade: any): Grade => ({
                id: grade._id,
                name: grade.name,

                annualLeaveQuota:
                  grade.annualLeaveQuota ??
                  0,

                sickLeaveQuota:
                  grade.sickLeaveQuota ??
                  0,

                casualLeaveQuota:
                  grade.casualLeaveQuota ??
                  0,

                carryForwardAllowed:
                  Boolean(
                    grade.carryForwardAllowed
                  ),

                maxCarryForwardDays:
                  grade.maxCarryForwardDays ??
                  0,

                description:
                  grade.description,
              })
            )
          );

          const backendDepartments =
            departmentResponse.data
              ?.data || [];

          setDepartments(
            backendDepartments.map(
              (department: any) =>
                department.name
            )
          );

          setDepartmentSaturdayOff(
            Object.fromEntries(
              backendDepartments.map(
                (department: any) => [
                  department.name,
                  Boolean(
                    department.saturdayOff
                  ),
                ]
              )
            )
          );

          setDesignations(
            (
              designationResponse.data
                ?.data || []
            ).map(
              (designation: any) =>
                designation.name
            )
          );

          setRoles(
            (
              roleResponse.data?.data ||
              []
            ).map(
              (role: any) =>
                role.name
            )
          );
        } catch (error) {
          console.error(
            'Lookup data load failed:',
            getApiErrorMessage(error)
          );

          throw error;
        }
      }, []);

    /* =========================================================
      BASIC HELPERS
    ========================================================= */

    const getUserById =
      useCallback(
        (id: string) =>
          users.find(
            (user) =>
              user.id === id
          ),
        [users]
      );

    const getManager =
      useCallback(
        (user: User) => {
          if (!user.managerId) {
            return undefined;
          }

          return users.find(
            (candidate) =>
              candidate.id ===
              user.managerId
          );
        },
        [users]
      );

    const getActiveLeaveTypes =
      useCallback((): LeaveType[] => {
        const fromPolicies =
          leavePolicies.map(
            (policy) =>
              policy.leaveType as LeaveType
          );

        const combined = [
          ...CORE_LEAVE_TYPES,
        ];

        fromPolicies.forEach(
          (type) => {
            if (
              !combined.includes(type)
            ) {
              combined.push(type);
            }
          }
        );

        return combined;
      }, [leavePolicies]);

    /* =========================================================
      AUDIT LOCAL STATE
      Backend also creates its own audit logs.
      This remains until Audit API phase.
    ========================================================= */

    const addAuditLog =
      useCallback(
        (
          log: Omit<
            AuditLog,
            'id' | 'createdAt'
          >
        ) => {
          const entry: AuditLog = {
            ...log,

            id: `al${Date.now()}`,

            createdAt:
              new Date().toISOString(),
          };

          setAuditLogs(
            (previous) => [
              entry,
              ...previous,
            ]
          );
        },
        []
      );

    /* =========================================================
      EMPLOYEE CREATE
    ========================================================= */

    const addUser = async (
      user: User
    ): Promise<User | undefined> => {
      setEmployeeApiError('');

      try {
        const selectedGrade =
          grades.find(
            (grade) =>
              grade.name ===
              user.grade
          );

        if (!selectedGrade) {
          throw new Error(
            'Please select a valid grade.'
          );
        }

        const payload: CreateEmployeePayload =
          {
            fullName:
              user.fullName.trim(),

            email:
              user.email
                .trim()
                .toLowerCase(),

            cnic:
              user.cnic.trim(),

            role:
              user.role === 'manager'
                ? 'manager'
                : 'employee',

            gradeId:
              selectedGrade.id,

            employeeId:
              user.employeeId.trim(),

            designation:
              user.designation,

            department:
              user.department,

            dateOfJoining:
              user.dateOfJoining,

            phone:
              user.phone || undefined,

            managerId:
              user.managerId || null,

            canApproveOtherDepartments:
              Boolean(
                user.canApproveOtherDepartments
              ),

            profilePhotoUrl:
              user.profilePhotoUrl,
          };

        const created =
          await apiCreateEmployee(
            payload
          );

        setUsers(
          (previous) => [
            ...previous.filter(
              (existing) =>
                existing.id !==
                created.id
            ),

            created,
          ]
        );

        return created;
      } catch (error) {
        const message =
          getApiErrorMessage(
            error,
            'Unable to create employee.'
          );

        setEmployeeApiError(message);

        throw error;
      }
    };

    /* =========================================================
      EMPLOYEE UPDATE
    ========================================================= */

    const updateUser = async (
      user: User
    ): Promise<User | undefined> => {
      setEmployeeApiError('');

      try {
        const selectedGrade =
          grades.find(
            (grade) =>
              grade.name ===
              user.grade
          );

        const payload: UpdateEmployeePayload =
          {
            fullName:
              user.fullName.trim(),

            email:
              user.email
                .trim()
                .toLowerCase(),

            role:
              user.role,

            gradeId:
              selectedGrade?.id,

            managerId:
              user.managerId || null,

            canApproveOtherDepartments:
              Boolean(
                user.canApproveOtherDepartments
              ),

            employeeId:
              user.employeeId.trim(),

            designation:
              user.designation,

            department:
              user.department,

            phone:
              user.phone || '',

            dateOfJoining:
              user.dateOfJoining,

            status:
              user.status,

            profilePhotoUrl:
              user.profilePhotoUrl,
          };

        const updated =
          await apiUpdateEmployee(
            user.id,
            payload
          );

        setUsers(
          (previous) =>
            previous.map(
              (existing) =>
                existing.id ===
                updated.id
                  ? updated
                  : existing
            )
        );

        return updated;
      } catch (error) {
        const message =
          getApiErrorMessage(
            error,
            'Unable to update employee.'
          );

        setEmployeeApiError(message);

        throw error;
      }
    };

    /* =========================================================
      EMPLOYEE SOFT REMOVE
    ========================================================= */

    const removeUser = async (
      id: string
    ): Promise<boolean> => {
      setEmployeeApiError('');

      try {
        await apiRemoveEmployee(id);

        setUsers(
          (previous) =>
            previous.filter(
              (user) =>
                user.id !== id
            )
        );

        return true;
      } catch (error) {
        const message =
          getApiErrorMessage(
            error,
            'Unable to remove employee.'
          );

        setEmployeeApiError(message);

        throw error;
      }
    };

    /* =========================================================
      RESTORE EMPLOYEE
    ========================================================= */

    const restoreUser = async (
      id: string
    ): Promise<User | undefined> => {
      try {
        const restored =
          await apiRestoreEmployee(id);

        setUsers(
          (previous) => [
            ...previous.filter(
              (user) =>
                user.id !==
                restored.id
            ),

            restored,
          ]
        );

        return restored;
      } catch (error) {
        setEmployeeApiError(
          getApiErrorMessage(
            error,
            'Unable to restore employee.'
          )
        );

        throw error;
      }
    };

    /* =========================================================
      DESIGNATIONS
    ========================================================= */

    const addDesignation =
      async (
        name: string
      ) => {
        const trimmed =
          name.trim();

        if (!trimmed) return;

        const response =
          await api.post(
            '/designations',
            {
              name: trimmed,
            }
          );

        const savedName =
          response.data.data.name;

        setDesignations(
          (previous) =>
            Array.from(
              new Set([
                ...previous,
                savedName,
              ])
            ).sort()
        );
      };

    const updateDesignation =
      async (
        oldName: string,
        newName: string
      ) => {
        const trimmed =
          newName.trim();

        if (!trimmed) return;

        const listResponse =
          await api.get(
            '/designations'
          );

        const current =
          listResponse.data.data.find(
            (item: any) =>
              item.name === oldName
          );

        if (!current) {
          throw new Error(
            'Designation not found.'
          );
        }

        await api.patch(
          `/designations/${current._id}`,
          {
            name: trimmed,
          }
        );

        setDesignations(
          (previous) =>
            previous
              .map((item) =>
                item === oldName
                  ? trimmed
                  : item
              )
              .sort()
        );
      };

    const deleteDesignation =
      async (
        name: string
      ) => {
        const response =
          await api.get(
            '/designations'
          );

        const current =
          response.data.data.find(
            (item: any) =>
              item.name === name
          );

        if (!current) return;

        await api.delete(
          `/designations/${current._id}`
        );

        setDesignations(
          (previous) =>
            previous.filter(
              (item) =>
                item !== name
            )
        );
      };

    /* =========================================================
      DEPARTMENTS
    ========================================================= */

    const addDepartment =
      async (
        name: string
      ) => {
        const trimmed =
          name.trim();

        if (!trimmed) return;

        const response =
          await api.post(
            '/departments',
            {
              name: trimmed,
              saturdayOff: true,
            }
          );

        const department =
          response.data.data;

        setDepartments(
          (previous) =>
            Array.from(
              new Set([
                ...previous,
                department.name,
              ])
            ).sort()
        );

        setDepartmentSaturdayOff(
          (previous) => ({
            ...previous,

            [department.name]:
              Boolean(
                department.saturdayOff
              ),
          })
        );
      };

    const updateDepartment =
      async (
        oldName: string,
        newName: string
      ) => {
        const trimmed =
          newName.trim();

        if (!trimmed) return;

        const response =
          await api.get(
            '/departments'
          );

        const current =
          response.data.data.find(
            (item: any) =>
              item.name === oldName
          );

        if (!current) {
          throw new Error(
            'Department not found.'
          );
        }

        await api.patch(
          `/departments/${current._id}`,
          {
            name: trimmed,
          }
        );

        setDepartments(
          (previous) =>
            previous
              .map((item) =>
                item === oldName
                  ? trimmed
                  : item
              )
              .sort()
        );

        setDepartmentSaturdayOff(
          (previous) => {
            const next = {
              ...previous,
            };

            const value =
              next[oldName] ?? true;

            delete next[oldName];

            next[trimmed] =
              value;

            return next;
          }
        );
      };

    const deleteDepartment =
      async (
        name: string
      ) => {
        const response =
          await api.get(
            '/departments'
          );

        const current =
          response.data.data.find(
            (item: any) =>
              item.name === name
          );

        if (!current) return;

        await api.delete(
          `/departments/${current._id}`
        );

        setDepartments(
          (previous) =>
            previous.filter(
              (item) =>
                item !== name
            )
        );

        setDepartmentSaturdayOff(
          (previous) => {
            const next = {
              ...previous,
            };

            delete next[name];

            return next;
          }
        );
      };

    const toggleDepartmentSaturday =
      async (
        department: string
      ) => {
        const response =
          await api.get(
            '/departments'
          );

        const current =
          response.data.data.find(
            (item: any) =>
              item.name ===
              department
          );

        if (!current) return;

        const newValue =
          !Boolean(
            current.saturdayOff
          );

        await api.patch(
          `/departments/${current._id}`,
          {
            saturdayOff:
              newValue,
          }
        );

        setDepartmentSaturdayOff(
          (previous) => ({
            ...previous,

            [department]:
              newValue,
          })
        );
      };

    /* =========================================================
      ROLE LABELS
    ========================================================= */

    const addRole = async (
      name: string
    ) => {
      const trimmed =
        name.trim();

      if (!trimmed) return;

      const response =
        await api.post(
          '/roles',
          {
            name: trimmed,
          }
        );

      setRoles(
        (previous) =>
          Array.from(
            new Set([
              ...previous,
              response.data.data.name,
            ])
          )
      );
    };

    const updateRole = async (
      oldName: string,
      newName: string
    ) => {
      const trimmed =
        newName.trim();

      if (!trimmed) return;

      const response =
        await api.get('/roles');

      const current =
        response.data.data.find(
          (item: any) =>
            item.name === oldName
        );

      if (!current) return;

      await api.patch(
        `/roles/${current._id}`,
        {
          name: trimmed,
        }
      );

      setRoles(
        (previous) =>
          previous.map(
            (item) =>
              item === oldName
                ? trimmed
                : item
          )
      );
    };

    const deleteRole = async (
      name: string
    ) => {
      const response =
        await api.get('/roles');

      const current =
        response.data.data.find(
          (item: any) =>
            item.name === name
        );

      if (!current) return;

      await api.delete(
        `/roles/${current._id}`
      );

      setRoles(
        (previous) =>
          previous.filter(
            (item) =>
              item !== name
          )
      );
    };

    /* =========================================================
      GRADES
    ========================================================= */

    const addGrade = async (
      grade: Grade
    ) => {
      const response =
        await api.post(
          '/grades',
          {
            name: grade.name,

            annualLeaveQuota:
              grade.annualLeaveQuota,

            sickLeaveQuota:
              grade.sickLeaveQuota,

            casualLeaveQuota:
              grade.casualLeaveQuota,

            carryForwardAllowed:
              grade.carryForwardAllowed,

            maxCarryForwardDays:
              grade.maxCarryForwardDays,

            description:
              grade.description,
          }
        );

      const saved =
        response.data.data;

      setGrades(
        (previous) => [
          ...previous,

          {
            ...grade,
            id: saved._id,
          },
        ]
      );
    };

    const updateGrade = async (
      grade: Grade
    ) => {
      const response =
        await api.patch(
          `/grades/${grade.id}`,
          {
            name: grade.name,

            annualLeaveQuota:
              grade.annualLeaveQuota,

            sickLeaveQuota:
              grade.sickLeaveQuota,

            casualLeaveQuota:
              grade.casualLeaveQuota,

            carryForwardAllowed:
              grade.carryForwardAllowed,

            maxCarryForwardDays:
              grade.maxCarryForwardDays,

            description:
              grade.description,
          }
        );

      const saved =
        response.data.data;

      setGrades(
        (previous) =>
          previous.map(
            (item) =>
              item.id === grade.id
                ? {
                    ...grade,
                    id: saved._id,
                  }
                : item
          )
      );
    };

    const deleteGrade = async (
      id: string
    ) => {
      await api.delete(
        `/grades/${id}`
      );

      setGrades(
        (previous) =>
          previous.filter(
            (grade) =>
              grade.id !== id
          )
      );
    };

    /* =========================================================
      LEAVE POLICY
      Temporary local state.
      API integration comes next.
    ========================================================= */

    const addLeavePolicy = (
      policy: LeavePolicy
    ) => {
      setLeavePolicies(
        (previous) => [
          ...previous,
          policy,
        ]
      );

      addAuditLog({
        actorId: 'u1',
        actorName: 'Admin',
        action:
          'CREATE_LEAVE_POLICY',
        targetType:
          'LeavePolicy',
        targetId: policy.id,

        details:
          `Created ${policy.leaveType} leave policy`,

        leaveType:
          policy.leaveType,
      });
    };

    const updateLeavePolicy = (
      policy: LeavePolicy
    ) => {
      setLeavePolicies(
        (previous) =>
          previous.map(
            (item) =>
              item.id === policy.id
                ? policy
                : item
          )
      );

      addAuditLog({
        actorId: 'u1',
        actorName: 'Admin',
        action:
          'EDIT_LEAVE_POLICY',
        targetType:
          'LeavePolicy',
        targetId: policy.id,

        details:
          `Updated ${policy.leaveType} leave policy`,

        leaveType:
          policy.leaveType,
      });
    };

    /* =========================================================
      LEAVE BALANCE TEMP LOCAL LOGIC
    ========================================================= */

    const updateBalanceUsed = (
      employeeId: string,
      leaveType: LeaveType,
      daysToAdd: number
    ) => {
      setLeaveBalances(
        (previous) => {
          const balances =
            previous[employeeId];

          if (!balances) {
            return previous;
          }

          return {
            ...previous,

            [employeeId]:
              balances.map(
                (balance) => {
                  if (
                    balance.leaveType !==
                    leaveType
                  ) {
                    return balance;
                  }

                  const used =
                    balance.used +
                    daysToAdd;

                  return {
                    ...balance,

                    used,

                    remaining:
                      Math.max(
                        0,
                        balance.quota -
                          used
                      ),
                  };
                }
              ),
          };
        }
      );
    };

    /* =========================================================
      CANCEL PENDING
    ========================================================= */

    const cancelPendingLeave = (
      requestId: string,
      userId: string
    ) => {
      setLeaveRequests(
        (previous) =>
          previous.map(
            (request) =>
              request.id ===
                requestId &&
              request.employeeId ===
                userId &&
              request.status ===
                'pending'
                ? {
                    ...request,

                    status:
                      'cancelled' as const,

                    cancelledReason:
                      'Cancelled by employee',
                  }
                : request
          )
      );
    };

    /* =========================================================
      APPROVER RESOLUTION
    ========================================================= */

    const resolvePolicyApproverIds =
      (
        policy:
          | LeavePolicy
          | undefined,

        employeeId: string
      ): string[] => {
        if (!policy) {
          return [];
        }

        if (
          policy.finalApprovalMode
        ) {
          const employee =
            users.find(
              (user) =>
                user.id ===
                employeeId
            );

          if (
            !employee?.managerId
          ) {
            return [];
          }

          const manager =
            users.find(
              (candidate) =>
                candidate.id ===
                employee.managerId
            );

          if (
            !manager ||
            manager.role !==
              'manager' ||
            manager.status !==
              'active'
          ) {
            return [];
          }

          return [manager.id];
        }

        return (
          policy
            .approvalRouting
            ?.approverIds || []
        );
      };

    /* =========================================================
      SUBMIT LEAVE
      Temporary local implementation.
    ========================================================= */

    const submitLeaveRequest = (
      request: Omit<
        LeaveRequest,
        | 'id'
        | 'createdAt'
        | 'status'
        | 'approvalHistory'
      >
    ) => {
      const policy =
        leavePolicies.find(
          (item) =>
            item.leaveType ===
            request.leaveType
        );

      const requiredApproverIds =
        resolvePolicyApproverIds(
          policy,
          request.employeeId
        );

      if (
        policy?.finalApprovalMode &&
        requiredApproverIds.length ===
          0
      ) {
        console.error(
          `Cannot submit ${request.leaveType} leave: ${request.employeeName} does not have an active assigned Manager.`
        );

        return;
      }

      const newRequest: LeaveRequest =
        {
          ...request,

          id: `lr${Date.now()}`,

          createdAt:
            new Date().toISOString(),

          status: 'pending',

          approvalHistory: [],

          totalWorkingDays:
            request.totalWorkingDays ||
            request.totalDaysRequested,

          requiredApproverIds,

          approvedByIds: [],

          rejectedByIds: [],

          currentApproverRole:
            'manager',
        };

      setLeaveRequests(
        (previous) => [
          newRequest,
          ...previous,
        ]
      );

      addAuditLog({
        actorId:
          request.employeeId,

        actorName:
          request.employeeName,

        action:
          'SUBMIT_LEAVE',

        targetType:
          'LeaveRequest',

        targetId:
          newRequest.id,

        details:
          `Submitted ${request.leaveType} leave request`,

        affectedPerson:
          request.employeeName,

        department:
          request.department,

        leaveType:
          request.leaveType,

        comment:
          request.reason,
      });
    };

    /* =========================================================
      EXTEND LEAVE
    ========================================================= */

    const extendLeave = (
      originalRequest:
        LeaveRequest,

      initiator: User,

      newEndDate: string,

      reason: string,

      isPaid: boolean
    ) => {
      const policy =
        leavePolicies.find(
          (item) =>
            item.leaveType ===
            originalRequest.leaveType
        );

      const requiredApproverIds =
        resolvePolicyApproverIds(
          policy,
          originalRequest.employeeId
        );

      if (
        policy?.finalApprovalMode &&
        requiredApproverIds.length ===
          0
      ) {
        return;
      }

      const extensionStart =
        new Date(
          originalRequest.endDate
        );

      extensionStart.setDate(
        extensionStart.getDate() +
          1
      );

      const startDateStr =
        extensionStart
          .toISOString()
          .split('T')[0];

      const workingDays =
        calcWorkingDays(
          startDateStr,
          newEndDate
        );

      const newRequest: LeaveRequest =
        {
          id: `lr${Date.now()}`,

          createdAt:
            new Date().toISOString(),

          employeeId:
            originalRequest.employeeId,

          employeeName:
            originalRequest.employeeName,

          department:
            originalRequest.department,

          leaveType:
            originalRequest.leaveType,

          startDate:
            startDateStr,

          endDate:
            newEndDate,

          totalDaysRequested:
            workingDays,

          totalWorkingDays:
            workingDays,

          reason,

          status: 'pending',

          requiredApproverIds,

          approvedByIds: [],

          rejectedByIds: [],

          approvalHistory: [],

          isExtension: true,

          originalRequestId:
            originalRequest.id,

          isPaidOverride:
            isPaid,

          currentApproverRole:
            policy?.finalApprovalMode
              ? 'manager'
              : policy
                    ?.requiresApprovalFrom ===
                  'admin'
                ? 'admin'
                : 'manager',
        };

      setLeaveRequests(
        (previous) => [
          newRequest,
          ...previous,
        ]
      );

      addAuditLog({
        actorId:
          initiator.id,

        actorName:
          initiator.fullName,

        action:
          'EXTEND_LEAVE',

        targetType:
          'LeaveRequest',

        targetId:
          newRequest.id,

        details:
          `Extended ${originalRequest.employeeName}'s ${originalRequest.leaveType} leave through ${newEndDate} (${isPaid ? 'paid' : 'unpaid'})`,

        affectedPerson:
          originalRequest.employeeName,

        department:
          originalRequest.department,

        leaveType:
          originalRequest.leaveType,

        comment: reason,
      });
    };

    /* =========================================================
      STOP LEAVE REQUEST
    ========================================================= */

    const requestStopLeave = (
      originalRequest:
        LeaveRequest,

      employee: User,

      newReturnDate: string,

      reason: string
    ) => {
      const policy =
        leavePolicies.find(
          (item) =>
            item.leaveType ===
            originalRequest.leaveType
        );

      const requiredApproverIds =
        resolvePolicyApproverIds(
          policy,
          originalRequest.employeeId
        );

      if (
        policy?.finalApprovalMode &&
        requiredApproverIds.length ===
          0
      ) {
        return;
      }

      const newRequest: LeaveRequest =
        {
          id: `lr${Date.now()}`,

          createdAt:
            new Date().toISOString(),

          employeeId:
            originalRequest.employeeId,

          employeeName:
            originalRequest.employeeName,

          department:
            originalRequest.department,

          leaveType:
            originalRequest.leaveType,

          startDate:
            originalRequest.startDate,

          endDate:
            newReturnDate,

          totalDaysRequested: 0,

          totalWorkingDays: 0,

          reason,

          status: 'pending',

          requiredApproverIds,

          approvedByIds: [],

          rejectedByIds: [],

          approvalHistory: [],

          isStopRequest: true,

          originalRequestId:
            originalRequest.id,

          currentApproverRole:
            policy?.finalApprovalMode
              ? 'manager'
              : policy
                    ?.requiresApprovalFrom ===
                  'admin'
                ? 'admin'
                : 'manager',
        };

      setLeaveRequests(
        (previous) => [
          newRequest,
          ...previous,
        ]
      );

      addAuditLog({
        actorId:
          employee.id,

        actorName:
          employee.fullName,

        action:
          'REQUEST_STOP_LEAVE',

        targetType:
          'LeaveRequest',

        targetId:
          newRequest.id,

        details:
          `Requested to end ${originalRequest.leaveType} leave early, returning ${newReturnDate}`,

        affectedPerson:
          employee.fullName,

        department:
          originalRequest.department,

        leaveType:
          originalRequest.leaveType,

        comment: reason,
      });
    };

    /* =========================================================
      ADMIN CANCEL APPROVED LEAVE
    ========================================================= */

    const cancelLeaveByAdmin = (
      requestId: string,
      cancelledBy: User,
      reason: string,
      returnDate: string
    ) => {
      const request =
        leaveRequests.find(
          (item) =>
            item.id ===
            requestId
        );

      if (
        !request ||
        request.status !==
          'approved'
      ) {
        return;
      }

      const daysUsed =
        calcWorkingDays(
          request.startDate,
          returnDate
        );

      const entry = {
        approverId:
          cancelledBy.id,

        approverName:
          cancelledBy.fullName,

        approverRole:
          cancelledBy.role,

        action:
          'cancelled' as const,

        comment: reason,

        actionDate:
          new Date().toISOString(),
      };

      setLeaveRequests(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              requestId
                ? {
                    ...item,

                    status:
                      'cancelled' as const,

                    cancelledBy:
                      cancelledBy.id,

                    cancelledByName:
                      cancelledBy.fullName,

                    cancelledReason:
                      reason,

                    daysUsedBeforeCancel:
                      daysUsed,

                    actualEndDate:
                      returnDate,

                    approvalHistory:
                      [
                        ...item.approvalHistory,
                        entry,
                      ],
                  }
                : item
          )
      );

      if (daysUsed > 0) {
        updateBalanceUsed(
          request.employeeId,
          request.leaveType as LeaveType,
          daysUsed
        );
      }
    };

    /* =========================================================
      LEAVE STATUS
    ========================================================= */

    const computeLeaveStatus = (
      requiredApproverIds:
        string[],

      approvedByIds:
        string[],

      rejectedByIds:
        string[]
    ): LeaveRequest['status'] => {
      if (
        requiredApproverIds.length ===
        0
      ) {
        return 'approved';
      }

      const gatekeeperId =
        requiredApproverIds[0];

      const restIds =
        requiredApproverIds.slice(1);

      if (
        rejectedByIds.includes(
          gatekeeperId
        )
      ) {
        return 'rejected';
      }

      if (
        !approvedByIds.includes(
          gatekeeperId
        )
      ) {
        return 'pending';
      }

      if (
        restIds.length === 0
      ) {
        return 'approved';
      }

      const allRestApproved =
        restIds.every((id) =>
          approvedByIds.includes(id)
        );

      return allRestApproved
        ? 'approved'
        : 'pending';
    };

    /* =========================================================
      APPROVE LEAVE
    ========================================================= */

    const approveLeave = (
      requestId: string,
      approver: User,
      comment?: string
    ) => {
      const request =
        leaveRequests.find(
          (item) =>
            item.id ===
            requestId
        );

      if (!request) return;

      const required =
        request.requiredApproverIds ||
        [];

      if (
        !required.includes(
          approver.id
        )
      ) {
        return;
      }

      if (
        request.employeeId ===
        approver.id
      ) {
        return;
      }

      const entry = {
        approverId:
          approver.id,

        approverName:
          approver.fullName,

        approverRole:
          approver.role,

        action:
          'approved' as const,

        comment,

        actionDate:
          new Date().toISOString(),
      };

      const updatedApprovedByIds =
        Array.from(
          new Set([
            ...(request.approvedByIds ||
              []),

            approver.id,
          ])
        );

      const rejectedByIds =
        request.rejectedByIds ||
        [];

      const newStatus =
        computeLeaveStatus(
          required,
          updatedApprovedByIds,
          rejectedByIds
        );

      setLeaveRequests(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              requestId
                ? {
                    ...item,

                    status:
                      newStatus,

                    approvedByIds:
                      updatedApprovedByIds,

                    approvalHistory:
                      [
                        ...item.approvalHistory,
                        entry,
                      ],
                  }
                : item
          )
      );

      if (
        newStatus ===
        'approved'
      ) {
        if (
          request.isStopRequest &&
          request.originalRequestId
        ) {
          const original =
            leaveRequests.find(
              (item) =>
                item.id ===
                request.originalRequestId
            );

          if (original) {
            const daysActuallyUsed =
              calcWorkingDays(
                original.startDate,
                request.endDate
              );

            const daysRestored =
              Math.max(
                0,
                original.totalWorkingDays -
                  daysActuallyUsed
              );

            if (
              daysRestored > 0
            ) {
              updateBalanceUsed(
                original.employeeId,
                original.leaveType as LeaveType,
                -daysRestored
              );
            }
          }
        } else if (
          request.totalWorkingDays >
          0
        ) {
          updateBalanceUsed(
            request.employeeId,
            request.leaveType as LeaveType,
            request.totalWorkingDays
          );
        }
      }
    };

    /* =========================================================
      REJECT LEAVE
    ========================================================= */

    const rejectLeave = (
      requestId: string,
      approver: User,
      comment?: string
    ) => {
      const request =
        leaveRequests.find(
          (item) =>
            item.id ===
            requestId
        );

      if (!request) return;

      const required =
        request.requiredApproverIds ||
        [];

      if (
        !required.includes(
          approver.id
        )
      ) {
        return;
      }

      if (
        request.employeeId ===
        approver.id
      ) {
        return;
      }

      const entry = {
        approverId:
          approver.id,

        approverName:
          approver.fullName,

        approverRole:
          approver.role,

        action:
          'rejected' as const,

        comment,

        actionDate:
          new Date().toISOString(),
      };

      const updatedRejectedByIds =
        Array.from(
          new Set([
            ...(request.rejectedByIds ||
              []),

            approver.id,
          ])
        );

      const approvedByIds =
        request.approvedByIds ||
        [];

      const newStatus =
        computeLeaveStatus(
          required,
          approvedByIds,
          updatedRejectedByIds
        );

      setLeaveRequests(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              requestId
                ? {
                    ...item,

                    status:
                      newStatus,

                    rejectedByIds:
                      updatedRejectedByIds,

                    approvalHistory:
                      [
                        ...item.approvalHistory,
                        entry,
                      ],
                  }
                : item
          )
      );
    };

    /* =========================================================
      ACT ON BEHALF
    ========================================================= */

    const actOnBehalf = (
      requestId: string,
      admin: User,
      targetApproverId: string,
      action:
        | 'approved'
        | 'rejected',
      comment?: string
    ) => {
      const request =
        leaveRequests.find(
          (item) =>
            item.id ===
            requestId
        );

      if (!request) return;

      if (
        admin.role !== 'admin'
      ) {
        return;
      }

      const required =
        request.requiredApproverIds ||
        [];

      if (
        !required.includes(
          targetApproverId
        )
      ) {
        return;
      }

      const targetApprover =
        getUserById(
          targetApproverId
        );

      const entry = {
        approverId:
          targetApproverId,

        approverName:
          targetApprover?.fullName ||
          'Unknown',

        approverRole:
          targetApprover?.role ||
          'manager',

        action,

        comment,

        actionDate:
          new Date().toISOString(),
      };

      const approved =
        action === 'approved'
          ? Array.from(
              new Set([
                ...(request.approvedByIds ||
                  []),

                targetApproverId,
              ])
            )
          : request.approvedByIds ||
            [];

      const rejected =
        action === 'rejected'
          ? Array.from(
              new Set([
                ...(request.rejectedByIds ||
                  []),

                targetApproverId,
              ])
            )
          : request.rejectedByIds ||
            [];

      const newStatus =
        computeLeaveStatus(
          required,
          approved,
          rejected
        );

      setLeaveRequests(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              requestId
                ? {
                    ...item,

                    status:
                      newStatus,

                    approvedByIds:
                      approved,

                    rejectedByIds:
                      rejected,

                    approvalHistory:
                      [
                        ...item.approvalHistory,
                        entry,
                      ],
                  }
                : item
          )
      );
    };

    /* =========================================================
      PROVIDER
    ========================================================= */

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

          employeesLoading,

          employeeApiError,

          refreshEmployees,

          refreshLookups,

          refreshLeaveRequests,

          addUser:

          updateUser,

          removeUser,

          restoreUser,

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

  /* =========================================================
    HOOK
  ========================================================= */

  export function useAppData() {
    const context =
      useContext(
        AppDataContext
      );

    if (!context) {
      throw new Error(
        'useAppData must be used within AppDataProvider'
      );
    }

    return context;
  }

  /* =========================================================
    REPORTING CHAIN
  ========================================================= */

  export function getReportingChain(
    user: User,

    getUserById: (
      id: string
    ) => User | undefined
  ) {
    const manager =
      user.managerId
        ? getUserById(
            user.managerId
          )
        : undefined;

    return {
      manager,
    };
  }