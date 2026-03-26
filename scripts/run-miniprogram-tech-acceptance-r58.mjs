#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_WECHAT_AUTO_PORT,
  connectMiniProgram,
  launchMiniProgramWithFreshAutoPort,
  runConsoleFallback,
  waitForAutomationPort,
  waitForMiniProgramReady,
} from './lib/miniprogram-automator.mjs'
import {
  DEFAULT_WECHAT_DEVTOOLS_PORT,
  inspectWeChatDevtoolsLogs,
  resolveWeChatDevtoolsPort,
} from './lib/wechat-devtools.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')
const nodeBin = process.execPath
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const requestedDevtoolsPort = Number(process.env.WECHAT_DEVTOOLS_PORT || 0)
const initialPortResolution = resolveWeChatDevtoolsPort({
  explicitPort: requestedDevtoolsPort,
  lookbackLines: 800,
})
const autoPort = Number(process.env.WECHAT_AUTO_PORT || DEFAULT_WECHAT_AUTO_PORT)
const recoveryAutoPort = Number(process.env.WECHAT_AUTO_PORT_RECOVERY || 19641)
const evidenceRoot = path.join(miniprogramRoot, 'evidence', 'r58')
const runtimeRoot = path.join(evidenceRoot, 'runtime')
const logsRoot = path.join(evidenceRoot, 'logs')
const summaryPath = path.join(evidenceRoot, 'summary.md')
const jsonReportPath = path.join(runtimeRoot, 'tech-acceptance-run.json')
const fallbackResultPath = path.join(runtimeRoot, 'auto-smoke-fallback-result.json')
const cliOpenLogPath = path.join(logsRoot, 'devtools-cli-open.log')
const cliAutoLogPath = path.join(logsRoot, 'devtools-cli-auto.log')

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true })
}

function clipText(text, maxLength = 6000) {
  if (!text) {
    return ''
  }

  return text.length > maxLength ? text.slice(text.length - maxLength) : text
}

function safeJsonParse(text) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== '{') {
        continue
      }

      try {
        return JSON.parse(text.slice(index))
      } catch (innerError) {
        continue
      }
    }

    return null
  }
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: options.timeoutMs || 15000,
    env: options.env || process.env,
    input: options.input || '',
  })

  return {
    ok: result.status === 0,
    exitCode: typeof result.status === 'number' ? result.status : -1,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? `${result.error.name || 'Error'}: ${result.error.message}` : '',
  }
}

function buildSkippedCommandResult(message) {
  return {
    ok: true,
    exitCode: 0,
    timedOut: false,
    stdout: '',
    stderr: '',
    error: '',
    skipped: true,
    message,
  }
}

