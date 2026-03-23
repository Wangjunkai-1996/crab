import { COLLECTIONS } from '../constants/collections'
import { ERROR_CODES } from '../constants/error-codes'
import { AppError } from '../errors/app-error'
import {
  ApplicationDetailResponseData,
  ApplicationMyListResponseData,
  ApplicationStatusMutationResponseData,
  ApplicationSubmitPayload,
  ApplicationSubmitResponseData,
  ApplicationWithdrawResponseData,
  PublisherApplicationAction,
  PublisherApplicationDetailResponseData,
  PublisherApplicationListResponseData,
} from '../contracts/miniprogram/application-bff'
import { addDocument, findOneByField, listByWhere, updateDocumentById } from '../db/repository'
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

function canViewPublisherContact(status: string) {
  return ['contact_pending', 'communicating', 'completed'].includes(status)
}

function creatorContactRevealState(application: Record<string, any>) {
  if (application.creatorContactRevealedAt) {
    return 'revealed' as const
  }

  if (application.contactValueSnapshot) {
    return 'masked' as const
  }

  return 'hidden' as const
}

function publisherContactRevealState(application: Record<string, any>) {
  if (application.publisherContactRevealedAt) {
    return 'revealed' as const
  }

  return canViewPublisherContact(asString(application.status)) ? 'revealed' : 'hidden'
}

function buildPublisherAvailableActions(status: string, revealState: 'hidden' | 'masked' | 'revealed'): PublisherApplicationAction[] {
  const actions: PublisherApplicationAction[] = []

  if (status === 'applied') {
    actions.push('markViewed')
  }

  if (status === 'viewed') {
    actions.push('markContactPending', 'markRejected')
  }

  if (status === 'contact_pending') {
    actions.push('markCommunicating', 'markRejected')
  }

  if (status === 'communicating') {
    actions.push('markCompleted', 'markRejected')
  }

  if (revealState !== 'revealed' && status !== 'withdrawn') {
    actions.push('revealCreatorContact')
  }

  return actions
}

function buildContactText(contactType: string | null, contactValue: string | null) {
  if (!contactValue) {
    return ''
  }

  return contactType ? `${contactType}：${contactValue}` : contactValue
}

function applicationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    applied: '已报名',
    viewed: '已查看',
    contact_pending: '待联系',
    communicating: '已沟通',
    rejected: '未入选',
    withdrawn: '已撤回',
    completed: '已完成合作',
  }

  return labels[status] ?? status
}

async function findNoticeByNoticeId(noticeId: string) {
  return findOneByField(COLLECTIONS.NOTICES, 'noticeId', noticeId)
}

async function findPublisherProfileByUserId(userId: string) {
  return findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', userId)
}

async function findCreatorCardByUserId(userId: string) {
  return findOneByField(COLLECTIONS.CREATOR_CARDS, 'userId', userId)
}

async function findApplicationByApplicationId(applicationId: string) {
  return findOneByField(COLLECTIONS.APPLICATIONS, 'applicationId', applicationId)
}

async function listApplicationsByNoticeId(noticeId: string) {
  const pageSize = 100
  let offset = 0
  const list: Record<string, any>[] = []

  while (true) {
    const batch = await listByWhere(COLLECTIONS.APPLICATIONS, { noticeId }, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: pageSize,
      skip: offset,
    })

    if (batch.length === 0) {
      break
    }

    list.push(...batch)
    offset += batch.length

    if (batch.length < pageSize) {
      break
    }
  }

  return list
}

async function countEffectiveApplications(noticeId: string) {
  const list = await listApplicationsByNoticeId(noticeId)
  return list.filter((item) => asString(item.status) !== 'withdrawn').length
}

async function scanApplications(where: Record<string, unknown>, pageSize: number, offset: number) {
  const records = await listByWhere(COLLECTIONS.APPLICATIONS, where, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: pageSize + 1,
    skip: offset,
  })

  const hasMore = records.length > pageSize

  return {
    list: records.slice(0, pageSize),
    hasMore,
    nextCursor: hasMore ? buildCursor(offset + pageSize) : '',
  }
}

