import { ADMIN_AVAILABLE_ACTION_KEYS, LEGACY_AVAILABLE_ACTION_KEY_MAP } from '@/constants/admin-contract'
import { ROUTE_NAMES } from '@/constants/routes'
import type { ActionOption } from '@/models/common'
import type {
  AccountActionListItem,
  AccountActionListResult,
  DashboardPriorityItem,
  DashboardResult,
  OperationLogItem,
  OperationLogListResult,
} from '@/models/governance'
import type { ReportDetailResult, ReportHistoryAction, ReportHistoryRecord, ReportListItem, ReportListResult } from '@/models/report'
import type {
  ReviewDetailResult,
  ReviewHistoryLog,
  ReviewRiskSummary,
  ReviewTaskDetailNotice,
  ReviewTaskDetailPublisherProfile,
  ReviewTaskDetailTask,
  ReviewTaskListItem,
  ReviewTaskListResult,
} from '@/models/review'

const mapLegacyVariant = (value?: string) => {
  if (value === 'primary' || value === 'danger' || value === 'default') {
    return value
  }
  return value === 'warning' ? 'default' : value === 'success' ? 'primary' : 'default'
}

const toStringValue = (value: unknown, fallback = '') => {
  if (value === undefined || value === null) {
    return fallback
  }
  return String(value)
}

const toNullableString = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return String(value)
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => String(item))
}

const toRecordObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

const normalizeActionOption = (action: Record<string, any>): ActionOption => {
  const normalizedKey = LEGACY_AVAILABLE_ACTION_KEY_MAP[String(action.key)] || String(action.key)
  const variant = mapLegacyVariant(action.variant || action.buttonType)

  return {
    key: normalizedKey,
    label: toStringValue(action.label),
    variant,
    disabled: Boolean(action.disabled),
    disabledReason: action.disabledReason ?? null,
    danger: variant === 'danger' || Boolean(action.danger),
  }
}

const normalizeReviewTaskStatus = (status?: string) => {
  if (status === 'claimed') return 'processing'
  if (status === 'resolved') return 'completed'
  return (status || 'pending') as ReviewTaskListItem['taskStatus']
}

const normalizeReviewStage = (stage?: string) => {
  if (stage === 'machine_review') return 'initial_review'
  if (stage === 'final_review') return 'resubmission_review'
  return (stage || 'manual_review') as ReviewTaskListItem['reviewStage']
}

const normalizeReviewRiskSummary = (raw: Record<string, any>): ReviewRiskSummary => ({
  riskLevel: raw?.riskLevel ?? null,
  riskFlags: toStringArray(raw?.riskFlags),
  suggestedTags: toStringArray(raw?.suggestedTags),
})

const normalizeReviewHistoryLog = (log: Record<string, any>): ReviewHistoryLog => ({
  action: toStringValue(log.action),
  operatorType: toStringValue(log.operatorType || 'admin'),
  operatorId: toStringValue(log.operatorId),
  operatorDisplayName: toStringValue(log.operatorDisplayName),
  remark: toStringValue(log.remark),
  createdAt: toStringValue(log.createdAt),
})

