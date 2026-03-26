import { ROUTES } from '../constants/routes';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { switchBootstrapRuntime } from './bootstrap.service';
import { getCloudEnvId, type ApiMode } from './runtime-config';

const AUTO_SMOKE_TAG = 'AUTO_SMOKE_RESULT::';
const MAX_PREVIEW_LENGTH = 800;
const PAGE_SETTLE_TIMEOUT_MS = 4000;
const PAGE_SETTLE_POLL_MS = 150;

interface KeyPageSpec {
  key: string;
  route: string;
  openMode: 'tab' | 'navigate';
  buildUrl: (params: { noticeId: string }) => string;
}

const KEY_PAGE_SPECS: KeyPageSpec[] = [
  {
    key: 'tab.plaza',
    route: ROUTES.plaza,
    openMode: 'tab',
    buildUrl: () => ROUTES.plaza,
  },
  {
    key: 'tab.publish',
    route: ROUTES.publish,
    openMode: 'tab',
    buildUrl: () => ROUTES.publish,
  },
  {
    key: 'tab.messages',
    route: ROUTES.messages,
    openMode: 'tab',
    buildUrl: () => ROUTES.messages,
  },
  {
    key: 'tab.mine',
    route: ROUTES.mine,
    openMode: 'tab',
    buildUrl: () => ROUTES.mine,
  },
  {
    key: 'notice.detail',
    route: ROUTES.noticeDetail,
    openMode: 'navigate',
    buildUrl: ({ noticeId }) => `${ROUTES.noticeDetail}?noticeId=${noticeId || 'notice_202603160001'}`,
  },
  {
    key: 'creator.apply',
    route: ROUTES.creatorApply,
    openMode: 'navigate',
    buildUrl: ({ noticeId }) => `${ROUTES.creatorApply}?noticeId=${noticeId || 'notice_202603160001'}`,
  },
  {
    key: 'creator.application-list',
    route: ROUTES.creatorApplicationList,
    openMode: 'navigate',
    buildUrl: () => ROUTES.creatorApplicationList,
  },
  {
    key: 'publish.notice-list',
    route: ROUTES.publishNoticeList,
    openMode: 'navigate',
    buildUrl: () => ROUTES.publishNoticeList,
  },
  {
    key: 'publish.application-manage',
    route: ROUTES.publishApplicationManage,
    openMode: 'navigate',
    buildUrl: () => ROUTES.publishApplicationManage,
  },
];

