import api from './api';
import type { AuditLog } from '../types';

interface BackendAuditLog {
  _id: string;
  actorId: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  affectedPerson?: string;
  department?: string;
  leaveType?: string;
  comment?: string;
  createdAt: string;
}

function mapAuditLog(item: BackendAuditLog): AuditLog {
  return {
    id: item._id,
    actorId: String(item.actorId || ''),
    actorName: item.actorName || 'Unknown',
    action: item.action,
    targetType: item.targetType || '',
    targetId: String(item.targetId || ''),
    details: item.details || '',
    affectedPerson: item.affectedPerson || undefined,
    department: item.department || undefined,
    leaveType: item.leaveType || undefined,
    comment: item.comment || undefined,
    createdAt: item.createdAt,
  };
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const response = await api.get('/audit-logs', {
    params: { page: 1, limit: 500 },
  });

  return (response.data?.data || []).map(mapAuditLog);
}