function buildTimeline(application: Record<string, any>) {
  const timeline: Array<{ key: string; label: string; at: string | null; description?: string }> = [
    {
      key: 'applied',
      label: '已报名',
      at: application.createdAt ? toIsoString(application.createdAt) : null,
    },
  ]

  if (application.publisherViewedAt) {
    timeline.push({
      key: 'viewed',
      label: '已查看',
      at: toIsoString(application.publisherViewedAt),
    })
  }

  if (application.publisherContactRevealedAt) {
    timeline.push({
      key: 'contact_pending',
      label: '待联系',
      at: toIsoString(application.publisherContactRevealedAt),
      description: '发布方已释放联系方式',
    })
  }

  if (asString(application.status) === 'communicating') {
    timeline.push({
      key: 'communicating',
      label: '已沟通',
      at: application.updatedAt ? toIsoString(application.updatedAt) : null,
    })
  }

  if (asString(application.status) === 'rejected') {
    timeline.push({
      key: 'rejected',
      label: '未入选',
      at: application.updatedAt ? toIsoString(application.updatedAt) : null,
    })
  }

  if (application.completedAt) {
    timeline.push({
      key: 'completed',
      label: '已完成合作',
      at: toIsoString(application.completedAt),
    })
  }

  if (application.withdrawnAt) {
    timeline.push({
      key: 'withdrawn',
      label: '已撤回',
      at: toIsoString(application.withdrawnAt),
    })
  }

  return timeline
}

function createApplicationStatusError(currentStatus: string, expectedStatuses: string[]) {
  throw new AppError({
    code: ERROR_CODES.APPLICATION_STATUS_INVALID,
    message: `当前报名状态不支持该操作：${currentStatus}`,
    data: {
      currentStatus,
      expectedStatuses,
    },
  })
}

function ensureCreatorCardComplete(creatorCard: Record<string, any> | null) {
  if (!creatorCard) {
    throw new AppError({
      code: ERROR_CODES.CREATOR_CARD_REQUIRED,
      message: '请先完善达人名片',
    })
  }

  const missingFieldKeys = [
    'nickname',
    'city',
    'primaryPlatform',
    'primaryCategory',
    'followerBand',
    'contactType',
    'contactValue',
  ].filter((field) => !asNullableString(creatorCard[field]))

  if (asStringArray(creatorCard.portfolioImages).length === 0) {
    missingFieldKeys.push('portfolioImages')
  }

  if (missingFieldKeys.length > 0) {
    throw new AppError({
      code: ERROR_CODES.CREATOR_CARD_REQUIRED,
      message: '请先完善达人名片',
      data: {
        missingFieldKeys,
      },
    })
  }

  return creatorCard
}

async function ensurePublisherOwnedApplication(applicationId: string, userContext: UserContext) {
  const application = await findApplicationByApplicationId(applicationId)

  if (!application) {
    throw createValidationError({
      applicationId: 'applicationId 不存在',
    })
  }

  if (asString(application.publisherUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前报名不可操作',
    })
  }

  return application
}

async function ensureCreatorOwnedApplication(applicationId: string, userContext: UserContext) {
  const application = await findApplicationByApplicationId(applicationId)

  if (!application) {
    throw createValidationError({
      applicationId: 'applicationId 不存在',
    })
  }

  if (asString(application.creatorUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前报名不可操作',
    })
  }

  return application
}

async function buildApplicationMutationResponse(application: Record<string, any>, extras: Partial<ApplicationStatusMutationResponseData> = {}): Promise<ApplicationStatusMutationResponseData> {
  const creatorCard = await findCreatorCardByUserId(asString(application.creatorUserId))
  const contactType = asNullableString(application.contactTypeSnapshot) ?? asNullableString(creatorCard?.contactType)
  const contactValue = asNullableString(application.contactValueSnapshot) ?? asNullableString(creatorCard?.contactValue)

  return {
    applicationId: asString(application.applicationId),
    status: asString(application.status),
    publisherViewedAt: application.publisherViewedAt ? toIsoString(application.publisherViewedAt) : undefined,
    publisherContactRevealedAt: application.publisherContactRevealedAt ? toIsoString(application.publisherContactRevealedAt) : undefined,
    completedAt: application.completedAt ? toIsoString(application.completedAt) : undefined,
    creatorContact: extras.creatorContact ?? (application.creatorContactRevealedAt ? buildContactText(contactType, contactValue) : undefined),
    creatorContactRevealedAt: application.creatorContactRevealedAt ? toIsoString(application.creatorContactRevealedAt) : undefined,
    withdrawnAt: application.withdrawnAt ? toIsoString(application.withdrawnAt) : undefined,
    ...extras,
  }
}

async function updateApplicationRecord(application: Record<string, any>, patch: Record<string, unknown>) {
  await updateDocumentById(COLLECTIONS.APPLICATIONS, application._id, patch)
  return {
    ...application,
    ...patch,
  }
}

