#!/usr/bin/env node
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

function getTencentCredentialStatus() {
  const secretId = getEnvValue(['TENCENTCLOUD_SECRETID', 'TENCENT_SECRET_ID'], '')
  const secretKey = getEnvValue(['TENCENTCLOUD_SECRETKEY', 'TENCENT_SECRET_KEY'], '')
  const secretIdStatus = detectPlaceholderCredential(secretId, 'secretId')
  const secretKeyStatus = detectPlaceholderCredential(secretKey, 'secretKey')

  if (secretIdStatus === 'missing' || secretKeyStatus === 'missing') {
    return { status: 'missing', secretId, secretKey }
  }

  if (secretIdStatus === 'placeholder' || secretKeyStatus === 'placeholder') {
    return { status: 'placeholder', secretId, secretKey }
  }

  return { status: 'provided', secretId, secretKey }
}

async function loadNodeSdk() {
  try {
    const mod = await import('@cloudbase/node-sdk')
    return mod.default ?? mod
  } catch {
    throw new Error('missing @cloudbase/node-sdk. run `cd scripts && npm install` first')
  }
}

function createNodeSdkApp(nodeSdk, envId) {
  const credentialStatus = getTencentCredentialStatus()

  if (credentialStatus.status === 'missing') {
    throw new Error('missing real TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (or TENCENT_SECRET_ID/TENCENT_SECRET_KEY)')
  }

  if (credentialStatus.status === 'placeholder') {
    throw new Error('placeholder TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY detected; replace with real credentials before running seed')
  }

  return nodeSdk.init({
    env: envId,
    secretId: credentialStatus.secretId,
    secretKey: credentialStatus.secretKey,
    sessionToken: getEnvValue(['TENCENTCLOUD_SESSIONTOKEN', 'TENCENT_SESSION_TOKEN'], undefined),
  })
}

function toPayload(doc) {
  return doc && typeof doc.data === 'object' && doc.data !== null ? doc.data : doc
}

