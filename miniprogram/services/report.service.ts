import { request } from '../utils/request';

const FUNCTION_NAME = 'report-bff';

interface ReportSubmitResponse {
  reportId: string;
  status: string;
}

interface ReportListItem {
  reportId: string;
  targetType: string;
  targetId?: string;
  reasonCode: string;
  status: string;
  resultAction?: string;
}

interface ReportListResponse {
  list: ReportListItem[];
  nextCursor: string;
  hasMore: boolean;
}

export function submit(payload: Record<string, unknown>) {
  return request<ReportSubmitResponse, Record<string, unknown>>(FUNCTION_NAME, 'submit', payload);
}

export function myList() {
  return request<ReportListResponse>(FUNCTION_NAME, 'myList');
}