const normalizeReviewListItem = (item: Record<string, any>): ReviewTaskListItem => ({
  reviewTaskId: toStringValue(item.reviewTaskId),
  taskStatus: normalizeReviewTaskStatus(item.taskStatus),
  reviewStage: normalizeReviewStage(item.reviewStage),
  queueType: toStringValue(item.queueType),
  riskLevel: item.riskLevel ?? null,
  riskFlags: toStringArray(item.riskFlags),
  createdAt: toStringValue(item.createdAt),
  claimedAt: toNullableString(item.claimedAt),
  notice: {
    noticeId: toStringValue(item.notice?.noticeId),
    title: toStringValue(item.notice?.title),
    status: toStringValue(item.notice?.status),
    city: toStringValue(item.notice?.city),
    cooperationPlatform: toStringValue(item.notice?.cooperationPlatform),
    settlementType: toStringValue(item.notice?.settlementType),
    budgetSummary: toStringValue(item.notice?.budgetSummary),
  },
  publisher: {
    publisherUserId: toStringValue(item.publisher?.publisherUserId),
    publisherProfileId: toStringValue(item.publisher?.publisherProfileId),
    displayName: toStringValue(item.publisher?.displayName),
    identityType: toStringValue(item.publisher?.identityType),
    city: toStringValue(item.publisher?.city),
  },
  assignedAdmin: item.assignedAdmin
    ? {
        adminUserId: toStringValue(item.assignedAdmin.adminUserId),
        displayName: toStringValue(item.assignedAdmin.displayName),
      }
    : null,
})

export const normalizeReviewTaskListResult = (raw: Record<string, any>): ReviewTaskListResult => ({
  list: (raw.list || []).map((item: Record<string, any>) => normalizeReviewListItem(item)),
  nextCursor: toStringValue(raw.nextCursor),
  hasMore: Boolean(raw.hasMore),
  summary: {
    pendingCount: Number(raw.summary?.pendingCount || 0),
  },
})

const normalizeReviewDetailTask = (
  rawTask: Record<string, any>,
  _rawNotice: Record<string, any>,
  riskSummary: ReviewRiskSummary,
): ReviewTaskDetailTask => ({
  reviewTaskId: toStringValue(rawTask?.reviewTaskId),
  objectType: 'notice',
  objectId: toStringValue(rawTask?.objectId),
  noticeStatusSnapshot: toStringValue(rawTask?.noticeStatusSnapshot),
  reviewStage: normalizeReviewStage(rawTask?.reviewStage),
  taskStatus: normalizeReviewTaskStatus(rawTask?.taskStatus),
  queueType: toStringValue(rawTask?.queueType),
  riskLevel: rawTask?.riskLevel ?? riskSummary.riskLevel ?? null,
  riskFlags: toStringArray(rawTask?.riskFlags || riskSummary.riskFlags),
  assignedTo: toNullableString(rawTask?.assignedTo),
  assignedAdminName: toNullableString(rawTask?.assignedAdminName),
  claimedAt: toNullableString(rawTask?.claimedAt),
  completedAt: toNullableString(rawTask?.completedAt),
  reviewResult: toNullableString(rawTask?.reviewResult) as ReviewTaskDetailTask['reviewResult'],
  reasonCategory: toNullableString(rawTask?.reasonCategory),
  reasonText: toNullableString(rawTask?.reasonText),
  nextQueueType: toNullableString(rawTask?.nextQueueType) as ReviewTaskDetailTask['nextQueueType'],
  createdAt: toStringValue(rawTask?.createdAt),
})

const normalizeReviewDetailNotice = (
  rawNotice: Record<string, any>,
  _rawPublisherProfile: Record<string, any>,
  riskSummary: ReviewRiskSummary,
): ReviewTaskDetailNotice => ({
  noticeId: toStringValue(rawNotice?.noticeId),
  publisherUserId: toStringValue(rawNotice?.publisherUserId),
  publisherProfileId: toStringValue(rawNotice?.publisherProfileId),
  title: toStringValue(rawNotice?.title),
  brandName: toNullableString(rawNotice?.brandName),
  identityTypeSnapshot: toStringValue(rawNotice?.identityTypeSnapshot),
  cooperationPlatform: toStringValue(rawNotice?.cooperationPlatform),
  cooperationCategory: toStringValue(rawNotice?.cooperationCategory),
  cooperationType: toStringValue(rawNotice?.cooperationType),
  city: toStringValue(rawNotice?.city),
  settlementType: toStringValue(rawNotice?.settlementType),
  budgetRange: toStringValue(rawNotice?.budgetRange),
  budgetSummary: toStringValue(rawNotice?.budgetSummary),
  recruitCount: typeof rawNotice?.recruitCount === 'number' ? rawNotice.recruitCount : null,
  deadlineAt: toStringValue(rawNotice?.deadlineAt),
  creatorRequirements: toStringValue(rawNotice?.creatorRequirements),
  cooperationDescription: toStringValue(rawNotice?.cooperationDescription),
  attachments: toStringArray(rawNotice?.attachments),
  status: toStringValue(rawNotice?.status),
  reviewRoundCount: Number(rawNotice?.reviewRoundCount || 0),
  latestReviewReasonCategory: toNullableString(rawNotice?.latestReviewReasonCategory),
  latestReviewReasonText: toNullableString(rawNotice?.latestReviewReasonText),
  riskFlags: toStringArray(rawNotice?.riskFlags || riskSummary.riskFlags),
  applicationCount: Number(rawNotice?.applicationCount || 0),
  publishedAt: toNullableString(rawNotice?.publishedAt),
  closedAt: toNullableString(rawNotice?.closedAt),
  removedAt: toNullableString(rawNotice?.removedAt),
})

