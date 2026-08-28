import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';

import {
  getReportingChain,
  useAppData,
} from '../context/AppDataContext';

import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import {
  completePendingEmployee,
  createEmployee as apiCreateEmployee,
  updateEmployee as apiUpdateEmployee,
  updateEmployeeRoleLabel,
  exportEmployeesCsv,
  importEmployeesCsv,
  type CreateEmployeePayload,
  type CsvHardError,
  type CsvImportResponse,
  type UpdateEmployeePayload,
} from '../services/employees';

import api, {
  getApiErrorMessage,
} from '../services/api';

import {
  formatDate,
} from '../utils/formatDate';

import type {
  Role,
  User,
} from '../types';

type MessageType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

type AddMasterField =
  | 'roleLabel'
  | 'grade'
  | 'designation'
  | 'department';

interface MessageState {
  open: boolean;
  type: MessageType;
  title: string;
  message: string;
}

const portalAccessLabel: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

const emptyForm = {
  fullName: '',
  email: '',
  employeeId: '',
  cnic: '',
  phone: '',
  role: 'employee' as Role,
  roleLabel: '',
  designation: '',
  grade: '',
  department: '',
  dateOfJoining: '',
  status: 'active' as 'active' | 'inactive',
  managerId: '',
  canApproveOtherDepartments: false,
};

function getBlockingCsvErrors(
  error: unknown
): CsvHardError[] {
  const maybe =
    error as {
      response?: {
        data?: {
          hardErrors?: CsvHardError[];
        };
      };
    };

  return (
    maybe.response?.data?.hardErrors ||
    []
  );
}

