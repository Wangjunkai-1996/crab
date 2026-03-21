export const ADMIN_AVAILABLE_ACTION_KEYS = {
  CLAIM_TASK: 'claim_task',
  RELEASE_TASK: 'release_task',
  RESOLVE_TASK_APPROVED: 'resolve_task_approved',
  RESOLVE_TASK_REJECTED: 'resolve_task_rejected',
  RESOLVE_TASK_SUPPLEMENT_REQUIRED: 'resolve_task_supplement_required',
  RESOLVE_TASK_TRANSFER_MANUAL_REVIEW: 'resolve_task_transfer_manual_review',
  RESOLVE_TASK_REMOVED: 'resolve_task_removed',
  CLAIM_REPORT: 'claim_report',
  RESOLVE_REPORT_REJECTED: 'resolve_report_rejected',
  RESOLVE_REPORT_CONFIRMED_RECORD_ONLY: 'resolve_report_confirmed_record_only',
  RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE: 'resolve_report_confirmed_remove_notice',
  RESOLVE_REPORT_CONFIRMED_WATCHLIST: 'resolve_report_confirmed_watchlist',
  RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH: 'resolve_report_confirmed_restrict_publish',
  RESOLVE_REPORT_CONFIRMED_RESTRICT_APPLY: 'resolve_report_confirmed_restrict_apply',
  RESOLVE_REPORT_CONFIRMED_BANNED: 'resolve_report_confirmed_banned',
  CREATE_ACCOUNT_ACTION: 'create_account_action',
  RELEASE_ACCOUNT_ACTION: 'release_account_action',
  FORCE_REMOVE_NOTICE: 'force_remove_notice',
} as const

export type AdminAvailableActionKey =
  (typeof ADMIN_AVAILABLE_ACTION_KEYS)[keyof typeof ADMIN_AVAILABLE_ACTION_KEYS]
