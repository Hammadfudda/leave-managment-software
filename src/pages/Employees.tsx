import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
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
import Popup from '../components/ui/Popup';

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

type PopupType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

interface PopupState {
  open: boolean;
  type: PopupType;
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

  const [showAdd, setShowAdd] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [addNewField, setAddNewField] =
    useState<'designation' | 'department' | null>(null);

  const [newItemName, setNewItemName] = useState('');

  const [popup, setPopup] = useState<PopupState>({
    open: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showPopup = (
    type: PopupType,
    title: string,
    message: string
  ) => {
    setPopup({
      open: true,
      type,
      title,
      message,
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
        showPopup(
          'error',
          'Unable to Load Data',
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

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.employeeId.toLowerCase().includes(search);

      const matchesDepartment =
        !deptFilter ||
        user.department === deptFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [users, query, deptFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setErrors({});
    setEditingUser(null);
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.fullName.trim()) {
      next.fullName = 'Full name is required';
    }

    if (!form.email.trim()) {
      next.email = 'Email is required';
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
      showPopup(
        'warning',
        'Missing Information',
        'Please complete all required fields correctly.'
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      const payload: User = {
        ...(editingUser || {
          id: '',
        }),

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

        managerId:
          form.managerId || undefined,

        canApproveOtherDepartments:
          form.canApproveOtherDepartments,
      } as User;

      if (editingUser) {
        await updateUser(payload);

        showPopup(
          'success',
          'Employee Updated',
          `${payload.fullName} has been updated successfully.`
        );
      } else {
        await addUser(payload);

        showPopup(
          'success',
          'Employee Created',
          `${payload.fullName} has been created successfully.`
        );
      }

      setShowAdd(false);
      resetForm();

      await refreshEmployees();
    } catch (error) {
      showPopup(
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

  const handleEdit = (user: User) => {
    setEditingUser(user);

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

  const handleRemove = async () => {
    if (!removeTarget) return;

    setDeleting(true);

    try {
      await removeUser(removeTarget.id);

      showPopup(
        'success',
        'Employee Removed',
        `${removeTarget.fullName} has been removed successfully.`
      );

      setRemoveTarget(null);

      await refreshEmployees();
    } catch (error) {
      showPopup(
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
      showPopup(
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

      showPopup(
        'success',
        'Added Successfully',
        `${name} has been added.`
      );
    } catch (error) {
      showPopup(
        'error',
        'Unable to Add',
        getApiErrorMessage(error)
      );
    }
  };

  const handleImport = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImporting(true);

    try {
      await importEmployeesCsv(file);
      await refreshEmployees();

      showPopup(
        'success',
        'Import Complete',
        'Employees imported successfully.'
      );
    } catch (error) {
      showPopup(
        'error',
        'Import Failed',
        getApiErrorMessage(error)
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

      showPopup(
        'success',
        'Export Complete',
        'Employee CSV exported successfully.'
      );
    } catch (error) {
      showPopup(
        'error',
        'Export Failed',
        getApiErrorMessage(error)
      );
    } finally {
      setExporting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <Popup
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() =>
          setPopup((previous) => ({
            ...previous,
            open: false,
          }))
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Employees
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage employee records and organization accounts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            {importing ? 'Importing...' : 'Import CSV'}

            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>

          <Button
            onClick={() => {
              resetForm();

              setForm({
                ...emptyForm,
                grade: grades[0]?.name || '',
              });

              setShowAdd(true);
            }}
          >
            <UserPlus size={16} />
            Create Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees"
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} />

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={inputCls}
          >
            <option value="">
              All Departments
            </option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {employeesLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading employees...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-5 py-3">Emp ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Designation</th>
                  <th className="px-5 py-3">Grade</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3 font-mono">
                      {user.employeeId}
                    </td>

                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">
                        {user.fullName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="px-5 py-3">
                      {user.designation}
                    </td>

                    <td className="px-5 py-3">
                      <Badge variant="teal">
                        {user.grade || '—'}
                      </Badge>
                    </td>

                    <td className="px-5 py-3">
                      {user.department}
                    </td>

                    <td className="px-5 py-3">
                      {roleLabel[user.role]}
                    </td>

                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          user.status === 'active'
                            ? 'green'
                            : 'gray'
                        }
                      >
                        {user.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setViewUser(user)}
                          className="flex items-center gap-1 text-blue-600"
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(user)}
                          className="text-amber-600"
                        >
                          Edit
                        </button>

                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveTarget(user)
                            }
                            className="flex items-center gap-1 text-rose-600"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => {
          if (!saving) {
            setShowAdd(false);
            resetForm();
          }
        }}
        title={
          editingUser
            ? 'Edit Employee'
            : 'Create Employee'
        }
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
                ? 'Saving...'
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
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Full Name"
            error={errors.fullName}
          >
            <input
              value={form.fullName}
              onChange={(e) =>
                setForm({
                  ...form,
                  fullName: e.target.value,
                })
              }
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Email"
            error={errors.email}
          >
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              className={inputCls}
            />
          </FormField>

          <FormField
            label="CNIC"
            error={errors.cnic}
          >
            <input
              value={form.cnic}
              disabled={Boolean(editingUser)}
              onChange={(e) =>
                setForm({
                  ...form,
                  cnic: e.target.value,
                })
              }
              placeholder="12345-1234567-1"
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Phone"
            error={errors.phone}
          >
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value,
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
              onChange={(e) =>
                setForm({
                  ...form,
                  employeeId: e.target.value,
                })
              }
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Role"
          >
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as Role,
                })
              }
              className={inputCls}
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
            label="Designation"
            error={errors.designation}
          >
            <div className="flex gap-2">
              <select
                value={form.designation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    designation: e.target.value,
                  })
                }
                className={inputCls}
              >
                <option value="">
                  Select
                </option>

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
              >
                <Plus size={18} />
              </button>
            </div>
          </FormField>

          <FormField
            label="Grade"
            error={errors.grade}
          >
            <select
              value={form.grade}
              onChange={(e) =>
                setForm({
                  ...form,
                  grade: e.target.value,
                })
              }
              className={inputCls}
            >
              <option value="">
                Select
              </option>

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
                onChange={(e) =>
                  setForm({
                    ...form,
                    department: e.target.value,
                  })
                }
                className={inputCls}
              >
                <option value="">
                  Select
                </option>

                {departments.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setAddNewField('department')
                }
              >
                <Plus size={18} />
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
              onChange={(e) =>
                setForm({
                  ...form,
                  dateOfJoining: e.target.value,
                })
              }
              className={inputCls}
            />
          </FormField>

          <FormField label="Manager">
            <select
              value={form.managerId}
              onChange={(e) =>
                setForm({
                  ...form,
                  managerId: e.target.value,
                })
              }
              className={inputCls}
            >
              <option value="">
                No Manager
              </option>

              {users
                .filter(
                  (user) =>
                    user.role === 'manager' &&
                    user.id !== editingUser?.id
                )
                .map((manager) => (
                  <option
                    key={manager.id}
                    value={manager.id}
                  >
                    {manager.fullName}
                  </option>
                ))}
            </select>
          </FormField>
        </form>
      </Modal>

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
              onClick={() => setAddNewField(null)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleAddNewItem()}
            >
              Add
            </Button>
          </>
        }
      >
        <input
          value={newItemName}
          onChange={(e) =>
            setNewItemName(e.target.value)
          }
          className={inputCls}
          autoFocus
        />
      </Modal>

      <Modal
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title="Employee Details"
      >
        {viewUser &&
          (() => {
            const { manager } =
              getReportingChain(
                viewUser,
                getUserById
              );

            return (
              <div className="space-y-3 text-sm">
                <Detail label="Name" value={viewUser.fullName} />
                <Detail label="Email" value={viewUser.email} />
                <Detail label="Employee ID" value={viewUser.employeeId} />
                <Detail label="CNIC" value={viewUser.cnic} />
                <Detail label="Phone" value={viewUser.phone || '—'} />
                <Detail label="Designation" value={viewUser.designation} />
                <Detail label="Grade" value={viewUser.grade || '—'} />
                <Detail label="Department" value={viewUser.department} />
                <Detail label="Role" value={roleLabel[viewUser.role]} />
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
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
            >
              {deleting
                ? 'Removing...'
                : 'Remove Employee'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to remove{' '}
          <strong>{removeTarget?.fullName}</strong>?
          This uses soft delete, so the employee can be
          restored during the backend restore period.
        </p>
      </Modal>
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
  children: React.ReactNode;
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
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}