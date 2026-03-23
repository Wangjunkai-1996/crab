export const STATUS_TYPE_MAP: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  cancelled: 'info',
  resolved: 'success',
  closed: 'success',
  approved: 'success',
  rejected: 'danger',
  supplement_required: 'warning',
  transfer_manual_review: 'warning',
  removed: 'danger',
  active: 'danger',
  released: 'success',
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export const REVIEW_TASK_STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待领取',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
}

export const REVIEW_STAGE_LABEL_MAP: Record<string, string> = {
  initial_review: '初审队列',
  manual_review: '人工审核',
  resubmission_review: '补件复审',
}

export const REPORT_STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  closed: '已关闭',
}

export const RESTRICTION_STATUS_LABEL_MAP: Record<string, string> = {
  active: '生效中',
  released: '已解除',
}

export const RISK_LEVEL_LABEL_MAP: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}
