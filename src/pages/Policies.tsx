import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Pencil, Plus, Lock } from 'lucide-react';
import type { LeavePolicy, LeaveType } from '../types';

const extraTypes: LeaveType[] = ['unpaid', 'maternity', 'paternity'];

export default function Policies() {
  const { user } = useAuth();
  const { leavePolicies, addLeavePolicy, updateLeavePolicy, designations, departments } = useAppData();
  const isAdmin = user?.role === 'admin';
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState({
    leaveTypeName: '',
    role: 'All Employees',
    isPaid: true,
    designation: 'All Designations',
    department: 'All Departments',
    approvers: ['manager'] as ('team_leader' | 'manager' | 'admin' | 'hr')[],
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
      approvers: p.approvalRouting?.approvers || [p.requiresApprovalFrom],
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
      requiresApprovalFrom: form.approvers[0] || 'manager',
      approvalRouting: {
        designation: form.designation !== 'All Designations' ? form.designation : undefined,
        department: form.department !== 'All Departments' ? form.department : undefined,
        approvers: form.approvers,
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
      approvers: ['manager'],
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
              approvers: ['manager'],
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
          const approversList = p.approvalRouting?.approvers || [p.requiresApprovalFrom];
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
                    {approversList.map((app) => (
                      <Badge key={app} variant="blue">{app.replace('_', ' ')}</Badge>
                    ))}
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
                <option value="team_leader">Team Leader</option>
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
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Multi-level Approvers</label>
              <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                <p className="text-[11px] text-gray-500 mb-2">Select required approvers:</p>
                {(['team_leader', 'manager', 'admin', 'hr'] as const).map((role) => {
                  const isChecked = form.approvers.includes(role);
                  return (
                    <label key={role} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let nextApprovers = [...form.approvers];
                          if (isChecked) {
                            nextApprovers = nextApprovers.filter((r) => r !== role);
                          } else {
                            nextApprovers.push(role);
                          }
                          setForm({ ...form, approvers: nextApprovers });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{role.replace('_', ' ')}</span>
                    </label>
                  );
                })}
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