const normalizeReviewPublisherProfile = (rawProfile: Record<string, any>): ReviewTaskDetailPublisherProfile => ({
  publisherProfileId: toStringValue(rawProfile?.publisherProfileId),
  userId: toStringValue(rawProfile?.userId),
  identityType: toStringValue(rawProfile?.identityType),
  displayName: toStringValue(rawProfile?.displayName),
  city: toStringValue(rawProfile?.city),
  contactType: toStringValue(rawProfile?.contactType),
  contactValue: toStringValue(rawProfile?.contactValue),
  intro: toNullableString(rawProfile?.intro),
  profileCompleteness: Number(rawProfile?.profileCompleteness || 0),
  publishCount: Number(rawProfile?.publishCount || 0),
  approvedPublishCount: Number(rawProfile?.approvedPublishCount || 0),
  violationCount: Number(rawProfile?.violationCount || 0),
  status: toStringValue(rawProfile?.status),
})

export const normalizeReviewDetailResult = (raw: Record<string, any>): ReviewDetailResult => {
  const riskSummary = normalizeReviewRiskSummary(raw.riskSummary || {})

  return {
    task: normalizeReviewDetailTask(raw.task || {}, raw.notice || {}, riskSummary),
    notice: normalizeReviewDetailNotice(raw.notice || {}, raw.publisherProfile || {}, riskSummary),
    publisherProfile: normalizeReviewPublisherProfile(raw.publisherProfile || {}),
    riskSummary,
    historyLogs: (raw.historyLogs || []).map((item: Record<string, any>) => normalizeReviewHistoryLog(item)),
    availableActions: (raw.availableActions || []).map((item: Record<string, any>) => normalizeActionOption(item)),
  }
}

const DASHBOARD_ROUTE_KEY_MAP: Record<string, string> = {
  [ROUTE_NAMES.REVIEW_DETAIL]: ROUTE_NAMES.REVIEW_DETAIL,
  [ROUTE_NAMES.REPORT_DETAIL]: ROUTE_NAMES.REPORT_DETAIL,
  [ROUTE_NAMES.BLACKLIST]: ROUTE_NAMES.BLACKLIST,
  'account-action-list': ROUTE_NAMES.BLACKLIST,
}

const normalizeDashboardRouteKey = (routeKey: string) => {
  return DASHBOARD_ROUTE_KEY_MAP[routeKey] || ROUTE_NAMES.DASHBOARD
}

const normalizeRouteParams = (routeParams: unknown) => {
  if (!routeParams || typeof routeParams !== 'object') {
    return {}
  }

  return Object.entries(routeParams as Record<string, unknown>).reduce<Record<string, string>>((accumulator, [key, value]) => {
    accumulator[key] = String(value ?? '')
    return accumulator
  }, {})
}