export default function Employees() {
  const {
    users,
    grades,
    designations,
    departments,
    roles,
    employeesLoading,
    refreshEmployees,
    refreshLookups,
    removeUser,
    addDesignation,
    addDepartment,
    addRole,
    getUserById,
  } = useAppData();

  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingMaster, setAddingMaster] = useState(false);

  const [csvReview, setCsvReview] =
    useState<CsvImportResponse | null>(null);

  const [csvFile, setCsvFile] =
    useState<File | null>(null);

  const [csvBlockingErrors, setCsvBlockingErrors] =
    useState<CsvHardError[]>([]);

  const [form, setForm] = useState(emptyForm);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [addNewField, setAddNewField] =
    useState<AddMasterField | null>(null);

  const [newItemName, setNewItemName] =
    useState('');

  const [message, setMessage] =
    useState<MessageState>({
      open: false,
      type: 'info',
      title: '',
      message: '',
    });

  const showMessage = (
    type: MessageType,
    title: string,
    text: string
  ) => {
    setMessage({
      open: true,
      type,
      title,
      message: text,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          refreshEmployees(),
          refreshLookups(),
        ]);
      } catch (error) {
        showMessage(
          'error',
          'Unable to Load Employees',
          getApiErrorMessage(
            error,
            'Employee data could not be loaded.'
          )
        );
      }
    };

    void load();
  }, [
    refreshEmployees,
    refreshLookups,
  ]);

  const filtered = useMemo(() => {
    const search =
      query
        .trim()
        .toLowerCase();

    return users
      .filter(
        (user) =>
          user.role !== 'admin'
      )
      .filter((user) => {
        const matchesSearch =
          !search ||
          user.fullName
            .toLowerCase()
            .includes(search) ||
          user.email
            .toLowerCase()
            .includes(search) ||
          user.employeeId
            .toLowerCase()
            .includes(search) ||
          (user.designation || '')
            .toLowerCase()
            .includes(search) ||
          (user.roleLabel || '')
            .toLowerCase()
            .includes(search);

        const matchesDepartment =
          !deptFilter ||
          user.department ===
            deptFilter;

        const matchesRole =
          !roleFilter ||
          user.role ===
            roleFilter;

        const matchesStatus =
          !statusFilter ||
          user.status ===
            statusFilter;

        const matchesGrade =
          !gradeFilter ||
          user.grade ===
            gradeFilter;

        return (
          matchesSearch &&
          matchesDepartment &&
          matchesRole &&
          matchesStatus &&
          matchesGrade
        );
      });
  }, [
    users,
    query,
    deptFilter,
    roleFilter,
    statusFilter,
    gradeFilter,
  ]);

  /*
   * Existing manager rule is preserved:
   * only active Managers from the selected department.
   */
  const availableManagers =
    useMemo(() => {
      if (!form.department) {
        return [];
      }

      return users.filter(
        (candidate) =>
          candidate.role ===
            'manager' &&
          candidate.status ===
            'active' &&
          candidate.department ===
            form.department &&
          candidate.id !==
            editingUser?.id
      );
    }, [
      users,
      form.department,
      editingUser?.id,
    ]);

  const pendingSet =
    useMemo(
      () =>
        new Set(
          editingUser?.pendingFields ||
            []
        ),
      [
        editingUser?.pendingFields,
      ]
    );

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const filterCls =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const pendingInputClass = (
    field: string
  ) =>
    pendingSet.has(field)
      ? `${inputCls} border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20`
      : inputCls;

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.fullName.trim()) {
      next.fullName =
        'Full name is required';
    }

    if (!form.email.trim()) {
      next.email =
        'Email is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      next.email =
        'Invalid email format';
    }

    if (!form.employeeId.trim()) {
      next.employeeId =
        'Employee ID is required';
    }

    if (!form.cnic.trim()) {
      next.cnic =
        'CNIC is required';
    } else if (
      !/^\d{5}-\d{7}-\d$/.test(
        form.cnic
      )
    ) {
      next.cnic =
        'Format: 12345-1234567-1';
    }

    if (!form.phone.trim()) {
      next.phone =
        'Phone is required';
    }

    if (!form.roleLabel) {
      next.roleLabel =
        'Role is required';
    }

    if (!form.designation) {
      next.designation =
        'Designation is required';
    }

    if (!form.grade) {
      next.grade =
        'Grade is required';
    }

    if (!form.department) {
      next.department =
        'Department is required';
    }

    if (!form.dateOfJoining) {
      next.dateOfJoining =
        'Date of joining is required';
    }

    setErrors(next);

    if (
      Object.keys(next).length >
      0
    ) {
      showMessage(
        'warning',
        'Missing Information',
        'Please complete all required fields correctly.'
      );

      return false;
    }

    return true;
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
    });

    setErrors({});
    setEditingUser(null);
  };

  const openCreate = () => {
    setEditingUser(null);
    setErrors({});

    setForm({
      ...emptyForm,
      roleLabel:
        roles[0] || '',
      grade:
        grades[0]?.name || '',
    });

    setShowAdd(true);
  };

  const handleEdit = (
    user: User
  ) => {
    setEditingUser(user);
    setErrors({});

    setForm({
      fullName:
        user.fullName,

      email:
        user.email,

      employeeId:
        user.employeeId,

      cnic:
        user.cnic || '',

      phone:
        user.phone || '',

      role:
        user.role,

      roleLabel:
        user.roleLabel || '',

      designation:
        user.designation || '',

      grade:
        user.grade || '',

      department:
        user.department || '',

      dateOfJoining:
        user.dateOfJoining || '',

      status:
        user.status,

      managerId:
        user.managerId || '',

      canApproveOtherDepartments:
        user.canApproveOtherDepartments ||
        false,
    });

    setShowAdd(true);
  };

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);

    const isEdit =
      Boolean(
        editingUser?.id
      );

    try {
      const selectedGrade =
        grades.find(
          (grade) =>
            grade.name ===
            form.grade
        );

      if (!selectedGrade) {
        throw new Error(
          'Please select a valid grade.'
        );
      }

      if (isEdit) {
        if (!editingUser?.id) {
          throw new Error(
            'Employee ID is missing for update.'
          );
        }

        const updatePayload:
          UpdateEmployeePayload = {
          fullName:
            form.fullName.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          role:
            form.role,

          gradeId:
            selectedGrade.id,

          employeeId:
            form.employeeId.trim(),

          designation:
            form.designation,

          department:
            form.department,

          dateOfJoining:
            form.dateOfJoining,

          phone:
            form.phone.trim(),

          managerId:
            form.managerId ||
            null,

          canApproveOtherDepartments:
            form.canApproveOtherDepartments,

          status:
            form.status,
        };

        /*
         * Mature employee update flow remains unchanged.
         */
        await apiUpdateEmployee(
          editingUser.id,
          updatePayload
        );

        /*
         * HR Role is separate from access-control role and is updated
         * through its dedicated endpoint.
         */
        await updateEmployeeRoleLabel(
          editingUser.id,
          form.roleLabel
        );

        if (
          editingUser.detailsStatus ===
          'pending'
        ) {
          await completePendingEmployee(
            editingUser.id,
            {
              cnic:
                form.cnic.trim(),
            }
          );
        }

        showMessage(
          'success',
          editingUser.detailsStatus ===
            'pending'
            ? 'Employee Details Completed'
            : 'Employee Updated',
          `${form.fullName.trim()} has been updated successfully.`
        );
      } else {
        const createPayload:
          CreateEmployeePayload = {
          fullName:
            form.fullName.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          cnic:
            form.cnic.trim(),

          role:
            form.role ===
            'manager'
              ? 'manager'
              : 'employee',

          roleLabel:
            form.roleLabel,

          gradeId:
            selectedGrade.id,

          employeeId:
            form.employeeId.trim(),

          designation:
            form.designation,

          department:
            form.department,

          dateOfJoining:
            form.dateOfJoining,

          phone:
            form.phone.trim() ||
            undefined,

          managerId:
            form.managerId ||
            null,

          canApproveOtherDepartments:
            form.canApproveOtherDepartments,
        };

        await apiCreateEmployee(
          createPayload
        );

        showMessage(
          'success',
          'Employee Created',
          `${form.fullName.trim()} has been created successfully.`
        );
      }

      setShowAdd(false);
      resetForm();

      await refreshEmployees();
    } catch (error) {
      showMessage(
        'error',
        isEdit
          ? 'Update Failed'
          : 'Create Failed',
        getApiErrorMessage(
          error,
          isEdit
            ? 'Unable to update employee.'
            : 'Unable to create employee.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) {
      return;
    }

    setDeleting(true);

    try {
      await removeUser(
        removeTarget.id
      );

      showMessage(
        'success',
        'Employee Removed',
        `${removeTarget.fullName} has been removed.`
      );

      setRemoveTarget(null);

      await refreshEmployees();
    } catch (error) {
      showMessage(
        'error',
        'Remove Failed',
        getApiErrorMessage(
          error,
          'Unable to remove employee.'
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  const openAddMaster = (
    field: AddMasterField
  ) => {
    setNewItemName('');
    setAddNewField(field);
  };

  const handleAddNewItem =
    async () => {
      const name =
        newItemName.trim();

      if (
        !name ||
        !addNewField
      ) {
        showMessage(
          'warning',
          'Name Required',
          'Please enter a name.'
        );
        return;
      }

      setAddingMaster(true);

      try {
        if (
          addNewField ===
          'roleLabel'
        ) {
          await addRole(name);

          setForm(
            (previous) => ({
              ...previous,
              roleLabel:
                name,
            })
          );
        } else if (
          addNewField ===
          'grade'
        ) {
          await api.post(
            '/grades',
            {
              name,
              description: '',
            }
          );

          await refreshLookups();

          setForm(
            (previous) => ({
              ...previous,
              grade:
                name,
            })
          );
        } else if (
          addNewField ===
          'designation'
        ) {
          await addDesignation(
            name
          );

          setForm(
            (previous) => ({
              ...previous,
              designation:
                name,
            })
          );
        } else {
          await addDepartment(
            name
          );

          setForm(
            (previous) => ({
              ...previous,
              department:
                name,
              managerId: '',
            })
          );
        }

        setAddNewField(null);
        setNewItemName('');

        showMessage(
          'success',
          'Added Successfully',
          `${name} has been added and selected.`
        );
      } catch (error) {
        showMessage(
          'error',
          'Unable to Add',
          getApiErrorMessage(
            error,
            'Unable to save this item.'
          )
        );
      } finally {
        setAddingMaster(false);
      }
    };

  const handleImport = async (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.csv')
    ) {
      showMessage(
        'error',
        'Invalid File',
        'Please select a CSV file.'
      );

      event.target.value =
        '';

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      showMessage(
        'error',
        'File Too Large',
        'CSV file must be 5 MB or smaller.'
      );

      event.target.value =
        '';

      return;
    }

    setImporting(true);
    setCsvBlockingErrors([]);

    try {
      const preview =
        await importEmployeesCsv(
          file,
          'preview'
        );

      if (
        preview.requiresConfirmation ||
        (
          preview.summary.pending ||
          0
        ) > 0
      ) {
        setCsvFile(file);
        setCsvReview(
          preview
        );
      } else {
        const result =
          await importEmployeesCsv(
            file,
            'commit'
          );

        await refreshEmployees();

        showMessage(
          'success',
          'Import Complete',
          result.message ||
            'Employees were imported successfully.'
        );
      }
    } catch (error) {
      const hardErrors =
        getBlockingCsvErrors(
          error
        );

      if (
        hardErrors.length
      ) {
        setCsvBlockingErrors(
          hardErrors
        );
      } else {
        showMessage(
          'error',
          'Import Failed',
          getApiErrorMessage(
            error,
            'Unable to import employee CSV.'
          )
        );
      }
    } finally {
      setImporting(false);
      event.target.value =
        '';
    }
  };

  const confirmPendingImport =
    async () => {
      if (!csvFile) {
        return;
      }

      setImporting(true);

      try {
        const result =
          await importEmployeesCsv(
            csvFile,
            'commit'
          );

        setCsvReview(null);
        setCsvFile(null);

        await refreshEmployees();

        showMessage(
          'success',
          'Import Complete',
          result.message ||
            'Employees were imported successfully.'
        );
      } catch (error) {
        const hardErrors =
          getBlockingCsvErrors(
            error
          );

        if (
          hardErrors.length
        ) {
          setCsvReview(null);
          setCsvFile(null);
          setCsvBlockingErrors(
            hardErrors
          );
        } else {
          showMessage(
            'error',
            'Import Failed',
            getApiErrorMessage(
              error,
              'Unable to import employee CSV.'
            )
          );
        }
      } finally {
        setImporting(false);
      }
    };

  const handleExport =
    async () => {
      setExporting(true);

      try {
        await exportEmployeesCsv();

        showMessage(
          'success',
          'Export Complete',
          'Employee CSV has been exported successfully.'
        );
      } catch (error) {
        showMessage(
          'error',
          'Export Failed',
          getApiErrorMessage(
            error,
            'Unable to export employees.'
          )
        );
      } finally {
        setExporting(false);
      }
    };

  const clearFilters = () => {
    setQuery('');
    setDeptFilter('');
    setRoleFilter('');
    setStatusFilter('');
    setGradeFilter('');
  };

  const addModalTitle =
    addNewField === 'roleLabel'
      ? 'Add Role'
      : addNewField === 'grade'
        ? 'Add Grade'
        : addNewField === 'designation'
          ? 'Add Designation'
          : 'Add Department';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Employees
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage real employee records from the backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={
              exporting
            }
            onClick={() =>
              void handleExport()
            }
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting
              ? 'Exporting…'
              : 'Export CSV'}
          </button>

          <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {importing
              ? 'Importing…'
              : 'Import CSV'}

            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={
                importing
              }
              onChange={
                handleImport
              }
            />
          </label>

          <Button
            onClick={
              openCreate
            }
          >
            <UserPlus
              size={16}
            />
            Create Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[230px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={
              query
            }
            onChange={
              (event) =>
                setQuery(
                  event.target.value
                )
            }
            placeholder="Search name, email, ID, role, designation"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <Filter
          size={15}
          className="text-gray-400"
        />

        <select
          value={
            deptFilter
          }
          onChange={
            (event) =>
              setDeptFilter(
                event.target.value
              )
          }
          className={
            filterCls
          }
        >
          <option value="">
            All Departments
          </option>

          {departments.map(
            (department) => (
              <option
                key={
                  department
                }
                value={
                  department
                }
              >
                {department}
              </option>
            )
          )}
        </select>

        <select
          value={
            roleFilter
          }
          onChange={
            (event) =>
              setRoleFilter(
                event.target.value
              )
          }
          className={
            filterCls
          }
        >
          <option value="">
            All Portal Access
          </option>

          <option value="manager">
            Managers
          </option>

          <option value="employee">
            Employees
          </option>
        </select>

        <select
          value={
            statusFilter
          }
          onChange={
            (event) =>
              setStatusFilter(
                event.target.value
              )
          }
          className={
            filterCls
          }
        >
          <option value="">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>
        </select>

        <select
          value={
            gradeFilter
          }
          onChange={
            (event) =>
              setGradeFilter(
                event.target.value
              )
          }
          className={
            filterCls
          }
        >
          <option value="">
            All Grades
          </option>

          {grades.map(
            (grade) => (
              <option
                key={
                  grade.id
                }
                value={
                  grade.name
                }
              >
                {grade.name}
              </option>
            )
          )}
        </select>

        <button
          type="button"
          onClick={
            clearFilters
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {employeesLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading employees…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Emp ID
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Name
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Designation
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Grade
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Dept
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Role
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Portal Access
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filtered.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-sm text-gray-400"
                    >
                      No employees match the selected filters.
                    </td>
                  </tr>
                )}

                {filtered.map(
                  (user) => (
                    <tr
                      key={
                        user.id
                      }
                      className="animate-fade-in hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {user.employeeId}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                            {user.fullName.charAt(
                              0
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-gray-900">
                              {user.fullName}
                            </p>

                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {user.designation ||
                          '—'}
                      </td>

                      <td className="px-5 py-3">
                        {user.grade ? (
                          <Badge variant="teal">
                            {user.grade}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {user.department ||
                          '—'}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {user.roleLabel ||
                          '—'}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {portalAccessLabel[
                          user.role
                        ]}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {user.status ===
                          'active' ? (
                            <Badge variant="green">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="gray">
                              Inactive
                            </Badge>
                          )}

                          {user.detailsStatus ===
                            'pending' && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                              Details Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setViewUser(
                                user
                              )
                            }
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            <Eye
                              size={14}
                            />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                user
                              )
                            }
                            className="text-sm font-medium text-amber-600 hover:text-amber-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRemoveTarget(
                                user
                              )
                            }
                            className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                          >
                            <Trash2
                              size={14}
                            />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={
          showAdd
        }
        onClose={() => {
          if (saving) {
            return;
          }

          setShowAdd(false);
          setAddNewField(null);
          resetForm();
        }}
        title={
          editingUser?.id
            ? 'Edit Employee'
            : 'Create Employee'
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                saving
              }
              onClick={() => {
                setShowAdd(
                  false
                );

                resetForm();
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="employee-form"
              disabled={
                saving
              }
            >
              {saving
                ? 'Saving…'
                : editingUser?.id
                  ? 'Save Changes'
                  : 'Create Employee'}
            </Button>
          </>
        }
      >
        <form
          id="employee-form"
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >
          {editingUser?.detailsStatus ===
            'pending' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p className="font-semibold">
                Details Pending
              </p>

              <p className="mt-1">
                Complete the highlighted employee details:{' '}
                {(
                  editingUser.pendingFields ||
                  []
                ).join(', ') ||
                  'required employee details'}
                .
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.6fr]">
            {/* MASTER DATA — ALL TOGETHER ON LEFT */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Employee Classification
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Role, Grade, Designation and Department
                </p>
              </div>

              <FormField
                label="Role"
                error={
                  errors.roleLabel
                }
              >
                <SelectWithAdd
                  value={
                    form.roleLabel
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        roleLabel:
                          value,
                      })
                    )
                  }
                  placeholder="Select role"
                  options={
                    roles
                  }
                  inputClass={
                    inputCls
                  }
                  onAdd={() =>
                    openAddMaster(
                      'roleLabel'
                    )
                  }
                />
              </FormField>

              <FormField
                label="Grade"
                error={
                  errors.grade
                }
              >
                <SelectWithAdd
                  value={
                    form.grade
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        grade:
                          value,
                      })
                    )
                  }
                  placeholder="Select grade"
                  options={
                    grades.map(
                      (grade) =>
                        grade.name
                    )
                  }
                  inputClass={
                    pendingInputClass(
                      'grade'
                    )
                  }
                  onAdd={() =>
                    openAddMaster(
                      'grade'
                    )
                  }
                />
              </FormField>

              <FormField
                label="Designation"
                error={
                  errors.designation
                }
              >
                <SelectWithAdd
                  value={
                    form.designation
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        designation:
                          value,
                      })
                    )
                  }
                  placeholder="Select designation"
                  options={
                    designations
                  }
                  inputClass={
                    pendingInputClass(
                      'designation'
                    )
                  }
                  onAdd={() =>
                    openAddMaster(
                      'designation'
                    )
                  }
                />
              </FormField>

              <FormField
                label="Department"
                error={
                  errors.department
                }
              >
                <SelectWithAdd
                  value={
                    form.department
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        department:
                          value,
                        managerId:
                          '',
                      })
                    )
                  }
                  placeholder="Select department"
                  options={
                    departments
                  }
                  inputClass={
                    pendingInputClass(
                      'department'
                    )
                  }
                  onAdd={() =>
                    openAddMaster(
                      'department'
                    )
                  }
                />
              </FormField>
            </div>

            {/* ALL OTHER EMPLOYEE DETAILS ON RIGHT */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Full Name"
                error={
                  errors.fullName
                }
              >
                <input
                  value={
                    form.fullName
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          fullName:
                            event.target.value,
                        })
                      )
                  }
                  className={
                    inputCls
                  }
                />
              </FormField>

              <FormField
                label="Email"
                error={
                  errors.email
                }
              >
                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          email:
                            event.target.value,
                        })
                      )
                  }
                  className={
                    inputCls
                  }
                />
              </FormField>

              <FormField
                label="CNIC"
                error={
                  errors.cnic
                }
              >
                <input
                  value={
                    form.cnic
                  }
                  disabled={
                    Boolean(
                      editingUser?.id &&
                      editingUser.detailsStatus !==
                        'pending'
                    )
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          cnic:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="12345-1234567-1"
                  className={`${pendingInputClass('cnic')} disabled:bg-gray-100`}
                />
              </FormField>

              <FormField
                label="Phone"
                error={
                  errors.phone
                }
              >
                <input
                  value={
                    form.phone
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          phone:
                            event.target.value,
                        })
                      )
                  }
                  className={
                    pendingInputClass(
                      'phone'
                    )
                  }
                />
              </FormField>

              <FormField
                label="Employee ID"
                error={
                  errors.employeeId
                }
              >
                <input
                  value={
                    form.employeeId
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          employeeId:
                            event.target.value,
                        })
                      )
                  }
                  className={
                    inputCls
                  }
                />
              </FormField>

              <FormField label="Portal Access">
                <select
                  value={
                    form.role
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          role:
                            event.target
                              .value as Role,
                        })
                      )
                  }
                  className={
                    inputCls
                  }
                >
                  <option value="employee">
                    Employee
                  </option>

                  <option value="manager">
                    Manager
                  </option>
                </select>
              </FormField>

              <FormField
                label="Date of Joining"
                error={
                  errors.dateOfJoining
                }
              >
                <input
                  type="date"
                  value={
                    form.dateOfJoining
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          dateOfJoining:
                            event.target.value,
                        })
                      )
                  }
                  className={
                    pendingInputClass(
                      'dateOfJoining'
                    )
                  }
                />
              </FormField>

              <FormField label="Manager">
                <select
                  value={
                    form.managerId
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          managerId:
                            event.target.value,
                        })
                      )
                  }
                  disabled={
                    !form.department
                  }
                  className={`${inputCls} disabled:cursor-not-allowed disabled:bg-gray-100`}
                >
                  <option value="">
                    {form.department
                      ? 'No Manager'
                      : 'Select department first'}
                  </option>

                  {availableManagers.map(
                    (manager) => (
                      <option
                        key={
                          manager.id
                        }
                        value={
                          manager.id
                        }
                      >
                        {manager.fullName}
                        {' — '}
                        {manager.designation}
                      </option>
                    )
                  )}
                </select>

                {form.department &&
                  availableManagers.length ===
                    0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    No active manager is available in this department.
                  </p>
                )}
              </FormField>

              {editingUser?.id && (
                <FormField label="Status">
                  <select
                    value={
                      form.status
                    }
                    onChange={
                      (event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            status:
                              event.target
                                .value as
                                | 'active'
                                | 'inactive',
                          })
                        )
                    }
                    className={
                      inputCls
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </FormField>
              )}

              {form.role ===
                'manager' && (
                <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        form.canApproveOtherDepartments
                      }
                      onChange={
                        (event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              canApproveOtherDepartments:
                                event.target.checked,
                            })
                          )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    Can approve leaves from other departments too
                  </label>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={
          Boolean(
            addNewField
          )
        }
        onClose={() => {
          if (
            addingMaster
          ) {
            return;
          }

          setAddNewField(null);
          setNewItemName('');
        }}
        title={
          addModalTitle
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                addingMaster
              }
              onClick={() => {
                setAddNewField(
                  null
                );

                setNewItemName(
                  ''
                );
              }}
            >
              Cancel
            </Button>

            <Button
              disabled={
                addingMaster
              }
              onClick={() =>
                void handleAddNewItem()
              }
            >
              {addingMaster
                ? 'Adding…'
                : 'Add'}
            </Button>
          </>
        }
      >
        <input
          value={
            newItemName
          }
          onChange={
            (event) =>
              setNewItemName(
                event.target.value
              )
          }
          onKeyDown={
            (event) => {
              if (
                event.key ===
                  'Enter' &&
                !addingMaster
              ) {
                event.preventDefault();
                void handleAddNewItem();
              }
            }
          }
          placeholder={`Enter ${addModalTitle.replace('Add ', '').toLowerCase()} name`}
          className={
            inputCls
          }
          autoFocus
        />
      </Modal>

      <Modal
        open={
          Boolean(
            viewUser
          )
        }
        onClose={() =>
          setViewUser(
            null
          )
        }
        title="Employee Details"
        size="lg"
      >
        {viewUser &&
          (() => {
            const {
              manager,
            } =
              getReportingChain(
                viewUser,
                getUserById
              );

            return (
              <div className="space-y-3">
                {viewUser.detailsStatus ===
                  'pending' && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <strong>
                      Details Pending:
                    </strong>{' '}
                    {(
                      viewUser.pendingFields ||
                      []
                    ).join(', ') ||
                      'required employee details'}
                  </div>
                )}

                <Detail
                  label="Name"
                  value={
                    viewUser.fullName
                  }
                />

                <Detail
                  label="Email"
                  value={
                    viewUser.email
                  }
                />

                <Detail
                  label="Employee ID"
                  value={
                    viewUser.employeeId
                  }
                />

                <Detail
                  label="CNIC"
                  value={
                    viewUser.cnic ||
                    '—'
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    viewUser.phone ||
                    '—'
                  }
                />

                <Detail
                  label="Role"
                  value={
                    viewUser.roleLabel ||
                    '—'
                  }
                />

                <Detail
                  label="Designation"
                  value={
                    viewUser.designation ||
                    '—'
                  }
                />

                <Detail
                  label="Grade"
                  value={
                    viewUser.grade ||
                    '—'
                  }
                />

                <Detail
                  label="Department"
                  value={
                    viewUser.department ||
                    '—'
                  }
                />

                <Detail
                  label="Portal Access"
                  value={
                    portalAccessLabel[
                      viewUser.role
                    ]
                  }
                />

                <Detail
                  label="Joining Date"
                  value={
                    viewUser.dateOfJoining
                      ? formatDate(
                          viewUser.dateOfJoining
                        )
                      : '—'
                  }
                />

                <Detail
                  label="Manager"
                  value={
                    manager?.fullName ||
                    '—'
                  }
                />

                <EmployeeLeaveBalanceSummary
                  employeeId={
                    viewUser.id
                  }
                />
              </div>
            );
          })()}
      </Modal>

      <Modal
        open={
          Boolean(
            removeTarget
          )
        }
        onClose={() => {
          if (
            !deleting
          ) {
            setRemoveTarget(
              null
            );
          }
        }}
        title="Remove Employee"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                deleting
              }
              onClick={() =>
                setRemoveTarget(
                  null
                )
              }
            >
              Cancel
            </Button>

            <button
              type="button"
              disabled={
                deleting
              }
              onClick={() =>
                void handleRemove()
              }
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting
                ? 'Removing…'
                : 'Remove Employee'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-gray-600">
          Are you sure you want to remove{' '}
          <strong className="text-gray-900">
            {removeTarget?.fullName}
          </strong>
          ? This uses the backend soft-remove flow.
        </p>
      </Modal>

      <Modal
        open={
          Boolean(
            csvReview
          )
        }
        onClose={() => {
          if (
            importing
          ) {
            return;
          }

          setCsvReview(
            null
          );
          setCsvFile(
            null
          );
        }}
        title="CSV Import Review"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                importing
              }
              onClick={() => {
                setCsvReview(
                  null
                );
                setCsvFile(
                  null
                );
              }}
            >
              Cancel Import
            </Button>

            <Button
              disabled={
                importing
              }
              onClick={() =>
                void confirmPendingImport()
              }
            >
              {importing
                ? 'Importing…'
                : 'Import & Complete Later'}
            </Button>
          </>
        }
      >
        {csvReview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard
                label="Total"
                value={
                  csvReview.summary.total
                }
              />

              <SummaryCard
                label="Complete"
                value={
                  csvReview.summary.complete ||
                  0
                }
              />

              <SummaryCard
                label="Details Pending"
                value={
                  csvReview.summary.pending ||
                  0
                }
                danger
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              These employees can be imported now and completed later.
              Unknown Department, Designation or Grade values will not be
              created in Master Data automatically.
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {(
                csvReview.pendingEmployees ||
                []
              )
                .slice(
                  0,
                  10
                )
                .map(
                  (
                    employee
                  ) => (
                    <div
                      key={
                        employee.row
                      }
                      className="rounded-lg border border-rose-100 bg-rose-50/50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <strong className="text-sm text-gray-900">
                          {employee.fullName ||
                            employee.employeeId ||
                            'Employee'}
                        </strong>

                        <span className="text-xs text-gray-500">
                          Row {employee.row}
                        </span>
                      </div>

                      <ul className="space-y-1 text-sm text-rose-700">
                        {employee.issues.map(
                          (
                            issue,
                            index
                          ) => (
                            <li
                              key={`${employee.row}-${issue.field}-${index}`}
                            >
                              • {issue.message}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )
                )}

              {(
                csvReview
                  .pendingEmployees
                  ?.length ||
                0
              ) > 10 && (
                <p className="text-xs text-gray-500">
                  Showing first 10 pending employees. Total pending:{' '}
                  {
                    csvReview
                      .pendingEmployees
                      ?.length
                  }
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={
          csvBlockingErrors.length >
          0
        }
        onClose={() =>
          setCsvBlockingErrors(
            []
          )
        }
        title="CSV Import Blocked"
        size="lg"
        footer={
          <Button
            onClick={() =>
              setCsvBlockingErrors(
                []
              )
            }
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            The CSV contains blocking errors. Nothing was imported.
            Fix these fields and upload the file again.
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {csvBlockingErrors
              .slice(
                0,
                20
              )
              .map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${item.row}-${item.field}-${index}`}
                    className="rounded-lg border border-gray-100 px-3 py-2 text-sm"
                  >
                    <strong>
                      Row {item.row}
                    </strong>
                    {' — '}
                    {item.employee}
                    {' — '}
                    <span className="text-rose-700">
                      {item.message}
                    </span>
                  </div>
                )
              )}

            {csvBlockingErrors.length >
              20 && (
              <p className="text-xs text-gray-500">
                Showing first 20 errors. Total errors:{' '}
                {csvBlockingErrors.length}
              </p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={
          message.open
        }
        onClose={() =>
          setMessage(
            (previous) => ({
              ...previous,
              open: false,
            })
          )
        }
        title={
          message.title
        }
        footer={
          <Button
            onClick={() =>
              setMessage(
                (previous) => ({
                  ...previous,
                  open: false,
                })
              )
            }
          >
            OK
          </Button>
        }
      >
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type ===
            'error'
              ? 'bg-rose-50 text-rose-700'
              : message.type ===
                  'warning'
                ? 'bg-amber-50 text-amber-700'
                : message.type ===
                    'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
          }`}
        >
          {message.message}
        </div>
      </Modal>
    </div>
  );
}

function SelectWithAdd({
  value,
  options,
  placeholder,
  inputClass,
  onChange,
  onAdd,
}: {
  value: string;
  options: string[];
  placeholder: string;
  inputClass: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={
          value
        }
        onChange={
          (event) =>
            onChange(
              event.target.value
            )
        }
        className={
          inputClass
        }
      >
        <option value="">
          {placeholder}
        </option>

        {options.map(
          (name) => (
            <option
              key={
                name
              }
              value={
                name
              }
            >
              {name}
            </option>
          )
        )}
      </select>

      <button
        type="button"
        onClick={
          onAdd
        }
        aria-label={`Add ${placeholder.replace('Select ', '')}`}
        className="flex w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-blue-600 hover:bg-blue-50"
      >
        <Plus
          size={17}
        />
      </button>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}

function EmployeeLeaveBalanceSummary({
  employeeId,
}: {
  employeeId: string;
}) {
  const [
    balances,
    setBalances,
  ] = useState<
    Record<
      string,
      {
        quota: number;
        used: number;
        remaining: number;
      }
    >
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    balanceError,
    setBalanceError,
  ] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setBalanceError('');

    void api
      .get(
        `/leave-requests/balance/${employeeId}`
      )
      .then((response) => {
        if (!active) {
          return;
        }

        setBalances(
          response.data?.data ||
            {}
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setBalanceError(
          getApiErrorMessage(
            error,
            'Unable to load leave balances.'
          )
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [employeeId]);

  const rows =
    Object.entries(
      balances
    ).sort(
      ([a], [b]) =>
        a.localeCompare(b)
    );

  const totals =
    rows.reduce(
      (
        total,
        [, balance]
      ) => ({
        quota:
          total.quota +
          Number(
            balance.quota ||
            0
          ),
        used:
          total.used +
          Number(
            balance.used ||
            0
          ),
        remaining:
          total.remaining +
          Number(
            balance.remaining ||
            0
          ),
      }),
      {
        quota: 0,
        used: 0,
        remaining: 0,
      }
    );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">
          Leave Balance
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Granted, used and remaining leave for the current leave year.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">
          Loading leave balance…
        </p>
      ) : balanceError ? (
        <p className="text-sm text-rose-600">
          {balanceError}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No leave balance is available for this employee.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">
                  Leave Type
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Granted
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Used
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Remaining
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rows.map(
                ([leaveType, balance]) => (
                  <tr key={leaveType}>
                    <td className="px-3 py-2 font-medium capitalize text-gray-800">
                      {leaveType.replace(
                        /_/g,
                        ' '
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {balance.quota}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {balance.used}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-700">
                      {balance.remaining}
                    </td>
                  </tr>
                )
              )}

              <tr className="bg-gray-50 font-semibold">
                <td className="px-3 py-2 text-gray-900">
                  Total
                </td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {totals.quota}
                </td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {totals.used}
                </td>
                <td className="px-3 py-2 text-right text-emerald-700">
                  {totals.remaining}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? 'rounded-lg border border-rose-200 bg-rose-50 p-3'
          : 'rounded-lg border border-gray-100 bg-gray-50 p-3'
      }
    >
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p
        className={
          danger
            ? 'mt-1 text-xl font-semibold text-rose-700'
            : 'mt-1 text-xl font-semibold text-gray-900'
        }
      >
        {value}
      </p>
    </div>
  );
}
