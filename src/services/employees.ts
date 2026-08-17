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

  employeeId: string;
  cnic?: string;
  nationalId?: string;

  designation: string;
  department: string;
  phone?: string;

  gradeId:
    | string
    | BackendGrade;

  managerId?: string | null;

  canApproveOtherDepartments?: boolean;

  dateOfJoining: string;

  status:
    | 'active'
    | 'inactive'
    | 'pending_deletion';

  profilePhotoUrl?: string;

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

  role: 'employee' | 'manager';

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

/* ==============================
   MAP BACKEND -> FRONTEND
============================== */

export function mapEmployeeToUser(
  employee: BackendEmployee
): User {
  const grade =
    typeof employee.gradeId === 'object'
      ? employee.gradeId?.name || ''
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
      employee.nationalId ||
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
  file: File
) {
  const formData =
    new FormData();

  formData.append(
    'file',
    file
  );

  const response =
    await api.post(
      '/employees/import',
      formData,
      {
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
