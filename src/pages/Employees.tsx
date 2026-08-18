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
  exportEmployeesCsv,
  importEmployeesCsv,
} from '../services/employees';

import {
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

interface MessageState {
  open: boolean;
  type: MessageType;
  title: string;
  message: string;
}

const roleLabel: Record<Role, string> = {
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
  designation: '',
  grade: '',
  department: '',
  dateOfJoining: '',
  status: 'active' as 'active' | 'inactive',
  managerId: '',
  canApproveOtherDepartments: false,
};

export default function Employees() {
  const {
    users,
    grades,
    designations,
    departments,
    employeesLoading,
    refreshEmployees,
    refreshLookups,
    addUser,
    updateUser,
    removeUser,
    addDesignation,
    addDepartment,
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

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [addNewField, setAddNewField] =
    useState<'designation' | 'department' | null>(null);

  const [newItemName, setNewItemName] = useState('');

  const [message, setMessage] = useState<MessageState>({
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
  }, [refreshEmployees, refreshLookups]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return users
      .filter((user) => user.role !== 'admin')
      .filter((user) => {
        const matchesSearch =
          !search ||
          user.fullName.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.employeeId.toLowerCase().includes(search) ||
          (user.designation || '').toLowerCase().includes(search);

        const matchesDepartment =
          !deptFilter ||
          user.department === deptFilter;

        const matchesRole =
          !roleFilter ||
          user.role === roleFilter;

        const matchesStatus =
          !statusFilter ||
          user.status === statusFilter;

        const matchesGrade =
          !gradeFilter ||
          user.grade === gradeFilter;

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

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.fullName.trim()) {
      next.fullName = 'Full name is required';
    }

    if (!form.email.trim()) {
      next.email = 'Email is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      next.email = 'Invalid email format';
    }

    if (!form.employeeId.trim()) {
      next.employeeId = 'Employee ID is required';
    }

    if (!form.cnic.trim()) {
      next.cnic = 'CNIC is required';
    } else if (
      !/^\d{5}-\d{7}-\d$/.test(form.cnic)
    ) {
      next.cnic = 'Format: 12345-1234567-1';
    }

    if (!form.phone.trim()) {
      next.phone = 'Phone is required';
    }

    if (!form.designation) {
      next.designation = 'Designation is required';
    }

    if (!form.grade) {
      next.grade = 'Grade is required';
    }

    if (!form.department) {
      next.department = 'Department is required';
    }

    if (!form.dateOfJoining) {
      next.dateOfJoining = 'Date of joining is required';
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
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
    setForm(emptyForm);
    setErrors({});
    setEditingUser(null);
  };

  const openCreate = () => {
    resetForm();
    setForm({
      ...emptyForm,
      grade: grades[0]?.name || '',
    });
    setShowAdd(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setErrors({});

    setForm({
      fullName: user.fullName,
      email: user.email,
      employeeId: user.employeeId,
      cnic: user.cnic,
      phone: user.phone || '',
      role: user.role,
      designation: user.designation,
      grade: user.grade,
      department: user.department,
      dateOfJoining: user.dateOfJoining,
      status: user.status,
      managerId: user.managerId || '',
      canApproveOtherDepartments:
        user.canApproveOtherDepartments || false,
    });

    setShowAdd(true);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      const payload: User = {
        ...(editingUser || { id: '' }),
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        employeeId: form.employeeId.trim(),
        cnic: form.cnic.trim(),
        phone: form.phone.trim(),
        role: form.role,
        designation: form.designation,
        grade: form.grade,
        department: form.department,
        dateOfJoining: form.dateOfJoining,
        status: form.status,
        managerId: form.managerId || undefined,
        canApproveOtherDepartments:
          form.canApproveOtherDepartments,
      } as User;

      if (editingUser) {
        await updateUser(payload);

        showMessage(
          'success',
          'Employee Updated',
          `${payload.fullName} has been updated successfully.`
        );
      } else {
        await addUser(payload);

        showMessage(
          'success',
          'Employee Created',
          `${payload.fullName} has been created successfully.`
        );
      }

      setShowAdd(false);
      resetForm();
      await refreshEmployees();
    } catch (error) {
      showMessage(
        'error',
        editingUser ? 'Update Failed' : 'Create Failed',
        getApiErrorMessage(
          error,
          'Unable to save employee.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;

    setDeleting(true);

    try {
      await removeUser(removeTarget.id);

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

  const handleAddNewItem = async () => {
    const name = newItemName.trim();

    if (!name || !addNewField) {
      showMessage(
        'warning',
        'Name Required',
        'Please enter a name.'
      );
      return;
    }

    try {
      if (addNewField === 'designation') {
        await addDesignation(name);
        setForm((previous) => ({
          ...previous,
          designation: name,
        }));
      } else {
        await addDepartment(name);
        setForm((previous) => ({
          ...previous,
          department: name,
        }));
      }

      setAddNewField(null);
      setNewItemName('');

      showMessage(
        'success',
        'Added Successfully',
        `${name} has been added.`
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
    }
  };

  const handleImport = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showMessage(
        'error',
        'Invalid File',
        'Please select a CSV file.'
      );
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        'error',
        'File Too Large',
        'CSV file must be 5 MB or smaller.'
      );
      event.target.value = '';
      return;
    }

    setImporting(true);

    try {
      await importEmployeesCsv(file);
      await refreshEmployees();

      showMessage(
        'success',
        'Import Complete',
        'Employees were imported successfully.'
      );
    } catch (error) {
      showMessage(
        'error',
        'Import Failed',
        getApiErrorMessage(
          error,
          'Unable to import employee CSV.'
        )
      );
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
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

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const filterCls =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const errorCls =
    'mt-1 text-xs text-rose-600';

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
            disabled={exporting}
            onClick={() => void handleExport()}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>

          <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {importing ? 'Importing…' : 'Import CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>

          <Button onClick={openCreate}>
            <UserPlus size={16} />
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
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search name, email, ID, designation"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <Filter size={15} className="text-gray-400" />

        <select
          value={deptFilter}
          onChange={(event) =>
            setDeptFilter(event.target.value)
          }
          className={filterCls}
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option
              key={department}
              value={department}
            >
              {department}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value)
          }
          className={filterCls}
        >
          <option value="">All Roles</option>
          <option value="manager">Managers</option>
          <option value="employee">Employees</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className={filterCls}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={gradeFilter}
          onChange={(event) =>
            setGradeFilter(event.target.value)
          }
          className={filterCls}
        >
          <option value="">All Grades</option>
          {grades.map((grade) => (
            <option
              key={grade.id}
              value={grade.name}
            >
              {grade.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clearFilters}
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
                  <th className="px-5 py-3 font-medium">Emp ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Designation</th>
                  <th className="px-5 py-3 font-medium">Grade</th>
                  <th className="px-5 py-3 font-medium">Dept</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-gray-400"
                    >
                      No employees match the selected filters.
                    </td>
                  </tr>
                )}

                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="animate-fade-in hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      {user.employeeId}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                          {user.fullName.charAt(0)}
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
                      {user.designation || '—'}
                    </td>

                    <td className="px-5 py-3">
                      <Badge variant="teal">
                        {user.grade || '—'}
                      </Badge>
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {user.department || '—'}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {roleLabel[user.role]}
                    </td>

                    <td className="px-5 py-3">
                      {user.status === 'active' ? (
                        <Badge variant="green">Active</Badge>
                      ) : (
                        <Badge variant="gray">Inactive</Badge>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setViewUser(user)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(user)}
                          className="text-sm font-medium text-amber-600 hover:text-amber-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setRemoveTarget(user)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => {
          if (saving) return;
          setShowAdd(false);
          setAddNewField(null);
          resetForm();
        }}
        title={editingUser ? 'Edit Employee' : 'Create Employee'}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="employee-form"
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : editingUser
                  ? 'Save Changes'
                  : 'Create Employee'}
            </Button>
          </>
        }
      >
        <form
          id="employee-form"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Full Name" error={errors.fullName}>
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    fullName: event.target.value,
                  })
                }
                className={inputCls}
              />
            </FormField>

            <FormField label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                className={inputCls}
              />
            </FormField>

            <FormField label="CNIC" error={errors.cnic}>
              <input
                value={form.cnic}
                disabled={Boolean(editingUser)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    cnic: event.target.value,
                  })
                }
                placeholder="12345-1234567-1"
                className={`${inputCls} disabled:bg-gray-100`}
              />
            </FormField>

            <FormField label="Phone" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value,
                  })
                }
                className={inputCls}
              />
            </FormField>

            <FormField
              label="Employee ID"
              error={errors.employeeId}
            >
              <input
                value={form.employeeId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    employeeId: event.target.value,
                  })
                }
                className={inputCls}
              />
            </FormField>

            <FormField label="Portal Access">
              <select
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as Role,
                  })
                }
                className={inputCls}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </FormField>

            <FormField
              label="Designation"
              error={errors.designation}
            >
              <div className="flex gap-2">
                <select
                  value={form.designation}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      designation: event.target.value,
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Select designation</option>
                  {designations.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setAddNewField('designation')
                  }
                  className="rounded-lg border border-gray-200 px-3 text-blue-600 hover:bg-blue-50"
                >
                  <Plus size={17} />
                </button>
              </div>
            </FormField>

            <FormField label="Grade" error={errors.grade}>
              <select
                value={form.grade}
                onChange={(event) =>
                  setForm({
                    ...form,
                    grade: event.target.value,
                  })
                }
                className={inputCls}
              >
                <option value="">Select grade</option>
                {grades.map((grade) => (
                  <option
                    key={grade.id}
                    value={grade.name}
                  >
                    {grade.name}
                  </option>
                ))}
              </select>
            </FormField>

        <FormField
  label="Department"
  error={errors.department}
