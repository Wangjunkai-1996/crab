"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareBootstrapRuntime = prepareBootstrapRuntime;
exports.performBootstrapRequest = performBootstrapRequest;
exports.ensureBootstrapReady = ensureBootstrapReady;
exports.switchBootstrapRuntime = switchBootstrapRuntime;
const ui_1 = require("../constants/ui");
const cloud_1 = require("./cloud");
const runtime_config_1 = require("./runtime-config");
const user_service_1 = require("./user.service");
const user_store_1 = require("../stores/user.store");
const ui_store_1 = require("../stores/ui.store");
const safe_area_1 = require("../utils/safe-area");
function prepareBootstrapRuntime(runtimeOverride) {
    const runtimeSwitchState = (0, cloud_1.initCloud)(runtimeOverride);
    (0, ui_store_1.setSafeAreaInfo)((0, safe_area_1.getSafeAreaInfo)());
    return {
        runtimeMode: (0, cloud_1.getRuntimeMode)(),
        runtimeSwitchState,
        pendingConfirmations: ui_1.WAIT_CONFIRMATIONS,
        runtimeDescription: (0, runtime_config_1.resolveRuntimeDescription)(runtimeSwitchState),
    };
}
async function performBootstrapRequest() {
    const result = await (0, user_service_1.bootstrap)();
    (0, user_store_1.hydrateUserStore)({
        userId: result.user.userId,
        roleFlags: result.user.roleFlags,
        accountStatus: result.user.accountStatus,
        preferredView: result.user.preferredView,
    });
    (0, user_store_1.setUnreadCount)(result.message.unreadCount);
    return result;
}
function ensureBootstrapReady(force = false) {
    const app = getApp();
    if (force || app.globalData.bootstrapError) {
        return app.bootstrapApp(true);
    }
    return app.globalData.bootstrapPromise;
}
async function switchBootstrapRuntime(mode, cloudEnvId = (0, runtime_config_1.getCloudEnvId)(), options = {}) {
    if (options.persist !== false) {
        (0, runtime_config_1.persistRuntimeConfig)(mode, cloudEnvId);
    }
    const app = getApp();
    const snapshot = prepareBootstrapRuntime({
        desiredMode: mode,
        cloudEnvId,
    });
    app.globalData.runtimeMode = snapshot.runtimeMode;
    app.globalData.runtimeSwitchState = snapshot.runtimeSwitchState;
    app.globalData.pendingConfirmations = snapshot.pendingConfirmations;
    await app.bootstrapApp(true);
    return snapshot.runtimeSwitchState;
}
