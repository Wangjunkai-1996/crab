import {
  REPORT_STATUS_LABEL_MAP,
  RESTRICTION_STATUS_LABEL_MAP,
  REVIEW_STAGE_LABEL_MAP,
  REVIEW_TASK_STATUS_LABEL_MAP,
  RISK_LEVEL_LABEL_MAP,
} from '@/constants/status'
import { formatDateTime, formatText } from '@/utils/formatter'

type DashboardPriorityLike = {
  itemType: string
  title: string
  summary: string
  status: string
  riskLevel: string | null
}

type OperationLogLike = {
  action: string
  targetType: string
  operatorType: string
  remark: string
  beforeSnapshot: Record<string, unknown> | null
  afterSnapshot: Record<string, unknown> | null
}

type ReviewHistoryLike = {
  action: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  remark: string
}

type ReportHistoryLike = {
  reportId: string
  reasonCode: string
  status: string
  reporterUserId: string
}

type ReportHistoryActionLike = {
  action: string
  targetType: string
  targetId: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  remark: string
}

type ReviewResultCardLike = {
  completedAt: string | null
  reviewResult: string | null
  reasonCategory: string | null
  reasonText: string | null
  nextQueueType: string | null
}

type ReportResultCardLike = {
  handlerId: string | null
  resultAction: string | null
  resultRemark: string | null
  status: string
}

type ReportTargetSnapshotLike = {
  targetType: string
  summary: string
  status: string
}

const RISK_FLAG_LABEL_MAP: Record<string, string> = {
  sensitive_keywords: '敏感词风险',
  contact_anomaly: '联系方式异常',
  multi_reports_24h: '短时重复举报',
}

const CONTACT_TYPE_LABEL_MAP: Record<string, string> = {
  wechat: '微信',
  phone: '手机',
  mobile: '手机',
  email: '邮箱',
  qq: 'QQ',
}

const OPERATION_ACTION_LABEL_MAP: Record<string, string> = {
  admin_login: '管理员登录成功',
  admin_logout: '管理员主动登出',
  admin_change_password: '管理员修改密码',
  claim_task: '领取审核',
  release_task: '释放审核',
  resolve_task_approved: '审核通过',
  resolve_task_rejected: '审核拒绝',
  resolve_task_supplement_required: '要求补件',
  resolve_task_transfer_manual_review: '转人工复核',
  resolve_task_removed: '审核下架处理',
  report_claim: '领取举报',
  report_release: '释放举报',
  report_reject: '举报不成立',
  report_resolve_record_only: '举报成立（仅记录）',
  report_resolve_rejected: '举报不成立',
  report_resolve_confirmed: '举报成立',
  report_resolve_restrict_publish: '举报成立（限制发布）',
  report_resolve_restrict_apply: '举报成立（限制报名）',
  report_resolve_banned: '举报成立（全量封禁）',
  review_task_claim: '领取审核',
  review_task_release: '释放审核',
  review_task_resolve: '审核处理完成',
  notice_review_result: '通告审核结论',
  report_resolve: '举报处理完成',
  report_create_account_action: '举报联动处罚',
  notice_force_remove: '强制下架通告',
  notice_review_sample: '通告审核样本',
  account_action_create: '新增处罚',
  account_action_release: '解除处罚',
}

const DASHBOARD_PRIORITY_STATUS_LABEL_MAP: Record<string, Record<string, string>> = {
  review_task: REVIEW_TASK_STATUS_LABEL_MAP,
  report: REPORT_STATUS_LABEL_MAP,
  account_action: RESTRICTION_STATUS_LABEL_MAP,
}

const RESULT_ACTION_LABEL_MAP: Record<string, string> = {
  record_only: '仅记录',
  remove_notice: '下架通告',
  watchlist: '加入观察名单',
  restrict_publish: '限制发布',
  restrict_apply: '限制报名',
  restricted_publish: '限制发布',
  restricted_apply: '限制报名',
  banned: '全量封禁',
}

