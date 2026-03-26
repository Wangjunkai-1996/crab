#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  TAB_PAGE_ROUTES,
  buildEvidenceAnchors,
  captureScreenshot,
  connectMiniProgram,
  ensureDir,
  getRuntimeErrorCount,
  getRuntimeErrorsFrom,
  getStyleArtifactInfo,
  reLaunchAndWait,
  resolveReadinessBand,
  resolveStyleStatus,
  runConsoleFallback,
  toScreenshotFilename,
  waitForAutomationPort,
  waitForMiniProgramReady,
} from './lib/miniprogram-automator.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')
const evidenceRoot = path.join(miniprogramRoot, 'evidence', 'r58')
const runtimeRoot = path.join(evidenceRoot, 'runtime')
const screenshotsRoot = path.join(evidenceRoot, 'screenshots')
const summaryPath = path.join(evidenceRoot, 'ui-inventory.md')
const jsonPath = path.join(runtimeRoot, 'ui-inventory.json')
const fallbackPath = path.join(runtimeRoot, 'auto-smoke-fallback-result.json')
const autoPort = Number(process.env.WECHAT_AUTO_PORT || 9421)
const refreshScreenshots = process.env.MINIPROGRAM_REFRESH_SCREENSHOTS === '1'

const AUDIT_SPECS = [
  { key: 'plaza', group: '核心主线', route: 'pages/plaza/index', buildUrl: () => '/pages/plaza/index' },
  { key: 'publish', group: '核心主线', route: 'pages/publish/index', buildUrl: () => '/pages/publish/index' },
  { key: 'messages', group: '核心主线', route: 'pages/messages/index', buildUrl: () => '/pages/messages/index' },
  { key: 'mine', group: '核心主线', route: 'pages/mine/index', buildUrl: () => '/pages/mine/index' },
  {
    key: 'search',
    group: '核心主线',
    route: 'pages/plaza/search',
    buildUrl: ({ searchKeyword }) => `/pages/plaza/search?keyword=${encodeURIComponent(searchKeyword || '探店')}`,
  },
  {
    key: 'notice-detail',
    group: '核心主线',
    route: 'pages/plaza/notice-detail',
    buildUrl: ({ noticeId }) => `/pages/plaza/notice-detail?noticeId=${noticeId}`,
  },
  {
    key: 'creator-apply',
    group: '核心主线',
    route: 'packages/creator/apply/index',
    buildUrl: ({ noticeId }) => `/packages/creator/apply/index?noticeId=${noticeId}`,
  },
  {
    key: 'creator-application-list',
    group: '核心主线',
    route: 'packages/creator/application-list/index',
    buildUrl: () => '/packages/creator/application-list/index',
  },
  {
    key: 'publish-notice-list',
    group: '核心主线',
    route: 'packages/publish/notice-list/index',
    buildUrl: () => '/packages/publish/notice-list/index',
  },
  {
    key: 'publish-application-manage',
    group: '核心主线',
    route: 'packages/publish/application-manage/index',
    buildUrl: ({ noticeId }) => `/packages/publish/application-manage/index?noticeId=${noticeId}`,
  },
  {
    key: 'creator-application-detail',
    group: '补充页面',
    route: 'packages/creator/application-detail/index',
    buildUrl: ({ applicationId }) => `/packages/creator/application-detail/index?applicationId=${applicationId}`,
  },
  {
    key: 'creator-card',
    group: '补充页面',
    route: 'packages/creator/creator-card/index',
    buildUrl: () => '/packages/creator/creator-card/index',
  },
  {
    key: 'report',
    group: '补充页面',
    route: 'packages/mine/report/index',
    buildUrl: ({ noticeId }) =>
      `/packages/mine/report/index?targetType=notice&targetId=${noticeId}&targetTitle=${encodeURIComponent('上海探店短视频达人招募')}`,
  },
  {
    key: 'report-records',
    group: '补充页面',
    route: 'packages/mine/report-records/index',
    buildUrl: () => '/packages/mine/report-records/index',
  },
  {
    key: 'feedback',
    group: '补充页面',
    route: 'packages/mine/feedback/index',
    buildUrl: () => '/packages/mine/feedback/index',
  },
  {
    key: 'rules',
    group: '补充页面',
    route: 'packages/mine/rules/index',
    buildUrl: () => '/packages/mine/rules/index',
    canSignoffDirectly: true,
  },
  {
    key: 'publish-success',
    group: '补充页面',
    route: 'packages/publish/success/index',
    buildUrl: ({ noticeId }) => `/packages/publish/success/index?noticeId=${noticeId}`,
    canSignoffDirectly: true,
  },
  {
    key: 'publish-edit',
    group: '补充页面',
    route: 'packages/publish/edit/index',
    buildUrl: ({ noticeId }) => `/packages/publish/edit/index?noticeId=${noticeId}`,
  },
]