export async function submitApplication(payload: ApplicationSubmitPayload, userContext: UserContext, requestId: string): Promise<ApplicationSubmitResponseData> {
  const notice = await findNoticeByNoticeId(payload.noticeId)

  if (!notice) {
    throw createValidationError({
      noticeId: 'noticeId 不存在',
    })
  }

  if (asString(notice.publisherUserId) === userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '发布方本人不可报名自己的通告',
    })
  }

  if (asString(notice.status) !== 'active') {
    throw new AppError({
      code: ERROR_CODES.NOTICE_STATUS_INVALID,
      message: '当前通告状态不可报名',
      data: {
        noticeId: payload.noticeId,
        noticeStatus: asString(notice.status),
      },
    })
  }

  if (!isFutureDate(notice.deadlineAt)) {
    throw new AppError({
      code: ERROR_CODES.NOTICE_STATUS_INVALID,
      message: '通告已截止，暂不可报名',
      data: {
        noticeId: payload.noticeId,
        deadlineAt: notice.deadlineAt ? toIsoString(notice.deadlineAt) : null,
      },
    })
  }

  const creatorCard = ensureCreatorCardComplete(await findCreatorCardByUserId(userContext.userId))
  const existingRecords = await listByWhere(COLLECTIONS.APPLICATIONS, {
    noticeId: payload.noticeId,
    creatorUserId: userContext.userId,
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 20,
  })

  if (existingRecords.some((item) => asString(item.status) !== 'withdrawn')) {
    throw new AppError({
      code: ERROR_CODES.DUPLICATE_APPLICATION,
      message: '你已报名该通告，无需重复提交',
      data: {
        noticeId: payload.noticeId,
      },
    })
  }

  const currentTime = now()
  const applicationId = createResourceId('app')
  const creatorSnapshot = {
    nickname: asString(creatorCard.nickname),
    city: asString(creatorCard.city),
    primaryPlatform: asString(creatorCard.primaryPlatform),
    primaryCategory: asString(creatorCard.primaryCategory),
    followerBand: asString(creatorCard.followerBand),
    caseDescription: asNullableString(creatorCard.caseDescription),
  }
  const document = {
    applicationId,
    noticeId: payload.noticeId,
    publisherUserId: asString(notice.publisherUserId),
    creatorUserId: userContext.userId,
    creatorCardId: asString(creatorCard.creatorCardId),
    creatorCardSnapshot: creatorSnapshot,
    selfIntroduction: payload.selfIntroduction,
    deliverablePlan: payload.deliverablePlan,
    expectedTerms: asNullableString(payload.expectedTerms) ?? null,
    portfolioImages: payload.portfolioImages ?? [],
    contactTypeSnapshot: payload.contactType ?? asString(creatorCard.contactType),
    contactValueSnapshot: payload.contactValue ?? asString(creatorCard.contactValue),
    status: 'applied',
    publisherViewedAt: null,
    creatorContactRevealedAt: null,
    publisherContactRevealedAt: null,
    withdrawnAt: null,
    completedAt: null,
    createdAt: currentTime,
    updatedAt: currentTime,
  }

  await addDocument(COLLECTIONS.APPLICATIONS, document)

  const applicationCount = await countEffectiveApplications(payload.noticeId)
  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, {
    applicationCount,
  })

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_submit',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    afterSnapshot: {
      status: 'applied',
      noticeId: payload.noticeId,
      publisherUserId: asString(notice.publisherUserId),
    },
  })

  await createUserMessage({
    receiverUserId: asString(notice.publisherUserId),
    messageType: 'application_status',
    title: '你收到一条新报名',
    summary: `${asString(creatorCard.nickname, '达人')} 报名了《${asString(notice.title, '通告')}》。`,
    relatedObjectType: 'application',
    relatedObjectId: applicationId,
  })

  return {
    applicationId,
    status: 'applied',
    noticeId: payload.noticeId,
  }
}

