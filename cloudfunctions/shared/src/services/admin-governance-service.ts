import { buildPermissionSummary } from '../auth/admin-auth'
import { COLLECTIONS } from '../constants/collections'
import { ERROR_CODES } from '../constants/error-codes'
import { ACCOUNT_STATUSES } from '../enums/account-status'
import { ADMIN_ROLE_CODES } from '../enums/admin'
import { AppError } from '../errors/app-error'
import { ADMIN_AVAILABLE_ACTION_KEYS } from '../contracts/admin/action-keys'
import { TEMP_RESOLVE_REPORT_RESULT_ACTIONS } from '../contracts/admin/action-payloads'
import { AdminAvailableAction, RiskSummaryDto } from '../contracts/admin/common'
import {
  DashboardPriorityItemDto,
  GovernanceDashboardResponseData,
  AccountActionListItemDto,
  AccountActionListResponseData,
  ReportDetailResponseData,
  ReportHistoryActionItemDto,
  ReportHistoryItemDto,
  ReportListItemDto,
  ReportListResponseData,
  ReportTargetSnapshotDto,
  OperationLogListItemDto,
  OperationLogListResponseData,
} from '../contracts/admin/governance-admin'
import { countByWhere, findOneByField, listByWhere, addDocument, updateDocumentById } from '../db/repository'
import { AdminContext } from '../types'
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

const VALID_REPORT_TARGET_TYPES = new Set(['notice', 'publisher', 'creator'])

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
    tags.push('高风险对象')
  }

  const mappings: Record<string, string> = {
    sensitive_keywords: '关注敏感词',
    contact_anomaly: '关注联系方式异常',
    multi_reports_24h: '关注短时重复举报',
  }

  for (const riskFlag of riskFlags) {
    tags.push(mappings[riskFlag] ?? riskFlag)
  }

  return Array.from(new Set(tags))
}

function normalizeReportTarget(report: Record<string, any>) {
  const targetType = asString(report.targetType)
  const targetId = asString(report.targetId)
  const normalizedType = VALID_REPORT_TARGET_TYPES.has(targetType) ? targetType : ''
  const normalizedId = targetId.trim()

  return {
    targetType,
    targetId,
    normalizedType,
    normalizedId,
    isValid: Boolean(normalizedType && normalizedId),
  }
}

