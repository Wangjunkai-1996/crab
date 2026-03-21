export interface RequestMeta {
  source: string;
  clientVersion: string;
  [key: string]: unknown;
}

export interface CloudActionRequest<T extends object = Record<string, unknown>> {
  action: string;
  payload: T;
  meta: RequestMeta;
}

export interface ApiExtraErrorData {
  errorType?: string;
  fieldErrors?: Record<string, string>;
  missingFieldKeys?: string[];
}

export interface ApiResponse<T = Record<string, unknown>> {
  code: number;
  message: string;
  data: T & ApiExtraErrorData;
  requestId: string;
}

export interface Paginated<T> {
  list: T[];
  nextCursor?: string;
  hasMore: boolean;
}