function toWritablePayload(doc) {
  const payload = { ...toPayload(doc) }
  delete payload._id
  delete payload._openid
  return payload
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

async function upsertByUniqueField(collection, field, value, doc, applyMode) {
  const matchedDocs = await listAllByAnyWhere(collection, [
    { [field]: value },
    { [`data.${field}`]: value },
  ], 20)

  const existing = matchedDocs[0]

  if (!applyMode) {
    return {
      field,
      value,
      matchedCount: matchedDocs.length,
      duplicateCount: Math.max(matchedDocs.length - 1, 0),
      created: !existing,
      updated: Boolean(existing),
    }
  }

  if (existing?._id) {
    const payload = toWritablePayload(existing)
    await collection.doc(existing._id).set({
      ...payload,
      ...doc,
    })

    return {
      field,
      value,
      matchedCount: matchedDocs.length,
      duplicateCount: Math.max(matchedDocs.length - 1, 0),
      created: false,
      updated: true,
      _id: existing._id,
    }
  }

  const addResult = await collection.add(doc)
  return {
    field,
    value,
    matchedCount: 0,
    duplicateCount: 0,
    created: true,
    updated: false,
    _id: addResult.id || addResult._id || '',
  }
}

async function removeByUniqueField(collection, field, value, applyMode) {
  const matchedDocs = await listAllByAnyWhere(collection, [
    { [field]: value },
    { [`data.${field}`]: value },
  ], 20)

  if (!applyMode) {
    return {
      field,
      value,
      matchedCount: matchedDocs.length,
      removedCount: matchedDocs.length,
    }
  }

  for (const doc of matchedDocs) {
    await collection.doc(doc._id).remove()
  }

  return {
    field,
    value,
    matchedCount: matchedDocs.length,
    removedCount: matchedDocs.length,
  }
}

const envId = getArg('--env') ?? getEnvValue(['CLOUDBASE_ENV_ID'], '')
const prefix = getArg('--prefix') ?? 'smoke_r51_detail'
const applyMode = hasFlag('--apply')
const cleanupMode = hasFlag('--cleanup')

if (!envId) {
  console.error(JSON.stringify({ ok: false, error: { message: 'missing envId; pass --env or set CLOUDBASE_ENV_ID' } }, null, 2))
  process.exit(1)
}

const ids = {
  publisherUserId: `${prefix}_publisher_user`,
  publisherProfileId: `${prefix}_publisher_profile`,
  weakPublisherUserId: `${prefix}_weak_publisher_user`,
  weakPublisherProfileId: `${prefix}_weak_publisher_profile`,
  creatorUserId: `${prefix}_creator_user`,
  creatorCardId: `${prefix}_creator_card`,
  noticeId: `${prefix}_notice`,
  reviewTaskId: `${prefix}_review_task`,
  reportId: `${prefix}_report`,
  reportHistoryId: `${prefix}_report_history`,
  reportPublisherId: `${prefix}_report_publisher`,
  reportCreatorId: `${prefix}_report_creator`,
  reportWeakPublisherId: `${prefix}_report_publisher_weak`,
  reporterUserId: `${prefix}_reporter_user`,
  restrictionId: `${prefix}_restriction`,
  restrictionBannedId: `${prefix}_restriction_banned`,
  restrictionReleasedId: `${prefix}_restriction_released`,
  restrictionSoonExpireId: `${prefix}_restriction_soon_expire`,
  logReportId: `${prefix}_log_report`,
  logReportResolveId: `${prefix}_log_report_resolve`,
  logReviewTaskResolveId: `${prefix}_log_review_task_resolve`,
  logTargetId: `${prefix}_log_target`,
  logAccountActionId: `${prefix}_log_account_action`,
  logAccountActionReleaseId: `${prefix}_log_account_action_release`,
}

const now = new Date()
const deadlineAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
const historyReportAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
const releaseAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
const soonExpireAt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
const bannedEndAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
const removedAt = new Date(now.getTime() - 30 * 60 * 1000)
const logAt = new Date(now.getTime() - 40 * 60 * 1000)
const logAtResolve = new Date(now.getTime() - 20 * 60 * 1000)
const logAtReviewResolve = new Date(now.getTime() - 15 * 60 * 1000)
const logAtNotice = new Date(now.getTime() - 10 * 60 * 1000)
const logAtAccountCreate = new Date(now.getTime() - 5 * 60 * 1000)
const logAtAccountRelease = new Date(now.getTime() - 3 * 60 * 1000)

const publisherProfileDoc = {
  publisherProfileId: ids.publisherProfileId,
  userId: ids.publisherUserId,
  identityType: 'merchant',
  displayName: '沪上轻食品牌',
  city: '上海',
  contactType: 'wechat',
  contactValue: 'domi_ops_sh',
  intro: '主营轻食与生活方式内容合作，可稳定配合探店拍摄。',
  profileCompleteness: 100,
  publishCount: 1,
  approvedPublishCount: 0,
  violationCount: 0,
  status: 'complete',
  createdAt: now,
  updatedAt: now,
}

const weakPublisherProfileDoc = {
  publisherProfileId: ids.weakPublisherProfileId,
  userId: ids.weakPublisherUserId,
  identityType: 'merchant',
  displayName: '轻旅合作方',
  city: '',
  contactType: 'wechat',
  contactValue: '',
  intro: '',
  profileCompleteness: 68,
  publishCount: 2,
  approvedPublishCount: 1,
  violationCount: 0,
  status: 'complete',
  createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
}

const creatorCardDoc = {
  creatorCardId: ids.creatorCardId,
  userId: ids.creatorUserId,
  nickname: '探店达人小栗',
  avatarUrl: '',
  city: '杭州',
  primaryPlatform: 'douyin',
  followerBand: '10w_50w',
  status: 'active',
  riskLevel: 'medium',
  riskFlags: ['sensitive_keywords'],
  createdAt: now,
  updatedAt: now,
}

const noticeDoc = {
  noticeId: ids.noticeId,
  publisherUserId: ids.publisherUserId,
  publisherProfileId: ids.publisherProfileId,
  title: '春季探店图文合作',
  brandName: '多米轻食',
  identityTypeSnapshot: 'merchant',
  cooperationPlatform: 'xiaohongshu',
  cooperationCategory: 'food_beverage',
  cooperationType: 'image_text',
  city: '上海',
  settlementType: 'fixed_price',
  budgetRange: '500_1000',
  budgetSummary: '固定报价 / 500-1000 元',
  recruitCount: 3,
  deadlineAt,
  creatorRequirements: '需有本地探店经验，支持 48 小时内交稿。',
  cooperationDescription: '招募上海本地探店达人，到店完成图文内容拍摄与发布。',
  attachments: [],
  status: 'pending_review',
  reviewRoundCount: 1,
  latestReviewReasonCategory: null,
  latestReviewReasonText: null,
  riskFlags: ['contact_anomaly'],
  applicationCount: 0,
  publishedAt: null,
  closedAt: null,
  removedAt: null,
  createdAt: now,
  updatedAt: now,
}

const reviewTaskDoc = {
  reviewTaskId: ids.reviewTaskId,
  objectId: ids.noticeId,
  objectType: 'notice',
  noticeStatusSnapshot: 'pending_review',
  reviewStage: 'initial_review',
  taskStatus: 'pending',
  queueType: 'initial_review_queue',
  riskLevel: 'medium',
  riskFlags: ['contact_anomaly'],
  assignedTo: null,
  claimedAt: null,
  completedAt: null,
  reviewResult: null,
  reasonCategory: null,
  reasonText: null,
  nextQueueType: null,
  createdAt: now,
  updatedAt: now,
}

const reportDoc = {
  reportId: ids.reportId,
  reporterUserId: ids.reporterUserId,
  targetType: 'notice',
  targetId: ids.noticeId,
  reasonCode: 'fake_requirement',
  reasonText: '举报人反馈合作内容存在疑似虚假招募信息，需进一步核验。',
  evidenceImages: [],
  status: 'pending',
  handlerId: null,
  resultAction: null,
  resultRemark: null,
  createdAt: now,
  updatedAt: now,
}

const reportHistoryDoc = {
  reportId: ids.reportHistoryId,
  reporterUserId: `${prefix}_history_reporter_user`,
  targetType: 'notice',
  targetId: ids.noticeId,
  reasonCode: 'fraud',
  reasonText: '历史举报：曾被反馈存在夸大合作回报。',
  evidenceImages: [],
  status: 'resolved',
  handlerId: 'domi_admin',
  resultAction: 'record_only',
  resultRemark: '历史举报已记录',
  createdAt: historyReportAt,
  updatedAt: historyReportAt,
}

const reportPublisherDoc = {
  reportId: ids.reportPublisherId,
  reporterUserId: `${prefix}_publisher_reporter_user`,
  targetType: 'publisher',
  targetId: ids.publisherProfileId,
  reasonCode: 'contact_abuse',
  reasonText: '发布方联系方式展示异常，需核验是否存在导流风险。',
  evidenceImages: [],
  status: 'processing',
  handlerId: 'domi_admin',
  resultAction: null,
  resultRemark: null,
  createdAt: new Date(now.getTime() - 45 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 45 * 60 * 1000),
}

const reportCreatorDoc = {
  reportId: ids.reportCreatorId,
  reporterUserId: `${prefix}_creator_reporter_user`,
  targetType: 'creator',
  targetId: ids.creatorCardId,
  reasonCode: 'fraud',
  reasonText: '达人资料存在异常引流嫌疑，作为 creator 类型展示样本。',
  evidenceImages: [],
  status: 'resolved',
  handlerId: 'domi_admin',
  resultAction: 'restrict_apply',
  resultRemark: '历史样本已处理',
  createdAt: new Date(now.getTime() - 90 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 90 * 60 * 1000),
}

const reportWeakPublisherDoc = {
  reportId: ids.reportWeakPublisherId,
  reporterUserId: `${prefix}_weak_publisher_reporter_user`,
  targetType: 'publisher',
  targetId: ids.weakPublisherProfileId,
  reasonCode: 'manual_review',
  reasonText: '资料信息不完整，先挂起等待人工确认。',
  evidenceImages: [],
  status: 'pending',
  handlerId: null,
  resultAction: null,
  resultRemark: null,
  createdAt: new Date(now.getTime() - 30 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
}

const accountActionDoc = {
  restrictionId: ids.restrictionId,
  userId: ids.publisherUserId,
  restrictionType: 'watchlist',
  reasonCategory: 'fraud',
  reasonText: '同对象重复举报，先加入观察名单持续关注。',
  startAt: historyReportAt,
  endAt: deadlineAt,
  operatorId: 'domi_admin',
  status: 'active',
  createdAt: historyReportAt,
  updatedAt: historyReportAt,
}

const accountActionBannedDoc = {
  restrictionId: ids.restrictionBannedId,
  userId: ids.publisherUserId,
  restrictionType: 'banned',
  reasonCategory: 'fraud',
  reasonText: '核验为高风险违规对象，升级为全量封禁。',
  startAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
  endAt: bannedEndAt,
  operatorId: 'domi_admin',
  status: 'active',
  createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
}

const accountActionReleasedDoc = {
  restrictionId: ids.restrictionReleasedId,
  userId: ids.creatorUserId,
  restrictionType: 'restricted_publish',
  reasonCategory: 'report_confirmed',
  reasonText: '历史限制发布记录，当前已完成解除。',
  startAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
  endAt: releaseAt,
  operatorId: 'domi_admin',
  status: 'released',
  createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
  updatedAt: releaseAt,
}

const accountActionSoonExpireDoc = {
  restrictionId: ids.restrictionSoonExpireId,
  userId: ids.creatorUserId,
  restrictionType: 'restricted_apply',
  reasonCategory: 'contact_abuse',
  reasonText: '短期限制报名样本，用于验证即将到期展示。',
  startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  endAt: soonExpireAt,
  operatorId: 'domi_admin',
  status: 'active',
  createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
}

const operationLogReportDoc = {
  logId: ids.logReportId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'report_claim',
  targetType: 'report',
  targetId: ids.reportId,
  requestId: `${prefix}_request_report`,
  beforeSnapshot: {
    status: 'pending',
  },
  afterSnapshot: {
    status: 'processing',
  },
  remark: '举报已领取，等待进一步核验。',
  createdAt: logAt,
}

const operationLogReportResolveDoc = {
  logId: ids.logReportResolveId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'report_resolve_confirmed',
  targetType: 'report',
  targetId: ids.reportId,
  requestId: `${prefix}_request_report_resolve`,
  beforeSnapshot: {
    status: 'processing',
  },
  afterSnapshot: {
    status: 'resolved',
    reviewResult: 'removed',
    resultAction: 'remove_notice',
    latestReviewReasonCategory: 'fraud',
  },
  remark: '举报成立并已下架关联通告。',
  createdAt: logAtResolve,
}

const operationLogReviewTaskResolveDoc = {
  logId: ids.logReviewTaskResolveId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'review_task_resolve',
  targetType: 'review_task',
  targetId: ids.reviewTaskId,
  requestId: `${prefix}_request_review_resolve`,
  beforeSnapshot: {
    taskStatus: 'processing',
  },
  afterSnapshot: {
    taskStatus: 'completed',
    reviewResult: 'supplement_required',
    latestReviewReasonCategory: 'incomplete_material',
  },
  remark: '审核任务已转为补件复审。',
  createdAt: logAtReviewResolve,
}

const operationLogTargetDoc = {
  logId: ids.logTargetId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'notice_force_remove',
  targetType: 'notice',
  targetId: ids.noticeId,
  requestId: `${prefix}_request_notice`,
  beforeSnapshot: {
    status: 'pending_review',
  },
  afterSnapshot: {
    status: 'removed',
    reviewResult: 'removed',
    resultAction: 'remove_notice',
    removedAt: removedAt,
    latestReviewReasonCategory: 'fraud',
  },
  remark: '通告已执行强制下架。',
  createdAt: logAtNotice,
}

const operationLogAccountActionDoc = {
  logId: ids.logAccountActionId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'account_action_create',
  targetType: 'account_action',
  targetId: ids.restrictionBannedId,
  requestId: `${prefix}_request_account_action`,
  beforeSnapshot: {
    accountStatus: 'normal',
  },
  afterSnapshot: {
    restrictionType: 'banned',
    accountStatus: 'banned',
    endAt: bannedEndAt,
  },
  remark: '新增全量封禁处罚。',
  createdAt: logAtAccountCreate,
}

const operationLogAccountActionReleaseDoc = {
  logId: ids.logAccountActionReleaseId,
  operatorType: 'admin',
  operatorId: 'domi_admin',
  action: 'account_action_release',
  targetType: 'account_action',
  targetId: ids.restrictionReleasedId,
  requestId: `${prefix}_request_account_action_release`,
  beforeSnapshot: {
    restrictionType: 'restricted_publish',
    accountStatus: 'restricted_publish',
    endAt: deadlineAt,
  },
  afterSnapshot: {
    restrictionType: 'restricted_publish',
    accountStatus: 'normal',
    endAt: releaseAt,
  },
  remark: '限制发布记录已解除。',
  createdAt: logAtAccountRelease,
}

const nodeSdk = await loadNodeSdk()
const app = createNodeSdkApp(nodeSdk, envId)
const db = app.database()

const collections = {
  publisherProfiles: db.collection('dm_publisher_profiles'),
  creatorCards: db.collection('dm_creator_cards'),
  notices: db.collection('dm_notices'),
  reviewTasks: db.collection('dm_notice_review_tasks'),
  reports: db.collection('dm_reports'),
  accountActions: db.collection('dm_account_actions'),
  operationLogs: db.collection('dm_operation_logs'),
}

const cleanupTasks = [
  ['publisherProfile', collections.publisherProfiles, 'publisherProfileId', ids.publisherProfileId],
  ['weakPublisherProfile', collections.publisherProfiles, 'publisherProfileId', ids.weakPublisherProfileId],
  ['creatorCard', collections.creatorCards, 'creatorCardId', ids.creatorCardId],
  ['notice', collections.notices, 'noticeId', ids.noticeId],
  ['reviewTask', collections.reviewTasks, 'reviewTaskId', ids.reviewTaskId],
  ['report', collections.reports, 'reportId', ids.reportId],
  ['reportHistory', collections.reports, 'reportId', ids.reportHistoryId],
  ['reportPublisher', collections.reports, 'reportId', ids.reportPublisherId],
  ['reportCreator', collections.reports, 'reportId', ids.reportCreatorId],
  ['reportWeakPublisher', collections.reports, 'reportId', ids.reportWeakPublisherId],
  ['accountAction', collections.accountActions, 'restrictionId', ids.restrictionId],
  ['accountActionBanned', collections.accountActions, 'restrictionId', ids.restrictionBannedId],
  ['accountActionReleased', collections.accountActions, 'restrictionId', ids.restrictionReleasedId],
  ['accountActionSoonExpire', collections.accountActions, 'restrictionId', ids.restrictionSoonExpireId],
  ['logReport', collections.operationLogs, 'logId', ids.logReportId],
  ['logReportResolve', collections.operationLogs, 'logId', ids.logReportResolveId],
  ['logReviewTaskResolve', collections.operationLogs, 'logId', ids.logReviewTaskResolveId],
  ['logTarget', collections.operationLogs, 'logId', ids.logTargetId],
  ['logAccountAction', collections.operationLogs, 'logId', ids.logAccountActionId],
  ['logAccountActionRelease', collections.operationLogs, 'logId', ids.logAccountActionReleaseId],
]

const upsertTasks = [
  ['publisherProfile', collections.publisherProfiles, 'publisherProfileId', ids.publisherProfileId, publisherProfileDoc],
  ['weakPublisherProfile', collections.publisherProfiles, 'publisherProfileId', ids.weakPublisherProfileId, weakPublisherProfileDoc],
  ['creatorCard', collections.creatorCards, 'creatorCardId', ids.creatorCardId, creatorCardDoc],
  ['notice', collections.notices, 'noticeId', ids.noticeId, noticeDoc],
  ['reviewTask', collections.reviewTasks, 'reviewTaskId', ids.reviewTaskId, reviewTaskDoc],
  ['report', collections.reports, 'reportId', ids.reportId, reportDoc],
  ['reportHistory', collections.reports, 'reportId', ids.reportHistoryId, reportHistoryDoc],
  ['reportPublisher', collections.reports, 'reportId', ids.reportPublisherId, reportPublisherDoc],
  ['reportCreator', collections.reports, 'reportId', ids.reportCreatorId, reportCreatorDoc],
  ['reportWeakPublisher', collections.reports, 'reportId', ids.reportWeakPublisherId, reportWeakPublisherDoc],
  ['accountAction', collections.accountActions, 'restrictionId', ids.restrictionId, accountActionDoc],
  ['accountActionBanned', collections.accountActions, 'restrictionId', ids.restrictionBannedId, accountActionBannedDoc],
  ['accountActionReleased', collections.accountActions, 'restrictionId', ids.restrictionReleasedId, accountActionReleasedDoc],
  ['accountActionSoonExpire', collections.accountActions, 'restrictionId', ids.restrictionSoonExpireId, accountActionSoonExpireDoc],
  ['logReport', collections.operationLogs, 'logId', ids.logReportId, operationLogReportDoc],
  ['logReportResolve', collections.operationLogs, 'logId', ids.logReportResolveId, operationLogReportResolveDoc],
  ['logReviewTaskResolve', collections.operationLogs, 'logId', ids.logReviewTaskResolveId, operationLogReviewTaskResolveDoc],
  ['logTarget', collections.operationLogs, 'logId', ids.logTargetId, operationLogTargetDoc],
  ['logAccountAction', collections.operationLogs, 'logId', ids.logAccountActionId, operationLogAccountActionDoc],
  ['logAccountActionRelease', collections.operationLogs, 'logId', ids.logAccountActionReleaseId, operationLogAccountActionReleaseDoc],
]

if (cleanupMode) {
  const cleanupResults = {}
  for (const [taskName, collection, field, value] of cleanupTasks) {
    cleanupResults[taskName] = await removeByUniqueField(collection, field, value, applyMode)
  }

  console.log(JSON.stringify({
    ok: true,
    envId,
    prefix,
    mode: applyMode ? 'cleanup-apply' : 'cleanup-dry-run',
    cleanupResults,
  }, null, 2))
  process.exit(0)
}

const upsertResults = {}
for (const [taskName, collection, field, value, doc] of upsertTasks) {
  upsertResults[taskName] = await upsertByUniqueField(collection, field, value, doc, applyMode)
}

console.log(JSON.stringify({
  ok: true,
  envId,
  prefix,
  mode: applyMode ? 'apply' : 'dry-run',
  purpose: 'seed governance populated smoke sample',
  records: ids,
  upsertResults,
  nextSuggestedCommands: [
    `cd ${__dirname} && node seed-admin-detail-smoke-sample.mjs --env ${envId} --prefix ${prefix} --apply`,
    `cd ${__dirname} && node smoke-admin-real-reads.mjs --env ${envId}`,
    `cd ${__dirname} && node seed-admin-detail-smoke-sample.mjs --env ${envId} --prefix ${prefix} --cleanup --apply`,
  ],
}, null, 2))