function safeGetStorage<T>(key: string, defaultValue: T): T {
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

function wait(timeout: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
}

function serializePreview(input: unknown, maxLength = MAX_PREVIEW_LENGTH) {
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

function normalizeBoolean(value: string) {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

function normalizeRoute(url: string) {
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

function getPageState(page: any) {
  return `${page?.data?.pageState || ''}`;
}

function getPageErrorText(page: any) {
  return `${page?.data?.errorText || ''}`;
}

function buildStepResult(params: {
  stage: DevAutoSmokeStepResult['stage'];
  step: string;
  ok: boolean;
  action: string;
  message: string;
  payload?: unknown;
  response?: unknown;
}) {
  return {
    stage: params.stage,
    step: params.step,
    ok: params.ok,
    action: params.action,
    requestId: '',
    message: params.message,
    payloadPreview: serializePreview(params.payload),
    responsePreview: serializePreview(params.response),
  } satisfies DevAutoSmokeStepResult;
}

function appendPageStepResult(result: DevAutoSmokePageResult) {
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

function buildRuntimeSwitchResult(mode: ApiMode, ok: boolean, message: string, response: unknown) {
  return buildStepResult({
    stage: 'runtime',
    step: 'runtime.switch',
    ok,
    action: mode === 'cloud' ? 'runtime.useCloud' : 'runtime.useMock',
    message,
    payload: {
      runtimeMode: mode,
      cloudEnvId: mode === 'cloud' ? getCloudEnvId() : '',
    },
    response,
  });
}

function getRuntimeErrorsFromIndex(startIndex = 0) {
  const app = getApp<IAppOption>();
  return app.globalData.runtimeErrors.slice(startIndex);
}

function persistAutoSmokeBundle(bundle: DevAutoSmokeResultBundle) {
  const app = getApp<IAppOption>();
  app.globalData.autoSmokeResult = bundle;
  safeSetStorage(STORAGE_KEYS.devAutoSmokeResult, bundle);
}

async function openPage(url: string, openMode: 'tab' | 'navigate') {
  await new Promise<void>((resolve, reject) => {
    const callback = {
      url,
      success: () => resolve(),
      fail: (error: any) => reject(error),
    };

    if (openMode === 'tab') {
      wx.switchTab(callback);
      return;
    }

    wx.navigateTo(callback);
  });
}

async function settlePage(targetRoute: string, runtimeErrorStartIndex: number) {
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

async function runKeyPageSmoke(noticeId: string): Promise<DevAutoSmokePageRun> {
  const pages: DevAutoSmokePageResult[] = [];

  for (const spec of KEY_PAGE_SPECS) {
    const url = spec.buildUrl({
      noticeId,
    });
    const startedAt = Date.now();
    const runtimeErrorStartIndex = getApp<IAppOption>().globalData.runtimeErrors.length;

    try {
      await openPage(url, spec.openMode);
      const settled = await settlePage(spec.route, runtimeErrorStartIndex);
      const pageState = settled.pageState || (settled.arrived ? 'arrived' : 'not_arrived');
      const runtimeErrorCount = settled.runtimeErrors.length;
      const ok =
        settled.arrived &&
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
    } catch (error) {
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
    await openPage(ROUTES.plaza, 'tab');
  } catch (error) {
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

export function resolveAutoSmokeLaunchOptions(launchOptions: WechatMiniprogram.AnyRecord = {}): DevAutoSmokeLaunchOptions {
  const query = (launchOptions.query || {}) as Record<string, string>;
  const normalizedQuery = Object.keys(query).reduce<Record<string, string>>((result, key) => {
    result[key] = `${query[key] || ''}`;
    return result;
  }, {});
  const enabled = normalizeBoolean(normalizedQuery.__dev_auto_smoke || '');
  const runtimeMode = (normalizedQuery.__dev_runtime || 'cloud') === 'mock' ? 'mock' : 'cloud';

  return {
    enabled,
    runtimeMode,
    cloudEnvId: runtimeMode === 'cloud' ? getCloudEnvId() : '',
    query: normalizedQuery,
  };
}

export function getAutoSmokeResultTag() {
  return AUTO_SMOKE_TAG;
}

export function getStoredAutoSmokeResult() {
  return safeGetStorage<DevAutoSmokeResultBundle | null>(STORAGE_KEYS.devAutoSmokeResult, null);
}

export async function runAutoSmokeIfNeeded(
  launchOptions: DevAutoSmokeLaunchOptions,
  getRuntimeSummary: () => RuntimeDebugSummary,
) {
  if (!launchOptions.enabled) {
    return null;
  }

  const app = getApp<IAppOption>();

  app.globalData.requestDebug.setEnabled(true);
  app.globalData.requestDebug.clearLogs();
  app.globalData.autoSmokeResult = null;

  const steps: DevAutoSmokeStepResult[] = [];
  let batch: DevSmokeBatchRun | null = null;
  let pageSmoke: DevAutoSmokePageRun = {
    ok: false,
    skipped: true,
    reason: 'not_started',
    pages: [],
  };

  try {
    await switchBootstrapRuntime(launchOptions.runtimeMode, launchOptions.cloudEnvId, {
      persist: false,
    });
    steps.push(buildRuntimeSwitchResult(launchOptions.runtimeMode, true, 'ok', getRuntimeSummary()));
  } catch (error) {
    steps.push(
      buildRuntimeSwitchResult(
        launchOptions.runtimeMode,
        false,
        error instanceof Error ? error.message : 'runtime_switch_failed',
        {
          runtimeSummary: getRuntimeSummary(),
        },
      ),
    );
  }

  if (steps.every((step) => step.ok)) {
    batch = await app.globalData.devSmoke.runFirstBatch();
    steps.push(
      ...batch.steps.map((step) => ({
        ...step,
        stage: 'batch' as const,
      })),
    );
  } else {
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
  } else if (batch) {
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
    ok:
      runtimeSummary.activeMode === launchOptions.runtimeMode &&
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
  } satisfies DevAutoSmokeResultBundle;

  persistAutoSmokeBundle(bundle);
  console.log(`${AUTO_SMOKE_TAG}${JSON.stringify(bundle)}`);

  return bundle;
}