function stringifyCommandResult(result) {
  return [
    `ok=${result.ok}`,
    `exitCode=${result.exitCode}`,
    `timedOut=${result.timedOut}`,
    result.error ? `error=${result.error}` : '',
    result.stdout ? `--- stdout ---\n${clipText(result.stdout)}` : '',
    result.stderr ? `--- stderr ---\n${clipText(result.stderr)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function resolveBlocker(params) {
  if (!params.precheck.ok) {
    return 'precheck_failed'
  }

  if (params.cliAuto.timedOut && !params.autoPortListening) {
    return 'devtools_automation_timeout'
  }

  if (!params.autoPortListening) {
    return params.devtoolsSignals.loginRequiredBlocking
      ? 'devtools_login_required'
      : 'automation_port_not_listening'
  }

  if (params.fallbackError) {
    return 'auto_smoke_fallback_failed'
  }

  if (params.autoSmokeResult?.batch?.ok) {
    return 'none'
  }

  if (params.devtoolsSignals.loginRequiredBlocking) {
    return 'devtools_login_required'
  }

  if (params.autoSmokeResult && !params.autoSmokeResult?.batch?.ok) {
    return 'auto_smoke_batch_failed'
  }

  if (!params.devtoolsSignals.autoSmokeResultSeen) {
    return params.autoSmokeResult ? 'none' : 'auto_smoke_not_observed'
  }

  return 'none'
}

function resolveNextAction(blocker) {
  switch (blocker) {
    case 'precheck_failed':
      return '先修复技术验收预检失败项，再重跑一键验收脚本。'
    case 'devtools_login_required':
      return '先在微信开发者工具右上角重新登录微信账号，再重跑一键验收脚本。'
    case 'devtools_automation_timeout':
      return '先确认 DevTools 已完成登录且项目窗口停在小程序工程，再重跑自动验收。'
    case 'automation_port_not_listening':
      return '先确认 DevTools `auto` 已真正启用 automation 端口，再继续追 auto-smoke。'
    case 'auto_smoke_fallback_failed':
      return 'automation 已连通，但 console fallback 未成功，请先查看 fallback 错误与 requestLogs。'
    case 'auto_smoke_batch_failed':
      return 'console fallback 已执行，但 `runFirstBatch()` 未全绿，请按失败 step 回查具体函数。'
    case 'auto_smoke_not_observed':
      return '继续追 compile 参数 / runtime helper / DevTools console 日志，直到出现 `AUTO_SMOKE_RESULT::`。'
    default:
      return '技术验收链路已具备继续推进条件，可进入下一轮产品 / 体验签收。'
  }
}

function buildSummaryMarkdown(report) {
  const passedItems = []
  const failedItems = []
  const blockers = []

  if (report.precheck.ok) {
    passedItems.push(`固定预检已通过：\`build-miniprogram-js\`、\`check-devtools-readiness\`、\`check-wechat-devtools-cli\``)
  } else {
    failedItems.push('固定预检未全绿，需先修复 gate 失败项')
  }

  if (report.devtools.servicePortEnabled) {
    passedItems.push(`DevTools 服务端口已开启，当前端口为 \`${report.devtools.port}\``)
  } else {
    failedItems.push('DevTools 服务端口未开启')
  }

  if (
    report.devtools.requestedPort &&
    report.devtools.requestedPort !== report.devtools.port
  ) {
    passedItems.push(
      `脚本已自动从请求端口 \`${report.devtools.requestedPort}\` 切换到当前真实端口 \`${report.devtools.port}\``,
    )
  }

  if (report.devtools.logSignals.cliUpgradeSeen) {
    passedItems.push('DevTools 已接受 CLI `upgrade` 请求')
  }

  if (report.devtools.logSignals.simulatorLaunchSeen || report.devtools.logSignals.appServiceMainframeSeen) {
    passedItems.push('DevTools 日志已观察到小程序运行态启动迹象')
  }

  if (report.devtools.logSignals.openCommandSeen) {
    passedItems.push('DevTools 日志已确认收到 `OPEN` 指令')
  }

  if (report.devtools.logSignals.autoCommandSeen) {
    passedItems.push('DevTools 日志已确认收到 `AUTO` 指令')
  } else {
    failedItems.push('DevTools 日志未确认收到 `AUTO` 指令')
  }

  if (report.autoPortListening) {
    passedItems.push(`automation 端口 \`${report.devtools.autoPort}\` 已监听`)
  } else {
    failedItems.push(`automation 端口 \`${report.devtools.autoPort}\` 未监听`)
  }

  if (report.autoPortWarmup?.ok) {
    passedItems.push(`automation 端口预热成功，等待 \`${report.autoPortWarmup.waitedMs}ms\` 后连通`)
  } else if (report.autoPortWarmup) {
    failedItems.push(`automation 端口在 \`${report.autoPortWarmup.waitedMs}ms\` 内仍未连通`)
  }

  if (report.automationRecovery?.ok) {
    passedItems.push(`固定 automation 端口未起时，脚本已自动切换到恢复端口 \`${report.automationRecovery.port}\``)
  } else if (report.automationRecovery?.attempted) {
    failedItems.push(`automation 恢复端口也未拉起：\`${report.automationRecovery.error || 'unknown'}\``)
  }

  if (report.autoSmokeFallback?.ok) {
    passedItems.push('已通过 automator 执行唯一允许的 console fallback，并拿到真实 runtime/batch 结果')
  } else if (report.autoSmokeFallback?.attempted) {
    failedItems.push('console fallback 已尝试，但未成功返回结果')
  }

  const fallbackBatchOk = Boolean(report.autoSmokeResult?.batch?.ok)

  if (report.devtools.logSignals.loginRequiredBlocking && !fallbackBatchOk && !report.autoSmokeFallback?.ok) {
    blockers.push('微信开发者工具当前登录态阻塞自动化，日志命中 `access_token missing / 需要重新登录 / getNewTicket empty ticket`，且尚未观察到运行态启动迹象。')
  } else if (report.devtools.logSignals.loginRequiredRaw) {
    blockers.push('日志出现过登录票据噪音，但当前已观察到启动迹象；本轮不再直接按“未登录”判死。')
  }

  if (report.blocker === 'devtools_automation_timeout') {
    blockers.push('CLI `auto` 已发起，但在超时时间内未形成可复用 automation 端口。')
  }

  if (!report.devtools.logSignals.autoSmokeResultSeen) {
    blockers.push(
      report.autoSmokeFallback?.ok
        ? 'DevTools 日志仍未直接吐出 `AUTO_SMOKE_RESULT::`，但 automator fallback 已拿到等价结构化结果。'
        : '尚未在日志中观察到 `AUTO_SMOKE_RESULT::`，真实技术验收结果仍未产出。',
    )
  }

  return `# 小程序技术验收摘要（R58）

## 环境事实

- DevTools 固定端口：\`${report.devtools.port}\`
- DevTools 请求端口：\`${report.devtools.requestedPort || 'auto'}\`
- DevTools 端口来源：\`${report.devtools.portSource}\`
- automation 目标端口：\`${report.devtools.autoPort}\`
- automation 实际端口：\`${report.devtools.effectiveAutoPort}\`
- DevTools 服务端口：\`${report.devtools.servicePortEnabled ? 'on' : 'off'}\`
- DevTools 登录态：\`${
    report.blocker === 'devtools_login_required'
      ? '需要重新登录'
      : report.devtools.logSignals.loginRequiredRaw
        ? '日志有噪音，但本轮未阻塞'
        : '已登录/未见阻塞'
  }\`
- 登录噪音：\`${report.devtools.logSignals.loginRequiredRaw ? 'seen' : 'none'}\`
- 启动迹象：\`${report.devtools.logSignals.simulatorLaunchSeen || report.devtools.logSignals.appServiceMainframeSeen ? 'seen' : 'none'}\`
- automation 预热：\`${report.autoPortWarmup?.ok ? `ready_after_${report.autoPortWarmup.waitedMs}ms` : 'failed'}\`
- automation 恢复：\`${report.automationRecovery?.ok ? `recovered_on_${report.automationRecovery.port}` : report.automationRecovery?.attempted ? 'failed' : 'skipped'}\`
- fallback 结果：\`${report.autoSmokeFallback?.ok ? 'success' : report.autoSmokeFallback?.attempted ? 'failed' : 'skipped'}\`
- AppID：\`wxa6f615dcab1f984f\`
- CloudBase 环境：\`cloud1-4grxqg018586792d\`
- 一键验收时间：\`${report.generatedAt}\`

## 通过项

${passedItems.length > 0 ? passedItems.map((item) => `- ${item}`).join('\n') : '- 暂无'}

## 失败项

${failedItems.length > 0 ? failedItems.map((item) => `- ${item}`).join('\n') : '- 暂无'}

## 阻塞项

${blockers.length > 0 ? blockers.map((item) => `- ${item}`).join('\n') : '- 暂无'}
`
}

