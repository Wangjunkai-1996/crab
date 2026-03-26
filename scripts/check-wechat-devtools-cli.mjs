#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_WECHAT_DEVTOOLS_PORT,
  detectWeChatDevtoolsPortFromText,
  inspectWeChatDevtoolsLogs,
  resolveWeChatDevtoolsPort,
} from './lib/wechat-devtools.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(repoRoot, 'miniprogram')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const requestedPort = Number(process.env.WECHAT_DEVTOOLS_PORT || 0)
const resolvedPort = resolveWeChatDevtoolsPort({
  explicitPort: requestedPort,
  lookbackLines: 800,
})

function runCli(args, port) {
  return spawnSync(cliPath, [...args, '--port', `${port}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: 'n\n',
    timeout: 10000,
  })
}

function parseOutput(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`.trim()
}

function runCliWithPortRetry(args, initialPort) {
  const firstResult = runCli(args, initialPort)
  const firstOutput = parseOutput(firstResult)
  const mismatchedPort = detectWeChatDevtoolsPortFromText(firstOutput)

  if (
    Number.isInteger(mismatchedPort) &&
    mismatchedPort > 0 &&
    mismatchedPort !== initialPort
  ) {
    const retryResult = runCli(args, mismatchedPort)

    return {
      result: retryResult,
      effectivePort: mismatchedPort,
      retried: true,
      requestedPort: initialPort,
      detectedPort: mismatchedPort,
      firstOutput,
    }
  }

  return {
    result: firstResult,
    effectivePort: initialPort,
    retried: false,
    requestedPort: initialPort,
    detectedPort: mismatchedPort,
    firstOutput,
  }
}

const cliExists = fs.existsSync(cliPath)
const defaultPort = resolvedPort.port || DEFAULT_WECHAT_DEVTOOLS_PORT
const result = {
  ok: false,
  cliPath,
  cliExists,
  port: defaultPort,
  requestedPort: requestedPort || null,
  portSource: resolvedPort.source,
  projectPath: miniprogramRoot,
  servicePortEnabled: false,
  ideConnected: false,
  detail: '',
  nextAction: '',
  openCommand: `${cliPath} open --project ${miniprogramRoot} --port ${defaultPort}`,
}

if (!cliExists) {
  result.detail = '未发现微信开发者工具 CLI'
  result.nextAction = '请先安装微信开发者工具'
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = 1
} else {
  const cliRun = runCliWithPortRetry(['islogin'], defaultPort)
  const islogin = cliRun.result
  const output = parseOutput(islogin)
  const servicePortDisabled = /service port disabled|服务端口已关闭/i.test(output)
  const logInspection = inspectWeChatDevtoolsLogs({
    lookbackLines: 800,
  })
  const cliLoginConfirmed = islogin.status === 0 && !/"login"\s*:\s*false/i.test(output)
  const loginRequired = Boolean(logInspection.signals.loginRequiredBlocking) && !cliLoginConfirmed

  result.port = cliRun.effectivePort
  result.portSource = cliRun.retried
    ? 'cli_retry'
    : requestedPort > 0
      ? 'explicit'
      : resolvedPort.source
  result.servicePortEnabled = !servicePortDisabled
  result.ideConnected = islogin.status === 0
  result.ok = islogin.status === 0
  result.detail = output || `exit=${islogin.status}`
  result.loginRequired = loginRequired
  result.loginRequiredRaw = Boolean(logInspection.signals.loginRequiredRaw)
  result.detectedPortFromLog = logInspection.signals.activeCliPort || null
  result.retry = cliRun.retried
    ? {
        from: cliRun.requestedPort,
        to: cliRun.effectivePort,
        reason: 'cli_reported_active_port_mismatch',
        firstOutput: cliRun.firstOutput,
      }
    : null
  result.latestLogFile = logInspection.latestLogFile
  result.logSignals = {
    loginRequired: logInspection.signals.loginRequired,
    loginRequiredRaw: logInspection.signals.loginRequiredRaw,
    loginRequiredBlocking: logInspection.signals.loginRequiredBlocking,
    cliUpgradeSeen: logInspection.signals.cliUpgradeSeen,
    autoCommandSeen: logInspection.signals.autoCommandSeen,
    autoSmokeResultSeen: logInspection.signals.autoSmokeResultSeen,
    simulatorLaunchSeen: logInspection.signals.simulatorLaunchSeen,
    appServiceMainframeSeen: logInspection.signals.appServiceMainframeSeen,
    activeCliPort: logInspection.signals.activeCliPort,
  }
  result.nextAction = servicePortDisabled
    ? '打开微信开发者工具 -> 设置 -> 安全设置 -> 开启服务端口，然后重跑本脚本'
    : loginRequired
      ? '请先在微信开发者工具右上角重新登录微信账号，然后重跑本脚本'
    : result.ok
      ? logInspection.signals.loginRequiredRaw
        ? 'CLI 已连通，日志里仍有旧登录噪音；以真实 open / auto 结果为准继续执行'
        : 'CLI 已连通，可继续执行 open / auto 相关命令'
      : '请先确认微信开发者工具已登录并打开服务端口'
  result.openCommand = `${cliPath} open --project ${miniprogramRoot} --port ${result.port}`

  console.log(JSON.stringify(result, null, 2))

  if (!result.ok) {
    process.exitCode = 1
  }
}