export async function withdrawApplication(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationWithdrawResponseData> {
  const application = await ensureCreatorOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'withdrawn' && application.withdrawnAt) {
    return {
      applicationId,
      status,
      withdrawnAt: toIsoString(application.withdrawnAt),
    }
  }

  if (!['applied', 'viewed'].includes(status)) {
    createApplicationStatusError(status, ['applied', 'viewed'])
  }

  const currentTime = now()
  const patch = {
    status: 'withdrawn',
    withdrawnAt: currentTime,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.APPLICATIONS, application._id, patch)

  const notice = await findNoticeByNoticeId(asString(application.noticeId))

  if (notice) {
    const applicationCount = await countEffectiveApplications(asString(application.noticeId))
    await updateDocumentById(COLLECTIONS.NOTICES, notice._id, {
      applicationCount,
    })

    await createUserMessage({
      receiverUserId: asString(application.publisherUserId),
      messageType: 'application_status',
      title: '有报名已撤回',
      summary: `《${asString(notice.title, '通告')}》的一条报名已被达人撤回。`,
      relatedObjectType: 'application',
      relatedObjectId: applicationId,
    })
  }

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_withdraw',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
      withdrawnAt: application.withdrawnAt ?? null,
    },
    afterSnapshot: patch,
  })

  return {
    applicationId,
    status: 'withdrawn',
    withdrawnAt: toIsoString(currentTime),
  }
}

export async function listCreatorApplications(
  creatorUserId: string,
  filters: {
    status?: string
    pageSize: number
    offset: number
  },
): Promise<ApplicationMyListResponseData> {
  const where: Record<string, unknown> = {
    creatorUserId,
  }

  if (filters.status) {
    where.status = filters.status
  }

  const scanned = await scanApplications(where, filters.pageSize, filters.offset)
  const list = [] as ApplicationMyListResponseData['list']

  for (const application of scanned.list) {
    const notice = await findNoticeByNoticeId(asString(application.noticeId))
    const publisherProfile = await findPublisherProfileByUserId(asString(application.publisherUserId))
    const status = asString(application.status)

    list.push({
      applicationId: asString(application.applicationId),
      noticeId: asString(application.noticeId),
      noticeTitle: asString(notice?.title),
      budgetSummary: asString(notice?.budgetSummary),
      city: asString(notice?.city),
      status,
      publisherSummary: {
        publisherUserId: asString(application.publisherUserId),
        displayName: asString(publisherProfile?.displayName, asString(notice?.brandName)),
      },
      canViewPublisherContact: canViewPublisherContact(status),
      updatedAt: toIsoString(application.updatedAt ?? application.createdAt),
      stageHint: applicationStatusLabel(status),
    })
  }

  return {
    list,
    nextCursor: scanned.nextCursor,
    hasMore: scanned.hasMore,
  }
}

export async function getCreatorApplicationDetail(applicationId: string, userContext: UserContext): Promise<ApplicationDetailResponseData> {
  const application = await findApplicationByApplicationId(applicationId)

  if (!application) {
    throw createValidationError({
      applicationId: 'applicationId 不存在',
    })
  }

  if (asString(application.creatorUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前报名不可查看',
    })
  }

  const notice = await findNoticeByNoticeId(asString(application.noticeId))
  const publisherProfile = await findPublisherProfileByUserId(asString(application.publisherUserId))
  const revealState = publisherContactRevealState(application)

  return {
    application: {
      applicationId: asString(application.applicationId),
      noticeId: asString(application.noticeId),
      status: asString(application.status),
      selfIntroduction: asString(application.selfIntroduction),
      deliverablePlan: asString(application.deliverablePlan),
      expectedTerms: asNullableString(application.expectedTerms),
      portfolioImages: asStringArray(application.portfolioImages),
      createdAt: toIsoString(application.createdAt),
    },
    noticeSummary: {
      noticeId: asString(application.noticeId),
      title: asString(notice?.title),
      city: asString(notice?.city),
      budgetSummary: asString(notice?.budgetSummary),
      status: asString(notice?.status),
    },
    publisherSummary: {
      publisherUserId: asString(application.publisherUserId),
      publisherProfileId: asString(notice?.publisherProfileId, asString(publisherProfile?.publisherProfileId)),
      displayName: asString(publisherProfile?.displayName, asString(notice?.brandName)),
      city: asString(publisherProfile?.city, asString(notice?.city)),
    },
    permissionState: {
      canViewPublisherContact: revealState === 'revealed',
    },
    timeline: buildTimeline(application),
    publisherContactRevealState: {
      stage: revealState,
      revealedAt: application.publisherContactRevealedAt ? toIsoString(application.publisherContactRevealedAt) : null,
    },
    maskedOrFullPublisherContact: revealState === 'revealed'
      ? {
          contactType: asNullableString(notice?.publisherContactTypeSnapshot) ?? asNullableString(publisherProfile?.contactType),
          contactValue: asNullableString(notice?.publisherContactValueSnapshot) ?? asNullableString(publisherProfile?.contactValue),
          isMasked: false,
        }
      : null,
  }
}

