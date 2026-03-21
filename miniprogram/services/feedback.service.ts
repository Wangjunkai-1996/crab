import { request } from '../utils/request';

const FUNCTION_NAME = 'feedback-bff';

interface FeedbackSubmitResponse {
  feedbackId: string;
  status: string;
}

export function submit(payload: Record<string, unknown>) {
  return request<FeedbackSubmitResponse, Record<string, unknown>>(FUNCTION_NAME, 'submit', payload);
}
