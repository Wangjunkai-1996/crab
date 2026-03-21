#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_ENV_ID = 'cloud1-4grxqg018586792d'
const FIXED_NOTICE_ID = 'notice_202603160001'
const shouldApply = process.argv.includes('--apply')

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

function createNodeSdkApp(nodeSdk, envId, credentials) {
  return nodeSdk.init({
    env: envId,
    secretId: credentials.secretId,
    secretKey: credentials.secretKey,
    sessionToken: credentials.token,
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
  const rowMap = new Map()

  for (const where of wheres) {
    const rows = await listAllByWhere(collection, where, pageSize)
    for (const row of rows) {
      const key = row?._id || JSON.stringify(row)
      rowMap.set(key, row)
    }
  }

  return Array.from(rowMap.values())
}

function normalizeNoticeDoc(doc) {
  if (!doc || typeof doc !== 'object') {
    return {}
  }

  const base = doc.data && typeof doc.data === 'object' ? doc.data : doc
  return {
    ...base,
    _id: doc._id || base._id || '',
  }
}

function toIsoString(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return ''
}

function isFuture(value) {
  const normalized = toIsoString(value)

  if (!normalized) {
    return false
  }

  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

function evaluateNotice(doc) {
  const notice = normalizeNoticeDoc(doc)
  const noticeId = normalizeEnvString(notice.noticeId)
  const status = normalizeEnvString(notice.status)
  const deadlineAt = toIsoString(notice.deadlineAt)
  const publisherUserId = normalizeEnvString(notice.publisherUserId)
  const candidateOk = Boolean(noticeId && publisherUserId && status === 'active' && isFuture(deadlineAt))

  return {
    _id: notice._id || '',
    noticeId,
    status,
    deadlineAt,
    publisherUserId,
    rootShape: !doc?.data,
    candidateOk,
    reason: candidateOk
      ? 'active + future deadline + publisherUserId present'
      : `status=${status || 'missing'}, deadlineFuture=${isFuture(deadlineAt)}, publisherUserId=${publisherUserId || 'missing'}`,
  }
}

function sortCandidate(a, b) {
  const aDeadline = Date.parse(a.deadlineAt || '')
  const bDeadline = Date.parse(b.deadlineAt || '')

  if (Number.isFinite(aDeadline) && Number.isFinite(bDeadline)) {
    return aDeadline - bDeadline
  }

  if (Number.isFinite(aDeadline)) {
    return -1
  }

  if (Number.isFinite(bDeadline)) {
    return 1
  }

  return a.noticeId.localeCompare(b.noticeId)
}

function buildFixedNoticeDocument(existing = {}) {
  const now = new Date()
  const deadlineAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return {
    noticeId: FIXED_NOTICE_ID,
    publisherUserId: 'user_pub_1001',
    publisherProfileId: 'pub_1001',
    title: '上海探店短视频达人招募',
    brandName: '蟹宝品牌店',
    identityTypeSnapshot: 'merchant',
    cooperationPlatform: 'xiaohongshu',
    cooperationCategory: 'food_beverage',
    cooperationType: 'short_video',
    city: '上海',
    settlementType: 'fixed_price',
    budgetRange: '500_1000',
    budgetSummary: '固定报价 / 500-1000 元',
    recruitCount: 5,
    deadlineAt,
    creatorRequirements: '有本地生活探店经验，粉丝 5k+',
    cooperationDescription: '到店拍摄 1 条 30-60 秒短视频并配图文笔记',
    attachments: ['cloud://domi-dev/notice-images/notice_202603160001/cover-1.jpg'],
    publisherContactTypeSnapshot: 'wechat',
    publisherContactValueSnapshot: 'crab_brand_ops',
    status: 'active',
    applicationCount: Number.isFinite(Number(existing.applicationCount)) ? Number(existing.applicationCount) : 0,
    publishedAt: existing.publishedAt || now.toISOString(),
    createdAt: existing.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  }
}

async function upsertFixedNotice(collection, existingRawDoc) {
  const existing = normalizeNoticeDoc(existingRawDoc)
  const nextDoc = buildFixedNoticeDocument(existing)

  if (existingRawDoc?._id) {
    await collection.doc(existingRawDoc._id).update(nextDoc)
    return {
      applied: true,
      mode: 'updated',
      noticeId: FIXED_NOTICE_ID,
      _id: existingRawDoc._id,
    }
  }

  const result = await collection.add(nextDoc)
  return {
    applied: true,
    mode: 'created',
    noticeId: FIXED_NOTICE_ID,
    _id: result.id || result._id || '',
  }
}

const envId = normalizeEnvString(getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], DEFAULT_ENV_ID)) || DEFAULT_ENV_ID
const credentials = buildCloudCredentials()
const nodeSdk = await loadNodeSdk()
const app = createNodeSdkApp(nodeSdk, envId, credentials)
const db = app.database()
const notices = db.collection('dm_notices')

const fixedRows = await listAllByAnyWhere(
  notices,
  [
    { noticeId: FIXED_NOTICE_ID },
    { 'data.noticeId': FIXED_NOTICE_ID },
  ],
  20,
)
const fixedEvaluations = fixedRows.map(evaluateNotice)
let fixedCandidate = fixedEvaluations.find((item) => item.candidateOk) || fixedEvaluations[0] || null

const activeRows = await listAllByAnyWhere(
  notices,
  [
    { status: 'active' },
    { 'data.status': 'active' },
  ],
  100,
)
const activeCandidates = activeRows
  .map(evaluateNotice)
  .filter((item) => item.noticeId)
  .sort(sortCandidate)

let fallbackCandidate = activeCandidates.find((item) => item.candidateOk && item.noticeId !== FIXED_NOTICE_ID) || null
let recommended = fixedCandidate?.candidateOk ? fixedCandidate : fallbackCandidate
let applyResult = null

if (!recommended && shouldApply) {
  applyResult = await upsertFixedNotice(notices, fixedRows[0])
  const afterApplyRows = await listAllByAnyWhere(
    notices,
    [
      { noticeId: FIXED_NOTICE_ID },
      { 'data.noticeId': FIXED_NOTICE_ID },
    ],
    20,
  )
  const afterApplyEvaluations = afterApplyRows.map(evaluateNotice)
  fixedCandidate = afterApplyEvaluations.find((item) => item.candidateOk) || afterApplyEvaluations[0] || fixedCandidate
  recommended = fixedCandidate?.candidateOk ? fixedCandidate : null
}

const result = {
  ok: Boolean(recommended),
  round: 'R54',
  envId,
  fixedNoticeId: FIXED_NOTICE_ID,
  fixedCandidate,
  fallbackCandidate,
  recommendedNoticeId: recommended?.noticeId || '',
  recommendedSource: fixedCandidate?.candidateOk ? 'fixed' : (fallbackCandidate ? 'fallback' : ''),
  applyResult,
  warnings: [
    '该脚本只校验“全局可报名候选样本”是否存在，不伪造 wxContext.OPENID。',
    'own notice / hasApplied / creatorCard completeness 仍依赖明早真实小程序账号上下文。',
  ],
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 2)
}

console.log(`# Miniprogram Dev Smoke Sample (${result.round})`)
console.log('')
console.log(`- envId: ${result.envId}`)
console.log(`- fixedNoticeId: ${result.fixedNoticeId}`)
console.log(`- recommendedNoticeId: ${result.recommendedNoticeId || 'none'}`)
console.log(`- recommendedSource: ${result.recommendedSource || 'none'}`)
console.log('')
console.log('## Fixed Candidate')
console.log(JSON.stringify(result.fixedCandidate, null, 2))
console.log('')
console.log('## Fallback Candidate')
console.log(JSON.stringify(result.fallbackCandidate, null, 2))
console.log('')
console.log('## Warnings')
for (const item of result.warnings) {
  console.log(`- ${item}`)
}

if (!result.ok) {
  process.exitCode = 2
}
