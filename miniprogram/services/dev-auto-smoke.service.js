"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAutoSmokeLaunchOptions = resolveAutoSmokeLaunchOptions;
exports.getAutoSmokeResultTag = getAutoSmokeResultTag;
exports.getStoredAutoSmokeResult = getStoredAutoSmokeResult;
exports.runAutoSmokeIfNeeded = runAutoSmokeIfNeeded;
const routes_1 = require("../constants/routes");
const storage_keys_1 = require("../constants/storage-keys");
const bootstrap_service_1 = require("./bootstrap.service");
const runtime_config_1 = require("./runtime-config");
const AUTO_SMOKE_TAG = 'AUTO_SMOKE_RESULT::';
const MAX_PREVIEW_LENGTH = 800;
const PAGE_SETTLE_TIMEOUT_MS = 4000;
const PAGE_SETTLE_POLL_MS = 150;
const KEY_PAGE_SPECS = [
    {
        key: 'tab.plaza',
        route: routes_1.ROUTES.plaza,
        openMode: 'tab',
        buildUrl: () => routes_1.ROUTES.plaza,
    },
    {
        key: 'tab.publish',
        route: routes_1.ROUTES.publish,
        openMode: 'tab',
        buildUrl: () => routes_1.ROUTES.publish,
    },
    {
        key: 'tab.messages',
        route: routes_1.ROUTES.messages,
        openMode: 'tab',
        buildUrl: () => routes_1.ROUTES.messages,
    },
    {
        key: 'tab.mine',
        route: routes_1.ROUTES.mine,
        openMode: 'tab',
        buildUrl: () => routes_1.ROUTES.mine,
    },
    {
        key: 'notice.detail',
        route: routes_1.ROUTES.noticeDetail,
        openMode: 'navigate',
        buildUrl: ({ noticeId }) => `${routes_1.ROUTES.noticeDetail}?noticeId=${noticeId || 'notice_202603160001'}`,
    },
    {
        key: 'creator.apply',
        route: routes_1.ROUTES.creatorApply,
        openMode: 'navigate',
        buildUrl: ({ noticeId }) => `${routes_1.ROUTES.creatorApply}?noticeId=${noticeId || 'notice_202603160001'}`,
    },
    {
        key: 'creator.application-list',
        route: routes_1.ROUTES.creatorApplicationList,
        openMode: 'navigate',
        buildUrl: () => routes_1.ROUTES.creatorApplicationList,
    },
    {
        key: 'publish.notice-list',
        route: routes_1.ROUTES.publishNoticeList,
        openMode: 'navigate',
        buildUrl: () => routes_1.ROUTES.publishNoticeList,
    },
    {
        key: 'publish.application-manage',
        route: routes_1.ROUTES.publishApplicationManage,
        openMode: 'navigate',
        buildUrl: () => routes_1.ROUTES.publishApplicationManage,
    },
];
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
function wait(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
    });
}
function serializePreview(input, maxLength = MAX_PREVIEW_LENGTH) {
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
function normalizeBoolean(value) {
    return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}
function normalizeRoute(url) {
    return url.replace(/^\//, '').split('?')[0] || '';
}
function getCurrentPage() {
    if (typeof getCurrentPages !== 'function') {
        return null;
    }
    const pages = getCurrentPages();
    return pages.length ? pages[pages.length - 1] : null;
}
function getCurrentRoute() {
    const currentPage = getCurrentPage();
    return `${currentPage?.route || ''}`;
}
function getPageState(page) {
    return `${page?.data?.pageState || ''}`;
}
function getPageErrorText(page) {
    return `${page?.data?.errorText || ''}`;
}
function buildStepResult(params) {
    return {
        stage: params.stage,
        step: params.step,
        ok: params.ok,
        action: params.action,
        requestId: '',
        message: params.message,
        payloadPreview: serializePreview(params.payload),
        responsePreview: serializePreview(params.response),
    };
}
function appendPageStepResult(result) {
    return buildStepResult({
        stage: 'page',
        step: `page.${result.key}`,
        ok: result.ok,
        action: `page.navigate:${result.route}`,
        message: result.message,
        payload: {
            url: result.url,
            openMode: result.openMode,
        },
        response: result,
    });
}
function buildRuntimeSwitchResult(mode, ok, message, response) {
    return buildStepResult({
        stage: 'runtime',
        step: 'runtime.switch',
        ok,
        action: mode === 'cloud' ? 'runtime.useCloud' : 'runtime.useMock',
        message,
        payload: {
            runtimeMode: mode,
            cloudEnvId: mode === 'cloud' ? (0, runtime_config_1.getCloudEnvId)() : '',
        },
        response,
    });
}
function getRuntimeErrorsFromIndex(startIndex = 0) {
    const app = getApp();
    return app.globalData.runtimeErrors.slice(startIndex);
}
function persistAutoSmokeBundle(bundle) {
    const app = getApp();
    app.globalData.autoSmokeResult = bundle;
    safeSetStorage(storage_keys_1.STORAGE_KEYS.devAutoSmokeResult, bundle);
}
async function openPage(url, openMode) {
    await new Promise((resolve, reject) => {
        const callback = {
            url,
            success: () => resolve(),
            fail: (error) => reject(error),
        };
        if (openMode === 'tab') {
            wx.switchTab(callback);
            return;
        }
        wx.navigateTo(callback);
    });
}
async function settlePage(targetRoute, runtimeErrorStartIndex) {
    const deadline = Date.now() + PAGE_SETTLE_TIMEOUT_MS;
    const normalizedTargetRoute = normalizeRoute(targetRoute);
    while (Date.now() < deadline) {
        const currentPage = getCurrentPage();
        const runtimeErrors = getRuntimeErrorsFromIndex(runtimeErrorStartIndex);
        const currentRoute = `${currentPage?.route || ''}`;
        const pageState = getPageState(currentPage);
        if (runtimeErrors.length > 0) {
            return {
                arrived: currentRoute === normalizedTargetRoute,
                pageState: pageState || 'runtime_error',
                errorText: getPageErrorText(currentPage),
                runtimeErrors,
                timedOut: false,
            };
        }
        if (currentRoute === normalizedTargetRoute) {
            if (!pageState || pageState !== 'loading') {
                return {
                    arrived: true,
                    pageState: pageState || 'arrived',
                    errorText: getPageErrorText(currentPage),
                    runtimeErrors,
                    timedOut: false,
                };
            }
        }
        await wait(PAGE_SETTLE_POLL_MS);
    }
    const currentPage = getCurrentPage();
    return {
        arrived: `${currentPage?.route || ''}` === normalizedTargetRoute,
        pageState: getPageState(currentPage) || 'loading',
        errorText: getPageErrorText(currentPage),
        runtimeErrors: getRuntimeErrorsFromIndex(runtimeErrorStartIndex),
        timedOut: true,
    };
}
async function runKeyPageSmoke(noticeId) {
    const pages = [];
    for (const spec of KEY_PAGE_SPECS) {
        const url = spec.buildUrl({
            noticeId,
        });
        const startedAt = Date.now();
        const runtimeErrorStartIndex = getApp().globalData.runtimeErrors.length;
        try {
            await openPage(url, spec.openMode);
            const settled = await settlePage(spec.route, runtimeErrorStartIndex);
            const pageState = settled.pageState || (settled.arrived ? 'arrived' : 'not_arrived');
            const runtimeErrorCount = settled.runtimeErrors.length;
            const ok = settled.arrived &&
                !settled.timedOut &&
                runtimeErrorCount === 0 &&
                ['ready', 'empty', 'error', 'arrived'].includes(pageState);
            pages.push({
                key: spec.key,
                route: spec.route,
                url,
                openMode: spec.openMode,
                ok,
                arrived: settled.arrived,
                pageState,
                errorText: settled.errorText,
                message: settled.timedOut
                    ? 'page_timeout'
                    : runtimeErrorCount > 0
                        ? 'runtime_error_detected'
                        : `state:${pageState}`,
                durationMs: Date.now() - startedAt,
                runtimeErrorCount,
            });
        }
        catch (error) {
            pages.push({
                key: spec.key,
                route: spec.route,
                url,
                openMode: spec.openMode,
                ok: false,
                arrived: normalizeRoute(getCurrentRoute()) === normalizeRoute(spec.route),
                pageState: 'navigation_failed',
                errorText: '',
                message: error instanceof Error ? error.message : 'navigation_failed',
                durationMs: Date.now() - startedAt,
                runtimeErrorCount: getRuntimeErrorsFromIndex(runtimeErrorStartIndex).length,
            });
        }
    }
    try {
        await openPage(routes_1.ROUTES.plaza, 'tab');
    }
    catch (error) {
        return {
            ok: false,
            skipped: false,
            reason: 'restore_home_failed',
            pages,
        };
    }
    return {
        ok: pages.every((page) => page.ok),
        skipped: false,
        reason: pages.every((page) => page.ok) ? 'completed' : 'page_failures_detected',
        pages,
    };
}
function resolveAutoSmokeLaunchOptions(launchOptions = {}) {
    const query = (launchOptions.query || {});
    const normalizedQuery = Object.keys(query).reduce((result, key) => {
        result[key] = `${query[key] || ''}`;
        return result;
    }, {});
    const enabled = normalizeBoolean(normalizedQuery.__dev_auto_smoke || '');
    const runtimeMode = (normalizedQuery.__dev_runtime || 'cloud') === 'mock' ? 'mock' : 'cloud';
    return {
        enabled,
        runtimeMode,
        cloudEnvId: runtimeMode === 'cloud' ? (0, runtime_config_1.getCloudEnvId)() : '',
        query: normalizedQuery,
    };
}
function getAutoSmokeResultTag() {
    return AUTO_SMOKE_TAG;
}
function getStoredAutoSmokeResult() {
    return safeGetStorage(storage_keys_1.STORAGE_KEYS.devAutoSmokeResult, null);
}
async function runAutoSmokeIfNeeded(launchOptions, getRuntimeSummary) {
    if (!launchOptions.enabled) {
        return null;
    }
    const app = getApp();
    app.globalData.requestDebug.setEnabled(true);
    app.globalData.requestDebug.clearLogs();
    app.globalData.autoSmokeResult = null;
    const steps = [];
    let batch = null;
    let pageSmoke = {
        ok: false,
        skipped: true,
        reason: 'not_started',
        pages: [],
    };
    try {
        await (0, bootstrap_service_1.switchBootstrapRuntime)(launchOptions.runtimeMode, launchOptions.cloudEnvId, {
            persist: false,
        });
        steps.push(buildRuntimeSwitchResult(launchOptions.runtimeMode, true, 'ok', getRuntimeSummary()));
    }
    catch (error) {
        steps.push(buildRuntimeSwitchResult(launchOptions.runtimeMode, false, error instanceof Error ? error.message : 'runtime_switch_failed', {
            runtimeSummary: getRuntimeSummary(),
        }));
    }
    if (steps.every((step) => step.ok)) {
        batch = await app.globalData.devSmoke.runFirstBatch();
        steps.push(...batch.steps.map((step) => ({
            ...step,
            stage: 'batch',
        })));
    }
    else {
        pageSmoke = {
            ok: false,
            skipped: true,
            reason: 'runtime_switch_failed',
            pages: [],
        };
    }
    if (batch?.ok) {
        pageSmoke = await runKeyPageSmoke(batch.latestResolvedNoticeId || batch.fixedNoticeId);
        steps.push(...pageSmoke.pages.map(appendPageStepResult));
    }
    else if (batch) {
        pageSmoke = {
            ok: false,
            skipped: true,
            reason: 'batch_failed',
            pages: [],
        };
    }
    const runtimeSummary = getRuntimeSummary();
    const requestLogs = app.globalData.requestDebug.getLogs();
    const bundle = {
        ok: runtimeSummary.activeMode === launchOptions.runtimeMode &&
            (launchOptions.runtimeMode !== 'cloud' || runtimeSummary.cloudReady) &&
            runtimeSummary.bootstrapError === '' &&
            Boolean(batch?.ok) &&
            pageSmoke.ok,
        launchOptions,
        runtimeSummary,
        batch,
        steps,
        pageSmoke,
        requestLogs,
        runtimeErrors: [...app.globalData.runtimeErrors],
        generatedAt: new Date().toISOString(),
        resultTag: AUTO_SMOKE_TAG,
    };
    persistAutoSmokeBundle(bundle);
    console.log(`${AUTO_SMOKE_TAG}${JSON.stringify(bundle)}`);
    return bundle;
}
