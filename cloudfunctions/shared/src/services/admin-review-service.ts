import { COLLECTIONS } from '../constants/collections'
import { ERROR_CODES } from '../constants/error-codes'
import { ADMIN_AVAILABLE_ACTION_KEYS } from '../contracts/admin/action-keys'
import { AdminAvailableAction, HistoryLogItemDto, RiskSummaryDto } from '../contracts/admin/common'
import { ReviewTaskDetailResponseData, ReviewTaskListItemDto, ReviewTaskListResponseData } from '../contracts/admin/review-admin'
import { countByWhere, findOneByField, listByWhere, addDocument, updateDocumentById } from '../db/repository'
import { AdminContext } from '../types'
import { ADMIN_ROLE_CODES } from '../enums/admin'
import { AppError } from '../errors/app-error'
import { createResourceId } from '../utils/id'
import { now, toDate } from '../utils/time'
import { findAdminUserByAdminUserId } from './admin-user-service'
import { writeOperationLog } from './operation-log-service'
import { findUserByUserId } from './user-service'
import { createValidationError } from '../validators/common'

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown, fallback = 0) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toIsoString(value: unknown) {
  const date = toDate(value)

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString()
  }

  return asString(value)
}

function toNullableIsoString(value: unknown) {
  const isoString = toIsoString(value)
  return isoString || null
}

function buildSuggestedTags(riskFlags: string[], riskLevel: string | null) {
  const tags: string[] = []

  if (riskLevel === 'high') {
    tags.push('建议人工复核')
  }

  const mappings: Record<string, string> = {
    sensitive_keywords: '关注敏感词',
    new_user_manual_review: '关注新用户发布',
    contact_anomaly: '关注联系方式异常',
    multi_reports_24h: '关注短时重复举报',
  }

  for (const riskFlag of riskFlags) {
    tags.push(mappings[riskFlag] ?? riskFlag)
  }

  return Array.from(new Set(tags))
}

function buildRiskSummary(task: Record<string, any>, notice: Record<string, any>): RiskSummaryDto {
  const riskLevel = asNullableString(task.riskLevel) ?? asNullableString(notice.riskLevel)
  const riskFlags = Array.from(new Set([...asStringArray(task.riskFlags), ...asStringArray(notice.riskFlags)]))

  return {
    riskLevel,
    riskFlags,
    suggestedTags: buildSuggestedTags(riskFlags, riskLevel),
  }
}

async function findNoticeByNoticeId(noticeId: string) {
  return findOneByField(COLLECTIONS.NOTICES, 'noticeId', noticeId)
}

async function findPublisherProfile(notice: Record<string, any>) {
  const publisherProfileId = asString(notice.publisherProfileId)

  if (publisherProfileId) {
    const profile = await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'publisherProfileId', publisherProfileId)

    if (profile) {
      return profile
    }
  }

  const publisherUserId = asString(notice.publisherUserId)
  return publisherUserId
    ? findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', publisherUserId)
    : null
}

async function resolveAdminDisplayName(adminUserId: string | null) {
  if (!adminUserId) {
    return null
  }

  const adminUser = await findAdminUserByAdminUserId(adminUserId)

  if (!adminUser) {
    return null
  }

  return {
    adminUserId: adminUser.adminUserId,
    displayName: adminUser.displayName,
  }
}

async function resolveUserDisplayName(userId: string) {
  const publisherProfile = await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', userId)

  if (publisherProfile?.displayName) {
    return publisherProfile.displayName
  }

  const creatorCard = await findOneByField(COLLECTIONS.CREATOR_CARDS, 'userId', userId)

  if (creatorCard?.nickname) {
    return creatorCard.nickname
  }

  const user = await findUserByUserId(userId)

  if (user?.nickname) {
    return user.nickname
  }

  return userId
}

