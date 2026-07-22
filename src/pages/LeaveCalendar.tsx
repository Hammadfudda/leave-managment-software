import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import StatusBadge from '../components/ui/StatusBadge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function LeaveCalendar() {
  const { leaveRequests, users } = useAppData();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const leavesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveRequests.filter((l) => l.startDate <= dateStr && l.endDate >= dateStr && l.status !== 'cancelled' && l.status !== 'rejected');
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">See who is on leave across the team.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><ChevronLeft size={16} /></button>
          <span className="min-w-32 text-center text-sm font-medium text-gray-900">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-gray-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const leaves = leavesForDay(day);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div
                key={i}
                className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors ${
                  isToday ? 'border-blue-400 bg-blue-50/40' : 'border-gray-100 bg-gray-50/40'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {leaves.slice(0, 2).map((l) => {
                    const emp = users.find((u) => u.id === l.employeeId);
                    return (
                      <div key={l.id} className="truncate rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-700 ring-1 ring-inset ring-gray-100" title={`${l.employeeName} - ${l.leaveType}`}>
                        {emp?.fullName.split(' ')[0] || l.employeeName.split(' ')[0]} · <span className="capitalize">{l.leaveType}</span>
                      </div>
                    );
                  })}
                  {leaves.length > 2 && <p className="text-[10px] text-gray-400">+{leaves.length - 2} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">On leave this month</h2>
        <div className="mt-3 space-y-2">
          {leaveRequests
            .filter((l) => {
              const s = new Date(l.startDate);
              const e = new Date(l.endDate);
              return s.getMonth() === month || e.getMonth() === month;
            })
            .map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 text-sm animate-fade-in">
                <span className="font-medium text-gray-900">{l.employeeName}</span>
                <span className="text-gray-500">{l.startDate} → {l.endDate}</span>
                <StatusBadge status={l.status} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
