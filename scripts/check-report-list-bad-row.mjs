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

function hasFlag(flag) {
  return process.argv.includes(flag)
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

function buildCloudCredentials() {
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

  return { secretId, secretKey, token }
}

async function loadNodeSdk() {
  try {
    const mod = await import('@cloudbase/node-sdk')
    return mod.default ?? mod
  } catch {
    throw new Error('missing @cloudbase/node-sdk. run `cd scripts && npm install` first')
  }
}

async function loadManagerNode() {
  const mod = await import(path.join(__dirname, 'node_modules', '@cloudbase', 'manager-node', 'lib', 'index.js'))
  return mod.default ?? mod
}

function createNodeSdkApp(nodeSdk, envId, credentials) {
  return nodeSdk.init({
    env: envId,
    secretId: credentials.secretId,
    secretKey: credentials.secretKey,
    sessionToken: credentials.token,
  })
}

function createManagerApp(CloudBase, envId, credentials) {
  return new CloudBase({
    envId,
    secretId: credentials.secretId,
    secretKey: credentials.secretKey,
    token: credentials.token,
  })
}

async function listAllByWhere(collection, where, pageSize = 100) {
  const rows = []
  let skip = 0

  while (true) {
    const result = await collection.where(where).skip(skip).limit(pageSize).get()
    rows.push(...result.data)

    if (result.data.length < pageSize) {
      return rows
    }

    skip += result.data.length
  }
}

async function listAllByAnyWhere(collection, wheres, pageSize = 100) {
  const rowsById = new Map()

  for (const where of wheres) {
    const rows = await listAllByWhere(collection, where, pageSize)
    for (const row of rows) {
      if (row?._id) {
        rowsById.set(row._id, row)
      }
    }
  }

  return Array.from(rowsById.values())
}

async function upsertByReportId(collection, reportId, doc) {
  const matchedDocs = await listAllByAnyWhere(collection, [
    { reportId },
    { 'data.reportId': reportId },
  ], 20)

  const existing = matchedDocs[0]

  if (existing?._id) {
    const payload = { ...(existing?.data || existing) }
    delete payload._id
    delete payload._openid
    await collection.doc(existing._id).set({
      ...payload,
      ...doc,
    })
    return {
      created: false,
      updated: true,
      matchedCount: matchedDocs.length,
      duplicateCount: Math.max(matchedDocs.length - 1, 0),
      _id: existing._id,
    }
  }

  const addResult = await collection.add(doc)
  return {
    created: true,
    updated: false,
    matchedCount: 0,
    duplicateCount: 0,
    _id: addResult.id || addResult._id || '',
  }
}

async function removeByReportId(collection, reportId) {
  const matchedDocs = await listAllByAnyWhere(collection, [
    { reportId },
    { 'data.reportId': reportId },
  ], 20)

  for (const doc of matchedDocs) {
    await collection.doc(doc._id).remove()
  }

  return {
    matchedCount: matchedDocs.length,
    removedCount: matchedDocs.length,
  }
}

function parseInvokeResult(result) {
  const retMsg = typeof result.RetMsg === 'string' ? result.RetMsg : '{}'

  try {
    return {
      cloudRequestId: result.RequestId || '',
      functionRequestId: result.FunctionRequestId || '',
      payload: JSON.parse(retMsg),
    }
  } catch {
    return {
      cloudRequestId: result.RequestId || '',
      functionRequestId: result.FunctionRequestId || '',
      payload: {
        code: -1,
        message: 'retMsg_parse_failed',
        rawRetMsg: retMsg,
      },
    }
  }
}

async function invokeJson(manager, functionName, request) {
  const result = await manager.functions.invokeFunction(functionName, request)
  return parseInvokeResult(result)
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const username = getArg('--username') ?? getEnvValue(['ADMIN_SMOKE_USERNAME', 'ADMIN_REAL_STANDARD_USERNAME'], 'domi_admin')
const password = getArg('--password') ?? getEnvValue(['ADMIN_SMOKE_PASSWORD'], '')
const cleanupAfter = hasFlag('--cleanup')
const round = normalizeEnvString(getArg('--round') ?? getEnvValue(['ADMIN_SMOKE_ROUND'], 'r51')) || 'r51'
const reportPrefix = normalizeEnvString(getArg('--report-prefix') ?? `smoke_${round}_bad_report`) || `smoke_${round}_bad_report`
const outputPath =
  getArg('--output') ??
  path.join(__dirname, 'evidence', round, 'report-list-bad-row-check.json')

if (!envId) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID' } }, null, 2))
  process.exit(1)
}

if (!username || !password) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing username/password; pass --username/--password or set ADMIN_SMOKE_USERNAME/ADMIN_SMOKE_PASSWORD' } }, null, 2))
  process.exit(1)
}

