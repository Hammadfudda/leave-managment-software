import { useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { getLeaveAttachmentUrl } from '../../services/leaveRequests';
import { getApiErrorMessage } from '../../services/api';

interface Props {
  leaveRequestId: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  className?: string;
}

export default function LeaveAttachmentButton({
  leaveRequestId,
  hasAttachment,
  attachmentName,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!hasAttachment) return null;

  const handleOpen = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getLeaveAttachmentUrl(leaveRequestId);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to open attachment.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        <span className="max-w-[240px] truncate">
          {attachmentName || 'View supporting document'}
        </span>
        {!loading && <ExternalLink size={14} />}
      </button>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
