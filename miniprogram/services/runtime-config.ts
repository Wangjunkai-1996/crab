import { DEFAULT_API_MODE, DEFAULT_CLOUD_ENV_ID } from '../constants/ui';
import { STORAGE_KEYS } from '../constants/storage-keys';

export type ApiMode = 'mock' | 'cloud';
export type RuntimeFallbackReason = 'ready' | 'mock_default' | 'missing_cloud_env' | 'cloud_unavailable';

export interface RuntimeSwitchState {
  desiredMode: ApiMode;
  activeMode: ApiMode;
  cloudEnvId: string;
  cloudReady: boolean;
  fallbackReason: RuntimeFallbackReason;
}

const RUNTIME_DESCRIPTION_MAP: Record<RuntimeFallbackReason, string> = {
  ready: 'CloudBase 环境已接入，可通过开发者控制台 helper 触发真实 bootstrap 与页面请求联调。',
  mock_default: '当前保持 Mock 联调模式；开发态可通过控制台 helper 直接切到已预置的 CloudBase 环境。',
  missing_cloud_env: '已切到 Cloud 联调意图，但当前没有可用 CloudBase 环境 ID，已自动回退到 Mock。',
  cloud_unavailable: '当前运行环境暂不可用 wx.cloud，已自动回退到 Mock 联调。',
};

function safeGetStorage<T>(key: string, defaultValue: T) {
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

export function getDesiredApiMode(): ApiMode {
  const stored = safeGetStorage<string>(STORAGE_KEYS.runtimeMode, DEFAULT_API_MODE);
  return stored === 'cloud' ? 'cloud' : 'mock';
}

export function getCloudEnvId() {
  return safeGetStorage<string>(STORAGE_KEYS.cloudEnvId, DEFAULT_CLOUD_ENV_ID);
}

export function persistRuntimeConfig(mode: ApiMode, cloudEnvId = '') {
  safeSetStorage(STORAGE_KEYS.runtimeMode, mode);
  safeSetStorage(STORAGE_KEYS.cloudEnvId, cloudEnvId);
}

export function resolveRuntimeSwitchState(): RuntimeSwitchState {
  const desiredMode = getDesiredApiMode();
  const cloudEnvId = getCloudEnvId();
  const cloudAvailable = typeof wx !== 'undefined' && !!wx.cloud;

  if (desiredMode === 'mock') {
    return {
      desiredMode,
      activeMode: 'mock',
      cloudEnvId,
      cloudReady: false,
      fallbackReason: 'mock_default',
    };
  }

  if (!cloudAvailable) {
    return {
      desiredMode,
      activeMode: 'mock',
      cloudEnvId,
      cloudReady: false,
      fallbackReason: 'cloud_unavailable',
    };
  }

  if (!cloudEnvId) {
    return {
      desiredMode,
      activeMode: 'mock',
      cloudEnvId,
      cloudReady: false,
      fallbackReason: 'missing_cloud_env',
    };
  }

  return {
    desiredMode,
    activeMode: 'cloud',
    cloudEnvId,
    cloudReady: true,
    fallbackReason: 'ready',
  };
}

export function resolveRuntimeDescription(state: RuntimeSwitchState = resolveRuntimeSwitchState()) {
  return RUNTIME_DESCRIPTION_MAP[state.fallbackReason];
}
