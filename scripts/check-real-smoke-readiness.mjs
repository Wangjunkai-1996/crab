#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const KNOWN_FACTS = {
  round: 'R58',
  miniProgramAppId: 'wxa6f615dcab1f984f',
  miniProgramName: '多米通告',
  miniProgramSubjectType: '个人',
  devCloudEnvId: 'cloud1-4grxqg018586792d',
  adminWebBaseUrl: 'https://cloud1-4grxqg018586792d-1412048057.tcloudbaseapp.com/',
  adminRealReadsRound: 'r52',
  realMiniSmokeDependsOnWxContext: true,
}

const REQUIRED_SAMPLE_FILES = [
  'scripts/api-samples/cloudfunctions.available.json',
  'scripts/api-samples/user-bff.bootstrap.request.json',
  'scripts/api-samples/user-bff.bootstrap.response.json',
  'scripts/api-samples/publisher-bff.getProfile.request.json',
  'scripts/api-samples/publisher-bff.getProfile.response.json',
  'scripts/api-samples/publisher-bff.upsertProfile.request.json',
  'scripts/api-samples/publisher-bff.upsertProfile.response.json',
  'scripts/api-samples/creator-bff.getCard.request.json',
  'scripts/api-samples/creator-bff.getCard.response.json',
  'scripts/api-samples/creator-bff.upsertCard.request.json',
  'scripts/api-samples/creator-bff.upsertCard.response.json',
  'scripts/api-samples/application-bff.submit.request.json',
  'scripts/api-samples/application-bff.submit.response.json',
  'scripts/api-samples/application-bff.withdraw.request.json',
  'scripts/api-samples/application-bff.withdraw.response.json',
  'scripts/check-miniprogram-dev-smoke-sample.mjs',
  'scripts/coordination/miniprogram-cloudbase-integration.md',
  'scripts/coordination/r08-real-smoke-template.md',
]

const REQUIRED_READY_FILES = [
  path.join(repoRoot, 'docs/engineering/MiniProgram-Technical-Acceptance-Runbook-R58.md'),
  path.join(repoRoot, 'miniprogram/evidence/r58/summary.md'),
  path.join(repoRoot, 'scripts/check-wechat-devtools-cli.mjs'),
  path.join(repoRoot, 'scripts/check-miniprogram-tech-acceptance.mjs'),
]

const ADMIN_SMOKE_EVIDENCE_FILE = path.join(
  repoRoot,
  'admin-web/evidence/r52/real-admin-reads/summary.md',
)

function getEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function pathExists(targetPath) {
  return fs.existsSync(targetPath)
}

function readText(targetPath) {
  try {
    return fs.readFileSync(targetPath, 'utf8')
  } catch (error) {
    return ''
  }
}

function readJson(targetPath) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'))
  } catch (error) {
    return null
  }
}

function readConstFromTs(targetPath, constName) {
  const text = readText(targetPath)
  const match = text.match(new RegExp(`export const ${constName} = ['"]([^'"]+)['"]`))
  return match?.[1] || ''
}

function detectPlaceholderCredential(value, type) {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (!normalized) {
    return 'missing'
  }

  const lower = normalized.toLowerCase()
  const genericPlaceholders = [
    '<secret-id>',
    '<secret-key>',
    'your-secret-id',
    'your-secret-key',
    'placeholder',
    'pending',
    'todo',
    'changeme',
  ]

  if (genericPlaceholders.some((item) => lower.includes(item))) {
    return 'placeholder'
  }

  if (type === 'secretId' && lower.includes('secretid')) {
    return 'placeholder'
  }

  if (type === 'secretKey' && lower.includes('secretkey')) {
    return 'placeholder'
  }

  return 'provided'
}

function walkFiles(targetDir) {
  if (!pathExists(targetDir)) {
    return []
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath))
      continue
    }

    files.push(absolutePath)
  }

  return files
}

function collectRealEvidence(targetDir) {
  return walkFiles(targetDir).filter((filePath) => {
    const baseName = path.basename(filePath)
    return !['README.md', '.gitkeep'].includes(baseName)
  })
}

function toRelative(targetPath) {
  if (targetPath.startsWith(`${repoRoot}${path.sep}`)) {
    return path.relative(repoRoot, targetPath)
  }

  return targetPath
}

function summarizeEvidence(relativeBaseDir, files) {
  if (files.length === 0) {
    return '尚无真实证据'
  }

  return `${files.length} 个文件（如 ${path.join(relativeBaseDir, path.basename(files[0]))}）`
}