async function countReportsByTarget(targetType: string, targetId: string) {
  if (!targetType || !targetId) {
    return 0
  }

  return asNumber((await countByWhere(COLLECTIONS.REPORTS, {
    targetType,
    targetId,
  }) as any).total, 0)
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

async function resolveUserSummary(userId: string) {
  const publisherProfile = await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', userId)
  const creatorCard = await findOneByField(COLLECTIONS.CREATOR_CARDS, 'userId', userId)
  const user = await findUserByUserId(userId)

  return {
    userId,
    displayName: asString(publisherProfile?.displayName, asString(creatorCard?.nickname, asString(user?.nickname, userId))),
    avatarUrl: asNullableString(creatorCard?.avatarUrl) ?? asNullableString(user?.avatarUrl),
    accountStatus: asString(user?.accountStatus, ACCOUNT_STATUSES.NORMAL),
  }
}

function buildRiskSummary(source: Record<string, any>, extraFlags: string[] = []): RiskSummaryDto {
  const riskLevel = asNullableString(source.riskLevel)
  const riskFlags = Array.from(new Set([...asStringArray(source.riskFlags), ...extraFlags]))

  return {
    riskLevel,
    riskFlags,
    suggestedTags: buildSuggestedTags(riskFlags, riskLevel),
  }
}

function buildMissingTargetSnapshot(report: Record<string, any>, reason = '目标对象缺失'): ReportTargetSnapshotDto {
  const normalized = normalizeReportTarget(report)
  const fallbackTargetId = asNullableString(report.targetId)
  const fallbackReportId = asNullableString(report.reportId)

  return {
    targetType: normalized.isValid ? normalized.normalizedType : 'missing',
    targetId: normalized.isValid ? normalized.normalizedId : fallbackTargetId ?? '',
    displayName: fallbackTargetId ?? fallbackReportId ?? '缺失目标',
    status: 'missing',
    ownerUserId: '',
    city: null,
    summary: reason,
    riskSummary: buildRiskSummary(report),
  }
}

async function resolveReportTargetSnapshot(report: Record<string, any>): Promise<ReportTargetSnapshotDto> {
  const normalized = normalizeReportTarget(report)

  if (!normalized.isValid) {
    return buildMissingTargetSnapshot(report, '目标对象缺失或非法')
  }

  if (normalized.normalizedType === 'notice') {
    const notice = await findOneByField(COLLECTIONS.NOTICES, 'noticeId', normalized.normalizedId)

    if (!notice) {
      return buildMissingTargetSnapshot(report, '目标对象不存在')
    }

    const aggregatedCount = await countReportsByTarget(normalized.normalizedType, normalized.normalizedId)
    const derivedFlags = aggregatedCount >= 3 ? ['multi_reports_24h'] : []

    return {
      targetType: 'notice',
      targetId: asString(notice.noticeId),
      displayName: asString(notice.title),
      status: asString(notice.status),
      ownerUserId: asString(notice.publisherUserId),
      city: asNullableString(notice.city),
      summary: [asString(notice.cooperationPlatform), asString(notice.budgetSummary), asString(notice.status)].filter(Boolean).join(' / '),
      riskSummary: buildRiskSummary(notice, derivedFlags),
    }
  }

  if (normalized.normalizedType === 'publisher') {
    const publisherProfile =
      (await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'publisherProfileId', normalized.normalizedId))
      ?? (await findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', normalized.normalizedId))

    if (!publisherProfile) {
      return buildMissingTargetSnapshot(report, '目标对象不存在')
    }

    return {
      targetType: 'publisher',
      targetId: normalized.normalizedId,
      displayName: asString(publisherProfile.displayName),
      status: asString(publisherProfile.status),
      ownerUserId: asString(publisherProfile.userId),
      city: asNullableString(publisherProfile.city),
      summary: [asString(publisherProfile.identityType), asString(publisherProfile.city)].filter(Boolean).join(' / '),
      riskSummary: buildRiskSummary(publisherProfile),
    }
  }

  const creatorCard =
    (await findOneByField(COLLECTIONS.CREATOR_CARDS, 'creatorCardId', normalized.normalizedId))
    ?? (await findOneByField(COLLECTIONS.CREATOR_CARDS, 'userId', normalized.normalizedId))

  if (!creatorCard) {
    return buildMissingTargetSnapshot(report, '目标对象不存在')
  }

  return {
    targetType: 'creator',
    targetId: normalized.normalizedId,
    displayName: asString(creatorCard.nickname),
    status: asString(creatorCard.status),
    ownerUserId: asString(creatorCard.userId),
    city: asNullableString(creatorCard.city),
    summary: [asString(creatorCard.primaryPlatform), asString(creatorCard.followerBand)].filter(Boolean).join(' / '),
    riskSummary: buildRiskSummary(creatorCard),
  }
}

function buildReportActions(
  report: Record<string, any>,
  targetSnapshot: ReportTargetSnapshotDto,
  adminContext: AdminContext,
): AdminAvailableAction[] {
  const permissionSummary = buildPermissionSummary(adminContext.roleCodes)
  const reportStatus = asString(report.status)
  const handlerId = asNullableString(report.handlerId)
  const assignedToOtherAdmin = handlerId !== null && handlerId !== adminContext.adminUserId
  const disabledReason = assignedToOtherAdmin ? '当前举报已被其他管理员领取' : null
  const canResolveReport = permissionSummary.actionAccess.resolveReportBasic
  const canManageRestrictions = permissionSummary.actionAccess.createAccountAction
  const canForceRemoveNotice = permissionSummary.actionAccess.forceRemoveNotice

  if (reportStatus === 'pending') {
    return permissionSummary.actionAccess.claimReport
      ? [
          {
            key: ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_REPORT,
            label: '领取举报',
            variant: 'primary',
            disabled: false,
            disabledReason: null,
          },
        ]
      : []
  }

  if (reportStatus !== 'processing' || !canResolveReport) {
    return []
  }

  const actions: AdminAvailableAction[] = [
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED,
      label: '举报不成立',
      variant: 'default',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
    {
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RECORD_ONLY,
      label: '举报成立但仅记录',
      variant: 'primary',
      disabled: assignedToOtherAdmin,
      disabledReason,
    },
  ]

  if (targetSnapshot.targetType === 'notice' && canForceRemoveNotice) {
    actions.push({
      key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE,
      label: '举报成立并下架通告',
      variant: 'danger',
      disabled: assignedToOtherAdmin || targetSnapshot.status === 'removed',
      disabledReason: targetSnapshot.status === 'removed' ? '目标通告已下架' : disabledReason,
    })
  }

  if (canManageRestrictions && targetSnapshot.ownerUserId) {
    actions.push(
      {
        key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_WATCHLIST,
        label: '举报成立并加入观察名单',
        variant: 'default',
        disabled: assignedToOtherAdmin,
        disabledReason,
      },
      {
        key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH,
        label: '举报成立并限制发布',
        variant: 'danger',
        disabled: assignedToOtherAdmin,
        disabledReason,
      },
      {
        key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_APPLY,
        label: '举报成立并限制报名',
        variant: 'danger',
        disabled: assignedToOtherAdmin,
        disabledReason,
      },
      {
        key: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_BANNED,
        label: '举报成立并全量封禁',
        variant: 'danger',
        disabled: assignedToOtherAdmin,
        disabledReason,
      },
    )
  }

  return actions
}

async function mapReportListItem(report: Record<string, any>): Promise<ReportListItemDto> {
  const normalized = normalizeReportTarget(report)
  const targetSnapshot = normalized.isValid
    ? await resolveReportTargetSnapshot(report)
    : buildMissingTargetSnapshot(report, '目标对象缺失或非法')
  const aggregatedReportCount = normalized.isValid
    ? await countReportsByTarget(normalized.normalizedType, normalized.normalizedId)
    : 0

  return {
    reportId: asString(report.reportId),
    targetType: targetSnapshot.targetType,
    targetId: targetSnapshot.targetId,
    targetDisplayName: targetSnapshot.displayName,
    reasonCode: asString(report.reasonCode),
    status: asString(report.status),
    aggregatedReportCount,
    isHighRisk: targetSnapshot.riskSummary.riskLevel === 'high' || aggregatedReportCount >= 3,
    createdAt: toIsoString(report.createdAt),
    handlerId: asNullableString(report.handlerId),
    resultAction: asNullableString(report.resultAction),
  }
}

function buildReportListFallback(report: Record<string, any>, reason = '目标对象异常'): ReportListItemDto {
  const targetSnapshot = buildMissingTargetSnapshot(report, reason)

  return {
    reportId: asString(report.reportId),
    targetType: targetSnapshot.targetType,
    targetId: targetSnapshot.targetId,
    targetDisplayName: targetSnapshot.displayName,
    reasonCode: asString(report.reasonCode),
    status: asString(report.status),
    aggregatedReportCount: 0,
    isHighRisk: false,
    createdAt: toIsoString(report.createdAt),
    handlerId: asNullableString(report.handlerId),
    resultAction: asNullableString(report.resultAction),
  }
}

async function scanReports(filters: Record<string, unknown>) {
  const where: Record<string, unknown> = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.targetType) {
    where.targetType = filters.targetType
  }

  if (filters.reasonCode) {
    where.reasonCode = filters.reasonCode
  }

  const pageSize = Number(filters.pageSize)
  let rawOffset = Number(filters.offset || 0)
  const batchSize = Math.max(pageSize * 2, 20)
  const list: ReportListItemDto[] = []

  while (list.length < pageSize) {
    const batch = await listByWhere(COLLECTIONS.REPORTS, where, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: batchSize,
      skip: rawOffset,
    })

    if (batch.length === 0) {
      break
    }

    for (const report of batch) {
      rawOffset += 1
      try {
        list.push(await mapReportListItem(report))
      } catch {
        list.push(buildReportListFallback(report, '目标对象异常或数据损坏'))
      }

      if (list.length >= pageSize) {
        break
      }
    }

    if (batch.length < batchSize) {
      break
    }
  }

  const nextBatch = await listByWhere(COLLECTIONS.REPORTS, where, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 1,
    skip: rawOffset,
  })

  return {
    list,
    hasMore: nextBatch.length > 0,
    nextCursor: nextBatch.length > 0 ? Buffer.from(JSON.stringify({ offset: rawOffset })).toString('base64') : '',
  }
}

