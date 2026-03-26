import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const automator = require('../node_modules/miniprogram-automator')

export const DEFAULT_WECHAT_AUTO_PORT = 9421
export const ACCEPTED_PAGE_STATES = new Set(['ready', 'empty', 'error', 'arrived'])
export const DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS = 4000
export const DEFAULT_SCREENSHOT_TIMEOUT_MS = 40000
export const TAB_PAGE_ROUTES = new Set([
  'pages/plaza/index',
  'pages/publish/index',
  'pages/messages/index',
  'pages/mine/index',
])

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true })
}

export function toScreenshotFilename(routeKey) {
  return routeKey.replace(/[^\w.-]+/g, '_')
}

export function normalizeRoutePath(route) {
  return `${route || ''}`.split('?')[0].replace(/^\//, '')
}

export function pageRouteToArtifactPath(miniprogramRoot, route, extension) {
  return path.join(miniprogramRoot, `${route.replace(/^\//, '')}.${extension}`)
}

export function getStyleArtifactInfo(miniprogramRoot, route) {
  const wxssPath = pageRouteToArtifactPath(miniprogramRoot, route, 'wxss')

  if (!fs.existsSync(wxssPath)) {
    return {
      exists: false,
      size: 0,
      path: wxssPath,
    }
  }

  return {
    exists: true,
    size: fs.statSync(wxssPath).size,
    path: wxssPath,
  }
}

export function resolveStyleStatus(styleInfo, pageState) {
  if (!styleInfo.exists || styleInfo.size <= 0) {
    return '缺少页面样式产物'
  }

  if (pageState === 'error') {
    return '样式产物存在，运行异常待结合截图复核'
  }

  if (pageState === 'loading') {
    return '样式产物存在，但页面仍停留在骨架态'
  }

  return '页面样式产物已命中'
}

export function resolveReadinessBand(params) {
  if (!params.arrived || params.runtimeErrorCount > 0 || params.pageState === 'error') {
    return '运行异常'
  }

  if (params.pageState === 'loading') {
    return '仅骨架'
  }

  if (params.canSignoffDirectly) {
    return '可验收'
  }

  if (ACCEPTED_PAGE_STATES.has(params.pageState || 'arrived')) {
    return '基本可用待收口'
  }

  return '运行异常'
}

export function buildEvidenceAnchors(anchors) {
  return anchors.filter(Boolean).join(' | ')
}

async function withTimeout(promise, timeoutMs, timeoutLabel) {
  const timeout = Number(timeoutMs || DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS)

  return await Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutLabel))
      }, timeout)
    }),
  ])
}

export async function isPortListening(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({
      host: '127.0.0.1',
      port,
    })

    const finish = (value) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(1200)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export async function waitForAutomationPort(port, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 15000)
  const pollMs = Number(options.pollMs || 500)
  const deadline = Date.now() + timeoutMs

  while (Date.now() <= deadline) {
    if (await isPortListening(port)) {
      return {
        ok: true,
        waitedMs: timeoutMs - Math.max(0, deadline - Date.now()),
      }
    }

    await wait(pollMs)
  }

  return {
    ok: false,
    waitedMs: timeoutMs,
  }
}

export async function connectMiniProgram(autoPort) {
  return await automator.connect({
    wsEndpoint: `ws://127.0.0.1:${autoPort}`,
  })
}

export async function bootstrapMiniProgramApp(miniProgram) {
  return await withTimeout(
    miniProgram.evaluate(async () => {
      try {
        const app = typeof getApp === 'function' ? getApp() : null

        if (app?.bootstrapApp) {
          await app.bootstrapApp(true)
        }

        const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
        const currentPage = pages.length > 0 ? pages[pages.length - 1] : null
        const data = currentPage?.data || {}

        return {
          ok: true,
          hasApp: Boolean(app),
          route: `${currentPage?.route || currentPage?.__route__ || ''}`,
          pageState: `${data?.pageState || ''}`,
          errorText: `${data?.errorText || ''}`,
        }
      } catch (error) {
        return {
          ok: false,
          hasApp: false,
          route: '',
          pageState: '',
          errorText: '',
          error: error instanceof Error ? error.message : `${error}`,
        }
      }
    }),
    8000,
    'bootstrap_app_timeout',
  )
}

