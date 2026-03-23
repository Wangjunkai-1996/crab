#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function getEnvValue(keys, fallback = '') {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key]
    }
  }

  return fallback
}

function normalizeEnvString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function detectPlaceholderCredential(value, type) {
  const normalized = normalizeEnvString(value)

  if (!normalized) {
    return 'missing'
  }

  const lower = normalized.toLowerCase()
  const genericPlaceholders = [
    '<secret-id>',
    '<secret-key>',
    'your-secret-id',
    'your-secret-key',
    'example',
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

function buildManagerConfig(envId) {
  const secretId = getEnvValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], '')
  const secretKey = getEnvValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], '')
  const token = getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined)

  const secretIdStatus = detectPlaceholderCredential(secretId, 'secretId')
  const secretKeyStatus = detectPlaceholderCredential(secretKey, 'secretKey')

  if (secretIdStatus === 'missing' || secretKeyStatus === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running')
  }

  return {
    secretId,
    secretKey,
    token,
    envId,
  }
}

async function loadManagerNode() {
  const mod = await import(path.join(__dirname, 'node_modules', '@cloudbase', 'manager-node', 'lib', 'index.js'))
  return mod.default ?? mod
}

function parseInvokeResult(result) {
  const retMsg = typeof result.RetMsg === 'string' ? result.RetMsg : '{}'
  let parsed = {}

  try {
    parsed = JSON.parse(retMsg)
  } catch {
    parsed = {
      code: -1,
      message: 'retMsg_parse_failed',
      rawRetMsg: retMsg,
    }
  }

  return {
    cloudRequestId: result.RequestId || '',
    functionRequestId: result.FunctionRequestId || '',
    invokeResult: result.InvokeResult || 0,
    payload: parsed,
  }
}

function summarizeData(data) {
  if (!data || typeof data !== 'object') {
    return {
      kind: typeof data,
    }
  }

  const record = data

  if (Array.isArray(record.list)) {
    return {
      kind: 'list',
      listCount: record.list.length,
      hasMore: Boolean(record.hasMore),
      nextCursorLength: typeof record.nextCursor === 'string' ? record.nextCursor.length : 0,
      firstItemKeys: record.list[0] && typeof record.list[0] === 'object' ? Object.keys(record.list[0]) : [],
      firstItemId:
        record.list[0]?.reviewTaskId ||
        record.list[0]?.reportId ||
        record.list[0]?.restrictionId ||
        record.list[0]?.logId ||
        null,
    }
  }

  return {
    kind: 'object',
    keys: Object.keys(record),
  }
}

function buildSkippedStep(step, reason, extras = {}) {
  return {
    step,
    skipped: true,
    skipReason: reason,
    code: 0,
    message: 'skipped',
    requestId: '',
    cloudRequestId: '',
    functionRequestId: '',
    dataSummary: {
      kind: 'skipped',
      reason,
      ...extras,
    },
  }
}

function redactSensitive(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitive)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const output = {}

  for (const [key, item] of Object.entries(value)) {
    if (key === 'adminSessionToken') {
      output[key] = '[REDACTED]'
      continue
    }

    output[key] = redactSensitive(item)
  }

  return output
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

async function invokeJson(manager, functionName, request) {
  const result = await manager.functions.invokeFunction(functionName, request)
  return parseInvokeResult(result)
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const username = getArg('--username') ?? getEnvValue(['ADMIN_SMOKE_USERNAME', 'ADMIN_REAL_STANDARD_USERNAME'], 'domi_admin')
const password = getArg('--password') ?? getEnvValue(['ADMIN_SMOKE_PASSWORD'], '')
const round = normalizeEnvString(getArg('--round') ?? getEnvValue(['ADMIN_SMOKE_ROUND'], 'r51')) || 'r51'
const minReviewTaskCount = parseNonNegativeInteger(
  getArg('--min-review-task-count') ?? getEnvValue(['ADMIN_SMOKE_MIN_REVIEW_TASK_COUNT'], '1'),
  1,
)
const minReportCount = parseNonNegativeInteger(
  getArg('--min-report-count') ?? getEnvValue(['ADMIN_SMOKE_MIN_REPORT_COUNT'], '3'),
  3,
)
const minAccountActionCount = parseNonNegativeInteger(
  getArg('--min-account-action-count') ?? getEnvValue(['ADMIN_SMOKE_MIN_ACCOUNT_ACTION_COUNT'], '3'),
  3,
)
const requiredOperationLogTargetTypes = (getArg('--required-log-target-types')
  ?? getEnvValue(['ADMIN_SMOKE_REQUIRED_LOG_TARGET_TYPES'], 'report,notice,account_action'))
  .split(',')
  .map((item) => normalizeEnvString(item))
  .filter(Boolean)
const outputPath =
  getArg('--output') ??
  path.join(__dirname, 'evidence', round, 'admin-real-reads-smoke.json')

if (!envId) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID' } }, null, 2))
  process.exit(1)
}