export async function listReports(filters: Record<string, unknown>): Promise<ReportListResponseData> {
  return scanReports(filters)
}

async function buildReportHistoryActions(report: Record<string, any>): Promise<ReportHistoryActionItemDto[]> {
  const reportLogs = await listByWhere(
    COLLECTIONS.OPERATION_LOGS,
    {
      targetType: 'report',
      targetId: asString(report.reportId),
    },
    {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: 10,
    },
  )

  const targetLogs = await listByWhere(
    COLLECTIONS.OPERATION_LOGS,
    {
      targetType: asString(report.targetType),
      targetId: asString(report.targetId),
    },
    {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: 10,
    },
  )

  const allLogs = Array.from(new Map([...reportLogs, ...targetLogs].map((log) => [asString(log.logId) || `${log.targetType}:${log.targetId}:${log.action}:${log.createdAt}`, log])).values())
  allLogs.sort((left, right) => toDate(left.createdAt).getTime() - toDate(right.createdAt).getTime())

  const historyActions: ReportHistoryActionItemDto[] = []

  for (const log of allLogs.slice(0, 10)) {
    const operator = await resolveAdminDisplayName(asNullableString(log.operatorId))

    historyActions.push({
      action: asString(log.action),
      operatorType: asString(log.operatorType),
      operatorId: asString(log.operatorId),
      operatorDisplayName: operator?.displayName ?? asString(log.operatorId),
      remark: asString(log.remark),
      createdAt: toIsoString(log.createdAt),
      targetType: asString(log.targetType),
      targetId: asString(log.targetId),
    })
  }

  return historyActions
}

