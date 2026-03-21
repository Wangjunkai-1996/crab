"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("./services/cloud");
const bootstrap_service_1 = require("./services/bootstrap.service");
const dev_smoke_service_1 = require("./services/dev-smoke.service");
const runtime_config_1 = require("./services/runtime-config");
const request_debug_1 = require("./utils/request-debug");
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
    onLaunch() {
        const snapshot = (0, bootstrap_service_1.prepareBootstrapRuntime)();
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
});
