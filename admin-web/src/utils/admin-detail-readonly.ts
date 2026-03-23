import type { ActionOption } from '@/models/common'
import type { ReportDetailResult } from '@/models/report'
import type { ReviewDetailResult } from '@/models/review'

interface ResolveReadonlyReasonOptions<TDetail> {
  detail: TDetail
  availableActions: ActionOption[]
  panelActions: ActionOption[]
  mustResetPassword: boolean
  mustResetPasswordReason: string
  resolveUnavailableReason: (detail: TDetail) => string
}

interface DomainReadonlyReasonOptions<TDetail> {
  detail: TDetail
  panelActions: ActionOption[]
  mustResetPassword: boolean
  currentAdminUserId?: string | null
}

const resolveDetailReadonlyReason = <TDetail>({
  detail,
  availableActions,
  panelActions,
  mustResetPassword,
  mustResetPasswordReason,
  resolveUnavailableReason,
}: ResolveReadonlyReasonOptions<TDetail>) => {
  if (mustResetPassword) {
    return mustResetPasswordReason
  }

  if (availableActions.length === 0) {
    return resolveUnavailableReason(detail)
  }

  return panelActions.find((item) => item.disabledReason)?.disabledReason || ''
}

export const getReviewDetailReadonlyReason = ({
  detail,
  panelActions,
  mustResetPassword,
  currentAdminUserId,
}: DomainReadonlyReasonOptions<ReviewDetailResult>) => {
  return resolveDetailReadonlyReason({
    detail,
    availableActions: detail.availableActions,
    panelActions,
    mustResetPassword,
    mustResetPasswordReason: '请先完成首次改密后再执行审核动作。',
    resolveUnavailableReason: (currentDetail) => {
      if (currentDetail.task.taskStatus === 'completed') {
        return '当前任务已处理完成，详情进入只读态。'
      }

      if (
        currentDetail.task.taskStatus === 'processing' &&
        currentDetail.task.assignedTo &&
        currentDetail.task.assignedTo !== currentAdminUserId
      ) {
        return `当前任务已由 ${currentDetail.task.assignedAdminName || currentDetail.task.assignedTo} 领取，页面保持只读。`
      }

      return '当前任务暂不可执行处理动作。'
    },
  })
}

export const getReportDetailReadonlyReason = ({
  detail,
  panelActions,
  mustResetPassword,
  currentAdminUserId,
}: DomainReadonlyReasonOptions<ReportDetailResult>) => {
  return resolveDetailReadonlyReason({
    detail,
    availableActions: detail.availableActions,
    panelActions,
    mustResetPassword,
    mustResetPasswordReason: '请先完成首次改密后再执行举报处理动作。',
    resolveUnavailableReason: (currentDetail) => {
      if (['resolved', 'closed'].includes(currentDetail.report.status)) {
        return '当前举报已处理完成，页面进入只读态。'
      }

      if (
        currentDetail.report.status === 'processing' &&
        currentDetail.report.handlerId &&
        currentDetail.report.handlerId !== currentAdminUserId
      ) {
        return '当前举报已由其他管理员领取，页面保持只读。'
      }

      return '当前举报暂不可执行处理动作。'
    },
  })
}
