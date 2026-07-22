import { useState } from 'react';
import { useAppData, getReportingChain } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { UserPlus, Search, Eye, Filter, Plus } from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import type { User, Role } from '../types';

const roleLabel: Record<Role, string> = {
  admin: 'Admin', manager: 'Manager', team_leader: 'Team Leader', employee: 'Employee',
};

const emptyForm = {
  fullName: '', email: '', employeeId: '', cnic: '', phone: '',
  role: 'employee' as Role, designation: '', grade: 'Grade C', department: '',
  dateOfJoining: '', status: 'active' as 'active' | 'inactive', teamLeaderId: '', managerId: '',
};

export default function Employees() {
  const {
    users, grades, designations, departments, addUser, updateUser,
    addDesignation, addDepartment, getUserById,
  } = useAppData();

  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addNewField, setAddNewField] = useState<'designation' | 'department' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const filtered = users.filter((u) => {
    const matchesQuery =
      u.fullName.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(query.toLowerCase());
    const matchesDept = deptFilter ? u.department === deptFilter : true;
    return matchesQuery && matchesDept;
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.employeeId.trim()) e.employeeId = 'Employee ID is required';
    if (!form.cnic.trim()) e.cnic = 'CNIC is required';
    else if (!/^\d{5}-\d{7}-\d$/.test(form.cnic)) e.cnic = 'Format: 12345-1234567-1';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.designation) e.designation = 'Designation is required';
    if (!form.department) e.department = 'Department is required';
    if (!form.dateOfJoining) e.dateOfJoining = 'Date of joining is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setErrors({});
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: User = editingUser
      ? { ...editingUser, fullName: form.fullName.trim(), email: form.email.trim(), employeeId: form.employeeId.trim(), cnic: form.cnic.trim(), phone: form.phone.trim(), role: form.role, designation: form.designation, grade: form.grade, department: form.department, dateOfJoining: form.dateOfJoining, status: form.status as User['status'], teamLeaderId: form.teamLeaderId || undefined, managerId: form.managerId || undefined }
      : {
          id: `u${Date.now()}`,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          employeeId: form.employeeId.trim(),
          cnic: form.cnic.trim(),
          phone: form.phone.trim(),
          role: form.role,
          designation: form.designation,
          grade: form.grade,
          department: form.department,
          dateOfJoining: form.dateOfJoining,
          status: form.status as User['status'],
          teamLeaderId: form.teamLeaderId || undefined,
          managerId: form.managerId || undefined,
        };

    if (editingUser) updateUser(payload);
    else addUser(payload);
    setShowAdd(false);
    resetForm();
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim() || !addNewField) return;
    if (addNewField === 'designation') {
      addDesignation(newItemName.trim());
      setForm({ ...form, designation: newItemName.trim() });
    } else {
      addDepartment(newItemName.trim());
      setForm({ ...form, department: newItemName.trim() });
    }
    setAddNewField(null);
    setNewItemName('');
  };

  const handleExport = () => {
    const header = ['fullName', 'email', 'employeeId', 'cnic', 'phone', 'role', 'designation', 'grade', 'department', 'dateOfJoining', 'status'];
    const rows = users.map((u) => [u.fullName, u.email, u.employeeId, u.cnic, u.phone, u.role, u.designation, u.grade, u.department, u.dateOfJoining, u.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/).slice(1);
    lines.forEach((line) => {
      const [fullName, email, employeeId, cnic, phone, role, designation, grade, department, dateOfJoining, status] = line.split(',').map((value) => value.replace(/^"|"$/g, ''));
      if (!fullName || !email || !employeeId) return;
      addUser({ id: `u${Date.now()}-${Math.random()}`, fullName, email, employeeId, cnic, phone, role: role as User['role'], designation, grade, department, dateOfJoining, status: status as User['status'], teamLeaderId: undefined, managerId: undefined });
    });
    setImporting(false);
    event.target.value = '';
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
  const errorCls = 'mt-1 text-xs text-rose-600';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all employee records and create new accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100">Export CSV</button>
          <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {importing ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <Button onClick={() => { resetForm(); setShowAdd(true); }}><UserPlus size={16} /> Create Employee</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or employee ID"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="relative flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
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
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 animate-fade-in">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{u.employeeId}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{u.fullName.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-gray-900">{u.fullName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.designation}</td>
                  <td className="px-5 py-3"><Badge variant="teal">{u.grade}</Badge></td>
                  <td className="px-5 py-3 text-gray-600">{u.department}</td>
                  <td className="px-5 py-3 text-gray-600">{roleLabel[u.role]}</td>
                  <td className="px-5 py-3">
                    {u.status === 'active' ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Inactive</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setViewUser(u)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        <Eye size={14} /> View
                      </button>
                      <button onClick={() => { setEditingUser(u); setForm({ fullName: u.fullName, email: u.email, employeeId: u.employeeId, cnic: u.cnic, phone: u.phone, role: u.role, designation: u.designation, grade: u.grade, department: u.department, dateOfJoining: u.dateOfJoining, status: u.status, teamLeaderId: u.teamLeaderId || '', managerId: u.managerId || '' }); setShowAdd(true); }} className="text-sm font-medium text-amber-600 hover:text-amber-700">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setErrors({}); setAddNewField(null); resetForm(); }}
        title={editingUser ? 'Edit Employee' : 'Create Employee'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setErrors({}); resetForm(); }}>Cancel</Button>
            <Button type="submit" form="create-emp-form">{editingUser ? 'Save Changes' : 'Create Employee'}</Button>
          </>
        }
      >
        <form id="create-emp-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg bg-blue-50/60 px-4 py-3 text-xs text-blue-700">
            Fill in all employee details. Fields marked with <span className="font-semibold">*</span> are required.
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Personal Information</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name <span className="text-rose-500">*</span></label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. John Doe" className={inputCls} />
                {errors.fullName && <p className={errorCls}>{errors.fullName}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">CNIC <span className="text-rose-500">*</span></label>
                <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="12345-1234567-1" className={`${inputCls} font-mono`} />
                {errors.cnic && <p className={errorCls}>{errors.cnic}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone <span className="text-rose-500">*</span></label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92-3xx-xxxxxxx" className={inputCls} />
                {errors.phone && <p className={errorCls}>{errors.phone}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email <span className="text-rose-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@nutrilov.com" className={inputCls} />
                {errors.email && <p className={errorCls}>{errors.email}</p>}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Employment Information</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Employee ID <span className="text-rose-500">*</span></label>
                <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="e.g. NDD-009" className={`${inputCls} font-mono`} />
                {errors.employeeId && <p className={errorCls}>{errors.employeeId}</p>}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Designation <span className="text-rose-500">*</span></label>
                  <button type="button" onClick={() => setAddNewField('designation')} className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"><Plus size={12} /> Add new</button>
                </div>
                <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={inputCls}>
                  <option value="">Select designation</option>
                  {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.designation && <p className={errorCls}>{errors.designation}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Grade</label>
                <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputCls}>
                  {grades.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Department <span className="text-rose-500">*</span></label>
                  <button type="button" onClick={() => setAddNewField('department')} className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"><Plus size={12} /> Add new</button>
                </div>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className={errorCls}>{errors.department}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputCls}>
                  <option value="employee">Employee</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of joining <span className="text-rose-500">*</span></label>
                <input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} className={inputCls} />
                {errors.dateOfJoining && <p className={errorCls}>{errors.dateOfJoining}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {form.role === 'employee' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Team Leader</label>
                    <select value={form.teamLeaderId} onChange={(e) => setForm({ ...form, teamLeaderId: e.target.value })} className={inputCls}>
                      <option value="">No team leader</option>
                      {users.filter((u) => u.role === 'team_leader').map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} — {u.designation}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Manager</label>
                    <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className={inputCls}>
                      <option value="">Auto (via team leader)</option>
                      {users.filter((u) => u.role === 'manager').map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} — {u.designation}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!addNewField}
        onClose={() => { setAddNewField(null); setNewItemName(''); }}
        title={addNewField === 'designation' ? 'Add Designation' : 'Add Department'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAddNewField(null); setNewItemName(''); }}>Cancel</Button>
            <Button onClick={handleAddNewItem}>Add</Button>
          </>
        }
      >
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={addNewField === 'designation' ? 'e.g. Data Scientist' : 'e.g. Research'}
          className={inputCls}
          autoFocus
        />
      </Modal>

      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="Employee Details" size="lg">
        {viewUser && (() => {
          const { teamLeader, manager } = getReportingChain(viewUser, getUserById);
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-slate-50 p-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white">
                  {viewUser.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{viewUser.fullName}</h3>
                  <p className="text-sm text-gray-600">{viewUser.designation}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="teal">{viewUser.grade}</Badge>
                    {viewUser.status === 'active' ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Inactive</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Employee ID" value={viewUser.employeeId} mono />
                <DetailField label="Email" value={viewUser.email} />
                <DetailField label="CNIC" value={viewUser.cnic} mono />
                <DetailField label="Phone" value={viewUser.phone} />
                <DetailField label="Department" value={viewUser.department} />
                <DetailField label="Role" value={roleLabel[viewUser.role]} />
                <DetailField label="Date of Joining" value={formatDate(viewUser.dateOfJoining)} />
                <DetailField label="Team Leader" value={teamLeader?.fullName || '—'} />
                <DetailField label="Manager" value={manager?.fullName || '—'} />
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