>
  <div className="flex gap-2">
    <select
      value={form.department}
      onChange={(event) => {
        const newDepartment =
          event.target.value;

        setForm((previous) => ({
          ...previous,
          department: newDepartment,
          managerId: '',
        }));
      }}
      className={inputCls}
    >
      <option value="">
        Select department
      </option>

      {departments.map((name) => (
        <option
          key={name}
          value={name}
        >
          {name}
        </option>
      ))}
    </select>

    <button
      type="button"
      onClick={() =>
        setAddNewField('department')
      }
      className="rounded-lg border border-gray-200 px-3 text-blue-600 hover:bg-blue-50"
    >
      <Plus size={17} />
    </button>
  </div>
</FormField>

        <FormField
          label="Date of Joining"
          error={errors.dateOfJoining}
        >
          <input
            type="date"
            value={form.dateOfJoining}
            onChange={(event) =>
              setForm({
                ...form,
                dateOfJoining: event.target.value,
              })
            }
            className={inputCls}
          />
        </FormField>

        {editingUser && (
          <FormField label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status:
                    event.target.value as
                    | 'active'
                    | 'inactive',
                })
              }
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        )}
        <FormField label="Manager">
          <select
            value={form.managerId}
            onChange={(event) =>
              setForm({
                ...form,
                managerId: event.target.value,
              })
            }
            disabled={!form.department}
            className={`${inputCls} disabled:cursor-not-allowed disabled:bg-gray-100`}
          >
            <option value="">
              {form.department
                ? 'No Manager'
                : 'Select department first'}
            </option>

            {users
              .filter(
                (candidate) =>
                  candidate.role === 'manager' &&
                  candidate.status === 'active' &&
                  candidate.department === form.department &&
                  candidate.id !== editingUser?.id
              )
              .map((manager) => (
                <option
                  key={manager.id}
                  value={manager.id}
                >
                  {manager.fullName} — {manager.designation}
                </option>
              ))}
          </select>

          {form.department &&
            users.filter(
              (candidate) =>
                candidate.role === 'manager' &&
                candidate.status === 'active' &&
                candidate.department === form.department &&
                candidate.id !== editingUser?.id
            ).length === 0 && (
              <p className="mt-1 text-xs text-gray-400">
                No active manager is available in this department.
              </p>
            )}
        </FormField>

        {form.role === 'manager' && (
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={
                  form.canApproveOtherDepartments
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    canApproveOtherDepartments:
                      event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Can approve leaves from other departments too
            </label>
          </div>
        )}
    </div>
        </form >
      </Modal >

      <Modal
        open={Boolean(addNewField)}
        onClose={() => {
          setAddNewField(null);
          setNewItemName('');
        }}
        title={
          addNewField === 'designation'
            ? 'Add Designation'
            : 'Add Department'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAddNewField(null);
                setNewItemName('');
              }}
            >
              Cancel
            </Button>

            <Button onClick={() => void handleAddNewItem()}>
              Add
            </Button>
          </>
        }
      >
        <input
          value={newItemName}
          onChange={(event) =>
            setNewItemName(event.target.value)
          }
          className={inputCls}
          autoFocus
        />
      </Modal>

      <Modal
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title="Employee Details"
        size="lg"
      >
        {viewUser &&
          (() => {
            const { manager } =
              getReportingChain(
                viewUser,
                getUserById
              );

            return (
              <div className="space-y-3">
                <Detail label="Name" value={viewUser.fullName} />
                <Detail label="Email" value={viewUser.email} />
                <Detail
                  label="Employee ID"
                  value={viewUser.employeeId}
                />
                <Detail label="CNIC" value={viewUser.cnic} />
                <Detail
                  label="Phone"
                  value={viewUser.phone || '—'}
                />
                <Detail
                  label="Designation"
                  value={viewUser.designation || '—'}
                />
                <Detail
                  label="Grade"
                  value={viewUser.grade || '—'}
                />
                <Detail
                  label="Department"
                  value={viewUser.department || '—'}
                />
                <Detail
                  label="Role"
                  value={roleLabel[viewUser.role]}
                />
                <Detail
                  label="Joining Date"
                  value={formatDate(viewUser.dateOfJoining)}
                />
                <Detail
                  label="Manager"
                  value={manager?.fullName || '—'}
                />
              </div>
            );
          })()}
      </Modal>

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => {
          if (!deleting) {
            setRemoveTarget(null);
          }
        }}
        title="Remove Employee"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>

            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleRemove()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove Employee'}
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
        open={message.open}
        onClose={() =>
          setMessage((previous) => ({
            ...previous,
            open: false,
          }))
        }
        title={message.title}
        footer={
          <Button
            onClick={() =>
              setMessage((previous) => ({
                ...previous,
                open: false,
              }))
            }
          >
            OK
          </Button>
        }
      >
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-700'
              : message.type === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
          }`}
        >
          {message.message}
        </div>
      </Modal>
    </div >
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
