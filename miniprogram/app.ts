import { getRuntimeSwitchState } from './services/cloud';
import { performBootstrapRequest, prepareBootstrapRuntime, switchBootstrapRuntime } from './services/bootstrap.service';
import { createDevSmokeHelper } from './services/dev-smoke.service';
import { resolveRuntimeDescription } from './services/runtime-config';
import {
  clearRequestDebugRecords,
  getRequestDebugRecords,
  isRequestDebugEnabled,
  setRequestDebugEnabled,
} from './utils/request-debug';

function buildRuntimeDebugSummary(): RuntimeDebugSummary {
  const app = getApp<IAppOption>();
  const runtimeSwitchState = app.globalData.runtimeSwitchState;

  return {
    runtimeMode: app.globalData.runtimeMode,
    desiredMode: runtimeSwitchState.desiredMode,
    activeMode: runtimeSwitchState.activeMode,
    cloudEnvId: runtimeSwitchState.cloudEnvId,
    cloudReady: runtimeSwitchState.cloudReady,
    fallbackReason: runtimeSwitchState.fallbackReason,
    runtimeDescription: resolveRuntimeDescription(runtimeSwitchState),
    pendingConfirmations: [...app.globalData.pendingConfirmations],
    requestDebugEnabled: app.globalData.requestDebug.enabled,
    requestLogCount: getRequestDebugRecords().length,
    bootstrapError: app.globalData.bootstrapError,
  };
}

async function switchRuntimeMode(mode: 'mock' | 'cloud', cloudEnvId = '') {
  const app = getApp<IAppOption>();
  const targetCloudEnvId = cloudEnvId || app.globalData.runtimeSwitchState.cloudEnvId;

  await switchBootstrapRuntime(mode, targetCloudEnvId);
  return buildRuntimeDebugSummary();
}

App<IAppOption>({
  globalData: {
    bootstrapPromise: Promise.resolve(),
    bootstrapError: '',
    runtimeMode: 'mock',
    runtimeSwitchState: getRuntimeSwitchState(),
    pendingConfirmations: [],
    requestDebug: {
      enabled: isRequestDebugEnabled(),
      setEnabled(enabled: boolean) {
        setRequestDebugEnabled(enabled);
        getApp<IAppOption>().globalData.requestDebug.enabled = enabled;
      },
      clearLogs() {
        clearRequestDebugRecords();
      },
      getLogs() {
        return getRequestDebugRecords();
      },
    },
    runtimeDebug: {
      getSummary() {
        return buildRuntimeDebugSummary();
      },
      useMock() {
        return switchRuntimeMode('mock');
      },
      useCloud(cloudEnvId?: string) {
        return switchRuntimeMode('cloud', cloudEnvId);
      },
      clearRequestLogs() {
        clearRequestDebugRecords();
        return buildRuntimeDebugSummary();
      },
      async rerunBootstrap() {
        await getApp<IAppOption>().bootstrapApp(true);
        return buildRuntimeDebugSummary();
      },
    },
    devSmoke: createDevSmokeHelper(() => buildRuntimeDebugSummary()),
  },

  onLaunch() {
    const snapshot = prepareBootstrapRuntime();

    this.globalData.runtimeMode = snapshot.runtimeMode;
    this.globalData.runtimeSwitchState = snapshot.runtimeSwitchState;
    this.globalData.pendingConfirmations = snapshot.pendingConfirmations;

    this.bootstrapApp(true);
  },

  async bootstrapApp(force = false) {
    if (!force && !this.globalData.bootstrapError) {
      return this.globalData.bootstrapPromise;
    }

    const task = (async () => {
      this.globalData.bootstrapError = '';

      try {
        await performBootstrapRequest();
      } catch (error) {
        const message = error instanceof Error ? error.message : '启动失败，请稍后重试';
        this.globalData.bootstrapError = message;
        throw error;
      }
    })();

    this.globalData.bootstrapPromise = task;
    return task;
  },
});
