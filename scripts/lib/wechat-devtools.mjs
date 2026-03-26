import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DEVTOOLS_BASE_DIR = path.join(os.homedir(), 'Library', 'Application Support', '微信开发者工具')
export const DEFAULT_WECHAT_DEVTOOLS_PORT = 9420

const CLI_SERVER_PORT_PATTERNS = [
  /start cli server,\s*local port\s*(\d+)/i,
  /cli server started at 127\.0\.0\.1:(\d+)/i,
]

const CLI_PORT_MISMATCH_PATTERNS = [
  /IDE server has started on http:\/\/127\.0\.0\.1:(\d+) and must be restarted on port \d+ first/i,
  /IDE 已启动并在监听 http:\/\/127\.0\.0\.1:(\d+)[，,]\s*需要重启才能使用端口 \d+/i,
]

function safeReadDir(targetPath) {
  try {
    return fs.readdirSync(targetPath, { withFileTypes: true })
  } catch (error) {
    return []
  }
}

function readTailLines(targetPath, maxLines = 400) {
  try {
    const content = fs.readFileSync(targetPath, 'utf8')
    const lines = content.split('\n')
    return lines.slice(Math.max(0, lines.length - maxLines)).join('\n')
  } catch (error) {
    return ''
  }
}

function getLogFilenameOrderKey(filename) {
  const matched = filename.match(
    /^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{3})-/,
  )

  if (!matched) {
    return ''
  }

  return matched.slice(1).join('')
}

export function findLatestWeChatDevtoolsLogFile() {
  const userDirs = safeReadDir(DEVTOOLS_BASE_DIR)
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(DEVTOOLS_BASE_DIR, entry.name, 'WeappLog', 'logs'))
    .filter((logDir) => fs.existsSync(logDir))

  let latestFile = ''
  let latestMtimeMs = 0
  let latestOrderKey = ''

  for (const logDir of userDirs) {
    for (const entry of safeReadDir(logDir)) {
      if (!entry.isFile() || !entry.name.endsWith('.log')) {
        continue
      }

      const absolutePath = path.join(logDir, entry.name)

      try {
        const stats = fs.statSync(absolutePath)
        const orderKey = getLogFilenameOrderKey(entry.name)

        if (
          (orderKey && orderKey > latestOrderKey) ||
          (orderKey === latestOrderKey && stats.mtimeMs > latestMtimeMs) ||
          (!latestOrderKey && !orderKey && stats.mtimeMs > latestMtimeMs)
        ) {
          latestMtimeMs = stats.mtimeMs
          latestFile = absolutePath
          latestOrderKey = orderKey
        }
      } catch (error) {
        continue
      }
    }
  }

  return {
    latestFile,
    latestMtimeMs,
  }
}

function collectInterestingLines(logText) {
  const interestingPatterns = [
    /access_token missing/i,
    /需要重新登录/i,
    /getNewTicket empty ticket/i,
    /cli upgrade/i,
    /start cli server,\s*local port\s*\d+/i,
    /cli server started at 127\.0\.0\.1:\d+/i,
    /simulator launch success/i,
    /appservice\/mainframe/i,
    /type:\s*'AUTO'/i,
    /type:\s*'OPEN'/i,
    /AUTO_SMOKE_RESULT::/i,
    /no cli client started/i,
  ]

  return logText
    .split('\n')
    .filter((line) => interestingPatterns.some((pattern) => pattern.test(line)))
    .slice(-20)
}

function firstMatchedPort(text, patterns) {
  if (!text) {
    return null
  }

  for (const pattern of patterns) {
    const matched = text.match(pattern)

    if (!matched) {
      continue
    }

    const port = Number(matched[1])

    if (Number.isInteger(port) && port > 0) {
      return port
    }
  }

  return null
}

export function detectWeChatDevtoolsPortFromText(text) {
  return firstMatchedPort(text, [...CLI_PORT_MISMATCH_PATTERNS, ...CLI_SERVER_PORT_PATTERNS])
}

export function resolveWeChatDevtoolsPort(options = {}) {
  const explicitPort = Number(options.explicitPort || 0)

  if (Number.isInteger(explicitPort) && explicitPort > 0) {
    return {
      port: explicitPort,
      source: 'explicit',
    }
  }

  const logInspection = inspectWeChatDevtoolsLogs({
    lookbackLines: Number(options.lookbackLines || 800),
  })
  const portFromLog = detectWeChatDevtoolsPortFromText(logInspection.logText)

  if (portFromLog) {
    return {
      port: portFromLog,
      source: 'latest_log',
      latestLogFile: logInspection.latestLogFile,
    }
  }

  return {
    port: DEFAULT_WECHAT_DEVTOOLS_PORT,
    source: 'default',
    latestLogFile: logInspection.latestLogFile,
  }
}

export function inspectWeChatDevtoolsLogs(options = {}) {
  const lookbackLines = Number(options.lookbackLines || 400)
  const latest = findLatestWeChatDevtoolsLogFile()
  const logText = latest.latestFile ? readTailLines(latest.latestFile, lookbackLines) : ''
  const activeCliPort = detectWeChatDevtoolsPortFromText(logText)
  const simulatorLaunchSeen = /simulator launch success/i.test(logText)
  const appServiceMainframeSeen = /appservice\/mainframe/i.test(logText)
  const rawLoginRequired = /(access_token missing|需要重新登录|getNewTicket empty ticket)/i.test(logText)

  const signals = {
    loginRequiredRaw: rawLoginRequired,
    loginRequired: rawLoginRequired,
    loginRequiredBlocking: rawLoginRequired && !simulatorLaunchSeen && !appServiceMainframeSeen,
    cliUpgradeSeen: /cli upgrade/i.test(logText),
    autoCommandSeen: /type:\s*'AUTO'/i.test(logText),
    openCommandSeen: /type:\s*'OPEN'/i.test(logText),
    autoSmokeResultSeen: /AUTO_SMOKE_RESULT::/i.test(logText),
    noCliClientSeen: /no cli client started/i.test(logText),
    simulatorLaunchSeen,
    appServiceMainframeSeen,
    activeCliPort,
    interestingLines: collectInterestingLines(logText),
  }

  return {
    latestLogFile: latest.latestFile,
    latestMtimeMs: latest.latestMtimeMs,
    logText,
    signals,
  }
}
