export const TEMP_ACTION_PAYLOAD_META = {
  status: 'temporary',
  note: '以下动作请求枚举仅作为 R03 联调临时口径，未拍板前不得当成最终业务规则。',
} as const

export const TEMP_RESOLVE_REPORT_RESULT_ACTIONS = {
  RECORD_ONLY: 'record_only',
  REMOVE_NOTICE: 'remove_notice',
  WATCHLIST: 'watchlist',
  RESTRICTED_PUBLISH: 'restricted_publish',
  RESTRICTED_APPLY: 'restricted_apply',
  BANNED: 'banned',
} as const

export type TempResolveReportResultAction =
  (typeof TEMP_RESOLVE_REPORT_RESULT_ACTIONS)[keyof typeof TEMP_RESOLVE_REPORT_RESULT_ACTIONS]

export const TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES = {
  WATCHLIST: 'watchlist',
  RESTRICTED_PUBLISH: 'restricted_publish',
  RESTRICTED_APPLY: 'restricted_apply',
  BANNED: 'banned',
} as const

export type TempAccountActionRestrictionType =
  (typeof TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES)[keyof typeof TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES]

export const TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES = {
  MANUAL_REVIEW_QUEUE: 'manual_review_queue',
} as const

export type TempReviewTaskNextQueueType =
  (typeof TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES)[keyof typeof TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES]

export interface ResolveTaskPayloadSuggestion {
  reviewTaskId: string
  reviewResult: 'approved' | 'rejected' | 'supplement_required' | 'transfer_manual_review' | 'removed'
  reasonCategory?: string
  reasonText?: string
  notifyUser?: boolean
  nextQueueType?: TempReviewTaskNextQueueType
}

export interface ResolveReportPayloadSuggestion {
  reportId: string
  result: 'confirmed' | 'rejected'
  resultAction?: TempResolveReportResultAction
  resultRemark?: string
  noticeAction?: 'none' | 'remove_notice'
  accountAction?: {
    userId: string
    restrictionType: TempAccountActionRestrictionType
    reasonCategory: string
    reasonText?: string
    endAt?: string
    forceRemoveActiveNotices?: boolean
  }
}

export interface CreateAccountActionPayloadSuggestion {
  userId: string
  restrictionType: TempAccountActionRestrictionType
  reasonCategory: string
  reasonText?: string
  startAt?: string
  endAt?: string
  forceRemoveActiveNotices?: boolean
}
