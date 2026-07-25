import Badge from './Badge';
import type { LeaveStatus } from '../../types';

const config: Record<LeaveStatus, { variant: 'gray' | 'yellow' | 'blue' | 'green' | 'red' | 'teal'; label: string }> = {
  pending: { variant: 'yellow', label: 'Pending' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red', label: 'Rejected' },
  cancelled: { variant: 'gray', label: 'Cancelled' },
};

export default function StatusBadge({ status }: { status: LeaveStatus }) {
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