const normalizePriorityItem = (item: Record<string, any>): DashboardPriorityItem => ({
  itemType: toStringValue(item.itemType) as DashboardPriorityItem['itemType'],
  itemId: toStringValue(item.itemId),
  title: toStringValue(item.title),
  summary: toStringValue(item.summary),
  status: toStringValue(item.status),
  riskLevel: item.riskLevel ?? null,
  createdAt: toStringValue(item.createdAt),
  routeKey: normalizeDashboardRouteKey(toStringValue(item.routeKey)),
  routeParams: normalizeRouteParams(item.routeParams),
})

export const normalizeDashboardResult = (raw: Record<string, any>): DashboardResult => ({
  reviewPendingCount: Number(raw.reviewPendingCount || 0),
  reportPendingCount: Number(raw.reportPendingCount || 0),
  todayNoticeCount: Number(raw.todayNoticeCount || 0),
  todayApprovedCount: Number(raw.todayApprovedCount || 0),
  todayRejectedCount: Number(raw.todayRejectedCount || 0),
  todayNewBlacklistCount: Number(raw.todayNewBlacklistCount || 0),
  priorityItems: (raw.priorityItems || []).map((item: Record<string, any>) => normalizePriorityItem(item)),
})

const normalizeReportRiskSummary = (raw: Record<string, any>) => ({
  riskLevel: raw?.riskLevel ?? null,
  riskFlags: toStringArray(raw?.riskFlags),
  suggestedTags: toStringArray(raw?.suggestedTags),
})

const normalizeReportListItem = (item: Record<string, any>): ReportListItem => ({
  reportId: toStringValue(item.reportId),
  targetType: toStringValue(item.targetType),
  targetId: toStringValue(item.targetId),
  targetDisplayName: toStringValue(item.targetDisplayName),
  reasonCode: toStringValue(item.reasonCode),
  status: toStringValue(item.status),
  aggregatedReportCount: Number(item.aggregatedReportCount || 0),
  isHighRisk: Boolean(item.isHighRisk),
  createdAt: toStringValue(item.createdAt),
  handlerId: toNullableString(item.handlerId),
  resultAction: toNullableString(item.resultAction),
})

const normalizeReportHistoryAction = (item: Record<string, any>, fallbackTargetId = ''): ReportHistoryAction => ({
  action: toStringValue(item.action),
  operatorType: toStringValue(item.operatorType || 'admin'),
  operatorId: toStringValue(item.operatorId),
  operatorDisplayName: toStringValue(item.operatorDisplayName),
  remark: toStringValue(item.remark),
  createdAt: toStringValue(item.createdAt),
  targetType: toStringValue(item.targetType || 'report'),
  targetId: toStringValue(item.targetId || fallbackTargetId),
})

export const normalizeReportListResult = (raw: Record<string, any>): ReportListResult => ({
  list: (raw.list || []).map((item: Record<string, any>) => normalizeReportListItem(item)),
  nextCursor: toStringValue(raw.nextCursor),
  hasMore: Boolean(raw.hasMore),
})

const normalizeReportDetailReport = (rawReport: Record<string, any>) => ({
  reportId: toStringValue(rawReport?.reportId),
  reporterUserId: toStringValue(rawReport?.reporterUserId),
  targetType: toStringValue(rawReport?.targetType),
  targetId: toStringValue(rawReport?.targetId),
  reasonCode: toStringValue(rawReport?.reasonCode),
  reasonText: toNullableString(rawReport?.reasonText),
  evidenceImages: toStringArray(rawReport?.evidenceImages),
  status: toStringValue(rawReport?.status),
  handlerId: toNullableString(rawReport?.handlerId),
  resultAction: toNullableString(rawReport?.resultAction),
  resultRemark: toNullableString(rawReport?.resultRemark),
  createdAt: toStringValue(rawReport?.createdAt),
})