const REVIEW_RESULT_LABEL_MAP: Record<string, string> = {
  approved: '审核通过',
  rejected: '审核拒绝',
  supplement_required: '补件复审',
  transfer_manual_review: '转人工复核',
  removed: '下架处理',
}

const REVIEW_NEXT_QUEUE_LABEL_MAP: Record<string, string> = {
  initial_review: '初审队列',
  manual_review: '人工审核',
  resubmission_review: '补件复审',
  manual_review_queue: '人工审核队列',
}

const NOTICE_STATUS_LABEL_MAP: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  supplement_required: '待补件',
  active: '已上线',
  rejected: '已拒绝',
  removed: '已下架',
  closed: '已关闭',
}

const REPORT_EXTRA_STATUS_LABEL_MAP: Record<string, string> = {
  confirmed: '举报成立',
  rejected: '举报驳回',
}

const getSnapshotField = (snapshot: Record<string, unknown> | null | undefined, key: string) => {
  if (!snapshot || snapshot[key] === undefined || snapshot[key] === null || snapshot[key] === '') {
    return ''
  }

  return String(snapshot[key])
}

const joinDisplayParts = (parts: Array<string | null | undefined>) => parts.filter((item) => Boolean(item && item !== '--')).join(' / ')

export const formatRiskLevelLabel = (value: string | null | undefined) => (value ? RISK_LEVEL_LABEL_MAP[value] || value : '--')

export const formatRiskFlagLabel = (value: string | null | undefined) => (value ? RISK_FLAG_LABEL_MAP[value] || value : '--')

export const formatRiskFlagList = (values: string[] | null | undefined) => {
  if (!Array.isArray(values)) {
    return []
  }

  return values.map((value) => formatRiskFlagLabel(value))
}

export const formatIdentityTypeLabel = (value: string | null | undefined) => {
  if (value === 'merchant') return '商家'
  if (value === 'company') return '企业'
  if (value === 'personal') return '个人'
  return value || '--'
}

export const formatReviewTaskStatusLabel = (value: string) => REVIEW_TASK_STATUS_LABEL_MAP[value] || value

export const formatReviewStageLabel = (value: string) => REVIEW_STAGE_LABEL_MAP[value] || value

export const formatReportStatusLabel = (value: string) => REPORT_STATUS_LABEL_MAP[value] || REPORT_EXTRA_STATUS_LABEL_MAP[value] || value

export const formatGenericStatusLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  if (value === 'missing') {
    return '信息缺失'
  }

  if (REPORT_STATUS_LABEL_MAP[value]) {
    return REPORT_STATUS_LABEL_MAP[value]
  }

  if (REPORT_EXTRA_STATUS_LABEL_MAP[value]) {
    return REPORT_EXTRA_STATUS_LABEL_MAP[value]
  }

  if (REVIEW_TASK_STATUS_LABEL_MAP[value]) {
    return REVIEW_TASK_STATUS_LABEL_MAP[value]
  }

  if (RESTRICTION_STATUS_LABEL_MAP[value]) {
    return RESTRICTION_STATUS_LABEL_MAP[value]
  }

  if (NOTICE_STATUS_LABEL_MAP[value]) {
    return NOTICE_STATUS_LABEL_MAP[value]
  }

  if (value === 'normal') {
    return formatAccountStatusLabel(value)
  }

  return value
}

export const formatReportTargetTypeLabel = (value: string | null | undefined) => {
  if (value === 'missing') return '缺失目标'
  if (value === 'notice') return '通告'
  if (value === 'publisher') return '发布方'
  if (value === 'creator') return '达人'
  if (value === 'user') return '账号'
  if (value === 'report') return '举报单'
  if (value === 'review_task') return '审核任务'
  if (value === 'account_action') return '处罚记录'
  if (value === 'admin_session') return '管理员会话'
  if (value === 'admin-auth') return '后台鉴权'
  return value || '--'
}

