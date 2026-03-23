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
const reportId = getArg('--report-id') ?? `smoke_${round}_bad_report_detail`
const outputPath =
  getArg('--output') ??
  path.join(__dirname, 'evidence', round, 'report-detail-bad-row-check.json')

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
const badReportDoc = {
  reportId,
  reporterUserId: `${reportId}_reporter_user`,
  targetType: '',
  targetId: '',
  reasonCode: 'fraud',
  reasonText: '坏详情容错回归样本（空 targetType/targetId）',
  evidenceImages: [],
  status: 'pending',
  handlerId: null,
  resultAction: null,
  resultRemark: null,
  createdAt: now,
  updatedAt: now,
}

const summary = {
  ok: true,
  envId,
  round,
  username,
  reportId,
  cleanupAfter,
  executedAt: now.toISOString(),
  upsertResult: null,
  reportDetail: {
    code: -1,
    message: '',
    requestId: '',
    cloudRequestId: '',
    functionRequestId: '',
  },
  reportReadable: false,
  targetSnapshotType: null,
  targetSnapshotId: null,
  targetSnapshotDisplayName: null,
  targetSnapshotStatus: null,
  fallbackByReportId: false,
  cleanupResult: null,
}

const upsertResult = await upsertByReportId(reportsCollection, reportId, badReportDoc)
summary.upsertResult = upsertResult

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
  summary.reportDetail.message = 'admin-auth.login_failed'
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  process.exit(1)
}

const reportDetailResult = await invokeJson(manager, 'governance-admin', {
  action: 'reportDetail',
  payload: {
    reportId,
  },
  meta: {
    source: 'admin-web',
    adminSessionToken,
  },
})

const reportDetailPayload = reportDetailResult.payload
const reportDetailData = reportDetailPayload?.data ?? {}
const targetSnapshot = reportDetailData?.targetSnapshot ?? {}

summary.reportDetail = {
  code: reportDetailPayload?.code ?? -1,
  message: reportDetailPayload?.message ?? '',
  requestId: reportDetailPayload?.requestId ?? '',
  cloudRequestId: reportDetailResult.cloudRequestId,
  functionRequestId: reportDetailResult.functionRequestId,
}
summary.reportReadable = reportDetailData?.report?.reportId === reportId
summary.targetSnapshotType = targetSnapshot?.targetType ?? null
summary.targetSnapshotId = targetSnapshot?.targetId ?? null
summary.targetSnapshotDisplayName = targetSnapshot?.displayName ?? null
summary.targetSnapshotStatus = targetSnapshot?.status ?? null
summary.fallbackByReportId = targetSnapshot?.displayName === reportId

await invokeJson(manager, 'admin-auth', {
  action: 'logout',
  payload: {},
  meta: {
    source: 'admin-web',
    adminSessionToken,
  },
})

if (cleanupAfter) {
  summary.cleanupResult = await removeByReportId(reportsCollection, reportId)
}

summary.ok =
  summary.reportDetail.code === 0
  && summary.reportReadable
  && summary.targetSnapshotType === 'missing'
  && summary.targetSnapshotStatus === 'missing'
  && summary.fallbackByReportId

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))

if (!summary.ok) {
  process.exit(1)
}
