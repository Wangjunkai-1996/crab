#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_ENV_ID = 'cloud1-4grxqg018586792d'
const DEFAULT_NOTICE_ID = 'notice_r63_manage_sample'
const DEFAULT_APPLICATION_ID = 'app_r63_manage_sample'
const DEFAULT_REPORT_ID = 'report_r63_records_sample'
const DEFAULT_CREATOR_USER_ID = 'seed_r63_creator_user'

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

function createNodeSdkApp(nodeSdk, envId, credentials) {
  return nodeSdk.init({
    env: envId,
    secretId: credentials.secretId,
    secretKey: credentials.secretKey,
    sessionToken: credentials.token,
  })
}

function parseJsonPreview(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function resolvePublisherUserIdFromEvidence() {
  const candidateFiles = [
    path.join(__dirname, '..', 'miniprogram', 'evidence', 'r58', 'runtime', 'tech-acceptance-run.json'),
    path.join(__dirname, '..', 'miniprogram', 'evidence', 'r58', 'runtime', 'auto-smoke-fallback-result.json'),
  ]

  for (const evidencePath of candidateFiles) {
    if (!fs.existsSync(evidencePath)) {
      continue
    }

    try {
      const report = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
      const steps = report?.autoSmokeResult?.steps || report?.autoSmokeResult?.batch?.steps || report?.steps || report?.batch?.steps || []
      const bootstrapStep = steps.find((step) => step?.step === 'bootstrap')
      const parsedPreview = parseJsonPreview(bootstrapStep?.responsePreview || '')
      const userId = normalizeEnvString(parsedPreview?.data?.user?.userId || '')

      if (userId) {
        return userId
      }
    } catch {
      continue
    }
  }

  return ''
}

async function findOneByField(collection, fieldName, fieldValue) {
  const result = await collection.where({
    [fieldName]: fieldValue,
  }).limit(1).get()

  return result.data[0] || null
}

async function upsertByField(collection, fieldName, fieldValue, doc) {
  const existing = await findOneByField(collection, fieldName, fieldValue)

  if (existing?._id) {
    await collection.doc(existing._id).update(doc)
    return {
      mode: 'updated',
      _id: existing._id,
    }
  }

  const created = await collection.add(doc)
  return {
    mode: 'created',
    _id: created.id || created._id || '',
  }
}

async function removeByField(collection, fieldName, fieldValue) {
  const existing = await findOneByField(collection, fieldName, fieldValue)

  if (!existing?._id) {
    return {
      removed: false,
    }
  }

  await collection.doc(existing._id).remove()
  return {
    removed: true,
    _id: existing._id,
  }
}

function buildNoticeDoc({
  noticeId,
  publisherUserId,
  publisherProfileId,
  now,
}) {
  const createdAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const deadlineAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
  const updatedAt = now.toISOString()

  return {
    noticeId,
    publisherUserId,
    publisherProfileId,
    title: '上海探店合作管理样本',
    brandName: '蟹宝品牌店',
    identityTypeSnapshot: 'merchant',
    cooperationPlatform: 'xiaohongshu',
    cooperationCategory: 'food_beverage',
    cooperationType: 'short_video',
    city: '上海',
    settlementType: 'fixed_price',
    budgetRange: '500_1000',
    budgetSummary: '固定报价 / 500-1000 元',
    recruitCount: 2,
    deadlineAt,
    creatorRequirements: '用于 R63 页面升档复核的最小真实样本',
    cooperationDescription: '仅用于补齐 search 和 publish-application-manage 的真实非空样本，不扩产品规则。',
    attachments: [],
    publisherContactTypeSnapshot: 'wechat',
    publisherContactValueSnapshot: 'crab_brand_ops',
    status: 'active',
    applicationCount: 1,
    publishedAt: createdAt,
    createdAt,
    updatedAt,
  }
}

function buildApplicationDoc({
  applicationId,
  noticeId,
  publisherUserId,
  creatorUserId,
  now,
}) {
  const createdAt = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const updatedAt = now.toISOString()

  return {
    applicationId,
    noticeId,
    publisherUserId,
    creatorUserId,
    creatorCardId: 'creator_r63_manage_sample',
    creatorCardSnapshot: {
      nickname: '样本达人 A',
      city: '上海',
      primaryPlatform: 'xiaohongshu',
      primaryCategory: 'food_beverage',
      followerBand: '10k_50k',
      caseDescription: '用于报名管理页复核的最小非空样本。',
    },
    selfIntroduction: '擅长本地生活短视频和图文探店内容制作。',
    deliverablePlan: '可在到店后 48 小时内交付 1 条短视频与 1 条图文。',
    expectedTerms: '工作日白天可优先排期。',
    portfolioImages: [],
    contactTypeSnapshot: 'wechat',
    contactValueSnapshot: 'seed_creator_contact_r63',
    status: 'contact_pending',
    publisherViewedAt: createdAt,
    creatorContactRevealedAt: updatedAt,
    publisherContactRevealedAt: updatedAt,
    withdrawnAt: null,
    completedAt: null,
    createdAt,
    updatedAt,
    isDeleted: false,
  }
}

function buildReportDoc({
  reportId,
  reporterUserId,
  noticeId,
  now,
}) {
  const createdAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const updatedAt = now.toISOString()

  return {
    reportId,
    reporterUserId,
    targetType: 'notice',
    targetId: noticeId,
    targetSummary: '上海探店合作管理样本',
    reasonCode: 'false_information',
    reasonText: '用于补齐 report-records 页的最小真实记录样本。',
    evidenceImages: [],
    status: 'processing',
    handlerId: null,
    resultAction: null,
    resultRemark: null,
    createdAt,
    updatedAt,
  }
}

function buildPlan({
  envId,
  publisherUserId,
  noticeId,
  applicationId,
  reportId,
  creatorUserId,
}) {
  return {
    envId,
    publisherUserId,
    creatorUserId,
    noticeId,
    applicationId,
    reportId,
    purpose: 'seed non-empty samples for search, publish-application-manage, and report-records',
    applyCommand: `cd ${__dirname} && node seed-miniprogram-r63-samples.mjs --env ${envId} --publisher-user-id ${publisherUserId} --apply`,
    cleanupCommand: `cd ${__dirname} && node seed-miniprogram-r63-samples.mjs --env ${envId} --publisher-user-id ${publisherUserId} --cleanup --apply`,
  }
}

function printUsage() {
  console.log(`
Usage:
  node seed-miniprogram-r63-samples.mjs [options]

Options:
  --env <envId>                  CloudBase env id. Default: ${DEFAULT_ENV_ID}
  --publisher-user-id <userId>   Dual-role test user id. Default: infer from R58 evidence
  --notice-id <noticeId>         Seed notice id. Default: ${DEFAULT_NOTICE_ID}
  --application-id <appId>       Seed application id. Default: ${DEFAULT_APPLICATION_ID}
  --report-id <reportId>         Seed report id. Default: ${DEFAULT_REPORT_ID}
  --creator-user-id <userId>     Seed creator user id. Default: ${DEFAULT_CREATOR_USER_ID}
  --apply                        Write to CloudBase
  --cleanup                      Remove seeded docs instead of upserting
  --help                         Show this help
`)
}

if (hasFlag('--help')) {
  printUsage()
  process.exit(0)
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID', 'CLOUDBASE_ENV_ID_DEV'], DEFAULT_ENV_ID)
const publisherUserId = getArg('--publisher-user-id') || resolvePublisherUserIdFromEvidence()
const noticeId = getArg('--notice-id') || DEFAULT_NOTICE_ID
const applicationId = getArg('--application-id') || DEFAULT_APPLICATION_ID
const reportId = getArg('--report-id') || DEFAULT_REPORT_ID
const creatorUserId = getArg('--creator-user-id') || DEFAULT_CREATOR_USER_ID
const shouldApply = hasFlag('--apply')
const shouldCleanup = hasFlag('--cleanup')

if (!publisherUserId) {
  throw new Error('missing publisherUserId; pass --publisher-user-id or ensure R58 evidence exists')
}

const plan = buildPlan({
  envId,
  publisherUserId,
  noticeId,
  applicationId,
  reportId,
  creatorUserId,
})

if (!shouldApply) {
  console.log(JSON.stringify({
    ok: true,
    mode: shouldCleanup ? 'cleanup_plan' : 'seed_plan',
    ...plan,
  }, null, 2))
  process.exit(0)
}

const credentials = buildCloudCredentials()
const nodeSdk = await loadNodeSdk()
const app = createNodeSdkApp(nodeSdk, envId, credentials)
const db = app.database()
const now = new Date()
const notices = db.collection('dm_notices')
const applications = db.collection('dm_applications')
const reports = db.collection('dm_reports')
const publisherProfiles = db.collection('dm_publisher_profiles')
const publisherProfile = await findOneByField(publisherProfiles, 'userId', publisherUserId)
const publisherProfileId = normalizeEnvString(publisherProfile?.publisherProfileId || '')

if (shouldCleanup) {
  const cleanup = {
    notice: await removeByField(notices, 'noticeId', noticeId),
    application: await removeByField(applications, 'applicationId', applicationId),
    report: await removeByField(reports, 'reportId', reportId),
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cleanup_applied',
    envId,
    publisherUserId,
    cleanup,
  }, null, 2))
  process.exit(0)
}

const noticeDoc = buildNoticeDoc({
  noticeId,
  publisherUserId,
  publisherProfileId,
  now,
})
const applicationDoc = buildApplicationDoc({
  applicationId,
  noticeId,
  publisherUserId,
  creatorUserId,
  now,
})
const reportDoc = buildReportDoc({
  reportId,
  reporterUserId: publisherUserId,
  noticeId,
  now,
})

const noticeResult = await upsertByField(notices, 'noticeId', noticeId, noticeDoc)
const applicationResult = await upsertByField(applications, 'applicationId', applicationId, applicationDoc)
const reportResult = await upsertByField(reports, 'reportId', reportId, reportDoc)

console.log(JSON.stringify({
  ok: true,
  mode: 'seed_applied',
  envId,
  publisherUserId,
  publisherProfileId,
  notice: {
    noticeId,
    ...noticeResult,
  },
  application: {
    applicationId,
    creatorUserId,
    ...applicationResult,
  },
  report: {
    reportId,
    ...reportResult,
  },
}, null, 2))