async function buildHistoryLogs(task: Record<string, any>, notice: Record<string, any>): Promise<HistoryLogItemDto[]> {
  const noticeLogs = await listByWhere(
    COLLECTIONS.OPERATION_LOGS,
    {
      targetType: 'notice',
      targetId: asString(notice.noticeId),
    },
    {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: 10,
    },
  )

  const taskLogs = await listByWhere(
    COLLECTIONS.OPERATION_LOGS,
    {
      targetType: 'review_task',
      targetId: asString(task.reviewTaskId),
    },
    {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: 10,
    },
  )

  const allLogs = [...noticeLogs, ...taskLogs]
  const uniqueLogs = Array.from(new Map(allLogs.map((log) => [asString(log.logId) || `${log.targetType}:${log.targetId}:${log.action}:${log.createdAt}`, log])).values())
  uniqueLogs.sort((left, right) => toDate(left.createdAt).getTime() - toDate(right.createdAt).getTime())

  const historyLogs: HistoryLogItemDto[] = []

  for (const log of uniqueLogs.slice(0, 10)) {
    let operatorDisplayName = asString(log.operatorId)

    if (log.operatorType === 'admin') {
      operatorDisplayName = (await resolveAdminDisplayName(asString(log.operatorId)))?.displayName ?? operatorDisplayName
    }

    if (log.operatorType === 'user') {
      operatorDisplayName = await resolveUserDisplayName(asString(log.operatorId))
    }

    historyLogs.push({
      action: asString(log.action),
      operatorType: asString(log.operatorType),
      operatorId: asString(log.operatorId),
      operatorDisplayName,
      remark: asString(log.remark),
      createdAt: toIsoString(log.createdAt),
    })
  }

  return historyLogs
}

function buildTaskActions(task: Record<string, any>, adminContext: AdminContext): AdminAvailableAction[] {
  const taskStatus = asString(task.taskStatus)
  const assignedTo = asNullableString(task.assignedTo)
  const assignedToOtherAdmin = assignedTo !== null && assignedTo !== adminContext.adminUserId
  const disabledReason = assignedToOtherAdmin ? '当前任务已被其他管理员领取' : null

  if (taskStatus === 'pending') {
    return [
      {
        key: ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK,
        label: '领取任务',
        variant: 'primary',
        disabled: false,
        disabledReason: null,
      },
    ]
  }

  if (taskStatus !== 'processing') {
    return []
  }

  return [
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK,
      label: '释放任务',
      variant: 'default',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED,
      label: '通过',
      variant: 'primary',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REJECTED,
      label: '驳回',
      variant: 'danger',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_SUPPLEMENT_REQUIRED,
      label: '需补充资料',
      variant: 'default',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_TRANSFER_MANUAL_REVIEW,
      label: '转人工复核',
      variant: 'default',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REMOVED,
      label: '直接下架',
      variant: 'danger',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
  ]
}

async function mapTaskListItem(task: Record<string, any>): Promise<ReviewTaskListItemDto | null> {
  const notice = await findNoticeByNoticeId(asString(task.objectId))

  if (!notice) {
    return null
  }

  const publisherProfile = await findPublisherProfile(notice)
  const assignedAdmin = await resolveAdminDisplayName(asNullableString(task.assignedTo))

  return {
    reviewTaskId: asString(task.reviewTaskId),
    taskStatus: asString(task.taskStatus) as ReviewTaskListItemDto['taskStatus'],
    reviewStage: asString(task.reviewStage) as ReviewTaskListItemDto['reviewStage'],
    queueType: asString(task.queueType, `${asString(task.reviewStage)}_queue`),
    riskLevel: asNullableString(task.riskLevel),
    riskFlags: asStringArray(task.riskFlags),
    createdAt: toIsoString(task.createdAt),
    claimedAt: toNullableIsoString(task.claimedAt),
    notice: {
      noticeId: asString(notice.noticeId),
      title: asString(notice.title),
      status: asString(notice.status),
      city: asString(notice.city),
      cooperationPlatform: asString(notice.cooperationPlatform),
      settlementType: asString(notice.settlementType),
      budgetSummary: asString(notice.budgetSummary),
    },
    publisher: {
      publisherUserId: asString(notice.publisherUserId),
      publisherProfileId: asString(publisherProfile?.publisherProfileId),
      displayName: asString(publisherProfile?.displayName, asString(notice.brandName)),
      identityType: asString(publisherProfile?.identityType, asString(notice.identityTypeSnapshot)),
      city: asString(publisherProfile?.city, asString(notice.city)),
    },
    assignedAdmin,
  }
}