export async function getRuntimeErrorCount(miniProgram) {
  return await withTimeout(
    miniProgram.evaluate(() => getApp().globalData.runtimeErrors.length),
    DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
    'runtime_error_count_timeout',
  )
}

export async function getRuntimeErrorsFrom(miniProgram, startIndex) {
  return await withTimeout(
    miniProgram.evaluate((targetStartIndex) => getApp().globalData.runtimeErrors.slice(targetStartIndex), startIndex),
    DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
    'runtime_error_slice_timeout',
  )
}

export async function getRuntimeSummary(miniProgram) {
  return await withTimeout(
    miniProgram.evaluate(() => getApp().globalData.runtimeDebug.getSummary()),
    DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
    'runtime_summary_timeout',
  )
}

export async function waitForMiniProgramReady(miniProgram, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 15000)
  const pollMs = Number(options.pollMs || 500)
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() <= deadline) {
    try {
      const page = await withTimeout(
        miniProgram.currentPage(),
        DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
        'ready_current_page_timeout',
      )
      await withTimeout(
        page.data(),
        DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
        'ready_page_data_timeout',
      )

      return {
        ok: true,
        route: page.path,
      }
    } catch (error) {
      lastError = error

      try {
        const bootstrap = await bootstrapMiniProgramApp(miniProgram)

        if (bootstrap?.ok && (bootstrap.route || bootstrap.hasApp)) {
          return {
            ok: true,
            route: bootstrap.route,
          }
        }

        if (bootstrap?.error) {
          lastError = new Error(bootstrap.error)
        }
      } catch (bootstrapError) {
        lastError = bootstrapError
      }

      await wait(pollMs)
    }
  }

  return {
    ok: false,
    route: '',
    error: lastError instanceof Error ? lastError.message : 'mini_program_not_ready',
  }
}

export async function runConsoleFallback(miniProgram) {
  await bootstrapMiniProgramApp(miniProgram)

  return await withTimeout(
    miniProgram.evaluate(async () => {
      const app = getApp()

       if (app?.bootstrapApp) {
        await app.bootstrapApp(true)
      }

      app.globalData.requestDebug.setEnabled(true)
      app.globalData.requestDebug.clearLogs()

      await app.globalData.runtimeDebug.useCloud()
      const batch = await app.globalData.devSmoke.runFirstBatch()

      return {
        runtimeSummary: app.globalData.runtimeDebug.getSummary(),
        batch,
        steps: batch.steps,
        requestLogs: app.globalData.requestDebug.getLogs(),
        generatedAt: new Date().toISOString(),
        resultTag: 'AUTO_SMOKE_RESULT::',
      }
    }),
    40000,
    'console_fallback_timeout',
  )
}

export async function captureScreenshot(miniProgram, targetPath) {
  ensureDir(path.dirname(targetPath))
  const timeoutMs = Number(process.env.MINIPROGRAM_SCREENSHOT_TIMEOUT_MS || DEFAULT_SCREENSHOT_TIMEOUT_MS)

  await withTimeout(
    miniProgram.screenshot({
      path: targetPath,
    }),
    timeoutMs,
    'capture_screenshot_timeout',
  )

  return targetPath
}

export function resolveNavigationMethod(targetUrl, expectedRoute = '') {
  const targetRoute = normalizeRoutePath(expectedRoute || targetUrl)
  return TAB_PAGE_ROUTES.has(targetRoute) ? 'switchTab' : 'navigateTo'
}

export async function dispatchNavigation(miniProgram, targetUrl, options = {}) {
  const method = `${options.method || resolveNavigationMethod(targetUrl, options.expectedRoute)}`

  return await withTimeout(
    miniProgram.evaluate((payload) => {
      try {
        const wxMethod = wx[payload.method]

        if (typeof wxMethod !== 'function') {
          return {
            ok: false,
            method: payload.method,
            error: `unknown_navigation_method:${payload.method}`,
          }
        }

        wxMethod.call(wx, {
          url: payload.url,
        })

        return {
          ok: true,
          method: payload.method,
          url: payload.url,
        }
      } catch (error) {
        return {
          ok: false,
          method: payload.method,
          error: error instanceof Error ? error.message : `${error}`,
        }
      }
    }, {
      method,
      url: targetUrl,
    }),
    DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
    `dispatch_navigation_timeout:${method}`,
  )
}

