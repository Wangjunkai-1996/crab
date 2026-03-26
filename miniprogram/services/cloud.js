"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCloud = initCloud;
exports.getRuntimeMode = getRuntimeMode;
exports.getRuntimeSwitchState = getRuntimeSwitchState;
exports.invokeCloudFunction = invokeCloudFunction;
const runtime_config_1 = require("./runtime-config");
const mock_adapter_1 = require("./mock-adapter");
let runtimeSwitchState = (0, runtime_config_1.resolveRuntimeSwitchState)();
function initCloud(runtimeOverride) {
    runtimeSwitchState = (0, runtime_config_1.resolveRuntimeSwitchState)(runtimeOverride);
    if (runtimeSwitchState.activeMode !== 'cloud') {
        return runtimeSwitchState;
    }
    try {
        wx.cloud.init({
            env: runtimeSwitchState.cloudEnvId,
            traceUser: true,
        });
    }
    catch (error) {
        runtimeSwitchState = {
            ...runtimeSwitchState,
            activeMode: 'mock',
            cloudReady: false,
            fallbackReason: 'cloud_unavailable',
        };
    }
    return runtimeSwitchState;
}
function getRuntimeMode() {
    return runtimeSwitchState.activeMode;
}
function getRuntimeSwitchState() {
    return runtimeSwitchState;
}
async function invokeCloudFunction(name, data) {
    if (runtimeSwitchState.activeMode === 'mock') {
        return (0, mock_adapter_1.mockCallFunction)(name, data);
    }
    const result = await wx.cloud.callFunction({
        name,
        data,
    });
    return result.result;
}
