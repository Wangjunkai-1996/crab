import { COLLECTIONS } from '../constants/collections'
import { ERROR_CODES } from '../constants/error-codes'
import { ACCOUNT_STATUSES } from '../enums/account-status'
import { AppError } from '../errors/app-error'
import {
  NoticeCloseResponseData,
  NoticeDetailResponseData,
  NoticeDraftInput,
  NoticeDraftMutationResponseData,
  NoticeDraftUpdateResponseData,
  NoticeListResponseData,
  NoticeMyListResponseData,
  NoticeRepublishResponseData,
  NoticeSubmitReviewResponseData,
} from '../contracts/miniprogram/notice-bff'
import { addDocument, countByWhere, findOneByField, listByWhere, updateDocumentById } from '../db/repository'
import { createUserMessage } from './message-service'
import { writeOperationLog } from './operation-log-service'
import { UserContext } from '../types'
import { createResourceId } from '../utils/id'
import { isFutureDate, now, toDate } from '../utils/time'
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

function asOptionalNumber(value: unknown) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
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

function buildCursor(offset: number) {
  return offset > 0 ? Buffer.from(JSON.stringify({ offset })).toString('base64') : ''
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    rejected: '驳回待修改',
    supplement_required: '需补充资料',
    active: '进行中',
    expired: '已截止',
    closed: '已关闭',
    removed: '已下架',
  }

  return labels[status] ?? status
}

function settlementTypeLabel(settlementType: string) {
  const labels: Record<string, string> = {
    fixed_price: '固定报价',
    negotiable: '可议价',
    barter: '置换合作',
    free_experience: '免费体验',
    other: '其他',
  }

  return labels[settlementType] ?? settlementType
}

function budgetRangeLabel(budgetRange: string) {
  const labels: Record<string, string> = {
    below_200: '200 元以下',
    '200_500': '200-500 元',
    '500_1000': '500-1000 元',
    '1000_3000': '1000-3000 元',
    '3000_5000': '3000-5000 元',
    '5000_plus': '5000 元以上',
    not_applicable: '不适用',
  }

  return labels[budgetRange] ?? budgetRange
}

function buildBudgetSummary(settlementType: string, budgetRange: string) {
  if (!settlementType) {
    return ''
  }

  if (['fixed_price', 'negotiable'].includes(settlementType)) {
    if (!budgetRange) {
      return settlementTypeLabel(settlementType)
    }

    return `${settlementTypeLabel(settlementType)} / ${budgetRangeLabel(budgetRange)}`
  }

  return settlementTypeLabel(settlementType)
}

async function findPublisherProfile(notice: Record<string, any>) {
  const publisherProfileId = asString(notice.publisherProfileId)

  if (publisherProfileId) {
    const profile = await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'publisherProfileId', publisherProfileId)

    if (profile) {
      return profile
    }
  }

  return findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', asString(notice.publisherUserId))
}

async function findPublisherProfileByUserId(userId: string) {
  return findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', userId)
}

async function findCreatorApplication(noticeId: string, creatorUserId: string) {
  const records = await listByWhere(COLLECTIONS.APPLICATIONS, {
    noticeId,
    creatorUserId,
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 5,
  })

  return records[0] ?? null
}

function canViewPublisherContactByApplicationStatus(status: string | null) {
  return ['contact_pending', 'communicating', 'completed'].includes(status || '')
}

function canApplyNotice(notice: Record<string, any>, userContext: UserContext, existingApplication: Record<string, any> | null) {
  if (asString(notice.status) !== 'active') {
    return false
  }

  if (!userContext.roleFlags.creatorEnabled) {
    return false
  }

  if ([ACCOUNT_STATUSES.RESTRICTED_APPLY, ACCOUNT_STATUSES.BANNED].includes(userContext.accountStatus as any)) {
    return false
  }

  if (existingApplication && asString(existingApplication.status) !== 'withdrawn') {
    return false
  }

  return true
}

