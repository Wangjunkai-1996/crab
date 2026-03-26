"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDesiredApiMode = getDesiredApiMode;
exports.getCloudEnvId = getCloudEnvId;
exports.persistRuntimeConfig = persistRuntimeConfig;
exports.resolveRuntimeSwitchState = resolveRuntimeSwitchState;
exports.resolveRuntimeDescription = resolveRuntimeDescription;
const ui_1 = require("../constants/ui");
const storage_keys_1 = require("../constants/storage-keys");
const RUNTIME_DESCRIPTION_MAP = {
    ready: 'CloudBase 环境已接入，可通过开发者控制台 helper 触发真实 bootstrap 与页面请求联调。',
    mock_default: '当前保持 Mock 联调模式；开发态可通过控制台 helper 直接切到已预置的 CloudBase 环境。',
    missing_cloud_env: '已切到 Cloud 联调意图，但当前没有可用 CloudBase 环境 ID，已自动回退到 Mock。',
    cloud_unavailable: '当前运行环境暂不可用 wx.cloud，已自动回退到 Mock 联调。',
};
function safeGetStorage(key, defaultValue) {
    try {
        const value = wx.getStorageSync(key);
        return (value || defaultValue);
    }
    catch (error) {
        return defaultValue;
    }
}
function safeSetStorage(key, value) {
    try {
        wx.setStorageSync(key, value);
    }
    catch (error) {
        return;
    }
}
function getDesiredApiMode() {
    const stored = safeGetStorage(storage_keys_1.STORAGE_KEYS.runtimeMode, ui_1.DEFAULT_API_MODE);
    return stored === 'cloud' ? 'cloud' : 'mock';
}
function getCloudEnvId() {
    return safeGetStorage(storage_keys_1.STORAGE_KEYS.cloudEnvId, ui_1.DEFAULT_CLOUD_ENV_ID);
}
function persistRuntimeConfig(mode, cloudEnvId = '') {
    safeSetStorage(storage_keys_1.STORAGE_KEYS.runtimeMode, mode);
    safeSetStorage(storage_keys_1.STORAGE_KEYS.cloudEnvId, cloudEnvId);
}
function resolveRuntimeSwitchState(override = {}) {
    const desiredMode = override.desiredMode ?? getDesiredApiMode();
    const cloudEnvId = override.cloudEnvId ?? getCloudEnvId();
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
function resolveRuntimeDescription(state = resolveRuntimeSwitchState()) {
    return RUNTIME_DESCRIPTION_MAP[state.fallbackReason];
}