export async function listPublisherApplications(
  noticeId: string,
  userContext: UserContext,
  filters: {
    status?: string
    pageSize: number
    offset: number
  },
): Promise<PublisherApplicationListResponseData> {
  const notice = await findNoticeByNoticeId(noticeId)

  if (!notice) {
    throw createValidationError({
      noticeId: 'noticeId 不存在',
    })
  }

  if (asString(notice.publisherUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前通告报名列表不可查看',
    })
  }

  const where: Record<string, unknown> = { noticeId }

  if (filters.status) {
    where.status = filters.status
  }

  const scanned = await scanApplications(where, filters.pageSize, filters.offset)

  return {
    list: scanned.list.map((application) => {
      const snapshot = (application.creatorCardSnapshot as Record<string, unknown>) ?? {}

      return {
        applicationId: asString(application.applicationId),
        creatorCardSnapshot: {
          nickname: asString(snapshot.nickname),
          city: asString(snapshot.city),
          primaryPlatform: asString(snapshot.primaryPlatform),
          primaryCategory: asString(snapshot.primaryCategory),
          followerBand: asString(snapshot.followerBand),
          caseDescription: asString(snapshot.caseDescription),
        },
        status: asString(application.status),
        publisherViewedAt: application.publisherViewedAt ? toIsoString(application.publisherViewedAt) : null,
        contactRevealState: creatorContactRevealState(application),
      }
    }),
    nextCursor: scanned.nextCursor,
    hasMore: scanned.hasMore,
  }
}

export async function getPublisherApplicationDetail(applicationId: string, userContext: UserContext): Promise<PublisherApplicationDetailResponseData> {
  const application = await findApplicationByApplicationId(applicationId)

  if (!application) {
    throw createValidationError({
      applicationId: 'applicationId 不存在',
    })
  }

  if (asString(application.publisherUserId) !== userContext.userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前报名详情不可查看',
    })
  }

  const creatorCard = await findCreatorCardByUserId(asString(application.creatorUserId))
  const snapshot = (application.creatorCardSnapshot as Record<string, unknown>) ?? {}
  const revealState = creatorContactRevealState(application)

  return {
    application: {
      applicationId: asString(application.applicationId),
      status: asString(application.status),
      selfIntroduction: asString(application.selfIntroduction),
      deliverablePlan: asString(application.deliverablePlan),
      expectedTerms: asNullableString(application.expectedTerms),
    },
    creatorSummary: {
      displayName: asString(snapshot.nickname, asString(creatorCard?.nickname)),
      city: asString(snapshot.city, asString(creatorCard?.city)),
      primaryPlatform: asString(snapshot.primaryPlatform, asString(creatorCard?.primaryPlatform)),
      primaryCategory: asString(snapshot.primaryCategory, asString(creatorCard?.primaryCategory)),
      followerBand: asString(snapshot.followerBand, asString(creatorCard?.followerBand)),
      caseDescription: asString(snapshot.caseDescription, asString(creatorCard?.caseDescription)),
    },
    maskedOrFullCreatorContact: revealState === 'revealed'
      ? buildContactText(
          asNullableString(application.contactTypeSnapshot) ?? asNullableString(creatorCard?.contactType),
          asNullableString(application.contactValueSnapshot) ?? asNullableString(creatorCard?.contactValue),
        )
      : undefined,
    creatorContactRevealState: revealState,
    availableActions: buildPublisherAvailableActions(asString(application.status), revealState),
  }
}

export async function markApplicationViewed(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'viewed' && application.publisherViewedAt) {
    return buildApplicationMutationResponse(application)
  }

  if (status !== 'applied') {
    createApplicationStatusError(status, ['applied'])
  }

  const currentTime = now()
  const patch = {
    status: 'viewed',
    publisherViewedAt: application.publisherViewedAt ?? currentTime,
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_mark_viewed',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
      publisherViewedAt: application.publisherViewedAt ?? null,
    },
    afterSnapshot: patch,
  })

  return buildApplicationMutationResponse(updated)
}