function buildCtaState(input: {
  isOwner: boolean
  canApply: boolean
  hasApplied: boolean
  creatorEnabled: boolean
  noticeStatus: string
  accountStatus: string
}) {
  if (input.isOwner) {
    return {
      primaryAction: 'view_applications',
      primaryText: '查看报名',
      disabledReason: null,
    }
  }

  if (input.hasApplied) {
    return {
      primaryAction: 'view_application',
      primaryText: '查看报名',
      disabledReason: null,
    }
  }

  if (!input.creatorEnabled) {
    return {
      primaryAction: 'complete_creator_card',
      primaryText: '完善达人名片后报名',
      disabledReason: '请先完善达人名片',
    }
  }

  if ([ACCOUNT_STATUSES.RESTRICTED_APPLY, ACCOUNT_STATUSES.BANNED].includes(input.accountStatus as any)) {
    return {
      primaryAction: 'disabled',
      primaryText: '当前不可报名',
      disabledReason: '当前账号已被限制报名',
    }
  }

  if (input.canApply) {
    return {
      primaryAction: 'apply',
      primaryText: '立即报名',
      disabledReason: null,
    }
  }

  return {
    primaryAction: 'disabled',
    primaryText: input.noticeStatus === 'active' ? '当前不可报名' : '暂不可报名',
    disabledReason: input.noticeStatus === 'active' ? '当前状态暂不可报名' : `通告当前状态为${statusLabel(input.noticeStatus)}`,
  }
}

async function scanNotices(where: Record<string, unknown>, pageSize: number, offset: number, matcher: (notice: Record<string, any>) => boolean) {
  const batchSize = Math.max(pageSize * 2, 20)
  const list: Record<string, any>[] = []
  let rawOffset = offset

  while (list.length < pageSize) {
    const batch = await listByWhere(COLLECTIONS.NOTICES, where, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: batchSize,
      skip: rawOffset,
    })

    if (batch.length === 0) {
      break
    }

    for (const notice of batch) {
      rawOffset += 1

      if (!matcher(notice)) {
        continue
      }

      list.push(notice)

      if (list.length >= pageSize) {
        break
      }
    }

    if (batch.length < batchSize) {
      break
    }
  }

  const nextBatch = await listByWhere(COLLECTIONS.NOTICES, where, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 50,
    skip: rawOffset,
  })
  const hasMore = nextBatch.some(matcher)

  return {
    list,
    hasMore,
    nextCursor: hasMore ? buildCursor(rawOffset) : '',
  }
}

async function mapNoticeCard(notice: Record<string, any>) {
  const publisherProfile = await findPublisherProfile(notice)

  return {
    noticeId: asString(notice.noticeId),
    title: asString(notice.title),
    cooperationPlatform: asString(notice.cooperationPlatform),
    cooperationCategory: asString(notice.cooperationCategory),
    cooperationType: asString(notice.cooperationType) || undefined,
    budgetSummary: asString(notice.budgetSummary),
    city: asString(notice.city),
    deadlineAt: toIsoString(notice.deadlineAt),
    createdAt: notice.createdAt ? toIsoString(notice.createdAt) : undefined,
    publisherSummary: {
      displayName: asString(publisherProfile?.displayName, asString(notice.brandName)),
      profileCompleteness: asOptionalNumber(publisherProfile?.profileCompleteness),
    },
    statusTag: {
      code: asString(notice.status),
      label: statusLabel(asString(notice.status)),
    },
    applicationCount: asNumber(notice.applicationCount, 0),
  }
}

function createNoticeStatusError(currentStatus: string, expectedStatuses: string[]) {
  throw new AppError({
    code: ERROR_CODES.NOTICE_STATUS_INVALID,
    message: `当前通告状态不支持该操作：${currentStatus}`,
    data: {
      currentStatus,
      expectedStatuses,
    },
  })
}

async function ensureOwnedNotice(noticeId: string, userContext: UserContext) {
  const notice = await findOneByField(COLLECTIONS.NOTICES, 'noticeId', noticeId)

  if (!notice) {
    throw createValidationError({
      noticeId: 'noticeId 不存在',
    })
  }

  if (asString(notice.publisherUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前通告不可操作',
    })
  }

  return notice
}