export const formatReportReasonCodeLabel = (value: string | null | undefined) => {
  if (value === 'fake_requirement') return '虚假合作需求'
  if (value === 'illegal_content') return '违规内容'
  if (value === 'fraud') return '诈骗诱导'
  if (value === 'contact_abuse') return '联系方式违规'
  if (value === 'contact_risk') return '联系方式异常'
  if (value === 'sensitive_content') return '敏感内容'
  if (value === 'sensitive_keywords') return '敏感词风险'
  if (value === 'manual_review') return '人工复核'
  if (value === 'incomplete_material') return '资料不完整'
  return value || '--'
}

export const formatReasonCategoryLabel = (value: string | null | undefined) => formatReportReasonCodeLabel(value)

export const formatRestrictionTypeLabel = (value: string | null | undefined) => {
  if (value === 'watchlist') return '观察名单'
  if (value === 'restricted_publish') return '限制发布'
  if (value === 'restricted_apply') return '限制报名'
  if (value === 'banned') return '全量封禁'
  return value || '--'
}

export const formatRestrictionStatusLabel = (value: string | null | undefined) => {
  return value ? RESTRICTION_STATUS_LABEL_MAP[value] || value : '--'
}

export const formatAccountStatusLabel = (value: string | null | undefined) => {
  if (value === 'normal') return '正常'
  return formatRestrictionTypeLabel(value)
}

export const formatContactTypeLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return CONTACT_TYPE_LABEL_MAP[value] || value
}

export const formatContactDisplay = (type: string | null | undefined, value: string | null | undefined) => {
  return joinDisplayParts([
    formatContactTypeLabel(type),
    formatText(value),
  ]) || '--'
}

export const formatAccountActionReasonCategoryLabel = (value: string | null | undefined) => {
  if (value === 'report_confirmed') return '举报成立'
  return formatReportReasonCodeLabel(value)
}

export const formatReviewResultLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return REVIEW_RESULT_LABEL_MAP[value] || value
}

export const formatResultActionLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return RESULT_ACTION_LABEL_MAP[value] || value
}

export const formatReviewNextQueueLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return REVIEW_NEXT_QUEUE_LABEL_MAP[value] || value
}

export const shouldShowReviewResultCard = (task: ReviewResultCardLike) => {
  return Boolean(task.completedAt || task.reviewResult || task.reasonCategory || task.reasonText || task.nextQueueType)
}

export const shouldShowReportResultCard = (report: ReportResultCardLike) => {
  return Boolean(
    report.handlerId
      || report.resultAction
      || report.resultRemark
      || ['resolved', 'closed', 'confirmed', 'rejected'].includes(report.status),
  )
}

export const formatDashboardPriorityTypeLabel = (value: string | null | undefined) => {
  if (value === 'review_task') return '审核任务'
  if (value === 'report') return '举报单'
  if (value === 'account_action') return '处罚记录'
  return value || '--'
}

export const formatDashboardPriorityStatusLabel = (itemType: string | null | undefined, status: string | null | undefined) => {
  if (!status) {
    return '--'
  }

  return DASHBOARD_PRIORITY_STATUS_LABEL_MAP[itemType || '']?.[status] || status
}

export const formatDashboardPriorityTitle = (item: DashboardPriorityLike) => {
  if (item.itemType === 'review_task') {
    return item.riskLevel === 'high' ? '高风险审核任务' : '审核任务待处理'
  }

  if (item.itemType === 'report') {
    return item.summary.includes('累计') ? '重复举报待处理' : '举报待处理'
  }

  if (item.itemType === 'account_action') {
    const segments = item.summary.split(' / ')
    return `${formatRestrictionTypeLabel(segments[segments.length - 1] || '')}记录`
  }

  return item.title || '--'
}