async function buildReportHistory(report: Record<string, any>): Promise<ReportHistoryItemDto[]> {
  const historyReports = await listByWhere(
    COLLECTIONS.REPORTS,
    {
      targetType: asString(report.targetType),
      targetId: asString(report.targetId),
    },
    {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: 10,
    },
  )

  return historyReports
    .filter((historyReport) => historyReport.reportId !== report.reportId)
    .slice(0, 10)
    .map((historyReport) => ({
      reportId: asString(historyReport.reportId),
      reasonCode: asString(historyReport.reasonCode),
      status: asString(historyReport.status),
      reporterUserId: asString(historyReport.reporterUserId),
      createdAt: toIsoString(historyReport.createdAt),
    }))
}

export async function getReportDetail(reportId: string, adminContext: AdminContext): Promise<ReportDetailResponseData> {
  const report = await findOneByField(COLLECTIONS.REPORTS, 'reportId', reportId)

  if (!report) {
    throw createValidationError({
      reportId: 'reportId 不存在',
    })
  }

  const targetSnapshot = await resolveReportTargetSnapshot(report)
  const historyReports = await buildReportHistory(report)
  const historyActions = await buildReportHistoryActions(report)

  return {
    report: {
      reportId: asString(report.reportId),
      reporterUserId: asString(report.reporterUserId),
      targetType: asString(report.targetType),
      targetId: asString(report.targetId),
      reasonCode: asString(report.reasonCode),
      reasonText: asNullableString(report.reasonText),
      evidenceImages: asStringArray(report.evidenceImages),
      status: asString(report.status),
      handlerId: asNullableString(report.handlerId),
      resultAction: asNullableString(report.resultAction),
      resultRemark: asNullableString(report.resultRemark),
      createdAt: toIsoString(report.createdAt),
    },
    targetSnapshot,
    historyReports,
    historyActions,
    availableActions: buildReportActions(report, targetSnapshot, adminContext),
  }
}

async function mapAccountActionItem(record: Record<string, any>): Promise<AccountActionListItemDto> {
  const user = await resolveUserSummary(asString(record.userId))
  const operator = await resolveAdminDisplayName(asNullableString(record.operatorId))

  return {
    restrictionId: asString(record.restrictionId),
    user,
    restrictionType: asString(record.restrictionType),
    reasonCategory: asString(record.reasonCategory),
    reasonText: asNullableString(record.reasonText),
    startAt: toIsoString(record.startAt),
    endAt: toNullableIsoString(record.endAt),
    operator: {
      operatorId: asString(record.operatorId),
      displayName: operator?.displayName ?? asString(record.operatorId),
    },
    status: asString(record.status),
    createdAt: toIsoString(record.createdAt),
  }
}

async function scanAccountActions(filters: Record<string, unknown>) {
  const where: Record<string, unknown> = {}

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.restrictionType) {
    where.restrictionType = filters.restrictionType
  }

  if (filters.status) {
    where.status = filters.status
  }

  const pageSize = Number(filters.pageSize)
  let rawOffset = Number(filters.offset || 0)
  const batchSize = Math.max(pageSize * 2, 20)
  const list: AccountActionListItemDto[] = []

  while (list.length < pageSize) {
    const batch = await listByWhere(COLLECTIONS.ACCOUNT_ACTIONS, where, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: batchSize,
      skip: rawOffset,
    })

    if (batch.length === 0) {
      break
    }

    for (const accountAction of batch) {
      rawOffset += 1
      list.push(await mapAccountActionItem(accountAction))

      if (list.length >= pageSize) {
        break
      }
    }

    if (batch.length < batchSize) {
      break
    }
  }

  const nextBatch = await listByWhere(COLLECTIONS.ACCOUNT_ACTIONS, where, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 1,
    skip: rawOffset,
  })

  return {
    list,
    hasMore: nextBatch.length > 0,
    nextCursor: nextBatch.length > 0 ? Buffer.from(JSON.stringify({ offset: rawOffset })).toString('base64') : '',
  }
}

export async function listAccountActions(filters: Record<string, unknown>): Promise<AccountActionListResponseData> {
  return scanAccountActions(filters)
}

function canOverrideGovernanceAssignment(adminContext: AdminContext) {
  return adminContext.roleCodes.includes(ADMIN_ROLE_CODES.OPS_ADMIN) || adminContext.roleCodes.includes(ADMIN_ROLE_CODES.SUPER_ADMIN)
}

function buildOffsetCursor(offset: number) {
  return offset > 0 ? Buffer.from(JSON.stringify({ offset })).toString('base64') : ''
}

function isSameUtcDay(value: unknown, baseDate = now()) {
  const target = toDate(value)

  if (Number.isNaN(target.getTime())) {
    return false
  }

  return target.getUTCFullYear() === baseDate.getUTCFullYear()
    && target.getUTCMonth() === baseDate.getUTCMonth()
    && target.getUTCDate() === baseDate.getUTCDate()
}