async function main() {
  ensureDir(runtimeRoot)
  ensureDir(logsRoot)

  const buildGate = runCommand(
    nodeBin,
    [path.join(repoRoot, 'scripts/build-miniprogram-js.mjs')],
    {
      timeoutMs: 30000,
    },
  )
  const readinessGate = runCommand(
    nodeBin,
    [path.join(repoRoot, 'scripts/check-devtools-readiness.mjs')],
    {
      timeoutMs: 30000,
    },
  )
  const cliGate = runCommand(
    nodeBin,
    [path.join(repoRoot, 'scripts/check-wechat-devtools-cli.mjs')],
    {
      timeoutMs: 20000,
      env:
        requestedDevtoolsPort > 0
          ? {
              ...process.env,
              WECHAT_DEVTOOLS_PORT: `${requestedDevtoolsPort}`,
            }
          : process.env,
    },
  )
  const buildGateJson = safeJsonParse(buildGate.stdout.trim())
  const readinessGateJson = safeJsonParse(readinessGate.stdout.trim())
  const cliGateJson = safeJsonParse(cliGate.stdout.trim())
  const devtoolsPort = Number(
    cliGateJson?.port ||
      initialPortResolution.port ||
      requestedDevtoolsPort ||
      DEFAULT_WECHAT_DEVTOOLS_PORT,
  )
  const devtoolsPortSource =
    cliGateJson?.portSource ||
    (requestedDevtoolsPort > 0 ? 'explicit' : initialPortResolution.source || 'default')
  const precheck = {
    ok: buildGate.ok && readinessGate.ok && cliGate.ok,
    gates: {
      build: {
        ok: buildGate.ok,
        parsed: buildGateJson,
        stdoutTail: clipText(buildGate.stdout),
        stderrTail: clipText(buildGate.stderr),
      },
      readiness: {
        ok: readinessGate.ok,
        parsed: readinessGateJson,
        stdoutTail: clipText(readinessGate.stdout),
        stderrTail: clipText(readinessGate.stderr),
      },
      cli: {
        ok: cliGate.ok,
        parsed: cliGateJson,
        stdoutTail: clipText(cliGate.stdout),
        stderrTail: clipText(cliGate.stderr),
      },
    },
  }

  const initialAutoPortState = await waitForAutomationPort(autoPort, {
    timeoutMs: 1000,
    pollMs: 250,
  })
  const cliCommandEnv = {
    ...process.env,
    PATH: `${path.dirname(nodeBin)}:${process.env.PATH || ''}`,
  }
  const cliOpen = initialAutoPortState.ok
    ? buildSkippedCommandResult(`automation port ${autoPort} already ready`)
    : runCommand(
        cliPath,
        ['open', '--project', miniprogramRoot, '--port', `${devtoolsPort}`, '--lang', 'zh'],
        {
          timeoutMs: 15000,
          env: cliCommandEnv,
        },
      )
  fs.writeFileSync(cliOpenLogPath, stringifyCommandResult(cliOpen), 'utf8')

  const cliAuto = initialAutoPortState.ok
    ? buildSkippedCommandResult(`automation port ${autoPort} already ready`)
    : runCommand(
        cliPath,
        ['auto', '--debug', '--project', miniprogramRoot, '--port', `${devtoolsPort}`, '--auto-port', `${autoPort}`, '--trust-project', '--lang', 'zh'],
        {
          timeoutMs: 20000,
          env: cliCommandEnv,
        },
      )
  fs.writeFileSync(cliAutoLogPath, stringifyCommandResult(cliAuto), 'utf8')

  const autoPortWarmup = initialAutoPortState.ok
    ? initialAutoPortState
    : await waitForAutomationPort(autoPort, {
        timeoutMs: 15000,
        pollMs: 500,
      })
  let autoPortListening = autoPortWarmup.ok
  let effectiveAutoPort = autoPort
  const devtoolsLogInspection = inspectWeChatDevtoolsLogs({
    lookbackLines: 800,
  })
  let autoSmokeResult = null
  let autoSmokeFallback = {
    attempted: false,
    ok: false,
    error: '',
  }
  let automationRecovery = {
    attempted: false,
    ok: false,
    port: null,
    error: '',
  }
  let recoveryMiniProgram = null

  if (!autoPortListening) {
    automationRecovery.attempted = true

    try {
      const recovery = await launchMiniProgramWithFreshAutoPort({
        cliPath,
        projectPath: miniprogramRoot,
        cwd: repoRoot,
        trustProject: true,
        preferredPort: recoveryAutoPort,
      })

      recoveryMiniProgram = recovery.miniProgram
      effectiveAutoPort = recovery.autoPort
      autoPortListening = true
      automationRecovery.ok = true
      automationRecovery.port = recovery.autoPort
    } catch (error) {
      automationRecovery.error = error instanceof Error ? error.message : 'automation_recovery_failed'
    }
  }

  if (autoPortListening && !devtoolsLogInspection.signals.autoSmokeResultSeen) {
    autoSmokeFallback.attempted = true

    try {
      const miniProgram = recoveryMiniProgram || await connectMiniProgram(effectiveAutoPort)

      try {
        const ready = await waitForMiniProgramReady(miniProgram, {
          timeoutMs: 15000,
          pollMs: 500,
        })

        if (!ready.ok) {
          throw new Error(ready.error || 'mini_program_not_ready')
        }

        autoSmokeResult = await runConsoleFallback(miniProgram)
      } finally {
        miniProgram.disconnect()
      }

      fs.writeFileSync(fallbackResultPath, JSON.stringify(autoSmokeResult, null, 2), 'utf8')
      autoSmokeFallback.ok = true
    } catch (error) {
      autoSmokeFallback.error = error instanceof Error ? error.message : 'fallback_failed'
    }
  }

  const report = {
    round: 'R58',
    ok: false,
    generatedAt: new Date().toISOString(),
    blocker: 'none',
    nextAction: '',
    precheck: {
      ok: precheck.ok,
      gates: precheck.gates,
    },
    devtools: {
      requestedPort: requestedDevtoolsPort || null,
      port: devtoolsPort,
      portSource: devtoolsPortSource,
      autoPort,
      effectiveAutoPort,
      servicePortEnabled:
        Boolean(cliGateJson?.servicePortEnabled) ||
        /HTTP 服务地址 http:\/\/127\.0\.0\.1:\d+/i.test(`${cliOpen.stderr || ''}\n${cliOpen.stdout || ''}`),
      latestLogFile: devtoolsLogInspection.latestLogFile,
      logSignals: devtoolsLogInspection.signals,
    },
    cliOpen: {
      ok: cliOpen.ok,
      exitCode: cliOpen.exitCode,
      timedOut: cliOpen.timedOut,
      stdoutTail: clipText(cliOpen.stdout),
      stderrTail: clipText(cliOpen.stderr),
      error: cliOpen.error,
    },
    cliAuto: {
      ok: cliAuto.ok,
      exitCode: cliAuto.exitCode,
      timedOut: cliAuto.timedOut,
      stdoutTail: clipText(cliAuto.stdout),
      stderrTail: clipText(cliAuto.stderr),
      error: cliAuto.error,
    },
    autoPortListening,
    autoPortWarmup,
    automationRecovery,
    autoSmokeFallback,
    autoSmokeResult,
  }

  report.blocker = resolveBlocker({
    precheck,
    cliAuto,
    autoPortListening,
    devtoolsSignals: devtoolsLogInspection.signals,
    fallbackError: autoSmokeFallback.error,
    autoSmokeResult,
  })
  report.nextAction = resolveNextAction(report.blocker)
  report.ok = report.blocker === 'none'

  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8')
  fs.writeFileSync(summaryPath, buildSummaryMarkdown(report), 'utf8')

  console.log(JSON.stringify(report, null, 2))
  return report.ok
}

try {
  const ok = await main()
  process.exit(ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : `${error}`)
  process.exit(1)
}