function ensurePublisherProfileComplete(profile: Record<string, any> | null) {
  if (!profile) {
    throw new AppError({
      code: ERROR_CODES.PUBLISHER_PROFILE_REQUIRED,
      message: '请先完善发布方资料',
    })
  }

  const missingFieldKeys = ['identityType', 'displayName', 'city', 'contactType', 'contactValue']
    .filter((field) => !asNullableString(profile[field]))

  if (missingFieldKeys.length > 0) {
    throw new AppError({
      code: ERROR_CODES.PUBLISHER_PROFILE_REQUIRED,
      message: '请先完善发布方资料',
      data: {
        missingFieldKeys,
      },
    })
  }

  return profile
}

function buildNoticeWriteDocument(input: NoticeDraftInput, currentNotice: Record<string, any> | null, profile: Record<string, any>, currentTime: Date) {
  const nextSettlementType = input.settlementType ?? asString(currentNotice?.settlementType)
  let nextBudgetRange = input.budgetRange ?? asString(currentNotice?.budgetRange)

  if (nextSettlementType && ['barter', 'free_experience', 'other'].includes(nextSettlementType) && !nextBudgetRange) {
    nextBudgetRange = 'not_applicable'
  }

  return {
    title: input.title ?? asString(currentNotice?.title),
    brandName: typeof input.brandName !== 'undefined' ? input.brandName : asNullableString(currentNotice?.brandName),
    cooperationPlatform: input.cooperationPlatform ?? asString(currentNotice?.cooperationPlatform),
    cooperationCategory: input.cooperationCategory ?? asString(currentNotice?.cooperationCategory),
    cooperationType: input.cooperationType ?? asString(currentNotice?.cooperationType),
    city: input.city ?? asString(currentNotice?.city, asString(profile.city)),
    settlementType: nextSettlementType,
    budgetRange: nextBudgetRange,
    budgetSummary: buildBudgetSummary(nextSettlementType, nextBudgetRange),
    recruitCount: typeof input.recruitCount !== 'undefined'
      ? (input.recruitCount ?? null)
      : (Number.isFinite(Number(currentNotice?.recruitCount)) ? Number(currentNotice?.recruitCount) : null),
    deadlineAt: typeof input.deadlineAt !== 'undefined' ? input.deadlineAt ?? null : currentNotice?.deadlineAt ?? null,
    creatorRequirements: input.creatorRequirements ?? asString(currentNotice?.creatorRequirements),
    cooperationDescription: input.cooperationDescription ?? asString(currentNotice?.cooperationDescription),
    attachments: typeof input.attachments !== 'undefined' ? input.attachments ?? [] : asStringArray(currentNotice?.attachments),
    publisherProfileId: asString(profile.publisherProfileId),
    identityTypeSnapshot: asString(profile.identityType),
    publisherContactTypeSnapshot: asString(profile.contactType),
    publisherContactValueSnapshot: asString(profile.contactValue),
    updatedAt: currentTime,
  }
}

function validateNoticeSubmissionFields(notice: Record<string, any>) {
  const fieldErrors: Record<string, string> = {}

  if (!asNullableString(notice.title)) {
    fieldErrors.title = 'title 不能为空'
  }

  if (!asNullableString(notice.cooperationPlatform)) {
    fieldErrors.cooperationPlatform = 'cooperationPlatform 不能为空'
  }

  if (!asNullableString(notice.cooperationCategory)) {
    fieldErrors.cooperationCategory = 'cooperationCategory 不能为空'
  }

  if (!asNullableString(notice.cooperationType)) {
    fieldErrors.cooperationType = 'cooperationType 不能为空'
  }

  if (!asNullableString(notice.city)) {
    fieldErrors.city = 'city 不能为空'
  }

  if (!asNullableString(notice.settlementType)) {
    fieldErrors.settlementType = 'settlementType 不能为空'
  }

  if (!asNullableString(notice.budgetRange)) {
    fieldErrors.budgetRange = 'budgetRange 不能为空'
  }

  if (!notice.deadlineAt || !isFutureDate(notice.deadlineAt)) {
    fieldErrors.deadlineAt = 'deadlineAt 必须为未来时间'
  }

  if (!asNullableString(notice.creatorRequirements)) {
    fieldErrors.creatorRequirements = 'creatorRequirements 不能为空'
  }

  if (!asNullableString(notice.cooperationDescription)) {
    fieldErrors.cooperationDescription = 'cooperationDescription 不能为空'
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw createValidationError(fieldErrors)
  }
}