function loadFallbackResult() {
  if (!fs.existsSync(fallbackPath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'))
}

function resolveExistingScreenshot(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return ''
  }

  const stat = fs.statSync(targetPath)
  return stat.size > 0 ? targetPath : ''
}

function summarizeIssues(result) {
  const issues = []

  if (!result.navigationDispatchOk && result.navigationDispatchError) {
    issues.push(`导航派发异常:${result.navigationDispatchError}`)
  }

  if (!result.arrived) {
    issues.push('页面未落到目标路由')
  }

  if (result.pageState === 'loading') {
    issues.push('页面长时间停留在 loading')
  }

  if (result.pageState === 'error' && result.errorText) {
    issues.push(result.errorText)
  }

  if (result.runtimeErrors.length > 0) {
    issues.push(...result.runtimeErrors.map((item) => `${item.type}:${item.message}`))
  }

  if (result.style.exists === false) {
    issues.push('缺少页面 wxss 产物')
  }

  return issues.length > 0 ? issues : ['无显式运行时错误']
}

function buildMarkdown(report) {
  const grouped = report.pages.reduce((result, page) => {
    if (!result[page.group]) {
      result[page.group] = []
    }

    result[page.group].push(page)
    return result
  }, {})

  const summaryLines = [
    '# 小程序页面完成度盘点（R58）',
    '',
    '## 总结',
    '',
    `- 盘点时间：\`${report.generatedAt}\``,
    `- Automation 端口：\`${report.autoPort}\``,
    `- Cloud 运行态：\`${report.runtimeSummary.activeMode}\``,
    `- 截图策略：\`${report.screenshotPolicy}\``,
    `- 页面统计：\`可验收 ${report.counts.acceptable} / 基本可用待收口 ${report.counts.needsPolish} / 仅骨架 ${report.counts.skeletonOnly} / 运行异常 ${report.counts.runtimeError}\``,
    '',
  ]

  for (const [group, pages] of Object.entries(grouped)) {
    summaryLines.push(`## ${group}`, '')

    for (const page of pages) {
      summaryLines.push(`### ${page.key}`)
      summaryLines.push(`- 页面状态：${page.readinessBand}（route=\`${page.route}\`，pageState=\`${page.pageState}\`）`)
      summaryLines.push(`- 样式状态：${page.styleStatus}`)
      summaryLines.push(`- 关键问题：${page.issues.join('；')}`)
      summaryLines.push(`- 证据锚点：${page.evidenceAnchors}`)
      summaryLines.push('')
    }
  }

  return `${summaryLines.join('\n')}\n`
}

async function main() {
  ensureDir(runtimeRoot)
  ensureDir(screenshotsRoot)

  const autoPortStatus = await waitForAutomationPort(autoPort, {
    timeoutMs: 15000,
    pollMs: 500,
  })

  if (!autoPortStatus.ok) {
    throw new Error(`automation port ${autoPort} not ready`)
  }

  const miniProgram = await connectMiniProgram(autoPort)

  try {
    const ready = await waitForMiniProgramReady(miniProgram, {
      timeoutMs: 15000,
      pollMs: 500,
    })

    if (!ready.ok) {
      throw new Error(ready.error || 'mini_program_not_ready')
    }

    const fallbackResult = loadFallbackResult() || (await runConsoleFallback(miniProgram))
    const inventorySamples = await miniProgram.evaluate(async () => {
      const app = getApp()

      if (app?.globalData?.devSmoke?.resolveInventorySamples) {
        return app.globalData.devSmoke.resolveInventorySamples()
      }

      return {
        publisherNoticeId: '',
        creatorApplicationId: '',
        searchKeyword: '',
        errors: {
          helper: 'resolveInventorySamples_not_available',
        },
      }
    })
    const noticeId = `${inventorySamples?.publisherNoticeId || fallbackResult?.batch?.latestResolvedNoticeId || fallbackResult?.batch?.fixedNoticeId || 'notice_202603160001'}`
    const applicationId = `${inventorySamples?.creatorApplicationId || fallbackResult?.batch?.latestWithdrawnApplicationId || fallbackResult?.batch?.latestSubmittedApplicationId || 'application-001'}`
    const searchKeyword = `${inventorySamples?.searchKeyword || '探店'}`
    const runtimeSummary = fallbackResult.runtimeSummary
    const pages = []

    for (const spec of AUDIT_SPECS) {
      console.error(`[ui-inventory] start ${spec.key}`)
      const runtimeErrorStartIndex = await getRuntimeErrorCount(miniProgram)
      const targetUrl = spec.buildUrl({
        noticeId,
        applicationId,
        searchKeyword,
      })
      const isTabRoute = TAB_PAGE_ROUTES.has(spec.route)

      if (!isTabRoute) {
        await reLaunchAndWait(miniProgram, '/pages/plaza/index', {
          expectedRoute: 'pages/plaza/index',
          method: 'reLaunch',
          routeTimeoutMs: 8000,
          settleTimeoutMs: 5000,
          pollMs: 500,
        })
      }

      const settled = await reLaunchAndWait(miniProgram, targetUrl, {
        expectedRoute: spec.route,
        method: isTabRoute ? 'switchTab' : 'navigateTo',
        routeTimeoutMs: isTabRoute ? 8000 : 15000,
        settleTimeoutMs: 5000,
        pollMs: 500,
      })
      const runtimeErrors = await getRuntimeErrorsFrom(miniProgram, runtimeErrorStartIndex)
      let screenshotPath = ''
      let screenshotIssue = ''
      const targetScreenshotPath = path.join(screenshotsRoot, `${toScreenshotFilename(spec.key)}.png`)
      const existingScreenshotPath = resolveExistingScreenshot(targetScreenshotPath)
      let screenshotSource = ''

      if (existingScreenshotPath && !refreshScreenshots) {
        screenshotPath = existingScreenshotPath
        screenshotSource = 'cached'
      } else {
        try {
          screenshotPath = await captureScreenshot(
            miniProgram,
            targetScreenshotPath,
          )
          screenshotSource = 'captured'
        } catch (error) {
          screenshotIssue = error instanceof Error ? error.message : `${error}`
          screenshotPath = existingScreenshotPath
          screenshotSource = screenshotPath ? 'cached_fallback' : 'error'
        }
      }

      const style = getStyleArtifactInfo(miniprogramRoot, spec.route)
      const readinessBand = resolveReadinessBand({
        arrived: settled.arrived,
        runtimeErrorCount: runtimeErrors.length,
        pageState: settled.pageState,
        canSignoffDirectly: Boolean(spec.canSignoffDirectly),
      })
      const styleStatus = resolveStyleStatus(style, settled.pageState)
      const pageResult = {
        key: spec.key,
        group: spec.group,
        route: settled.page?.path || '',
        targetRoute: spec.route,
        url: targetUrl,
        navigationMethod: settled.navigationMethod,
        navigationDispatchOk: settled.navigationDispatchOk,
        navigationDispatchError: settled.navigationDispatchError,
        pageState: settled.pageState,
        arrived: settled.arrived,
        errorText: settled.errorText,
        waitedMs: settled.waitedMs,
        runtimeErrors,
        runtimeErrorCount: runtimeErrors.length,
        readinessBand,
        style,
        styleStatus,
        issues: summarizeIssues({
          ...settled,
          runtimeErrors,
          style,
        }).concat(screenshotIssue
          ? [
              screenshotPath
                ? `截图实时采集失败，沿用已有截图:${screenshotIssue}`
                : `截图采集失败:${screenshotIssue}`,
            ]
          : []),
        screenshotPath,
        screenshotSource,
        evidenceAnchors: buildEvidenceAnchors([
          screenshotPath ? `screenshot:${path.relative(repoRoot, screenshotPath)}` : `screenshot:error:${screenshotIssue}`,
          `wxss:${path.relative(repoRoot, style.path)}`,
        ]),
      }

      pages.push(pageResult)
      console.error(
        `[ui-inventory] done ${spec.key} route=${pageResult.route || '-'} state=${pageResult.pageState} arrived=${pageResult.arrived}`,
      )
    }

    const counts = {
      acceptable: pages.filter((page) => page.readinessBand === '可验收').length,
      needsPolish: pages.filter((page) => page.readinessBand === '基本可用待收口').length,
      skeletonOnly: pages.filter((page) => page.readinessBand === '仅骨架').length,
      runtimeError: pages.filter((page) => page.readinessBand === '运行异常').length,
    }

    const report = {
      round: 'R58',
      generatedAt: new Date().toISOString(),
      autoPort,
      runtimeSummary,
      screenshotPolicy: refreshScreenshots ? 'refresh-live' : 'reuse-existing-first',
      sampleIds: {
        noticeId,
        applicationId,
      },
      sampleResolution: inventorySamples,
      counts,
      pages,
    }

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8')
    fs.writeFileSync(summaryPath, buildMarkdown(report), 'utf8')
    console.log(JSON.stringify(report, null, 2))
    return true
  } finally {
    miniProgram.disconnect()
  }
}

try {
  const ok = await main()
  process.exit(ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : `${error}`)
  process.exit(1)
}
