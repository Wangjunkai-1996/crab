import { APP_VERSION, CLIENT_SOURCE } from '../constants/ui';
import type { ApiExtraErrorData, ApiResponse } from '../models/api';
import { getRuntimeMode, invokeCloudFunction } from '../services/cloud';
import { appendRequestDebugRecord } from './request-debug';

const FRIENDLY_ERROR_MESSAGE: Record<number, string> = {
  20001: '用户上下文获取失败，请稍后重试',
  30001: '当前无权访问该内容',
  40001: '当前账号被限制发布',
  40002: '当前账号被限制报名',
  40003: '参数校验失败，请检查填写内容',
  50001: '当前通告状态不允许执行该操作',
  50002: '当前报名状态不允许执行该操作',
  50003: '请先完善发布方资料',
  50004: '请先完善达人名片',
  50005: '请勿重复报名',
};

export class RequestError extends Error {
  code: number;
  requestId: string;
  fieldErrors?: Record<string, string>;
  missingFieldKeys?: string[];
  errorType?: string;

  constructor(code: number, message: string, requestId: string, extra: ApiExtraErrorData | null | undefined = {}) {
    super(message);
    const normalizedExtra = extra && typeof extra === 'object' ? extra : {};
    this.name = 'RequestError';
    this.code = code;
    this.requestId = requestId;
    this.fieldErrors = normalizedExtra.fieldErrors;
    this.missingFieldKeys = normalizedExtra.missingFieldKeys;
    this.errorType = normalizedExtra.errorType;
  }
}

export async function request<T, P extends object = Record<string, unknown>, R = ApiResponse<T>['data']>(
  functionName: string,
  action: string,
  payload = {} as P,
  adapter?: (data: ApiResponse<T>['data']) => R,
): Promise<R> {
  const startedAt = Date.now();
  const runtimeMode = getRuntimeMode();
  let response: ApiResponse<T>;

  try {
    response = await invokeCloudFunction<T, P>(functionName, {
      action,
      payload,
      meta: {
        source: CLIENT_SOURCE,
        clientVersion: APP_VERSION,
      },
    });
  } catch (error) {
    appendRequestDebugRecord({
      functionName,
      action,
      mode: runtimeMode,
      durationMs: Date.now() - startedAt,
      success: false,
      code: -1,
      message: error instanceof Error ? error.message : 'invokeCloudFunction failed',
      payload,
      response: {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      },
    });

    throw error;
  }

  if (response.code !== 0) {
    appendRequestDebugRecord({
      functionName,
      action,
      mode: runtimeMode,
      durationMs: Date.now() - startedAt,
      success: false,
      code: response.code,
      message: response.message || 'RequestError',
      requestId: response.requestId,
      payload,
      response,
    });

    throw new RequestError(
      response.code,
      FRIENDLY_ERROR_MESSAGE[response.code] || response.message || '服务开小差了，请稍后重试',
      response.requestId,
      response.data,
    );
  }

  appendRequestDebugRecord({
    functionName,
    action,
    mode: runtimeMode,
    durationMs: Date.now() - startedAt,
    success: true,
    code: response.code,
    message: response.message || 'ok',
    requestId: response.requestId,
    payload,
    response,
  });

  const data = response.data as ApiResponse<T>['data'];
  return adapter ? adapter(data) : (data as unknown as R);
}
