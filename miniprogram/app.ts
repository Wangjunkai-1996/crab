import { getRuntimeSwitchState } from './services/cloud';
import { performBootstrapRequest, prepareBootstrapRuntime, switchBootstrapRuntime } from './services/bootstrap.service';
import { getStoredAutoSmokeResult, resolveAutoSmokeLaunchOptions, runAutoSmokeIfNeeded } from './services/dev-auto-smoke.service';
import { createDevSmokeHelper } from './services/dev-smoke.service';
import { resolveRuntimeDescription } from './services/runtime-config';
import {
  clearRequestDebugRecords,
  getRequestDebugRecords,
  isRequestDebugEnabled,
  setRequestDebugEnabled,
} from './utils/request-debug';

const MAX_RUNTIME_ERRORS = 20;

function serializePreview(input: unknown, maxLength = 600) {
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

function appendRuntimeErrorRecord(type: DevRuntimeErrorRecord['type'], payload: unknown) {
  const app = getApp<IAppOption>();
  const currentPages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const currentPage = currentPages.length ? currentPages[currentPages.length - 1] : null;
  const message =
    payload instanceof Error
      ? payload.message
      : typeof payload === 'string'
        ? payload
        : typeof (payload as { errMsg?: string })?.errMsg === 'string'
          ? `${(payload as { errMsg?: string }).errMsg || ''}`
          : 'runtime_error';

  const nextRecord = {
    timestamp: Date.now(),
    type,
    route: `${currentPage?.route || ''}`,
    message,
    payloadPreview: serializePreview(payload),
  } satisfies DevRuntimeErrorRecord;

  app.globalData.runtimeErrors = [nextRecord, ...app.globalData.runtimeErrors].slice(0, MAX_RUNTIME_ERRORS);
}

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
    runtimeErrors: [],
    autoSmokeResult: getStoredAutoSmokeResult(),
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

  onLaunch(options: WechatMiniprogram.AnyRecord) {
    const autoSmokeLaunch = resolveAutoSmokeLaunchOptions(options);
    const snapshot = prepareBootstrapRuntime(
      autoSmokeLaunch.enabled
        ? {
            desiredMode: autoSmokeLaunch.runtimeMode,
            cloudEnvId: autoSmokeLaunch.cloudEnvId,
          }
        : undefined,
    );

    this.globalData.runtimeMode = snapshot.runtimeMode;
    this.globalData.runtimeSwitchState = snapshot.runtimeSwitchState;
    this.globalData.pendingConfirmations = snapshot.pendingConfirmations;

    this.bootstrapApp(true);

    if (autoSmokeLaunch.enabled) {
      setTimeout(() => {
        void runAutoSmokeIfNeeded(autoSmokeLaunch, () => buildRuntimeDebugSummary());
      }, 0);
    }
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

  onError(error: string) {
    appendRuntimeErrorRecord('app_error', error);
  },

  onUnhandledRejection(payload: unknown) {
    appendRuntimeErrorRecord('unhandled_rejection', payload);
  },

  onPageNotFound(payload: unknown) {
    appendRuntimeErrorRecord('page_not_found', payload);
  },
});