function matchesTaskFilters(task: ReviewTaskListItemDto, filters: Record<string, unknown>) {
  if (typeof filters.city === 'string' && filters.city && task.notice.city !== filters.city) {
    return false
  }

  if (typeof filters.identityType === 'string' && filters.identityType && task.publisher.identityType !== filters.identityType) {
    return false
  }

  if (typeof filters.riskLevel === 'string' && filters.riskLevel && task.riskLevel !== filters.riskLevel) {
    return false
  }

  return true
}

async function scanReviewTasks(filters: Record<string, unknown>) {
  const where: Record<string, unknown> = {}

  if (filters.taskStatus) {
    where.taskStatus = filters.taskStatus
  }

  if (filters.reviewStage) {
    where.reviewStage = filters.reviewStage
  }

  const pageSize = Number(filters.pageSize)
  let rawOffset = Number(filters.offset || 0)
  const batchSize = Math.max(pageSize * 2, 20)
  const matched: ReviewTaskListItemDto[] = []
  let exhausted = false

  while (matched.length < pageSize && !exhausted) {
    const batch = await listByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, where, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: batchSize,
      skip: rawOffset,
    })

    if (batch.length === 0) {
      exhausted = true
      break
    }

    for (const task of batch) {
      rawOffset += 1
      const taskItem = await mapTaskListItem(task)

      if (!taskItem || !matchesTaskFilters(taskItem, filters)) {
        continue
      }

      matched.push(taskItem)

      if (matched.length >= pageSize) {
        break
      }
    }

    if (batch.length < batchSize) {
      exhausted = true
    }
  }

  let hasMore = false
  let probeOffset = rawOffset

  while (!exhausted && !hasMore) {
    const batch = await listByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, where, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: batchSize,
      skip: probeOffset,
    })

    if (batch.length === 0) {
      exhausted = true
      break
    }

    for (const task of batch) {
      probeOffset += 1
      const taskItem = await mapTaskListItem(task)

      if (taskItem && matchesTaskFilters(taskItem, filters)) {
        hasMore = true
        break
      }
    }

    if (batch.length < batchSize) {
      exhausted = true
    }
  }

  return {
    list: matched,
    hasMore,
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ offset: rawOffset })).toString('base64') : '',
  }
}

export async function listReviewTasks(filters: Record<string, unknown>): Promise<ReviewTaskListResponseData> {
  const pendingCountResult = await countByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, {
    taskStatus: 'pending',
  })
  const scanned = await scanReviewTasks(filters)

  return {
    list: scanned.list,
    nextCursor: scanned.nextCursor,
    hasMore: scanned.hasMore,
    summary: {
      pendingCount: asNumber((pendingCountResult as any).total, 0),
    },
  }
}