async function createReviewTaskForNotice(notice: Record<string, any>, reviewStage: 'initial_review' | 'resubmission_review', currentTime: Date) {
  const reviewTaskId = createResourceId('rtk')

  await addDocument(COLLECTIONS.NOTICE_REVIEW_TASKS, {
    reviewTaskId,
    objectType: 'notice',
    objectId: asString(notice.noticeId),
    noticeStatusSnapshot: 'pending_review',
    reviewStage,
    taskStatus: 'pending',
    queueType: `${reviewStage}_queue`,
    riskLevel: null,
    riskFlags: [],
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

  return reviewTaskId
}

export async function listDiscoveryNotices(
  filters: {
    keyword?: string
    cooperationPlatform?: string
    cooperationCategory?: string
    city?: string
    pageSize: number
    offset: number
  },
): Promise<NoticeListResponseData> {
  const where: Record<string, unknown> = {
    status: 'active',
  }

  if (filters.cooperationPlatform) {
    where.cooperationPlatform = filters.cooperationPlatform
  }

  if (filters.cooperationCategory) {
    where.cooperationCategory = filters.cooperationCategory
  }

  if (filters.city) {
    where.city = filters.city
  }

  const matcher = (notice: Record<string, any>) => {
    if (!filters.keyword) {
      return true
    }

    const keyword = filters.keyword.toLowerCase()
    return [asString(notice.title), asString(notice.brandName), asString(notice.city)]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  }

  const scanned = await scanNotices(where, filters.pageSize, filters.offset, matcher)
  const list = await Promise.all(scanned.list.map(mapNoticeCard))
  const totalResult = await countByWhere(COLLECTIONS.NOTICES, where)

  return {
    list,
    nextCursor: scanned.nextCursor,
    hasMore: scanned.hasMore,
    filterSummary: {
      total: asNumber((totalResult as any).total, list.length),
      activeCity: filters.city ?? null,
      activePlatform: filters.cooperationPlatform ?? null,
      activeCategory: filters.cooperationCategory ?? null,
    },
    filterEcho: {
      keyword: filters.keyword ?? '',
      cooperationPlatform: filters.cooperationPlatform ?? null,
      cooperationCategory: filters.cooperationCategory ?? null,
      city: filters.city ?? null,
    },
  }
}

export async function listPublisherNotices(
  publisherUserId: string,
  filters: {
    status?: string
    pageSize: number
    offset: number
  },
): Promise<NoticeMyListResponseData> {
  const where: Record<string, unknown> = {
    publisherUserId,
  }

  if (filters.status) {
    where.status = filters.status
  }

  const scanned = await scanNotices(where, filters.pageSize, filters.offset, () => true)
  const list = await Promise.all(scanned.list.map(mapNoticeCard))

  return {
    list,
    nextCursor: scanned.nextCursor,
    hasMore: scanned.hasMore,
  }
}

export async function getNoticeDetail(noticeId: string, userContext: UserContext): Promise<NoticeDetailResponseData> {
  const notice = await findOneByField(COLLECTIONS.NOTICES, 'noticeId', noticeId)

  if (!notice) {
    throw createValidationError({
      noticeId: 'noticeId 不存在',
    })
  }

  const isOwner = asString(notice.publisherUserId) === userContext.userId

  if (!isOwner && asString(notice.status) !== 'active') {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前通告不可查看',
    })
  }

  const publisherProfile = await findPublisherProfile(notice)
  const existingApplication = await findCreatorApplication(noticeId, userContext.userId)
  const existingApplicationStatus = existingApplication ? asString(existingApplication.status) : null
  const hasApplied = Boolean(existingApplication && existingApplicationStatus !== 'withdrawn')
  const canApply = canApplyNotice(notice, userContext, existingApplication)
  const canViewPublisherContact = isOwner || canViewPublisherContactByApplicationStatus(existingApplicationStatus)

  return {
    notice: {
      noticeId: asString(notice.noticeId),
      title: asString(notice.title),
      brandName: asNullableString(notice.brandName),
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
      applicationCount: asNumber(notice.applicationCount, 0),
      publishedAt: asNullableString(notice.publishedAt) ? toIsoString(notice.publishedAt) : null,
    },
    publisherSummary: {
      publisherUserId: asString(notice.publisherUserId),
      publisherProfileId: asString(notice.publisherProfileId),
      displayName: asString(publisherProfile?.displayName, asString(notice.brandName)),
      identityType: asString(publisherProfile?.identityType, asString(notice.identityTypeSnapshot)),
      city: asString(publisherProfile?.city, asString(notice.city)),
    },
    permissionState: {
      canApply,
      canViewPublisherContact,
      hasApplied,
      isOwner,
    },
    ctaState: buildCtaState({
      isOwner,
      canApply,
      hasApplied,
      creatorEnabled: userContext.roleFlags.creatorEnabled,
      noticeStatus: asString(notice.status),
      accountStatus: userContext.accountStatus,
    }),
    maskedOrFullContact: canViewPublisherContact
      ? {
          contactType: asNullableString(notice.publisherContactTypeSnapshot) ?? asNullableString(publisherProfile?.contactType),
          contactValue: asNullableString(notice.publisherContactValueSnapshot) ?? asNullableString(publisherProfile?.contactValue),
          isMasked: false,
        }
      : null,
  }
}