async function readCurrentPageSnapshot(miniProgram, previousSnapshot = null) {
  try {
    const page = await withTimeout(
      miniProgram.currentPage(),
      DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
      'snapshot_current_page_timeout',
    )
    let data = {}
    let readError = ''

    if (page) {
      try {
        data = await withTimeout(
          page.data(),
          DEFAULT_AUTOMATOR_CALL_TIMEOUT_MS,
          'snapshot_page_data_timeout',
        )
      } catch (error) {
        readError = error instanceof Error ? error.message : `${error}`
      }
    }

    return {
      page,
      data,
      route: normalizeRoutePath(page?.path || ''),
      pageState: `${data?.pageState || ''}` || 'arrived',
      errorText: `${data?.errorText || ''}`,
      readError,
    }
  } catch (error) {
    if (previousSnapshot) {
      return {
        ...previousSnapshot,
        readError: error instanceof Error ? error.message : `${error}`,
      }
    }

    return {
      page: null,
      data: {},
      route: '',
      pageState: '',
      errorText: '',
      readError: error instanceof Error ? error.message : `${error}`,
    }
  }
}

export async function reLaunchAndWait(miniProgram, targetUrl, options = {}) {
  const settleTimeoutMs = Number(options.settleTimeoutMs || 5000)
  const routeTimeoutMs = Number(options.routeTimeoutMs || 8000)
  const pollMs = Number(options.pollMs || 500)
  const expectedRoute = normalizeRoutePath(options.expectedRoute || targetUrl)
  const primaryMethod = `${options.method || resolveNavigationMethod(targetUrl, expectedRoute)}`
  const fallbackMethods = primaryMethod === 'switchTab'
    ? ['reLaunch']
    : primaryMethod === 'reLaunch'
      ? []
      : ['redirectTo', 'reLaunch']
  const navigationMethods = [...new Set([
    primaryMethod,
    ...fallbackMethods,
  ])]
  let waitedMs = 0
  let snapshot = await readCurrentPageSnapshot(miniProgram)
  let dispatchResult = null
  let navigationMethod = primaryMethod

  for (const method of navigationMethods) {
    navigationMethod = method

    try {
      dispatchResult = await dispatchNavigation(miniProgram, targetUrl, {
        ...options,
        expectedRoute,
        method,
      })
    } catch (error) {
      dispatchResult = {
        ok: false,
        method,
        url: targetUrl,
        error: error instanceof Error ? error.message : `${error}`,
      }
    }

    const routeDeadline = waitedMs + routeTimeoutMs

    while (waitedMs < routeDeadline) {
      snapshot = await readCurrentPageSnapshot(miniProgram, snapshot)

      if (!expectedRoute || snapshot.route === expectedRoute) {
        break
      }

      await wait(pollMs)
      waitedMs += pollMs
    }

    if (!expectedRoute || snapshot.route === expectedRoute) {
      break
    }
  }

  const settleDeadline = waitedMs + settleTimeoutMs

  while (waitedMs < settleDeadline) {
    snapshot = await readCurrentPageSnapshot(miniProgram, snapshot)
    const pageState = `${snapshot.pageState || ''}`

    if (expectedRoute && snapshot.route !== expectedRoute) {
      break
    }

    if (pageState && pageState !== 'loading') {
      break
    }

    if (!pageState && waitedMs >= pollMs) {
      break
    }

    await wait(pollMs)
    waitedMs += pollMs
  }

  return {
    page: snapshot.page,
    data: snapshot.data,
    waitedMs,
    arrived: !expectedRoute || snapshot.route === expectedRoute,
    pageState: `${snapshot.pageState || ''}` || 'arrived',
    errorText: `${snapshot.errorText || ''}`,
    navigationMethod,
    navigationDispatchOk: Boolean(dispatchResult?.ok),
    navigationDispatchError: `${dispatchResult?.error || snapshot.readError || ''}`,
  }
}