function buildReadiness() {
  const secretId = getEnv('TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID')
  const secretKey = getEnv('TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY')
  const secretIdStatus = detectPlaceholderCredential(secretId, 'secretId')
  const secretKeyStatus = detectPlaceholderCredential(secretKey, 'secretKey')
  const currentSessionTencentCredentialStatus = secretIdStatus === 'missing' || secretKeyStatus === 'missing'
    ? 'missing'
    : (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder' ? 'placeholder' : 'provided')

  const projectConfigPath = path.join(repoRoot, 'miniprogram/project.config.json')
  const uiConstPath = path.join(repoRoot, 'miniprogram/constants/ui.ts')
  const appTsPath = path.join(repoRoot, 'miniprogram/app.ts')
  const projectConfig = readJson(projectConfigPath) || {}
  const defaultCloudEnvId = readConstFromTs(uiConstPath, 'DEFAULT_CLOUD_ENV_ID')
  const defaultApiMode = readConstFromTs(uiConstPath, 'DEFAULT_API_MODE')
  const appTsText = readText(appTsPath)
  const runtimeHelperReady =
    appTsText.includes('runtimeDebug') &&
    appTsText.includes('resolveAutoSmokeLaunchOptions') &&
    appTsText.includes('runAutoSmokeIfNeeded')

  const requiredReadyFilesMissing = REQUIRED_READY_FILES.filter((filePath) => !pathExists(filePath))
  const missingSamples = REQUIRED_SAMPLE_FILES.filter((relativePath) => !pathExists(path.join(repoRoot, relativePath)))

  const runtimeEvidenceFiles = collectRealEvidence(path.join(repoRoot, 'miniprogram/evidence/r58/runtime'))
  const smokeEvidenceFiles = collectRealEvidence(path.join(repoRoot, 'miniprogram/evidence/r58/smoke'))
  const logEvidenceFiles = collectRealEvidence(path.join(repoRoot, 'miniprogram/evidence/r58/logs'))

  const readyFacts = [
    {
      key: 'project_config_appid',
      ok: projectConfig.appid === KNOWN_FACTS.miniProgramAppId,
      detail: `project.config.json=${projectConfig.appid || 'missing'}`,
    },
    {
      key: 'default_cloud_env',
      ok: defaultCloudEnvId === KNOWN_FACTS.devCloudEnvId,
      detail: defaultCloudEnvId || 'missing',
    },
    {
      key: 'default_api_mode',
      ok: defaultApiMode === 'mock',
      detail: defaultApiMode || 'missing',
    },
    {
      key: 'runtime_debug_helper',
      ok: runtimeHelperReady,
      detail: runtimeHelperReady
        ? 'App.globalData.runtimeDebug + devSmoke + auto-smoke launch query 已就绪'
        : '未发现 R58 auto-smoke 入口',
    },
    {
      key: 'r58_guides_and_templates',
      ok: requiredReadyFilesMissing.length === 0,
      detail: requiredReadyFilesMissing.length === 0
        ? 'R58 runbook、证据模板与 CLI gate 脚本均已落仓'
        : `缺少 ${requiredReadyFilesMissing.length} 个 readiness 文件`,
    },
    {
      key: 'mini_samples_and_support_docs',
      ok: missingSamples.length === 0,
      detail: missingSamples.length === 0
        ? `已就绪 ${REQUIRED_SAMPLE_FILES.length} 个样例/支援文档`
        : `缺少 ${missingSamples.length} 个样例/支援文档`,
    },
    {
      key: 'admin_web_base_url',
      ok: true,
      detail: KNOWN_FACTS.adminWebBaseUrl,
    },
    {
      key: 'admin_smoke_baseline',
      ok: true,
      detail: pathExists(ADMIN_SMOKE_EVIDENCE_FILE)
        ? `已存在 ${toRelative(ADMIN_SMOKE_EVIDENCE_FILE)}`
        : '当前仓库未携带后台 R52 证据；R58 小程序技术验收不以此作为前置 gate',
    },
    {
      key: 'current_session_tencent_credentials',
      ok: currentSessionTencentCredentialStatus === 'provided',
      detail: currentSessionTencentCredentialStatus === 'provided'
        ? '当前会话已注入真实腾讯云密钥'
        : (currentSessionTencentCredentialStatus === 'placeholder'
          ? '当前会话检测到占位值密钥；若要跑 CloudBase 脚本需重新注入真实值'
          : '当前会话未注入腾讯云密钥；若要跑 CloudBase 脚本需重新注入'),
    },
  ]

  const manualGateReady = readyFacts
    .filter((item) => !['current_session_tencent_credentials', 'admin_smoke_baseline'].includes(item.key))
    .every((item) => item.ok)

  const pendingItems = [
    {
      key: 'real_cloud_runtime_evidence',
      ok: runtimeEvidenceFiles.length > 0,
      detail: summarizeEvidence('miniprogram/evidence/r58/runtime', runtimeEvidenceFiles),
    },
    {
      key: 'first_batch_real_smoke',
      ok: smokeEvidenceFiles.length > 0,
      detail: summarizeEvidence('miniprogram/evidence/r58/smoke', smokeEvidenceFiles),
    },
    {
      key: 'request_logs_exported',
      ok: logEvidenceFiles.length > 0,
      detail: summarizeEvidence('miniprogram/evidence/r58/logs', logEvidenceFiles),
    },
    {
      key: 'launch_execution_started',
      ok: false,
      detail: '执行版倒排清单已落仓，但 owner 逐项执行尚未进入完成态',
    },
  ]

  const blockers = []

  if (!manualGateReady) {
    blockers.push('readiness 文档、工程配置或 helper 尚未齐备；需先补齐再进入明早人工关口')
  }

  if (runtimeEvidenceFiles.length === 0) {
    blockers.push('小程序真实 cloud 运行态证据尚未产生；需在 DevTools 以 R58 auto-smoke 或一次性 console fallback 执行')
  }

  if (smokeEvidenceFiles.length === 0) {
    blockers.push('首轮真实 smoke 尚未开始；必须产出 R58 tagged result bundle，且 batch 7 步从 bootstrap 开始')
  }

  const nextActions = [
    '先运行 node /Users/gy-vip/Desktop/KK_Crab/scripts/check-miniprogram-tech-acceptance.mjs',
    '微信开发者工具打开服务端口后，重跑 node /Users/gy-vip/Desktop/KK_Crab/scripts/check-wechat-devtools-cli.mjs',
    '使用 compile query __dev_auto_smoke=1&__dev_runtime=cloud 启动小程序，等待 AUTO_SMOKE_RESULT:: tagged 输出',
    '若 DevTools 无法稳定驱动，再降级为一次性 console fallback，但仍只接受一份结构化结果 bundle',
  ]

  const warnings = [
    KNOWN_FACTS.realMiniSmokeDependsOnWxContext
      ? '当前小程序真实 smoke 依赖微信开发者工具/真机提供的 wxContext.OPENID；今晚不做脚本伪造 OPENID'
      : '',
  ].filter(Boolean)

  return {
    round: KNOWN_FACTS.round,
    knownFacts: KNOWN_FACTS,
    readyFacts,
    pendingItems,
    blockers,
    warnings,
    manualGateReady,
    nextActions,
  }
}

const result = buildReadiness()

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.manualGateReady ? 0 : 2)
}