export async function createNoticeDraft(input: NoticeDraftInput, userContext: UserContext, requestId: string): Promise<NoticeDraftMutationResponseData> {
  const currentTime = now()
  const publisherProfile = ensurePublisherProfileComplete(await findPublisherProfileByUserId(userContext.userId))
  const noticeId = createResourceId('notice')
  const noticeDocument = buildNoticeWriteDocument(input, null, publisherProfile, currentTime)

  await addDocument(COLLECTIONS.NOTICES, {
    noticeId,
    publisherUserId: userContext.userId,
    status: 'draft',
    reviewRoundCount: 0,
    latestReviewReasonCategory: null,
    latestReviewReasonText: null,
    riskFlags: [],
    applicationCount: 0,
    publishedAt: null,
    closedAt: null,
    removedAt: null,
    createdAt: currentTime,
    ...noticeDocument,
  })

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'notice_create_draft',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    afterSnapshot: {
      status: 'draft',
      title: noticeDocument.title,
    },
  })

  return {
    noticeId,
    status: 'draft',
  }
}

export async function updateNoticeDraft(noticeId: string, input: NoticeDraftInput, userContext: UserContext, requestId: string): Promise<NoticeDraftUpdateResponseData> {
  const notice = await ensureOwnedNotice(noticeId, userContext)
  const status = asString(notice.status)

  if (!['draft', 'rejected', 'supplement_required'].includes(status)) {
    createNoticeStatusError(status, ['draft', 'rejected', 'supplement_required'])
  }

  const currentTime = now()
  const publisherProfile = ensurePublisherProfileComplete(await findPublisherProfileByUserId(userContext.userId))
  const patch = buildNoticeWriteDocument(input, notice, publisherProfile, currentTime)

  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'notice_update_draft',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    beforeSnapshot: {
      status,
      title: notice.title,
    },
    afterSnapshot: {
      status,
      title: patch.title,
      updatedAt: patch.updatedAt,
    },
  })

  return {
    noticeId,
    status,
    updatedAt: toIsoString(currentTime),
  }
}