function getRestrictionPriority(restrictionType: string) {
  if (restrictionType === ACCOUNT_STATUSES.BANNED) {
    return 4
  }

  if (restrictionType === ACCOUNT_STATUSES.RESTRICTED_PUBLISH) {
    return 3
  }

  if (restrictionType === ACCOUNT_STATUSES.RESTRICTED_APPLY) {
    return 2
  }

  if (restrictionType === ACCOUNT_STATUSES.WATCHLIST) {
    return 1
  }

  return 0
}

async function resolveOperatorDisplayName(operatorType: string, operatorId: string) {
  if (operatorType === 'admin') {
    return (await resolveAdminDisplayName(operatorId))?.displayName ?? operatorId
  }

  if (operatorType === 'user') {
    return (await resolveUserSummary(operatorId)).displayName
  }

  return operatorId || 'system'
}

async function loadRecentDocuments(collectionName: string, limit = 200) {
  return listByWhere(collectionName, {}, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit,
  })
}

async function recomputeUserAccountStatus(userId: string) {
  const user = await findUserByUserId(userId)

  if (!user) {
    return ACCOUNT_STATUSES.NORMAL
  }

  const activeActions = await listByWhere(COLLECTIONS.ACCOUNT_ACTIONS, {
    userId,
    status: 'active',
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 50,
  })

  const nextStatus = activeActions
    .map((item) => asString(item.restrictionType))
    .sort((left, right) => getRestrictionPriority(right) - getRestrictionPriority(left))[0] ?? ACCOUNT_STATUSES.NORMAL

  if (asString(user.accountStatus) !== nextStatus) {
    await updateDocumentById(COLLECTIONS.USERS, user._id, {
      accountStatus: nextStatus,
      updatedAt: now(),
    })
  }

  return nextStatus
}

async function applyNoticeRemoval(noticeId: string, reasonCategory: string, reasonText: string | null, adminContext: AdminContext, requestId: string) {
  const notice = await findOneByField(COLLECTIONS.NOTICES, 'noticeId', noticeId)

  if (!notice) {
    return null
  }

  if (asString(notice.status) === 'removed') {
    return 'removed'
  }

  const currentTime = now()
  const patch = {
    status: 'removed',
    removedAt: currentTime,
    latestReviewReasonCategory: reasonCategory,
    latestReviewReasonText: reasonText,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.NOTICES, notice._id, patch)
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'notice_force_remove',
    targetType: 'notice',
    targetId: noticeId,
    requestId,
    beforeSnapshot: {
      status: notice.status,
      removedAt: notice.removedAt ?? null,
    },
    afterSnapshot: patch,
    remark: reasonText ?? reasonCategory,
  })

  return patch.status
}

async function forceRemoveActiveNoticesForUser(userId: string, reasonCategory: string, reasonText: string | null, adminContext: AdminContext, requestId: string) {
  const notices = await listByWhere(COLLECTIONS.NOTICES, {
    publisherUserId: userId,
    status: 'active',
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 50,
  })

  const removedNoticeIds: string[] = []

  for (const notice of notices) {
    const status = await applyNoticeRemoval(asString(notice.noticeId), reasonCategory, reasonText, adminContext, requestId)

    if (status === 'removed') {
      removedNoticeIds.push(asString(notice.noticeId))
    }
  }

  return removedNoticeIds
}

async function createAccountActionInternal(
  input: {
    userId: string
    restrictionType: string
    reasonCategory: string
    reasonText?: string | null
    startAt?: string | null
    endAt?: string | null
    forceRemoveActiveNotices?: boolean
  },
  adminContext: AdminContext,
  requestId: string,
  action: string,
) {
  const user = await findUserByUserId(input.userId)

  if (!user) {
    throw createValidationError({
      userId: 'userId 不存在',
    })
  }

  const currentTime = now()
  const restrictionId = createResourceId('restriction')
  const document = {
    restrictionId,
    userId: input.userId,
    restrictionType: input.restrictionType,
    reasonCategory: input.reasonCategory,
    reasonText: input.reasonText ?? null,
    startAt: input.startAt ? toDate(input.startAt) : currentTime,
    endAt: input.endAt ? toDate(input.endAt) : null,
    operatorId: adminContext.adminUserId,
    status: 'active',
    createdAt: currentTime,
    updatedAt: currentTime,
  }

  await addDocument(COLLECTIONS.ACCOUNT_ACTIONS, document)

  const removedNoticeIds = input.forceRemoveActiveNotices
    ? await forceRemoveActiveNoticesForUser(input.userId, input.reasonCategory, input.reasonText ?? null, adminContext, requestId)
    : []

  const accountStatus = await recomputeUserAccountStatus(input.userId)

  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action,
    targetType: 'account_action',
    targetId: restrictionId,
    requestId,
    beforeSnapshot: {
      accountStatus: user.accountStatus,
    },
    afterSnapshot: {
      restrictionType: input.restrictionType,
      accountStatus,
      removedNoticeIds,
    },
    remark: input.reasonText ?? input.reasonCategory,
  })

  return {
    restrictionId,
    accountStatus,
    removedNoticeIds,
  }
}

