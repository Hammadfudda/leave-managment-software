import api from './api';

export type FeedbackType = 'feedback' | 'change_request' | 'issue';
export type FeedbackStatus = 'new' | 'reviewing' | 'resolved';

export interface FeedbackRequest {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  organizationName: string;
  submittedByName: string;
  submittedByEmail: string;
  superAdminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export async function submitFeedback(payload: {
  type: FeedbackType;
  subject: string;
  message: string;
}) {
  const response = await api.post('/feedback', payload);
  return {
    feedback: response.data.data as FeedbackRequest,
    emailSent: Boolean(response.data.emailSent),
  };
}

export async function getMyFeedback(): Promise<FeedbackRequest[]> {
  const response = await api.get('/feedback');
  return response.data.data || [];
}