const credentials = buildCloudCredentials()
const nodeSdk = await loadNodeSdk()
const CloudBase = await loadManagerNode()
const app = createNodeSdkApp(nodeSdk, envId, credentials)
const manager = createManagerApp(CloudBase, envId, credentials)
const reportsCollection = app.database().collection('dm_reports')
const now = new Date()
const scenarioDefinitions = [
  {
    key: 'empty_target',
    reportId: `${reportPrefix}_empty_target`,
    document: {
      targetType: '',
      targetId: '',
      reasonText: '坏单条容错回归样本（空 targetType/targetId）',
    },
    expected: {
      targetType: 'missing',
      targetId: '',
      displayName: `${reportPrefix}_empty_target`,
      fallbackSource: 'reportId',
    },
  },
  {
    key: 'invalid_target_type',
    reportId: `${reportPrefix}_invalid_target_type`,
    document: {
      targetType: 'invalid_target_type',
      targetId: `${reportPrefix}_invalid_target_ref`,
      reasonText: '坏单条容错回归样本（非法 targetType）',
    },
    expected: {
      targetType: 'missing',
      targetId: `${reportPrefix}_invalid_target_ref`,
      displayName: `${reportPrefix}_invalid_target_ref`,
      fallbackSource: 'targetId',
    },
  },
  {
    key: 'missing_notice_target',
    reportId: `${reportPrefix}_missing_notice_target`,
    document: {
      targetType: 'notice',
      targetId: `${reportPrefix}_missing_notice_ref`,
      reasonText: '坏单条容错回归样本（合法 targetType + 不存在 targetId）',
    },
    expected: {
      targetType: 'notice',
      targetId: `${reportPrefix}_missing_notice_ref`,
      displayName: `${reportPrefix}_missing_notice_ref`,
      fallbackSource: 'targetId',
    },
  },
]

const summary = {
  ok: true,
  envId,
  round,
  username,
  cleanupAfter,
  executedAt: now.toISOString(),
  reportPrefix,
  upsertResults: [],
  reportList: {
    code: -1,
    message: '',
    requestId: '',
    cloudRequestId: '',
    functionRequestId: '',
    listCount: 0,
  },
  scenarios: [],
  cleanupResults: [],
}

for (const scenario of scenarioDefinitions) {
  const doc = {
    reportId: scenario.reportId,
    reporterUserId: `${scenario.reportId}_reporter_user`,
    targetType: scenario.document.targetType,
    targetId: scenario.document.targetId,
    reasonCode: 'fraud',
    reasonText: scenario.document.reasonText,
    evidenceImages: [],
    status: 'pending',
    handlerId: null,
    resultAction: null,
    resultRemark: null,
    createdAt: now,
    updatedAt: now,
  }

  const upsertResult = await upsertByReportId(reportsCollection, scenario.reportId, doc)
  summary.upsertResults.push({
    scenarioKey: scenario.key,
    reportId: scenario.reportId,
    ...upsertResult,
  })
}

const loginResult = await invokeJson(manager, 'admin-auth', {
  action: 'login',
  payload: {
    username,
    password,
  },
  meta: {
    source: 'admin-web',
  },
})

const loginPayload = loginResult.payload
const adminSessionToken = loginPayload?.data?.session?.adminSessionToken

if (loginPayload?.code !== 0 || !adminSessionToken) {
  summary.ok = false
  summary.reportList.message = 'admin-auth.login_failed'
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  process.exit(1)
}

const reportListResult = await invokeJson(manager, 'governance-admin', {
  action: 'reportList',
  payload: {
    pageSize: 50,
  },
  meta: {
    source: 'admin-web',
    adminSessionToken,
  },
})

const reportListPayload = reportListResult.payload
const reportRows = Array.isArray(reportListPayload?.data?.list) ? reportListPayload.data.list : []

summary.reportList = {
  code: reportListPayload?.code ?? -1,
  message: reportListPayload?.message ?? '',
  requestId: reportListPayload?.requestId ?? '',
  cloudRequestId: reportListResult.cloudRequestId,
  functionRequestId: reportListResult.functionRequestId,
  listCount: reportRows.length,
}

for (const scenario of scenarioDefinitions) {
  const matchedItem = reportRows.find((item) => item?.reportId === scenario.reportId) || null
  const actualTargetType = matchedItem?.targetType ?? null
  const actualTargetId = matchedItem?.targetId ?? null
  const actualDisplayName = matchedItem?.targetDisplayName ?? null
  const fallbackByReportId = actualDisplayName === scenario.reportId
  const fallbackByTargetId = actualDisplayName === scenario.expected.targetId
  const expectedFallbackMatched = scenario.expected.fallbackSource === 'reportId' ? fallbackByReportId : fallbackByTargetId

  summary.scenarios.push({
    scenarioKey: scenario.key,
    reportId: scenario.reportId,
    found: Boolean(matchedItem),
    expected: scenario.expected,
    actual: {
      targetType: actualTargetType,
      targetId: actualTargetId,
      displayName: actualDisplayName,
    },
    fallbackByReportId,
    fallbackByTargetId,
    ok:
      summary.reportList.code === 0
      && Boolean(matchedItem)
      && actualTargetType === scenario.expected.targetType
      && actualTargetId === scenario.expected.targetId
      && expectedFallbackMatched,
  })
}

await invokeJson(manager, 'admin-auth', {
  action: 'logout',
  payload: {},
  meta: {
    source: 'admin-web',
    adminSessionToken,
  },
})

if (cleanupAfter) {
  for (const scenario of scenarioDefinitions) {
    summary.cleanupResults.push({
      scenarioKey: scenario.key,
      reportId: scenario.reportId,
      ...(await removeByReportId(reportsCollection, scenario.reportId)),
    })
  }
}

summary.ok = summary.reportList.code === 0 && summary.scenarios.every((scenario) => scenario.ok)

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))

if (!summary.ok) {
  process.exit(1)
}
