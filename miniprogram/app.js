"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("./services/cloud");
const bootstrap_service_1 = require("./services/bootstrap.service");
const dev_auto_smoke_service_1 = require("./services/dev-auto-smoke.service");
const dev_smoke_service_1 = require("./services/dev-smoke.service");
const runtime_config_1 = require("./services/runtime-config");
const request_debug_1 = require("./utils/request-debug");
const MAX_RUNTIME_ERRORS = 20;
function serializePreview(input, maxLength = 600) {
    try {
        const text = JSON.stringify(input);
        if (!text) {
            return '';
        }
        return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }
    catch (error) {
        return '[unserializable]';
    }
}
function appendRuntimeErrorRecord(type, payload) {
    const app = getApp();
    const currentPages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const currentPage = currentPages.length ? currentPages[currentPages.length - 1] : null;
    const message = payload instanceof Error
        ? payload.message
        : typeof payload === 'string'
            ? payload
            : typeof payload?.errMsg === 'string'
                ? `${payload.errMsg || ''}`
                : 'runtime_error';
    const nextRecord = {
        timestamp: Date.now(),
        type,
        route: `${currentPage?.route || ''}`,
        message,
        payloadPreview: serializePreview(payload),
    };
    app.globalData.runtimeErrors = [nextRecord, ...app.globalData.runtimeErrors].slice(0, MAX_RUNTIME_ERRORS);
}
function buildRuntimeDebugSummary() {
    const app = getApp();
    const runtimeSwitchState = app.globalData.runtimeSwitchState;
    return {
        runtimeMode: app.globalData.runtimeMode,
        desiredMode: runtimeSwitchState.desiredMode,
        activeMode: runtimeSwitchState.activeMode,
        cloudEnvId: runtimeSwitchState.cloudEnvId,
        cloudReady: runtimeSwitchState.cloudReady,
        fallbackReason: runtimeSwitchState.fallbackReason,
        runtimeDescription: (0, runtime_config_1.resolveRuntimeDescription)(runtimeSwitchState),
        pendingConfirmations: [...app.globalData.pendingConfirmations],
        requestDebugEnabled: app.globalData.requestDebug.enabled,
        requestLogCount: (0, request_debug_1.getRequestDebugRecords)().length,
        bootstrapError: app.globalData.bootstrapError,
    };
}
async function switchRuntimeMode(mode, cloudEnvId = '') {
    const app = getApp();
    const targetCloudEnvId = cloudEnvId || app.globalData.runtimeSwitchState.cloudEnvId;
    await (0, bootstrap_service_1.switchBootstrapRuntime)(mode, targetCloudEnvId);
    return buildRuntimeDebugSummary();
}
App({
    globalData: {
        bootstrapPromise: Promise.resolve(),
        bootstrapError: '',
        runtimeMode: 'mock',
        runtimeSwitchState: (0, cloud_1.getRuntimeSwitchState)(),
        pendingConfirmations: [],
        runtimeErrors: [],
        autoSmokeResult: (0, dev_auto_smoke_service_1.getStoredAutoSmokeResult)(),
        requestDebug: {
            enabled: (0, request_debug_1.isRequestDebugEnabled)(),
            setEnabled(enabled) {
                (0, request_debug_1.setRequestDebugEnabled)(enabled);
                getApp().globalData.requestDebug.enabled = enabled;
            },
            clearLogs() {
                (0, request_debug_1.clearRequestDebugRecords)();
            },
            getLogs() {
                return (0, request_debug_1.getRequestDebugRecords)();
            },
        },
        runtimeDebug: {
            getSummary() {
                return buildRuntimeDebugSummary();
            },
            useMock() {
                return switchRuntimeMode('mock');
            },
            useCloud(cloudEnvId) {
                return switchRuntimeMode('cloud', cloudEnvId);
            },
            clearRequestLogs() {
                (0, request_debug_1.clearRequestDebugRecords)();
                return buildRuntimeDebugSummary();
            },
            async rerunBootstrap() {
                await getApp().bootstrapApp(true);
                return buildRuntimeDebugSummary();
            },
        },
        devSmoke: (0, dev_smoke_service_1.createDevSmokeHelper)(() => buildRuntimeDebugSummary()),
    },
    onLaunch(options) {
        const autoSmokeLaunch = (0, dev_auto_smoke_service_1.resolveAutoSmokeLaunchOptions)(options);
        const snapshot = (0, bootstrap_service_1.prepareBootstrapRuntime)(autoSmokeLaunch.enabled
            ? {
                desiredMode: autoSmokeLaunch.runtimeMode,
                cloudEnvId: autoSmokeLaunch.cloudEnvId,
            }
            : undefined);
        this.globalData.runtimeMode = snapshot.runtimeMode;
        this.globalData.runtimeSwitchState = snapshot.runtimeSwitchState;
        this.globalData.pendingConfirmations = snapshot.pendingConfirmations;
        this.bootstrapApp(true);
        if (autoSmokeLaunch.enabled) {
            setTimeout(() => {
                void (0, dev_auto_smoke_service_1.runAutoSmokeIfNeeded)(autoSmokeLaunch, () => buildRuntimeDebugSummary());
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
                await (0, bootstrap_service_1.performBootstrapRequest)();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : '启动失败，请稍后重试';
                this.globalData.bootstrapError = message;
                throw error;
            }
        })();
        this.globalData.bootstrapPromise = task;
        return task;
    },
    onError(error) {
        appendRuntimeErrorRecord('app_error', error);
    },
    onUnhandledRejection(payload) {
        appendRuntimeErrorRecord('unhandled_rejection', payload);
    },
    onPageNotFound(payload) {
        appendRuntimeErrorRecord('page_not_found', payload);
    },
});
