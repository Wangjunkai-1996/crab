import type { ApiResponse, CloudActionRequest } from '../models/api';
import type { RuntimeSwitchState } from './runtime-config';
import { resolveRuntimeSwitchState, type RuntimeOverrideInput } from './runtime-config';
import { mockCallFunction } from './mock-adapter';

let runtimeSwitchState: RuntimeSwitchState = resolveRuntimeSwitchState();

export function initCloud(runtimeOverride?: RuntimeOverrideInput) {
  runtimeSwitchState = resolveRuntimeSwitchState(runtimeOverride);

  if (runtimeSwitchState.activeMode !== 'cloud') {
    return runtimeSwitchState;
  }

  try {
    wx.cloud.init({
      env: runtimeSwitchState.cloudEnvId,
      traceUser: true,
    } as any);
  } catch (error) {
    runtimeSwitchState = {
      ...runtimeSwitchState,
      activeMode: 'mock',
      cloudReady: false,
      fallbackReason: 'cloud_unavailable',
    };
  }

  return runtimeSwitchState;
}

export function getRuntimeMode() {
  return runtimeSwitchState.activeMode;
}

export function getRuntimeSwitchState() {
  return runtimeSwitchState;
}

export async function invokeCloudFunction<T, P extends object = Record<string, unknown>>(name: string, data: CloudActionRequest<P>): Promise<ApiResponse<T>> {
  if (runtimeSwitchState.activeMode === 'mock') {
    return mockCallFunction<T, P>(name, data);
  }

  const result = await wx.cloud.callFunction({
    name,
    data,
  });

  return result.result as ApiResponse<T>;
}