async function assertReportEditable(report: Record<string, any>, adminContext: AdminContext) {
  const handlerId = asNullableString(report.handlerId)

  if (handlerId && handlerId !== adminContext.adminUserId && !canOverrideGovernanceAssignment(adminContext)) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前举报已由其他管理员处理',
    })
  }
}

async function buildDashboardPriorityItems(): Promise<DashboardPriorityItemDto[]> {
  const reviewTasks = [
    ...(await listByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, { taskStatus: 'pending' }, { orderBy: [{ field: 'createdAt', order: 'desc' }], limit: 10 })),
    ...(await listByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, { taskStatus: 'processing' }, { orderBy: [{ field: 'createdAt', order: 'desc' }], limit: 10 })),
  ]
  const reports = [
    ...(await listByWhere(COLLECTIONS.REPORTS, { status: 'pending' }, { orderBy: [{ field: 'createdAt', order: 'desc' }], limit: 10 })),
    ...(await listByWhere(COLLECTIONS.REPORTS, { status: 'processing' }, { orderBy: [{ field: 'createdAt', order: 'desc' }], limit: 10 })),
  ]
  const accountActions = await listByWhere(COLLECTIONS.ACCOUNT_ACTIONS, { status: 'active' }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 10,
  })

  const items: Array<DashboardPriorityItemDto & { sortRisk: number; sortTime: number }> = []

  for (const task of reviewTasks) {
    const notice = await findOneByField(COLLECTIONS.NOTICES, 'noticeId', asString(task.objectId))
    const riskLevel = asNullableString(task.riskLevel) ?? asNullableString(notice?.riskLevel)
    const riskFlags = Array.from(new Set([...asStringArray(task.riskFlags), ...asStringArray(notice?.riskFlags)]))
    const sortRisk = riskLevel === 'high' ? 3 : riskLevel === 'medium' ? 2 : riskLevel === 'low' ? 1 : 0

    items.push({
      itemType: 'review_task',
      itemId: asString(task.reviewTaskId),
      title: sortRisk >= 3 ? '高风险审核任务' : '待处理审核任务',
      summary: riskFlags.length > 0 ? riskFlags.join(' / ') : asString(notice?.title, '待处理通告审核'),
      status: asString(task.taskStatus),
      riskLevel,
      createdAt: toIsoString(task.createdAt),
      routeKey: 'review-detail',
      routeParams: {
        reviewTaskId: asString(task.reviewTaskId),
      },
      sortRisk,
      sortTime: toDate(task.createdAt).getTime(),
    })
  }

  for (const report of reports) {
    const normalized = normalizeReportTarget(report)
    const aggregatedReportCount = normalized.isValid
      ? await countReportsByTarget(normalized.normalizedType, normalized.normalizedId)
      : 0
    const targetSnapshot = await resolveReportTargetSnapshot(report)
    const sortRisk = targetSnapshot.riskSummary.riskLevel === 'high' || aggregatedReportCount >= 3 ? 3 : 1

    items.push({
      itemType: 'report',
      itemId: asString(report.reportId),
      title: aggregatedReportCount >= 3 ? '重复举报聚合项' : '待处理举报',
      summary: aggregatedReportCount >= 3
        ? `同一对象累计 ${aggregatedReportCount} 次举报`
        : `${targetSnapshot.displayName} / ${asString(report.reasonCode)}`,
      status: asString(report.status),
      riskLevel: targetSnapshot.riskSummary.riskLevel ?? (aggregatedReportCount >= 3 ? 'high' : 'low'),
      createdAt: toIsoString(report.createdAt),
      routeKey: 'report-detail',
      routeParams: {
        reportId: asString(report.reportId),
      },
      sortRisk,
      sortTime: toDate(report.createdAt).getTime(),
    })
  }

  for (const accountAction of accountActions) {
    const user = await resolveUserSummary(asString(accountAction.userId))
    const sortRisk = getRestrictionPriority(asString(accountAction.restrictionType))

    items.push({
      itemType: 'account_action',
      itemId: asString(accountAction.restrictionId),
      title: '新治理动作',
      summary: `${user.displayName} / ${asString(accountAction.restrictionType)}`,
      status: asString(accountAction.status),
      riskLevel: sortRisk >= 3 ? 'high' : sortRisk >= 2 ? 'medium' : 'low',
      createdAt: toIsoString(accountAction.createdAt),
      routeKey: 'account-action-list',
      routeParams: {
        restrictionId: asString(accountAction.restrictionId),
        userId: asString(accountAction.userId),
      },
      sortRisk,
      sortTime: toDate(accountAction.createdAt).getTime(),
    })
  }

  return items
    .sort((left, right) => {
      if (right.sortRisk !== left.sortRisk) {
        return right.sortRisk - left.sortRisk
      }

      return left.sortTime - right.sortTime
    })
    .slice(0, 8)
    .map(({ sortRisk: _sortRisk, sortTime: _sortTime, ...item }) => item)
}