export async function getReviewTaskDetail(reviewTaskId: string, adminContext: AdminContext): Promise<ReviewTaskDetailResponseData> {
  const task = await findOneByField(COLLECTIONS.NOTICE_REVIEW_TASKS, 'reviewTaskId', reviewTaskId)

  if (!task) {
    throw createValidationError({
      reviewTaskId: 'reviewTaskId 不存在',
    })
  }

  const notice = await findNoticeByNoticeId(asString(task.objectId))

  if (!notice) {
    throw createValidationError({
      reviewTaskId: '任务关联的通告不存在',
    })
  }

  const publisherProfile = await findPublisherProfile(notice)
  const assignedAdmin = await resolveAdminDisplayName(asNullableString(task.assignedTo))
  const historyLogs = await buildHistoryLogs(task, notice)
  const applicationCountResult = asNumber(notice.applicationCount, NaN)
  const applicationCount = Number.isFinite(applicationCountResult)
    ? applicationCountResult
    : asNumber((await countByWhere(COLLECTIONS.APPLICATIONS, { noticeId: notice.noticeId }) as any).total, 0)
  const riskSummary = buildRiskSummary(task, notice)

  return {
    task: {
      reviewTaskId: asString(task.reviewTaskId),
      objectType: 'notice',
      objectId: asString(task.objectId),
      noticeStatusSnapshot: asString(task.noticeStatusSnapshot, asString(notice.status)),
      reviewStage: asString(task.reviewStage) as ReviewTaskDetailResponseData['task']['reviewStage'],
      taskStatus: asString(task.taskStatus) as ReviewTaskDetailResponseData['task']['taskStatus'],
      queueType: asString(task.queueType, `${asString(task.reviewStage)}_queue`),
      riskLevel: asNullableString(task.riskLevel),
      riskFlags: asStringArray(task.riskFlags),
      assignedTo: asNullableString(task.assignedTo),
      assignedAdminName: assignedAdmin?.displayName ?? null,
      claimedAt: toNullableIsoString(task.claimedAt),
      completedAt: toNullableIsoString(task.completedAt),
      reviewResult: asNullableString(task.reviewResult) as ReviewTaskDetailResponseData['task']['reviewResult'],
      reasonCategory: asNullableString(task.reasonCategory),
      reasonText: asNullableString(task.reasonText),
      nextQueueType: asNullableString(task.nextQueueType),
      createdAt: toIsoString(task.createdAt),
    },
    notice: {
      noticeId: asString(notice.noticeId),
      publisherUserId: asString(notice.publisherUserId),
      publisherProfileId: asString(publisherProfile?.publisherProfileId, asString(notice.publisherProfileId)),
      title: asString(notice.title),
      brandName: asNullableString(notice.brandName),
      identityTypeSnapshot: asString(notice.identityTypeSnapshot, asString(publisherProfile?.identityType)),
      cooperationPlatform: asString(notice.cooperationPlatform),
      cooperationCategory: asString(notice.cooperationCategory),
      cooperationType: asString(notice.cooperationType),
      city: asString(notice.city),
      settlementType: asString(notice.settlementType),
      budgetRange: asString(notice.budgetRange),
      budgetSummary: asString(notice.budgetSummary),
      recruitCount: Number.isFinite(Number(notice.recruitCount)) ? Number(notice.recruitCount) : null,
      deadlineAt: toIsoString(notice.deadlineAt),
      creatorRequirements: asString(notice.creatorRequirements),
      cooperationDescription: asString(notice.cooperationDescription),
      attachments: asStringArray(notice.attachments),
      status: asString(notice.status),
      reviewRoundCount: asNumber(notice.reviewRoundCount, 0),
      latestReviewReasonCategory: asNullableString(notice.latestReviewReasonCategory),
      latestReviewReasonText: asNullableString(notice.latestReviewReasonText),
      riskFlags: Array.from(new Set([...asStringArray(notice.riskFlags), ...asStringArray(task.riskFlags)])),
      applicationCount,
      publishedAt: toNullableIsoString(notice.publishedAt),
      closedAt: toNullableIsoString(notice.closedAt),
      removedAt: toNullableIsoString(notice.removedAt),
    },
    publisherProfile: {
      publisherProfileId: asString(publisherProfile?.publisherProfileId, asString(notice.publisherProfileId)),
      userId: asString(publisherProfile?.userId, asString(notice.publisherUserId)),
      identityType: asString(publisherProfile?.identityType, asString(notice.identityTypeSnapshot)),
      displayName: asString(publisherProfile?.displayName, asString(notice.brandName)),
      city: asString(publisherProfile?.city, asString(notice.city)),
      contactType: asString(publisherProfile?.contactType),
      contactValue: asString(publisherProfile?.contactValue),
      intro: asNullableString(publisherProfile?.intro),
      profileCompleteness: asNumber(publisherProfile?.profileCompleteness, 0),
      publishCount: asNumber(publisherProfile?.publishCount, 0),
      approvedPublishCount: asNumber(publisherProfile?.approvedPublishCount, 0),
      violationCount: asNumber(publisherProfile?.violationCount, 0),
      status: asString(publisherProfile?.status),
    },
    riskSummary,
    historyLogs,
    availableActions: buildTaskActions(task, adminContext),
  }
}