export async function submitNoticeReview(noticeId: string, userContext: UserContext, requestId: string): Promise<NoticeSubmitReviewResponseData> {
  const notice = await ensureOwnedNotice(noticeId, userContext)
  const status = asString(notice.status)

  if (!['draft', 'rejected', 'supplement_required'].includes(status)) {
    createNoticeStatusError(status, ['draft', 'rejected', 'supplement_required'])
  }

  const publisherProfile = ensurePublisherProfileComplete(await findPublisherProfileByUserId(userContext.userId))
  const currentTime = now()
  const refreshedFields = buildNoticeWriteDocument({}, notice, publisherProfile, currentTime)
  const nextNotice = {
    ...notice,
    ...refreshedFields,
  }

  validateNoticeSubmissionFields(nextNotice)

  const reviewRoundCount = asNumber(notice.reviewRoundCount, 0) + 1
  const reviewStage = status === 'draft' ? 'initial_review' : 'resubmission_review'
  const currentReviewTaskId = await createReviewTaskForNotice({ noticeId }, reviewStage, currentTime)
  const patch = {
    ...refreshedFields,
    status: 'pending_review',
    reviewRoundCount,
    latestReviewReasonCategory: null,
    latestReviewReasonText: null,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'notice_submit_review',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    beforeSnapshot: {
      status,
      reviewRoundCount: asNumber(notice.reviewRoundCount, 0),
    },
    afterSnapshot: {
      status: 'pending_review',
      reviewRoundCount,
      currentReviewTaskId,
      reviewStage,
    },
  })

  await createUserMessage({
    receiverUserId: userContext.userId,
    messageType: 'notice_review',
    title: '通告已提交审核',
    summary: `《${asString(notice.title)}》已进入审核队列。`,
    relatedObjectType: 'notice',
    relatedObjectId: noticeId,
  })

  return {
    noticeId,
    status: 'pending_review',
    reviewRoundCount,
    currentReviewTaskId,
  }
}

export async function closeNotice(noticeId: string, userContext: UserContext, requestId: string): Promise<NoticeCloseResponseData> {
  const notice = await ensureOwnedNotice(noticeId, userContext)
  const status = asString(notice.status)

  if (status === 'closed' && notice.closedAt) {
    return {
      noticeId,
      status,
      closedAt: toIsoString(notice.closedAt),
    }
  }

  if (status !== 'active') {
    createNoticeStatusError(status, ['active'])
  }

  const currentTime = now()
  const patch = {
    status: 'closed',
    closedAt: currentTime,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'notice_close',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    beforeSnapshot: {
      status,
      closedAt: notice.closedAt ?? null,
    },
    afterSnapshot: patch,
  })

  return {
    noticeId,
    status: 'closed',
    closedAt: toIsoString(currentTime),
  }
}

export async function republishNotice(noticeId: string, userContext: UserContext, requestId: string): Promise<NoticeRepublishResponseData> {
  const notice = await ensureOwnedNotice(noticeId, userContext)
  const status = asString(notice.status)

  if (!['expired', 'closed'].includes(status)) {
    createNoticeStatusError(status, ['expired', 'closed'])
  }

  if (!isFutureDate(notice.deadlineAt)) {
    throw createValidationError({
      deadlineAt: 'republish 当前缺少新的未来 deadlineAt，暂无法直接重发',
    })
  }

  const publisherProfile = ensurePublisherProfileComplete(await findPublisherProfileByUserId(userContext.userId))
  const currentTime = now()
  const refreshedFields = buildNoticeWriteDocument({}, notice, publisherProfile, currentTime)
  const nextNotice = {
    ...notice,
    ...refreshedFields,
  }

  validateNoticeSubmissionFields(nextNotice)

  const reviewRoundCount = asNumber(notice.reviewRoundCount, 0) + 1
  const currentReviewTaskId = await createReviewTaskForNotice({ noticeId }, 'initial_review', currentTime)
  const patch = {
    ...refreshedFields,
    status: 'pending_review',
    reviewRoundCount,
    latestReviewReasonCategory: null,
    latestReviewReasonText: null,
    publishedAt: null,
    closedAt: null,
    removedAt: null,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'notice_republish',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    beforeSnapshot: {
      status,
      reviewRoundCount: asNumber(notice.reviewRoundCount, 0),
      deadlineAt: notice.deadlineAt ? toIsoString(notice.deadlineAt) : null,
    },
    afterSnapshot: {
      status: 'pending_review',
      reviewRoundCount,
      currentReviewTaskId,
    },
  })

  await createUserMessage({
    receiverUserId: userContext.userId,
    messageType: 'notice_review',
    title: '通告已重新提交审核',
    summary: `《${asString(notice.title)}》已重新进入审核队列。`,
    relatedObjectType: 'notice',
    relatedObjectId: noticeId,
  })

  return {
    noticeId,
    status: 'pending_review',
    reviewRoundCount,
    currentReviewTaskId,
  }
}