export async function getGovernanceDashboard(_adminContext: AdminContext): Promise<GovernanceDashboardResponseData> {
  const reviewPending = asNumber((await countByWhere(COLLECTIONS.NOTICE_REVIEW_TASKS, { taskStatus: 'pending' }) as any).total, 0)
  const reportPending = asNumber((await countByWhere(COLLECTIONS.REPORTS, { status: 'pending' }) as any).total, 0)
  const recentNotices = await loadRecentDocuments(COLLECTIONS.NOTICES)
  const recentReviewTasks = await loadRecentDocuments(COLLECTIONS.NOTICE_REVIEW_TASKS)
  const recentAccountActions = await loadRecentDocuments(COLLECTIONS.ACCOUNT_ACTIONS)
  const currentTime = now()

  return {
    reviewPendingCount: reviewPending,
    reportPendingCount: reportPending,
    todayNoticeCount: recentNotices.filter((item) => isSameUtcDay(item.createdAt, currentTime)).length,
    todayApprovedCount: recentReviewTasks.filter((item) => isSameUtcDay(item.completedAt, currentTime) && asString(item.reviewResult) === 'approved').length,
    todayRejectedCount: recentReviewTasks.filter(
      (item) => isSameUtcDay(item.completedAt, currentTime) && ['rejected', 'supplement_required', 'removed'].includes(asString(item.reviewResult)),
    ).length,
    todayNewBlacklistCount: recentAccountActions.filter((item) => isSameUtcDay(item.createdAt, currentTime) && asString(item.status) === 'active').length,
    priorityItems: await buildDashboardPriorityItems(),
  }
}

export async function listOperationLogs(filters: Record<string, unknown>): Promise<OperationLogListResponseData> {
  const where: Record<string, unknown> = {}

  if (filters.targetType) {
    where.targetType = filters.targetType
  }

  if (filters.targetId) {
    where.targetId = filters.targetId
  }

  if (filters.operatorType) {
    where.operatorType = filters.operatorType
  }

  const pageSize = Number(filters.pageSize)
  const offset = Number(filters.offset || 0)
  const records = await listByWhere(COLLECTIONS.OPERATION_LOGS, where, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: pageSize + 1,
    skip: offset,
  })

  const hasMore = records.length > pageSize
  const list: OperationLogListItemDto[] = []

  for (const record of records.slice(0, pageSize)) {
    list.push({
      logId: asString(record.logId),
      targetType: asString(record.targetType),
      targetId: asString(record.targetId),
      action: asString(record.action),
      operatorType: asString(record.operatorType),
      operatorId: asString(record.operatorId),
      operatorDisplayName: await resolveOperatorDisplayName(asString(record.operatorType), asString(record.operatorId)),
      requestId: asString(record.requestId),
      remark: asString(record.remark),
      createdAt: toIsoString(record.createdAt),
      beforeSnapshot: (record.beforeSnapshot as Record<string, unknown>) ?? null,
      afterSnapshot: (record.afterSnapshot as Record<string, unknown>) ?? null,
    })
  }

  return {
    list,
    hasMore,
    nextCursor: hasMore ? buildOffsetCursor(offset + pageSize) : '',
  }
}

export async function claimReportCase(reportId: string, adminContext: AdminContext, requestId: string) {
  const report = await findOneByField(COLLECTIONS.REPORTS, 'reportId', reportId)

  if (!report) {
    throw createValidationError({
      reportId: 'reportId 不存在',
    })
  }

  if (asString(report.status) !== 'pending') {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前举报不可领取',
    })
  }

  const patch = {
    status: 'processing',
    handlerId: adminContext.adminUserId,
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.REPORTS, report._id, patch)
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'report_claim',
    targetType: 'report',
    targetId: reportId,
    requestId,
    beforeSnapshot: {
      status: report.status,
      handlerId: report.handlerId ?? null,
    },
    afterSnapshot: patch,
    remark: '领取举报任务',
  })

  return {
    reportId,
    status: patch.status,
    handlerId: patch.handlerId,
  }
}