export const formatDashboardPrioritySummary = (item: DashboardPriorityLike) => {
  const segments = item.summary.split(' / ').filter(Boolean)

  if (item.itemType === 'review_task') {
    return segments.length > 0 ? segments.map((segment) => formatRiskFlagLabel(segment)).join(' / ') : formatText(item.summary)
  }

  if (item.itemType === 'report') {
    if (item.summary.includes('累计')) {
      return item.summary
    }

    if (segments.length >= 2) {
      return joinDisplayParts([segments[0], formatReportReasonCodeLabel(segments[1])]) || '--'
    }
  }

  if (item.itemType === 'account_action' && segments.length >= 2) {
    return joinDisplayParts([segments[0], formatRestrictionTypeLabel(segments[1])]) || '--'
  }

  return formatText(item.summary)
}

export const formatDashboardPriorityHint = (item: DashboardPriorityLike) => {
  if (item.itemType === 'review_task') {
    return item.riskLevel === 'high' ? '建议优先进入审核详情处理' : '可直接进入审核详情页'
  }

  if (item.itemType === 'report') {
    return item.summary.includes('累计') ? '同目标已出现重复举报' : '可进入举报详情确认目标状态'
  }

  if (item.itemType === 'account_action') {
    return '当前仅支持查看记录，提交类动作暂未开放'
  }

  return '--'
}

export const formatDashboardPriorityRiskLabel = (value: string | null | undefined) => {
  if (!value) {
    return '未分级'
  }

  return formatRiskLevelLabel(value)
}

export const formatOperationActionLabel = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return OPERATION_ACTION_LABEL_MAP[value] || value
}

export const formatOperationTargetTypeLabel = (value: string | null | undefined) => formatReportTargetTypeLabel(value)

export const formatOperatorTypeLabel = (value: string | null | undefined) => {
  if (value === 'admin') return '后台管理员'
  if (value === 'user') return '平台用户'
  if (value === 'system') return '系统'
  return value || '--'
}

export const formatHistoryOperatorLabel = (operatorType: string | null | undefined, displayName: string | null | undefined, operatorId: string | null | undefined) => {
  const resolvedName = formatText(displayName) !== '--' ? formatText(displayName) : formatText(operatorId)
  const typeLabel = formatOperatorTypeLabel(operatorType)

  if (typeLabel === '--') {
    return resolvedName
  }

  return `${resolvedName}（${typeLabel}）`
}

export const formatReviewHistoryLogSummary = (item: ReviewHistoryLike) => {
  return joinDisplayParts([
    formatHistoryOperatorLabel(item.operatorType, item.operatorDisplayName, item.operatorId),
    formatText(item.remark),
  ]) || '--'
}

export const formatReportHistoryRecordSummary = (item: ReportHistoryLike) => {
  return joinDisplayParts([
    `举报人:${formatText(item.reporterUserId)}`,
    `状态:${formatReportStatusLabel(item.status)}`,
    `原因:${formatReportReasonCodeLabel(item.reasonCode)}`,
  ]) || '--'
}

export const formatReportHistoryActionSummary = (item: ReportHistoryActionLike) => {
  return joinDisplayParts([
    formatHistoryOperatorLabel(item.operatorType, item.operatorDisplayName, item.operatorId),
    `目标:${formatOperationTargetTypeLabel(item.targetType)} / ${formatText(item.targetId)}`,
    formatText(item.remark),
  ]) || '--'
}

export const formatReportTargetSummary = (target: ReportTargetSnapshotLike) => {
  const segments = target.summary.split(' / ').filter(Boolean)

  if (target.targetType === 'notice') {
    if (segments.length === 0) {
      return '--'
    }

    const platform = formatCooperationPlatformLabel(segments[0] || '')
    const middle = segments.slice(1, Math.max(1, segments.length - 1)).map((item) => formatText(item))
    return joinDisplayParts([platform, ...middle]) || '--'
  }

  if (target.targetType === 'publisher') {
    return joinDisplayParts([
      formatIdentityTypeLabel(segments[0] || ''),
      ...segments.slice(1).map((item) => formatText(item)),
    ]) || '--'
  }

  if (target.targetType === 'creator') {
    return joinDisplayParts([
      formatCooperationPlatformLabel(segments[0] || ''),
      ...segments.slice(1).map((item) => formatText(item)),
    ]) || '--'
  }

  if (target.status === 'missing') {
    return '对象信息缺失'
  }

  return formatText(target.summary)
}