const normalizeReportTargetSnapshot = (rawTarget: Record<string, any>, _rawReport: Record<string, any>) => ({
  targetType: toStringValue(rawTarget?.targetType),
  targetId: toStringValue(rawTarget?.targetId),
  displayName: toStringValue(rawTarget?.displayName),
  status: toStringValue(rawTarget?.status),
  ownerUserId: toStringValue(rawTarget?.ownerUserId),
  city: toNullableString(rawTarget?.city),
  summary: toStringValue(rawTarget?.summary),
  riskSummary: normalizeReportRiskSummary(rawTarget?.riskSummary || {}),
})

export const normalizeReportDetailResult = (raw: Record<string, any>): ReportDetailResult => ({
  report: normalizeReportDetailReport(raw.report || {}),
  targetSnapshot: normalizeReportTargetSnapshot(raw.targetSnapshot || {}, raw.report || {}),
  historyReports: (raw.historyReports || []).map(
    (item: Record<string, any>): ReportHistoryRecord => ({
      reportId: toStringValue(item.reportId),
      reasonCode: toStringValue(item.reasonCode),
      status: toStringValue(item.status),
      reporterUserId: toStringValue(item.reporterUserId),
      createdAt: toStringValue(item.createdAt),
    }),
  ),
  historyActions: (raw.historyActions || []).map((item: Record<string, any>) =>
    normalizeReportHistoryAction(item, raw.report?.reportId),
  ),
  availableActions: (raw.availableActions || []).map((item: Record<string, any>) => normalizeActionOption(item)),
})

const normalizeAccountActionListItem = (item: Record<string, any>): AccountActionListItem => ({
  restrictionId: toStringValue(item.restrictionId),
  user: {
    userId: toStringValue(item.user?.userId),
    displayName: toStringValue(item.user?.displayName),
    avatarUrl: toNullableString(item.user?.avatarUrl),
    accountStatus: toStringValue(item.user?.accountStatus),
  },
  restrictionType: toStringValue(item.restrictionType),
  reasonCategory: toStringValue(item.reasonCategory),
  reasonText: toNullableString(item.reasonText),
  startAt: toStringValue(item.startAt),
  endAt: toNullableString(item.endAt),
  operator: {
    operatorId: toStringValue(item.operator?.operatorId),
    displayName: toStringValue(item.operator?.displayName),
  },
  status: toStringValue(item.status),
  createdAt: toStringValue(item.createdAt),
})

export const normalizeAccountActionListResult = (raw: Record<string, any>): AccountActionListResult => ({
  list: (raw.list || []).map((item: Record<string, any>) => normalizeAccountActionListItem(item)),
  nextCursor: toStringValue(raw.nextCursor),
  hasMore: Boolean(raw.hasMore),
})

const normalizeOperationLogItem = (item: Record<string, any>): OperationLogItem => ({
  logId: toStringValue(item.logId),
  targetType: toStringValue(item.targetType),
  targetId: toStringValue(item.targetId),
  action: toStringValue(item.action),
  operatorType: toStringValue(item.operatorType),
  operatorId: toStringValue(item.operatorId),
  operatorDisplayName: toStringValue(item.operatorDisplayName),
  requestId: toStringValue(item.requestId),
  remark: toStringValue(item.remark),
  createdAt: toStringValue(item.createdAt),
  beforeSnapshot: toRecordObject(item.beforeSnapshot),
  afterSnapshot: toRecordObject(item.afterSnapshot),
})

export const normalizeOperationLogListResult = (raw: Record<string, any>): OperationLogListResult => ({
  list: (raw.list || []).map((item: Record<string, any>) => normalizeOperationLogItem(item)),
  nextCursor: toStringValue(raw.nextCursor),
  hasMore: Boolean(raw.hasMore),
})

export const normalizeAvailableActionKey = (key: string) => {
  return LEGACY_AVAILABLE_ACTION_KEY_MAP[key] || key || ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK
}