if (!username || !password) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing username/password; pass --username/--password or set ADMIN_SMOKE_USERNAME/ADMIN_SMOKE_PASSWORD' } }, null, 2))
  process.exit(1)
}

const CloudBase = await loadManagerNode()
const manager = new CloudBase(buildManagerConfig(envId))

const requestBaseMeta = {
  source: 'admin-web',
}

const summary = {
  ok: true,
  envId,
  round,
  username,
  executedAt: new Date().toISOString(),
  criteria: {
    minReviewTaskCount,
    minReportCount,
    minAccountActionCount,
    requiredOperationLogTargetTypes,
  },
  steps: [],
  detailCoverage: {
    reviewTaskDetail: {
      attempted: false,
      skipped: false,
      skipReason: null,
      reviewTaskId: null,
      code: null,
    },
    reportDetail: {
      attempted: false,
      skipped: false,
      skipReason: null,
      reportId: null,
      code: null,
    },
  },
  acceptance: {
    hasReviewTaskSample: false,
    hasReportSample: false,
    hasAccountActionSample: false,
    hasOperationLogTargetCoverage: false,
    reviewTaskDetailReadable: false,
    reportDetailReadable: false,
  },
}

const loginResult = await invokeJson(manager, 'admin-auth', {
  action: 'login',
  payload: {
    username,
    password,
  },
  meta: requestBaseMeta,
})

const loginPayload = loginResult.payload
const adminSessionToken = loginPayload?.data?.session?.adminSessionToken

summary.steps.push({
  step: 'admin-auth.login',
  code: loginPayload?.code ?? -1,
  message: loginPayload?.message ?? '',
  requestId: loginPayload?.requestId ?? '',
  cloudRequestId: loginResult.cloudRequestId,
  functionRequestId: loginResult.functionRequestId,
  dataSummary: summarizeData(loginPayload?.data ?? null),
})

if (loginPayload?.code !== 0 || !adminSessionToken) {
  summary.ok = false
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(redactSensitive(summary), null, 2))
  console.log(JSON.stringify(redactSensitive(summary), null, 2))
  process.exit(1)
}

const authMeta = {
  ...requestBaseMeta,
  adminSessionToken,
}

async function recordStep(functionName, action, payload) {
  const result = await invokeJson(manager, functionName, {
    action,
    payload,
    meta: authMeta,
  })

  const body = result.payload
  const stepSummary = {
    step: `${functionName}.${action}`,
    code: body?.code ?? -1,
    message: body?.message ?? '',
    requestId: body?.requestId ?? '',
    cloudRequestId: result.cloudRequestId,
    functionRequestId: result.functionRequestId,
    dataSummary: summarizeData(body?.data ?? null),
  }

  summary.steps.push(stepSummary)

  return body
}

const mePayload = await recordStep('admin-auth', 'me', {})
const dashboardPayload = await recordStep('governance-admin', 'dashboard', {})
const taskListPayload = await recordStep('review-admin', 'taskList', { pageSize: 10 })
const firstReviewTaskId = taskListPayload?.data?.list?.[0]?.reviewTaskId

