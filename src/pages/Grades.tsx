import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Pencil, Plus } from 'lucide-react';
import type { Grade } from '../types';

export default function Grades() {
  const { grades, addGrade, updateGrade } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' });

  const openEdit = (g: Grade) => {
    setEditing(g);
    setForm({ name: g.name, annualLeaveQuota: g.annualLeaveQuota, sickLeaveQuota: g.sickLeaveQuota, casualLeaveQuota: g.casualLeaveQuota, carryForwardAllowed: g.carryForwardAllowed, maxCarryForwardDays: g.maxCarryForwardDays, description: g.description || '' });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateGrade({ ...editing, ...form });
    } else {
      addGrade({ id: `g${Date.now()}`, ...form });
    }
    setShowAdd(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Grades</h1>
          <p className="mt-1 text-sm text-gray-500">Define leave quotas per employee grade.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', annualLeaveQuota: 14, sickLeaveQuota: 7, casualLeaveQuota: 5, carryForwardAllowed: false, maxCarryForwardDays: 0, description: '' }); setShowAdd(true); }}><Plus size={16} /> Add Grade</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((g) => (
          <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{g.name}</h3>
              <button onClick={() => { openEdit(g); setShowAdd(true); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil size={14} /></button>
            </div>
            {g.description && <p className="mt-1 text-xs text-gray-500">{g.description}</p>}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Annual</span><span className="font-medium text-gray-900">{g.annualLeaveQuota} days</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sick</span><span className="font-medium text-gray-900">{g.sickLeaveQuota} days</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Casual</span><span className="font-medium text-gray-900">{g.casualLeaveQuota} days</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Carry forward</span><span className="font-medium text-gray-900">{g.carryForwardAllowed ? `Yes (max ${g.maxCarryForwardDays})` : 'No'}</span></div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={editing ? 'Edit Grade' : 'Add Grade'}
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Annual</label>
              <input type="number" value={form.annualLeaveQuota} onChange={(e) => setForm({ ...form, annualLeaveQuota: +e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Sick</label>
              <input type="number" value={form.sickLeaveQuota} onChange={(e) => setForm({ ...form, sickLeaveQuota: +e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Casual</label>
              <input type="number" value={form.casualLeaveQuota} onChange={(e) => setForm({ ...form, casualLeaveQuota: +e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cf" checked={form.carryForwardAllowed} onChange={(e) => setForm({ ...form, carryForwardAllowed: e.target.checked })} className="rounded border-gray-300" />
            <label htmlFor="cf" className="text-sm text-gray-700">Allow carry forward</label>
          </div>
          {form.carryForwardAllowed && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Max carry forward days</label>
              <input type="number" value={form.maxCarryForwardDays} onChange={(e) => setForm({ ...form, maxCarryForwardDays: +e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