function canOverrideReviewTask(adminContext: AdminContext) {
  return adminContext.roleCodes.includes(ADMIN_ROLE_CODES.OPS_ADMIN) || adminContext.roleCodes.includes(ADMIN_ROLE_CODES.SUPER_ADMIN)
}

async function assertReviewTaskEditable(task: Record<string, any>, adminContext: AdminContext) {
  const assignedTo = asNullableString(task.assignedTo)

  if (assignedTo && assignedTo !== adminContext.adminUserId && !canOverrideReviewTask(adminContext)) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前任务已由其他管理员处理',
    })
  }
}

export async function claimReviewTask(reviewTaskId: string, adminContext: AdminContext, requestId: string) {
  const task = await findOneByField(COLLECTIONS.NOTICE_REVIEW_TASKS, 'reviewTaskId', reviewTaskId)

  if (!task) {
    throw createValidationError({
      reviewTaskId: 'reviewTaskId 不存在',
    })
  }

  if (asString(task.taskStatus) !== 'pending') {
    throw new AppError({
      code: ERROR_CODES.REVIEW_TASK_PROCESSED,
      message: '当前任务不可领取',
    })
  }

  const currentTime = now()
  const patch = {
    taskStatus: 'processing',
    assignedTo: adminContext.adminUserId,
    claimedAt: currentTime,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICE_REVIEW_TASKS, task._id, patch)
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'review_task_claim',
    targetType: 'review_task',
    targetId: reviewTaskId,
    requestId,
    beforeSnapshot: {
      taskStatus: task.taskStatus,
      assignedTo: task.assignedTo ?? null,
    },
    afterSnapshot: patch,
    remark: '领取审核任务',
  })

  return {
    reviewTaskId,
    taskStatus: patch.taskStatus,
    assignedTo: patch.assignedTo,
    claimedAt: patch.claimedAt,
  }
}

export async function releaseReviewTask(reviewTaskId: string, adminContext: AdminContext, requestId: string) {
  const task = await findOneByField(COLLECTIONS.NOTICE_REVIEW_TASKS, 'reviewTaskId', reviewTaskId)

  if (!task) {
    throw createValidationError({
      reviewTaskId: 'reviewTaskId 不存在',
    })
  }

  if (asString(task.taskStatus) !== 'processing') {
    throw new AppError({
      code: ERROR_CODES.REVIEW_TASK_PROCESSED,
      message: '当前任务不可释放',
    })
  }

  await assertReviewTaskEditable(task, adminContext)

  const currentTime = now()
  const patch = {
    taskStatus: 'pending',
    assignedTo: null,
    claimedAt: null,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICE_REVIEW_TASKS, task._id, patch)
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'review_task_release',
    targetType: 'review_task',
    targetId: reviewTaskId,
    requestId,
    beforeSnapshot: {
      taskStatus: task.taskStatus,
      assignedTo: task.assignedTo ?? null,
      claimedAt: task.claimedAt ?? null,
    },
    afterSnapshot: patch,
    remark: '释放审核任务',
  })

  return {
    reviewTaskId,
    taskStatus: patch.taskStatus,
  }
}