const formatOperationStatusLabel = (targetType: string | null | undefined, status: string) => {
  if (!status) {
    return ''
  }

  if (targetType === 'account_action') {
    return formatRestrictionStatusLabel(status)
  }

  if (REVIEW_TASK_STATUS_LABEL_MAP[status]) {
    return REVIEW_TASK_STATUS_LABEL_MAP[status]
  }

  return formatGenericStatusLabel(status)
}

export const formatOperationResultLabel = (row: OperationLogLike) => {
  const status = getSnapshotField(row.afterSnapshot, 'status')
  const taskStatus = getSnapshotField(row.afterSnapshot, 'taskStatus')
  const noticeStatus = getSnapshotField(row.afterSnapshot, 'noticeStatus')
  const linkedNoticeStatus = getSnapshotField(row.afterSnapshot, 'linkedNoticeStatus')
  const linkedAccountStatus = getSnapshotField(row.afterSnapshot, 'linkedAccountStatus')
  const reviewResult = getSnapshotField(row.afterSnapshot, 'reviewResult')
  const resultAction = getSnapshotField(row.afterSnapshot, 'resultAction')
  const restrictionType = getSnapshotField(row.afterSnapshot, 'restrictionType')
  const accountStatus = getSnapshotField(row.afterSnapshot, 'accountStatus')
  const latestReviewReasonCategory = getSnapshotField(row.afterSnapshot, 'latestReviewReasonCategory')
  const resultRemark = getSnapshotField(row.afterSnapshot, 'resultRemark')
  const removedAt = getSnapshotField(row.afterSnapshot, 'removedAt')
  const endAt = getSnapshotField(row.afterSnapshot, 'endAt')
  const releasedAt = getSnapshotField(row.afterSnapshot, 'releasedAt')
  const primaryStatus = taskStatus || noticeStatus || status

  const displayParts = [
    formatOperationStatusLabel(row.targetType, primaryStatus),
    formatReviewResultLabel(reviewResult),
    formatResultActionLabel(resultAction),
    formatRestrictionTypeLabel(restrictionType),
    formatAccountStatusLabel(accountStatus),
    formatReasonCategoryLabel(latestReviewReasonCategory),
    linkedNoticeStatus ? `通告:${formatGenericStatusLabel(linkedNoticeStatus)}` : '',
    linkedAccountStatus ? `账号:${formatAccountStatusLabel(linkedAccountStatus)}` : '',
    resultRemark ? `备注:${resultRemark}` : '',
    removedAt ? `移除:${formatDateTime(removedAt)}` : '',
    endAt ? `截止:${formatDateTime(endAt)}` : '',
    releasedAt ? `解除:${formatDateTime(releasedAt)}` : '',
  ]

  const summary = joinDisplayParts(displayParts)
  return summary || formatText(row.remark)
}

export const formatCooperationPlatformLabel = (value: string | null | undefined) => {
  if (value === 'xiaohongshu') return '小红书'
  if (value === 'douyin') return '抖音'
  if (value === 'kuaishou') return '快手'
  if (value === 'bilibili') return '哔哩哔哩'
  if (value === 'wechat_video') return '视频号'
  return value || '--'
}

export const formatSettlementTypeLabel = (value: string | null | undefined) => {
  if (value === 'fixed_price') return '固定报价'
  if (value === 'cpa') return '按效果结算'
  if (value === 'cps') return '按成交结算'
  if (value === 'barter') return '置换合作'
  return value || '--'
}