if (firstReviewTaskId) {
  summary.detailCoverage.reviewTaskDetail.attempted = true
  summary.detailCoverage.reviewTaskDetail.reviewTaskId = firstReviewTaskId
  const taskDetailPayload = await recordStep('review-admin', 'taskDetail', { reviewTaskId: firstReviewTaskId })
  summary.detailCoverage.reviewTaskDetail.code = taskDetailPayload?.code ?? -1
} else {
  summary.detailCoverage.reviewTaskDetail.skipped = true
  summary.detailCoverage.reviewTaskDetail.skipReason = 'taskList_empty'
  summary.steps.push(buildSkippedStep(
    'review-admin.taskDetail',
    'taskList_empty',
    {
      sourceStep: 'review-admin.taskList',
      listCount: Array.isArray(taskListPayload?.data?.list) ? taskListPayload.data.list.length : 0,
    },
  ))
}

const reportListPayload = await recordStep('governance-admin', 'reportList', { pageSize: 10 })
const firstReportId = reportListPayload?.data?.list?.[0]?.reportId

if (firstReportId) {
  summary.detailCoverage.reportDetail.attempted = true
  summary.detailCoverage.reportDetail.reportId = firstReportId
  const reportDetailPayload = await recordStep('governance-admin', 'reportDetail', { reportId: firstReportId })
  summary.detailCoverage.reportDetail.code = reportDetailPayload?.code ?? -1
} else {
  summary.detailCoverage.reportDetail.skipped = true
  summary.detailCoverage.reportDetail.skipReason = 'reportList_empty'
  summary.steps.push(buildSkippedStep(
    'governance-admin.reportDetail',
    'reportList_empty',
    {
      sourceStep: 'governance-admin.reportList',
      listCount: Array.isArray(reportListPayload?.data?.list) ? reportListPayload.data.list.length : 0,
    },
  ))
}

const accountActionListPayload = await recordStep('governance-admin', 'accountActionList', { pageSize: 10 })
const operationLogListPayload = await recordStep('governance-admin', 'operationLogList', { pageSize: 30 })
await recordStep('admin-auth', 'logout', {})

const operationLogTargetTypes = Array.isArray(operationLogListPayload?.data?.list)
  ? Array.from(new Set(operationLogListPayload.data.list
    .map((item) => item?.targetType)
    .filter((item) => typeof item === 'string' && item)))
  : []

summary.overview = {
  meMustResetPassword: mePayload?.data?.mustResetPassword ?? null,
  dashboardPriorityItemCount: Array.isArray(dashboardPayload?.data?.priorityItems) ? dashboardPayload.data.priorityItems.length : null,
  reviewTaskCount: Array.isArray(taskListPayload?.data?.list) ? taskListPayload.data.list.length : null,
  reportCount: Array.isArray(reportListPayload?.data?.list) ? reportListPayload.data.list.length : null,
  accountActionCount: Array.isArray(accountActionListPayload?.data?.list) ? accountActionListPayload.data.list.length : null,
  operationLogCount: Array.isArray(operationLogListPayload?.data?.list) ? operationLogListPayload.data.list.length : null,
  operationLogTargetTypes,
}

summary.acceptance = {
  hasReviewTaskSample: (summary.overview.reviewTaskCount ?? 0) >= minReviewTaskCount,
  hasReportSample: (summary.overview.reportCount ?? 0) >= minReportCount,
  hasAccountActionSample: (summary.overview.accountActionCount ?? 0) >= minAccountActionCount,
  hasOperationLogTargetCoverage:
    requiredOperationLogTargetTypes.every((targetType) => operationLogTargetTypes.includes(targetType)),
  reviewTaskDetailReadable: summary.detailCoverage.reviewTaskDetail.code === 0,
  reportDetailReadable: summary.detailCoverage.reportDetail.code === 0,
}

summary.ok = summary.steps.every((item) => item.code === 0)
  && summary.acceptance.hasReviewTaskSample
  && summary.acceptance.hasReportSample
  && summary.acceptance.hasAccountActionSample
  && summary.acceptance.hasOperationLogTargetCoverage
  && summary.acceptance.reviewTaskDetailReadable
  && summary.acceptance.reportDetailReadable

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, JSON.stringify(redactSensitive(summary), null, 2))
console.log(JSON.stringify(redactSensitive(summary), null, 2))
