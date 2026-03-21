import { STORAGE_KEYS } from '../constants/storage-keys';

type RuntimeMode = 'mock' | 'cloud';

export interface RequestDebugRecord {
  timestamp: number;
  functionName: string;
  action: string;
  mode: RuntimeMode;
  durationMs: number;
  success: boolean;
  code: number;
  message: string;
  requestId: string;
  payloadPreview: string;
  responsePreview: string;
}

const MAX_DEBUG_RECORDS = 40;

function safeGetStorage<T>(key: string, defaultValue: T): T {
  try {
    const value = wx.getStorageSync(key);
    return (value || defaultValue) as T;
  } catch (error) {
    return defaultValue;
  }
}

function safeSetStorage(key: string, value: unknown) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    return;
  }
}

function serializePreview(input: unknown, maxLength = 500) {
  try {
    const text = JSON.stringify(input);
    if (!text) {
      return '';
    }

    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  } catch (error) {
    return '[unserializable]';
  }
}

export function isRequestDebugEnabled() {
  return safeGetStorage<boolean>(STORAGE_KEYS.requestDebugEnabled, false);
}

export function setRequestDebugEnabled(enabled: boolean) {
  safeSetStorage(STORAGE_KEYS.requestDebugEnabled, enabled);
}

export function getRequestDebugRecords() {
  return safeGetStorage<RequestDebugRecord[]>(STORAGE_KEYS.requestDebugRecords, []);
}

export function clearRequestDebugRecords() {
  safeSetStorage(STORAGE_KEYS.requestDebugRecords, []);
}

interface AppendDebugRecordInput {
  functionName: string;
  action: string;
  mode: RuntimeMode;
  durationMs: number;
  success: boolean;
  code: number;
  message: string;
  requestId?: string;
  payload?: unknown;
  response?: unknown;
}

export function appendRequestDebugRecord(input: AppendDebugRecordInput) {
  if (!isRequestDebugEnabled()) {
    return;
  }

  const current = getRequestDebugRecords();

  const record: RequestDebugRecord = {
    timestamp: Date.now(),
    functionName: input.functionName,
    action: input.action,
    mode: input.mode,
    durationMs: input.durationMs,
    success: input.success,
    code: input.code,
    message: input.message,
    requestId: input.requestId || '',
    payloadPreview: serializePreview(input.payload),
    responsePreview: serializePreview(input.response),
  };

  const next = [record, ...current].slice(0, MAX_DEBUG_RECORDS);
  safeSetStorage(STORAGE_KEYS.requestDebugRecords, next);
}
