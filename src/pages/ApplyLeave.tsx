import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Button from '../components/ui/Button';
import type { LeaveType } from '../types';
import { Upload, CalendarDays } from 'lucide-react';
import { formatDate, calcWorkingDays } from '../utils/formatDate';

const CLOUDINARY_CLOUD_NAME = 'apna_cloud_name_yahan_daalein';
const CLOUDINARY_UPLOAD_PRESET = 'apna_upload_preset_yahan_daalein';

export default function ApplyLeave() {
  const { user } = useAuth();
  const { leaveBalances, leavePolicies, getActiveLeaveTypes, submitLeaveRequest } = useAppData();
  const navigate = useNavigate();
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;

  const leaveTypes = getActiveLeaveTypes();
  const balances = (leaveBalances[user.id] || []).filter((b) => leaveTypes.includes(b.leaveType));
  const policy = leavePolicies.find((p) => p.leaveType === leaveType);

  const calcDays = () => {
    if (!startDate || !endDate) return 0;
    return calcWorkingDays(startDate, endDate);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    setAttachmentName(selectedFile.name);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setUploadUrl(data.secure_url || 'Upload failed.');
    } catch {
      setUploadUrl('Upload failed.');
    }
  };

  const isDocRequired = policy?.documentRequirement === 'required' || policy?.requiresDocumentUpload;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (isDocRequired && (!uploadUrl || uploadUrl.includes('failed'))) {
      alert('A document attachment is required for this leave type. Please upload a file.');
      return;
    }

    const totalDays = calcDays();
    submitLeaveRequest({
      employeeId: user.id,
      employeeName: user.fullName,
      department: user.department,
      leaveType,
      startDate,
      endDate,
      totalDaysRequested: totalDays,
      totalWorkingDays: totalDays,
      reason,
      currentApproverRole: policy?.requiresApprovalFrom === 'admin' ? 'admin' : 'manager',
      attachmentUrl: uploadUrl || undefined,
      attachmentName: attachmentName || fileName || undefined,
    });

    setSubmitted(true);
    setTimeout(() => navigate('/leave/history'), 1200);
  };

  const uploadHint = useMemo(() => isDocRequired ? 'Upload your supporting document to Cloudinary (Required).' : 'Upload your supporting document to Cloudinary (Optional).', [isDocRequired]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Apply for Leave</h1>
        <p className="mt-1 text-sm text-gray-500">Submit a new leave request for approval.</p>
      </div>

      {submitted && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200 animate-fade-in">
          Leave request submitted successfully. Redirecting...
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {leaveTypes.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
            {policy && (
              <p className="mt-1.5 text-xs text-gray-500">
                Requires approval from {policy.requiresApprovalFrom.replace('_', ' ')}. Min notice: {policy.minDaysNoticeRequired} day(s). Document upload: {policy.requiresDocumentUpload ? 'Required' : 'Not required'}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {startDate && endDate && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3.5 py-2.5 text-sm text-blue-700">
              <CalendarDays size={16} />
              {formatDate(startDate)} → {formatDate(endDate)} · Total days: <strong className="font-semibold">{calcDays()}</strong>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Briefly describe the reason for your leave..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Document Attachment</span>
                {isDocRequired ? (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 animate-pulse">Required</span>
                ) : (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">Optional</span>
                )}
              </label>
              <p className="text-xs text-gray-500 mb-2">Upload a supporting document for your leave request.</p>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-3 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
              <Upload size={16} />
              {fileName || 'Click to select supporting document'}
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
            {uploadUrl && (
              <p className="break-all text-xs text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                Document Uploaded: <a href={uploadUrl} target="_blank" rel="noreferrer" className="underline hover:text-emerald-800">{fileName || 'View attached document'}</a>
              </p>
            )}

          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/leave/history')}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Your current balances</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {balances.map((b) => (
            <div key={b.leaveType} className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs capitalize text-gray-500">{b.leaveType}</p>
              <p className="mt-0.5 text-lg font-semibold text-gray-900">{b.remaining}<span className="text-xs font-normal text-gray-400">/{b.quota}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