console.log(`# Real Smoke Readiness (${result.round})`)
console.log('')
console.log(`- 小程序名称：${result.knownFacts.miniProgramName}`)
console.log(`- 小程序 AppID：${result.knownFacts.miniProgramAppId}`)
console.log(`- 主体类型：${result.knownFacts.miniProgramSubjectType}`)
console.log(`- 当前 dev Cloud 环境：${result.knownFacts.devCloudEnvId}`)
console.log(`- 当前后台地址：${result.knownFacts.adminWebBaseUrl}`)
console.log(`- 明早人工关口 ready：${result.manualGateReady ? 'yes' : 'no'}`)
console.log('')
console.log('## 已具备')
for (const item of result.readyFacts) {
  console.log(`- [${item.ok ? 'x' : ' '}] ${item.key}: ${item.detail}`)
}
console.log('')
console.log('## 未完成')
for (const item of result.pendingItems) {
  console.log(`- [${item.ok ? 'x' : ' '}] ${item.key}: ${item.detail}`)
}
console.log('')
console.log('## 阻塞 / 人工关口')
if (result.blockers.length === 0) {
  console.log('- 无')
} else {
  for (const item of result.blockers) {
    console.log(`- ${item}`)
  }
}
console.log('')
console.log('## 注意事项')
if (result.warnings.length === 0) {
  console.log('- 无')
} else {
  for (const item of result.warnings) {
    console.log(`- ${item}`)
  }
}
console.log('')
console.log('## 下一步')
for (const item of result.nextActions) {
  console.log(`- ${item}`)
}