export async function resolveReviewTask(
  payload: {
    reviewTaskId: string
    reviewResult: string
    reasonCategory?: string
    reasonText?: string
    notifyUser?: boolean
    nextQueueType?: string | null
  },
  adminContext: AdminContext,
  requestId: string,
) {
  const task = await findOneByField(COLLECTIONS.NOTICE_REVIEW_TASKS, 'reviewTaskId', payload.reviewTaskId)

  if (!task) {
    throw createValidationError({
      reviewTaskId: 'reviewTaskId 不存在',
    })
  }

  if (asString(task.taskStatus) !== 'processing') {
    throw new AppError({
      code: ERROR_CODES.REVIEW_TASK_PROCESSED,
      message: '当前任务不可处理',
    })
  }

  await assertReviewTaskEditable(task, adminContext)

  const notice = await findNoticeByNoticeId(asString(task.objectId))

  if (!notice) {
    throw createValidationError({
      reviewTaskId: '任务关联通告不存在',
    })
  }

  const currentTime = now()
  const reviewResult = payload.reviewResult
  const nextNoticeStatus = reviewResult === 'approved'
    ? 'active'
    : reviewResult === 'rejected'
      ? 'rejected'
      : reviewResult === 'supplement_required'
        ? 'supplement_required'
        : reviewResult === 'removed'
          ? 'removed'
          : 'pending_review'

  const taskPatch = {
    taskStatus: 'completed',
    reviewResult,
    reasonCategory: payload.reasonCategory ?? null,
    reasonText: payload.reasonText ?? null,
    nextQueueType: payload.nextQueueType ?? null,
    completedAt: currentTime,
    updatedAt: currentTime,
  }

  const noticePatch: Record<string, unknown> = {
    status: nextNoticeStatus,
    latestReviewReasonCategory: payload.reasonCategory ?? null,
    latestReviewReasonText: payload.reasonText ?? null,
    updatedAt: currentTime,
  }

  if (reviewResult === 'approved') {
    noticePatch.publishedAt = notice.publishedAt ?? currentTime
    noticePatch.removedAt = notice.removedAt ?? null
  }

  if (reviewResult === 'removed') {
    noticePatch.removedAt = currentTime
  }

  await updateDocumentById(COLLECTIONS.NOTICE_REVIEW_TASKS, task._id, taskPatch)
  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, noticePatch)

  let nextReviewTaskId: string | null = null

  if (reviewResult === 'transfer_manual_review' && payload.nextQueueType) {
    nextReviewTaskId = createResourceId('rtk')
    await addDocument(COLLECTIONS.NOTICE_REVIEW_TASKS, {
      reviewTaskId: nextReviewTaskId,
      objectType: 'notice',
      objectId: asString(task.objectId),
      noticeStatusSnapshot: 'pending_review',
      reviewStage: 'manual_review',
      taskStatus: 'pending',
      queueType: payload.nextQueueType,
      riskLevel: task.riskLevel ?? null,
      riskFlags: asStringArray(task.riskFlags),
      assignedTo: null,
      claimedAt: null,
      completedAt: null,
      reviewResult: null,
      reasonCategory: null,
      reasonText: null,
      nextQueueType: null,
      createdAt: currentTime,
      updatedAt: currentTime,
    })
  }

  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'review_task_resolve',
    targetType: 'review_task',
    targetId: payload.reviewTaskId,
    requestId,
    beforeSnapshot: {
      taskStatus: task.taskStatus,
      reviewResult: task.reviewResult ?? null,
      noticeStatus: notice.status,
    },
    afterSnapshot: {
      taskStatus: taskPatch.taskStatus,
      reviewResult,
      noticeStatus: nextNoticeStatus,
      nextReviewTaskId,
    },
    remark: payload.reasonText ?? `审核结果：${reviewResult}`,
  })

  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'notice_review_result',
    targetType: 'notice',
    targetId: asString(notice.noticeId),
    requestId,
    beforeSnapshot: {
      status: notice.status,
      latestReviewReasonCategory: notice.latestReviewReasonCategory ?? null,
      latestReviewReasonText: notice.latestReviewReasonText ?? null,
    },
    afterSnapshot: {
      status: nextNoticeStatus,
      latestReviewReasonCategory: payload.reasonCategory ?? null,
      latestReviewReasonText: payload.reasonText ?? null,
    },
    remark: payload.notifyUser ? '审核完成并要求发送通知' : '审核完成',
  })

  return {
    reviewTaskId: payload.reviewTaskId,
    taskStatus: taskPatch.taskStatus,
    noticeStatus: nextNoticeStatus,
    nextReviewTaskId,
  }
}