export async function markApplicationContactPending(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'contact_pending' && application.publisherContactRevealedAt) {
    return buildApplicationMutationResponse(application)
  }

  if (status !== 'viewed') {
    createApplicationStatusError(status, ['viewed'])
  }

  const currentTime = now()
  const patch = {
    status: 'contact_pending',
    publisherContactRevealedAt: application.publisherContactRevealedAt ?? currentTime,
    creatorContactRevealedAt: application.creatorContactRevealedAt ?? currentTime,
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)
  const notice = await findNoticeByNoticeId(asString(application.noticeId))

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_mark_contact_pending',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
      publisherContactRevealedAt: application.publisherContactRevealedAt ?? null,
      creatorContactRevealedAt: application.creatorContactRevealedAt ?? null,
    },
    afterSnapshot: patch,
  })

  await createUserMessage({
    receiverUserId: asString(application.creatorUserId),
    messageType: 'application_status',
    title: '发布方对你的报名有意向',
    summary: `《${asString(notice?.title, '通告')}》已进入待联系，发布方联系方式已释放。`,
    relatedObjectType: 'application',
    relatedObjectId: asString(application.applicationId),
  })

  return buildApplicationMutationResponse(updated)
}

export async function markApplicationCommunicating(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'communicating') {
    return buildApplicationMutationResponse(application)
  }

  if (status !== 'contact_pending') {
    createApplicationStatusError(status, ['contact_pending'])
  }

  const currentTime = now()
  const patch = {
    status: 'communicating',
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_mark_communicating',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
    },
    afterSnapshot: patch,
  })

  return buildApplicationMutationResponse(updated)
}

export async function markApplicationRejected(applicationId: string, reasonText: string | undefined, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'rejected') {
    return buildApplicationMutationResponse(application)
  }

  if (!['viewed', 'contact_pending', 'communicating'].includes(status)) {
    createApplicationStatusError(status, ['viewed', 'contact_pending', 'communicating'])
  }

  const currentTime = now()
  const patch = {
    status: 'rejected',
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)
  const notice = await findNoticeByNoticeId(asString(application.noticeId))

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_mark_rejected',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
    },
    afterSnapshot: patch,
    remark: reasonText ?? '',
  })

  await createUserMessage({
    receiverUserId: asString(application.creatorUserId),
    messageType: 'application_status',
    title: '你的报名未入选',
    summary: reasonText ?? `《${asString(notice?.title, '通告')}》当前未继续推进。`,
    relatedObjectType: 'application',
    relatedObjectId: asString(application.applicationId),
  })

  return buildApplicationMutationResponse(updated)
}

export async function markApplicationCompleted(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'completed' && application.completedAt) {
    return buildApplicationMutationResponse(application)
  }

  if (status !== 'communicating') {
    createApplicationStatusError(status, ['communicating'])
  }

  const currentTime = now()
  const patch = {
    status: 'completed',
    completedAt: application.completedAt ?? currentTime,
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)
  const notice = await findNoticeByNoticeId(asString(application.noticeId))

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_mark_completed',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      status,
      completedAt: application.completedAt ?? null,
    },
    afterSnapshot: patch,
  })

  await createUserMessage({
    receiverUserId: asString(application.creatorUserId),
    messageType: 'application_status',
    title: '合作已标记完成',
    summary: `《${asString(notice?.title, '通告')}》已被发布方标记为完成合作。`,
    relatedObjectType: 'application',
    relatedObjectId: asString(application.applicationId),
  })

  return buildApplicationMutationResponse(updated)
}

export async function revealApplicationCreatorContact(applicationId: string, userContext: UserContext, requestId: string): Promise<ApplicationStatusMutationResponseData> {
  const application = await ensurePublisherOwnedApplication(applicationId, userContext)
  const status = asString(application.status)

  if (status === 'withdrawn') {
    createApplicationStatusError(status, ['applied', 'viewed', 'contact_pending', 'communicating', 'rejected', 'completed'])
  }

  const creatorCard = await findCreatorCardByUserId(asString(application.creatorUserId))
  const contactType = asNullableString(application.contactTypeSnapshot) ?? asNullableString(creatorCard?.contactType)
  const contactValue = asNullableString(application.contactValueSnapshot) ?? asNullableString(creatorCard?.contactValue)
  const contactText = buildContactText(contactType, contactValue)

  if (application.creatorContactRevealedAt) {
    return buildApplicationMutationResponse(application, {
      creatorContact: contactText,
    })
  }

  const currentTime = now()
  const patch = {
    creatorContactRevealedAt: currentTime,
    updatedAt: currentTime,
  }

  const updated = await updateApplicationRecord(application, patch)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'application_reveal_creator_contact',
    targetType: 'application',
    targetId: applicationId,
    requestId,
    beforeSnapshot: {
      creatorContactRevealedAt: application.creatorContactRevealedAt ?? null,
    },
    afterSnapshot: patch,
  })

  return buildApplicationMutationResponse(updated, {
    creatorContact: contactText,
  })
}
