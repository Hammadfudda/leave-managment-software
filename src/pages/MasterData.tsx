import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Briefcase, Building2, GraduationCap, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import type { Grade } from '../types';

type Tab = 'designations' | 'departments' | 'grades' | 'roles';

export default function MasterData() {
  const {
    designations, departments, grades, roles,
    addDesignation, addDepartment, addGrade, addRole,
    updateDesignation, deleteDesignation,
    updateDepartment, deleteDepartment,
    updateRole, deleteRole,
    updateGrade, deleteGrade,
  } = useAppData();

  const [tab, setTab] = useState<Tab>('roles');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null); // original name being edited (designations/departments/roles)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });

  const resetGradeForm = () => setGradeForm({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });

  const openAdd = () => {
    setName('');
    setEditingItem(null);
    setEditingGrade(null);
    resetGradeForm();
    setShowAdd(true);
  };

  const openEditItem = (item: string) => {
    setName(item);
    setEditingItem(item);
    setShowAdd(true);
  };

  const openEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setGradeForm({ ...grade });
    setShowAdd(true);
  };

  const handleDeleteItem = (item: string) => {
    if (tab === 'designations') deleteDesignation(item);
    else if (tab === 'departments') deleteDepartment(item);
    else if (tab === 'roles') deleteRole(item);
  };

  const handleDeleteGrade = (grade: Grade) => {
    if (!window.confirm(`Delete grade "${grade.name}"? This cannot be undone.`)) return;
    deleteGrade(grade.id);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    if (editingItem) {
      if (tab === 'designations') updateDesignation(editingItem, name.trim());
      else if (tab === 'departments') updateDepartment(editingItem, name.trim());
      else if (tab === 'roles') updateRole(editingItem, name.trim());
    } else {
      if (tab === 'designations') addDesignation(name.trim());
      else if (tab === 'departments') addDepartment(name.trim());
      else if (tab === 'roles') addRole(name.trim());
    }
    setName('');
    setEditingItem(null);
    setShowAdd(false);
  };

  const handleAddGrade = () => {
    if (!gradeForm.name.trim()) return;
    if (editingGrade) {
      updateGrade({ id: editingGrade.id, ...gradeForm });
    } else {
      addGrade({ id: `g${Date.now()}`, ...gradeForm });
    }
    resetGradeForm();
    setEditingGrade(null);
    setShowAdd(false);
  };

  const tabs = [
    { key: 'designations' as const, label: 'Designations', icon: Briefcase },
    { key: 'departments' as const, label: 'Departments', icon: Building2 },
    { key: 'grades' as const, label: 'Grades', icon: GraduationCap },
    { key: 'roles' as const, label: 'Roles', icon: ShieldCheck },
  ];

  const renderContent = () => {
    if (tab === 'grades') {
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grades.map((g: Grade) => (
            <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-900">{g.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="teal">{g.description || 'Grade policy'}</Badge>
                  <button onClick={() => openEditGrade(g)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDeleteGrade(g)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
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

    const items = tab === 'designations' ? designations : tab === 'departments' ? departments : roles;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="flex items-center justify-between border-b border-r border-gray-50 px-5 py-3 text-sm text-gray-800">
              <span>{item}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditItem(item)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil size={13} /></button>
                <button onClick={() => handleDeleteItem(item)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Create</h1>
        <p className="mt-1 text-sm text-gray-500">Manage HR references and system roles.</p>
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
        <Button onClick={openAdd}><Plus size={16} /> {tab === 'designations' ? 'Add Designation' : tab === 'departments' ? 'Add Department' : tab === 'grades' ? 'Add Grade' : 'Add Role'}</Button>
      </div>

      {renderContent()}

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setName('');
          setEditingItem(null);
          setEditingGrade(null);
          resetGradeForm();
        }}
        title={
          tab === 'grades'
            ? (editingGrade ? 'Edit Grade' : 'Add Grade')
            : (editingItem ? `Edit ${tab === 'designations' ? 'Designation' : tab === 'departments' ? 'Department' : 'Role'}` : (tab === 'designations' ? 'Add Designation' : tab === 'departments' ? 'Add Department' : 'Add Role'))
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAdd(false);
              setName('');
              setEditingItem(null);
              setEditingGrade(null);
              resetGradeForm();
            }}>Cancel</Button>
            <Button onClick={tab === 'grades' ? handleAddGrade : handleAdd}>
              {tab === 'grades' ? (editingGrade ? 'Save Changes' : 'Create Grade') : (editingItem ? 'Save Changes' : 'Add')}
            </Button>
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
        ) : (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tab === 'designations' ? 'e.g. Data Scientist' : tab === 'departments' ? 'e.g. Research' : 'e.g. Team Lead'} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" autoFocus />
        )}
      </Modal>
    </div>
  );
}
