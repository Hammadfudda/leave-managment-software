import api from './api';
import type { Role, User } from '../types';

export interface BackendGrade {
  _id: string;
  name: string;
}

export interface BackendEmployee {
  _id: string;
  fullName: string;
  email: string;
  role: Role;

  /*
   * HR / Master Data role label.
   * Separate from access-control role above.
   */
  roleLabel?: string;

  employeeId: string;
  cnic?: string;
  nationalId?: string;

  designation: string;
  department: string;
  phone?: string;

  gradeId:
    | string
    | BackendGrade
    | null;

  managerId?: string | null;

  canApproveOtherDepartments?: boolean;

  dateOfJoining?: string | null;
  status:
    | 'active'
    | 'inactive'
    | 'pending_deletion';

  profilePhotoUrl?: string;

  detailsStatus?: 'complete' | 'pending';
  pendingFields?: string[];

  deactivatedAt?: string | null;
  scheduledPurgeAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

interface EmployeesResponse {
  success: boolean;
  data: BackendEmployee[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface EmployeeResponse {
  success: boolean;
  data: BackendEmployee;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  cnic: string;

  /*
   * Portal access: employee / manager only.
   */
  role: 'employee' | 'manager';

  /*
   * HR role selected from Master Data -> Roles.
   */
  roleLabel: string;

  gradeId: string;

  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;

  phone?: string;
  managerId?: string | null;

  canApproveOtherDepartments?: boolean;

  profilePhotoUrl?: string;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  email?: string;

  role?: Role;

  gradeId?: string;

  employeeId?: string;
  designation?: string;
  department?: string;

  dateOfJoining?: string;
  phone?: string;

  managerId?: string | null;

  canApproveOtherDepartments?: boolean;

  status?: 'active' | 'inactive';

  profilePhotoUrl?: string;
}

export type CsvPendingIssue = {
  field: string;
  message: string;
  currentValue?: string;
};

export type CsvPendingEmployee = {
  row: number;
  fullName: string;
  employeeId: string;
  issues: CsvPendingIssue[];
  pendingFields: string[];
};

export type CsvHardError = {
  row: number;
  employee: string;
  field: string;
  message: string;
};

export type CsvImportResponse = {
  success: boolean;
  preview?: boolean;
  requiresConfirmation?: boolean;
  created?: number;
  message?: string;
  summary: {
    total: number;
    complete?: number;
    pending?: number;
    blocking?: number;
  };
  pendingEmployees?: CsvPendingEmployee[];
  hardErrors?: CsvHardError[];
};

export interface CompletePendingEmployeePayload {
  cnic: string;
}

/* ==============================
   MAP BACKEND -> FRONTEND
============================== */

export function mapEmployeeToUser(
  employee: BackendEmployee
): User {
  const grade =
    typeof employee.gradeId === 'object' &&
    employee.gradeId
      ? employee.gradeId.name || ''
      : '';

  return {
    id: employee._id,

    employeeId:
      employee.employeeId || '',

    fullName:
      employee.fullName || '',

    email:
      employee.email || '',

    role:
      employee.role,

    roleLabel:
      employee.roleLabel || '',

    designation:
      employee.designation || '',

    grade,

    department:
      employee.department || '',

    dateOfJoining:
      employee.dateOfJoining
        ? employee.dateOfJoining.split('T')[0]
        : '',

    cnic:
      employee.cnic ||
      (
        employee.nationalId &&
        !employee.nationalId.startsWith('PENDING-')
          ? employee.nationalId
          : ''
      ) ||
      '',

    phone:
      employee.phone || '',

    status:
      employee.status === 'active'
        ? 'active'
        : 'inactive',

    managerId:
      employee.managerId || undefined,

    canApproveOtherDepartments:
      employee.canApproveOtherDepartments ??
      false,

    profilePhotoUrl:
      employee.profilePhotoUrl,

    detailsStatus:
      employee.detailsStatus || 'complete',

    pendingFields:
      employee.pendingFields || [],
  };
}

/* ==============================
   GET ALL EMPLOYEES
============================== */
export async function getEmployees(
  params?: {
    search?: string;
    department?: string;
    designation?: string;
    role?: Role;
    status?: string;
    grade?: string;
    page?: number;
    limit?: number;
  }
): Promise<User[]> {
  const response =
    await api.get<EmployeesResponse>(
      '/employees',
      {
        params: {
          page: 1,
          limit: 500,
          ...params,
        },
      }
    );

  return response.data.data.map(
    mapEmployeeToUser
  );
}

/* ==============================
   GET ONE
============================== */

export async function getEmployeeById(
  id: string
): Promise<User> {
  const response =
    await api.get<EmployeeResponse>(
      `/employees/${id}`
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/* ==============================
   CREATE
============================== */
export async function createEmployee(
  payload: CreateEmployeePayload
): Promise<User> {
  const response =
    await api.post<EmployeeResponse>(
      '/employees',
      payload
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/* ==============================
   UPDATE
============================== */
export async function updateEmployee(
  id: string,
  payload: UpdateEmployeePayload
): Promise<User> {
  const response =
    await api.patch<EmployeeResponse>(
      `/employees/${id}`,
      payload
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/*
 * HR RoleLabel is deliberately updated through its own small endpoint.
 * This avoids changing the mature employee update controller and keeps
 * access-control role separate from the Master Data role label.
 */
export async function updateEmployeeRoleLabel(
  id: string,
  roleLabel: string
): Promise<User> {
  const response =
    await api.patch<EmployeeResponse>(
      `/employees/${id}/role-label`,
      {
        roleLabel,
      }
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/* ==============================
   COMPLETE PENDING CSV EMPLOYEE
============================== */
export async function completePendingEmployee(
  id: string,
  payload: CompletePendingEmployeePayload
): Promise<User> {
  const response =
    await api.patch<EmployeeResponse>(
      `/employees/${id}/complete-pending`,
      payload
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/* ==============================
   REMOVE
============================== */
export async function removeEmployee(
  id: string
): Promise<BackendEmployee> {
  const response =
    await api.patch<EmployeeResponse>(
      `/employees/${id}/remove`
    );

  return response.data.data;
}

/* ==============================
   RESTORE
============================== */

export async function restoreEmployee(
  id: string
): Promise<User> {
  const response =
    await api.patch<EmployeeResponse>(
      `/employees/${id}/restore`
    );

  return mapEmployeeToUser(
    response.data.data
  );
}

/* ==============================
   REMOVED EMPLOYEES
============================== */

export async function getRemovedEmployees() {
  const response = await api.get(
    '/employees/removed',
    {
      params: {
        page: 1,
        limit: 500,
      },
    }
  );

  return response.data.data;
}

/* ==============================
   CSV IMPORT
============================== */

export async function importEmployeesCsv(
  file: File,
  mode: 'preview' | 'commit' = 'preview'
): Promise<CsvImportResponse> {
  const formData =
    new FormData();

  formData.append(
    'file',
    file
  );

  const response =
    await api.post<CsvImportResponse>(
      '/employees/import',
      formData,
      {
        params: {
          mode,
        },
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );

  return response.data;
}

/* ==============================
   CSV EXPORT
============================== */
export async function exportEmployeesCsv() {
  const response =
    await api.get(
      '/employees/export.csv',
      {
        responseType: 'blob',
      }
    );

  const blob =
    new Blob(
      [response.data],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

  const url =
    window.URL.createObjectURL(
      blob
    );

  const link =
    document.createElement('a');

  link.href = url;

  link.download =
    `employees-${Date.now()}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  window.URL.revokeObjectURL(
    url
  );
}