export async function resolveReportCase(
  payload: {
    reportId: string
    result: string
    resultAction: string | null
    resultRemark?: string
    noticeAction?: string
    accountAction: Record<string, unknown> | null
  },
  adminContext: AdminContext,
  requestId: string,
) {
  const report = await findOneByField(COLLECTIONS.REPORTS, 'reportId', payload.reportId)

  if (!report) {
    throw createValidationError({
      reportId: 'reportId 不存在',
    })
  }

  if (asString(report.status) !== 'processing') {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前举报不可处理',
    })
  }

  await assertReportEditable(report, adminContext)

  const targetSnapshot = await resolveReportTargetSnapshot(report)
  let linkedNoticeStatus: string | null = null
  let linkedAccountStatus: string | null = null

  if (payload.result === 'confirmed') {
    const shouldRemoveNotice = payload.noticeAction === 'remove_notice' || payload.resultAction === TEMP_RESOLVE_REPORT_RESULT_ACTIONS.REMOVE_NOTICE

    if (shouldRemoveNotice && targetSnapshot.targetType === 'notice') {
      linkedNoticeStatus = await applyNoticeRemoval(
        asString(report.targetId),
        asString(report.reasonCode),
        payload.resultRemark ?? asNullableString(report.reasonText),
        adminContext,
        requestId,
      )
    }

    if (payload.accountAction) {
      const accountActionResult = await createAccountActionInternal({
        userId: asString(payload.accountAction.userId),
        restrictionType: asString(payload.accountAction.restrictionType),
        reasonCategory: asString(payload.accountAction.reasonCategory),
        reasonText: asNullableString(payload.accountAction.reasonText),
        endAt: asNullableString(payload.accountAction.endAt),
        forceRemoveActiveNotices: Boolean(payload.accountAction.forceRemoveActiveNotices),
      }, adminContext, requestId, 'report_create_account_action')
      linkedAccountStatus = accountActionResult.accountStatus
    }
  }

  const nextStatus = payload.result === 'confirmed' ? 'confirmed' : 'rejected'
  const patch = {
    status: nextStatus,
    resultAction: payload.resultAction,
    resultRemark: payload.resultRemark ?? null,
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.REPORTS, report._id, patch)
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'report_resolve',
    targetType: 'report',
    targetId: payload.reportId,
    requestId,
    beforeSnapshot: {
      status: report.status,
      resultAction: report.resultAction ?? null,
    },
    afterSnapshot: {
      status: nextStatus,
      resultAction: payload.resultAction,
      linkedNoticeStatus,
      linkedAccountStatus,
    },
    remark: payload.resultRemark ?? `${payload.result} / ${payload.resultAction ?? 'none'}`,
  })

  return {
    reportId: payload.reportId,
    status: nextStatus,
    linkedNoticeStatus,
    linkedAccountStatus,
  }
}

export async function createAccountActionRecord(
  payload: {
    userId: string
    restrictionType: string
    reasonCategory: string
    reasonText?: string
    startAt?: string
    endAt?: string
    forceRemoveActiveNotices?: boolean
  },
  adminContext: AdminContext,
  requestId: string,
) {
  const result = await createAccountActionInternal(payload, adminContext, requestId, 'account_action_create')

  return {
    restrictionId: result.restrictionId,
    accountStatus: result.accountStatus,
  }
}

export async function releaseAccountActionRecord(
  restrictionId: string,
  reasonText: string | null,
  adminContext: AdminContext,
  requestId: string,
) {
  const record = await findOneByField(COLLECTIONS.ACCOUNT_ACTIONS, 'restrictionId', restrictionId)

  if (!record) {
    throw createValidationError({
      restrictionId: 'restrictionId 不存在',
    })
  }

  if (asString(record.status) !== 'active') {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前处罚记录不可解除',
    })
  }

  const patch = {
    status: 'released',
    releaseReasonText: reasonText,
    releasedAt: now(),
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.ACCOUNT_ACTIONS, record._id, patch)
  const accountStatus = await recomputeUserAccountStatus(asString(record.userId))
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'account_action_release',
    targetType: 'account_action',
    targetId: restrictionId,
    requestId,
    beforeSnapshot: {
      status: record.status,
      restrictionType: record.restrictionType,
    },
    afterSnapshot: {
      status: patch.status,
      accountStatus,
    },
    remark: reasonText ?? '解除处罚',
  })

  return {
    restrictionId,
    status: patch.status,
    accountStatus,
  }
}

export async function forceRemoveNoticeRecord(
  noticeId: string,
  reasonCategory: string,
  reasonText: string | null,
  adminContext: AdminContext,
  requestId: string,
) {
  const status = await applyNoticeRemoval(noticeId, reasonCategory, reasonText, adminContext, requestId)

  if (!status) {
    throw createValidationError({
      noticeId: 'noticeId 不存在',
    })
  }

  return {
    noticeId,
    status,
  }
}
