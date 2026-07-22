import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Briefcase, Building2, GraduationCap, ClipboardList } from 'lucide-react';
import type { Grade, LeavePolicy } from '../types';

type Tab = 'designations' | 'departments' | 'grades' | 'leaveTypes';

export default function MasterData() {
  const { designations, departments, grades, leavePolicies, addDesignation, addDepartment, addGrade, addLeavePolicy } = useAppData();
  const [tab, setTab] = useState<Tab>('designations');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [gradeForm, setGradeForm] = useState({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });
  const [policyForm, setPolicyForm] = useState({
    leaveTypeName: '',
    role: 'All Employees',
    isPaid: true,
    designation: 'All Designations',
    department: 'All Departments',
    approvers: ['manager'] as ('team_leader' | 'manager' | 'admin' | 'hr')[],
    minDaysNoticeRequired: 3,
    documentRequirement: 'optional' as 'optional' | 'required',
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    if (tab === 'designations') addDesignation(name.trim());
    else if (tab === 'departments') addDepartment(name.trim());
    setName('');
    setShowAdd(false);
  };

  const handleAddGrade = () => {
    if (!gradeForm.name.trim()) return;
    addGrade({ id: `g${Date.now()}`, ...gradeForm });
    setGradeForm({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });
    setShowAdd(false);
  };

  const handleAddPolicy = () => {
    if (!policyForm.leaveTypeName.trim()) return;
    const leaveTypeKey = policyForm.leaveTypeName.trim().toLowerCase().replace(/\s+/g, '_');
    addLeavePolicy({
      id: `lp${Date.now()}`,
      leaveType: leaveTypeKey,
      role: policyForm.role,
      requiresApprovalFrom: policyForm.approvers[0] || 'manager',
      approvalRouting: {
        designation: policyForm.designation !== 'All Designations' ? policyForm.designation : undefined,
        department: policyForm.department !== 'All Departments' ? policyForm.department : undefined,
        approvers: policyForm.approvers,
      },
      requiresDocumentUpload: policyForm.documentRequirement === 'required',
      documentRequirement: policyForm.documentRequirement,
      minDaysNoticeRequired: policyForm.minDaysNoticeRequired,
      isPaid: policyForm.isPaid,
    });
    setPolicyForm({
      leaveTypeName: '',
      role: 'All Employees',
      isPaid: true,
      designation: 'All Designations',
      department: 'All Departments',
      approvers: ['manager'],
      minDaysNoticeRequired: 3,
      documentRequirement: 'optional',
    });
    setShowAdd(false);
  };

  const tabs = [
    { key: 'designations' as const, label: 'Designations', icon: Briefcase },
    { key: 'departments' as const, label: 'Departments', icon: Building2 },
    { key: 'grades' as const, label: 'Grades', icon: GraduationCap },
    { key: 'leaveTypes' as const, label: 'Leave Types', icon: ClipboardList },
  ];

  const renderContent = () => {
    if (tab === 'grades') {
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grades.map((g: Grade) => (
            <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{g.name}</h3>
                <Badge variant="teal">{g.description || 'Grade policy'}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Annual balance</span><span className="font-medium text-gray-900">{g.annualLeaveQuota} days</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sick balance</span><span className="font-medium text-gray-900">{g.sickLeaveQuota} days</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Casual balance</span><span className="font-medium text-gray-900">{g.casualLeaveQuota} days</span></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (tab === 'leaveTypes') {
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leavePolicies.map((policy: LeavePolicy) => {
            const approversList = policy.approvalRouting?.approvers || [policy.requiresApprovalFrom];
            return (
              <div key={policy.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-base font-semibold capitalize text-gray-900">{policy.leaveType.replace(/_/g, ' ')} leave</h3>
                  <div className="flex gap-1 flex-wrap">
                    {approversList.map((app) => (
                      <Badge key={app} variant="blue">{app.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium text-gray-900">{policy.role || 'All Employees'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Notice</span><span className="font-medium text-gray-900">{policy.minDaysNoticeRequired} day(s)</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Document upload</span><span className="font-medium text-gray-900">{policy.documentRequirement ? (policy.documentRequirement === 'required' ? 'Required' : 'Optional') : (policy.requiresDocumentUpload ? 'Required' : 'Optional')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pay type</span><span className="font-medium text-gray-900">{policy.isPaid ? 'Paid' : 'Unpaid'}</span></div>
                  {policy.approvalRouting?.designation && (
                    <div className="flex justify-between"><span className="text-gray-500">Routing Designation</span><span className="font-medium text-gray-900">{policy.approvalRouting.designation}</span></div>
                  )}
                  {policy.approvalRouting?.department && (
                    <div className="flex justify-between"><span className="text-gray-500">Routing Department</span><span className="font-medium text-gray-900">{policy.approvalRouting.department}</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const items = tab === 'designations' ? designations : departments;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="border-b border-r border-gray-50 px-5 py-3 text-sm text-gray-800">
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Leave Types</h1>
        <p className="mt-1 text-sm text-gray-500">Manage HR references and create leave types for the system.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === item.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'}`}>
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> {tab === 'designations' ? 'Add Designation' : tab === 'departments' ? 'Add Department' : tab === 'grades' ? 'Add Grade' : 'Create Leave Type'}</Button>
      </div>

      {renderContent()}

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setName('');
          setGradeForm({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });
          setPolicyForm({
            leaveTypeName: '',
            role: 'All Employees',
            isPaid: true,
            designation: 'All Designations',
            department: 'All Departments',
            approvers: ['manager'],
            minDaysNoticeRequired: 3,
            documentRequirement: 'optional',
          });
        }}
        title={tab === 'designations' ? 'Add Designation' : tab === 'departments' ? 'Add Department' : tab === 'grades' ? 'Add Grade' : 'Create Leave Type'}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAdd(false);
              setName('');
              setGradeForm({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });
              setPolicyForm({
                leaveTypeName: '',
                role: 'All Employees',
                isPaid: true,
                designation: 'All Designations',
                department: 'All Departments',
                approvers: ['manager'],
                minDaysNoticeRequired: 3,
                documentRequirement: 'optional',
              });
            }}>Cancel</Button>
            <Button onClick={tab === 'grades' ? handleAddGrade : tab === 'leaveTypes' ? handleAddPolicy : handleAdd}>{tab === 'grades' ? 'Create Grade' : tab === 'leaveTypes' ? 'Create Policy' : 'Add'}</Button>
          </>
        }
      >
        {tab === 'grades' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Grade name</label>
              <input value={gradeForm.name} onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Annual balance</label><input type="number" value={gradeForm.annualLeaveQuota} onChange={(e) => setGradeForm({ ...gradeForm, annualLeaveQuota: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Sick balance</label><input type="number" value={gradeForm.sickLeaveQuota} onChange={(e) => setGradeForm({ ...gradeForm, sickLeaveQuota: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Casual balance</label><input type="number" value={gradeForm.casualLeaveQuota} onChange={(e) => setGradeForm({ ...gradeForm, casualLeaveQuota: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label><input value={gradeForm.description} onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
          </div>
        ) : tab === 'leaveTypes' ? (
          <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto px-1">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave Type Name</label>
              <input
                type="text"
                placeholder="e.g. Compassionate"
                value={policyForm.leaveTypeName}
                onChange={(e) => setPolicyForm({ ...policyForm, leaveTypeName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Applicable Role</label>
              <select
                value={policyForm.role}
                onChange={(e) => setPolicyForm({ ...policyForm, role: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                value={policyForm.isPaid ? 'paid' : 'unpaid'}
                onChange={(e) => setPolicyForm({ ...policyForm, isPaid: e.target.value === 'paid' })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="paid">Paid Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 font-semibold mt-4">Approval Routing Filters</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Designation</label>
                  <select
                    value={policyForm.designation}
                    onChange={(e) => setPolicyForm({ ...policyForm, designation: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    value={policyForm.department}
                    onChange={(e) => setPolicyForm({ ...policyForm, department: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <label className="mb-1.5 block text-sm font-medium text-gray-700 font-semibold">Multi-level Approvers</label>
              <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                <p className="text-[11px] text-gray-500 mb-2">Select required approvers for this leave type:</p>
                {(['team_leader', 'manager', 'admin', 'hr'] as const).map((role) => {
                  const isChecked = policyForm.approvers.includes(role);
                  return (
                    <label key={role} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let nextApprovers = [...policyForm.approvers];
                          if (isChecked) {
                            nextApprovers = nextApprovers.filter((r) => r !== role);
                          } else {
                            nextApprovers.push(role);
                          }
                          setPolicyForm({ ...policyForm, approvers: nextApprovers });
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
                value={policyForm.minDaysNoticeRequired}
                onChange={(e) => setPolicyForm({ ...policyForm, minDaysNoticeRequired: Math.max(0, Number(e.target.value)) })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Document Attachment</label>
              <select
                value={policyForm.documentRequirement}
                onChange={(e) => setPolicyForm({ ...policyForm, documentRequirement: e.target.value as 'optional' | 'required' })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="optional">Optional</option>
                <option value="required">Required</option>
              </select>
            </div>
          </div>
        ) : (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tab === 'designations' ? 'e.g. Data Scientist' : 'e.g. Research'} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" autoFocus />
        )}
      </Modal>
    </div>
  );
}
