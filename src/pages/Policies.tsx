import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Pencil, Plus, Lock, Trash2 } from 'lucide-react';
import type { LeavePolicy, LeaveType } from '../types';

const extraTypes: LeaveType[] = ['unpaid', 'maternity', 'paternity'];

export default function Policies() {
  const { user } = useAuth();
  const { leavePolicies, addLeavePolicy, updateLeavePolicy, designations, departments, users } = useAppData();
  const isAdmin = user?.role === 'admin';
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState({
    leaveTypeName: '',
    role: 'All Employees',
    isPaid: true,
    designation: 'All Designations',
    department: 'All Departments',
    approverIds: [] as string[],
    minDaysNoticeRequired: 3,
    documentRequirement: 'optional' as 'optional' | 'required',
  });

  const openEdit = (p: LeavePolicy) => {
    setEditing(p);
    setForm({
      leaveTypeName: p.leaveType.replace(/_/g, ' '),
      role: p.role || 'All Employees',
      isPaid: p.isPaid,
      designation: p.approvalRouting?.designation || 'All Designations',
      department: p.approvalRouting?.department || 'All Departments',
      approverIds: p.approvalRouting?.approverIds || [],
      minDaysNoticeRequired: p.minDaysNoticeRequired,
      documentRequirement: p.documentRequirement || (p.requiresDocumentUpload ? 'required' : 'optional'),
    });
  };

  const handleSave = () => {
    if (!form.leaveTypeName.trim()) return;
    const leaveTypeKey = form.leaveTypeName.trim().toLowerCase().replace(/\s+/g, '_');
    const policyPayload: LeavePolicy = {
      id: editing ? editing.id : `lp${Date.now()}`,
      leaveType: leaveTypeKey,
      role: form.role,
      requiresApprovalFrom: 'manager',
      approvalRouting: {
        designation: form.designation !== 'All Designations' ? form.designation : undefined,
        department: form.department !== 'All Departments' ? form.department : undefined,
        approverIds: form.approverIds,
      },
      requiresDocumentUpload: form.documentRequirement === 'required',
      documentRequirement: form.documentRequirement,
      minDaysNoticeRequired: form.minDaysNoticeRequired,
      isPaid: form.isPaid,
    };

    if (editing) {
      updateLeavePolicy(policyPayload);
    } else {
      addLeavePolicy(policyPayload);
    }

    setForm({
      leaveTypeName: '',
      role: 'All Employees',
      isPaid: true,
      designation: 'All Designations',
      department: 'All Departments',
      approverIds: [],
      minDaysNoticeRequired: 3,
      documentRequirement: 'optional',
    });
    setEditing(null);
    setShowAdd(false);
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Policies</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Configure rules for each leave type. Core types: annual, sick, casual. Add more below.' : 'View the rules that apply to each leave type.'}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => {
            setEditing(null);
            setForm({
              leaveTypeName: '',
              role: 'All Employees',
              isPaid: true,
              designation: 'All Designations',
              department: 'All Departments',
              approverIds: [],
              minDaysNoticeRequired: 3,
              documentRequirement: 'optional',
            });
            setShowAdd(true);
          }}><Plus size={16} /> Add Leave Type</Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
            <Lock size={12} /> Read-only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leavePolicies.map((p) => {
          const approversList = p.approvalRouting?.approverIds || [];
          return (
            <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-semibold capitalize text-gray-900">{p.leaveType.replace(/_/g, ' ')} leave</h3>
                {isAdmin && (
                  <button onClick={() => { openEdit(p); setShowAdd(true); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil size={14} /></button>
                )}
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Approval from</span>
                  <div className="flex gap-1 flex-wrap">
                    {approversList.length === 0 && <span className="text-xs text-gray-400">Not set</span>}
                    {approversList.map((id) => {
                      const approver = users.find((u) => u.id === id);
                      return (
                        <Badge key={id} variant="blue">{approver?.fullName || 'Unknown'}</Badge>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Role</span>
                  <span className="font-medium text-gray-900">{p.role || 'All Employees'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Document upload</span>
                  {p.documentRequirement === 'required' || p.requiresDocumentUpload ? <Badge variant="orange">Required</Badge> : <Badge variant="gray">Optional</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Min notice</span>
                  <span className="font-medium text-gray-900">{p.minDaysNoticeRequired} day(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Paid</span>
                  {p.isPaid ? <Badge variant="green">Paid</Badge> : <Badge variant="gray">Unpaid</Badge>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <Modal
          open={showAdd}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          title={editing ? 'Edit Leave Policy' : 'Create Leave Type'}
          footer={<><Button variant="secondary" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Policy'}</Button></>}
        >
          <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto px-1">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave Type Name</label>
              <input
                type="text"
                placeholder="e.g. Maternity"
                value={form.leaveTypeName}
                onChange={(e) => setForm({ ...form, leaveTypeName: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Applicable Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}
              >
                <option value="All Employees">All Employees</option>
                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Pay Type</label>
              <select
                value={form.isPaid ? 'paid' : 'unpaid'}
                onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'paid' })}
                className={inputCls}
              >
                <option value="paid">Paid Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700 mt-2">Approval Routing Filters</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Designation</label>
                  <select
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className={inputCls}
                  >
                    <option value="All Designations">All Designations</option>
                    {designations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className={inputCls}
                  >
                    <option value="All Departments">All Departments</option>
                    {departments.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Required Approvers</label>

              {form.approverIds.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {form.approverIds.map((id) => {
                    const approver = users.find((u) => u.id === id);
                    if (!approver) return null;
                    return (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm">
                        <span className="text-gray-800">{approver.fullName} <span className="text-xs text-gray-400">({approver.designation})</span></span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, approverIds: form.approverIds.filter((aid) => aid !== id) })}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-lg border border-gray-200 p-3 space-y-1 bg-gray-50/50 max-h-40 overflow-y-auto">
                <p className="text-[11px] text-gray-500 mb-1">
                  {form.designation !== 'All Designations' || form.department !== 'All Departments'
                    ? 'Matching people (based on filters above) — click to add:'
                    : 'Click to add an approver:'}
                </p>
                {users
                  .filter((u) => u.role !== 'employee')
                  .filter((u) => form.designation === 'All Designations' || u.designation === form.designation)
                  .filter((u) => form.department === 'All Departments' || u.department === form.department)
                  .filter((u) => !form.approverIds.includes(u.id))
                  .map((approver) => (
                    <button
                      type="button"
                      key={approver.id}
                      onClick={() => setForm({ ...form, approverIds: [...form.approverIds, approver.id] })}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-white hover:shadow-sm"
                    >
                      <span>{approver.fullName} <span className="text-xs text-gray-400">({approver.designation} · {approver.department})</span></span>
                      <span className="text-xs text-blue-600">+ Add</span>
                    </button>
                  ))}
                {users
                  .filter((u) => u.role !== 'employee')
                  .filter((u) => form.designation === 'All Designations' || u.designation === form.designation)
                  .filter((u) => form.department === 'All Departments' || u.department === form.department)
                  .filter((u) => !form.approverIds.includes(u.id)).length === 0 && (
                  <p className="text-xs text-gray-400 py-2 text-center">No matching people for this filter.</p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Minimum Notice Days Required</label>
              <input
                type="number"
                min={0}
                value={form.minDaysNoticeRequired}
                onChange={(e) => setForm({ ...form, minDaysNoticeRequired: Math.max(0, Number(e.target.value)) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Document Attachment</label>
              <select
                value={form.documentRequirement}
                onChange={(e) => setForm({ ...form, documentRequirement: e.target.value as 'optional' | 'required' })}
                className={inputCls}
              >
                <option value="optional">Optional</option>
                <option value="required">Required</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
