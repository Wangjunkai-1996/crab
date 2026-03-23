import { ADMIN_ACTION_ACCESS_KEYS, ADMIN_AVAILABLE_ACTION_KEYS, type AdminAvailableActionKey } from '@/constants/admin-contract'

export const TEMP_ACTION_PAYLOAD_META = {
  status: 'temporary',
  note: '以下动作请求枚举仅作为联调临时口径，未拍板前不得当成最终业务规则。',
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

export type TempResolveReportNoticeAction = 'none' | 'remove_notice'

export interface TempResolveReportActionBridge {
  result: 'confirmed' | 'rejected'
  resultAction?: TempResolveReportResultAction
  noticeAction?: TempResolveReportNoticeAction
  restrictionType?: TempAccountActionRestrictionType
  requiresReasonCategory?: boolean
  requiresEndAt?: boolean
}

export const TEMP_RESOLVE_REPORT_ACTION_BRIDGE_MAP: Partial<Record<AdminAvailableActionKey, TempResolveReportActionBridge>> = {
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED]: {
    result: 'rejected',
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RECORD_ONLY]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.RECORD_ONLY,
    noticeAction: 'none',
    requiresReasonCategory: true,
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.REMOVE_NOTICE,
    noticeAction: 'remove_notice',
    requiresReasonCategory: true,
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_WATCHLIST]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.WATCHLIST,
    restrictionType: TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.WATCHLIST,
    requiresReasonCategory: true,
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.RESTRICTED_PUBLISH,
    restrictionType: TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_PUBLISH,
    requiresReasonCategory: true,
    requiresEndAt: true,
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_APPLY]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.RESTRICTED_APPLY,
    restrictionType: TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_APPLY,
    requiresReasonCategory: true,
    requiresEndAt: true,
  },
  [ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_BANNED]: {
    result: 'confirmed',
    resultAction: TEMP_RESOLVE_REPORT_RESULT_ACTIONS.BANNED,
    restrictionType: TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.BANNED,
    requiresReasonCategory: true,
    requiresEndAt: true,
  },
}

export const TEMP_REVIEW_NEXT_QUEUE_OPTIONS = [
  {
    label: TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES.MANUAL_REVIEW_QUEUE,
    value: TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES.MANUAL_REVIEW_QUEUE,
  },
] as const

export const TEMP_REVIEW_NEXT_QUEUE_PLACEHOLDER = '当前临时口径仅建议使用 manual_review_queue'

export const TEMP_RESTRICTION_TYPE_ACTION_ACCESS_MAP = {
  [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.WATCHLIST]: ADMIN_ACTION_ACCESS_KEYS.CREATE_WATCHLIST,
  [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_PUBLISH]: ADMIN_ACTION_ACCESS_KEYS.CREATE_RESTRICTED_PUBLISH,
  [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_APPLY]: ADMIN_ACTION_ACCESS_KEYS.CREATE_RESTRICTED_APPLY,
  [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.BANNED]: ADMIN_ACTION_ACCESS_KEYS.CREATE_BANNED,
} as const

export const getTempResolveReportActionBridge = (actionKey: string) => {
  return TEMP_RESOLVE_REPORT_ACTION_BRIDGE_MAP[actionKey as keyof typeof TEMP_RESOLVE_REPORT_ACTION_BRIDGE_MAP]
}
