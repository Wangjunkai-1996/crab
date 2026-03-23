export const ADMIN_PAGE_ACCESS_KEYS = {
  DASHBOARD: 'dashboard',
  REVIEW_LIST: 'reviewList',
  REVIEW_DETAIL: 'reviewDetail',
  REPORT_LIST: 'reportList',
  REPORT_DETAIL: 'reportDetail',
  ACCOUNT_ACTION_LIST: 'accountActionList',
  OPERATION_LOG_LIST: 'operationLogList',
  ADMIN_USER_MANAGEMENT: 'adminUserManagement',
  SYSTEM_CONFIG_MANAGEMENT: 'systemConfigManagement',
} as const

export type AdminPageAccessKey =
  (typeof ADMIN_PAGE_ACCESS_KEYS)[keyof typeof ADMIN_PAGE_ACCESS_KEYS]

export const ADMIN_ACTION_ACCESS_KEYS = {
  CLAIM_REVIEW_TASK: 'claimReviewTask',
  RELEASE_REVIEW_TASK: 'releaseReviewTask',
  RESOLVE_REVIEW_TASK: 'resolveReviewTask',
  CLAIM_REPORT: 'claimReport',
  RESOLVE_REPORT_BASIC: 'resolveReportBasic',
  CREATE_WATCHLIST: 'createWatchlist',
  CREATE_RESTRICTED_PUBLISH: 'createRestrictedPublish',
  CREATE_RESTRICTED_APPLY: 'createRestrictedApply',
  CREATE_BANNED: 'createBanned',
  CREATE_ACCOUNT_ACTION: 'createAccountAction',
  RELEASE_ACCOUNT_ACTION: 'releaseAccountAction',
  FORCE_REMOVE_NOTICE: 'forceRemoveNotice',
  VIEW_OPERATION_LOG_LIST: 'viewOperationLogList',
  MANAGE_ADMIN_USERS: 'manageAdminUsers',
  MANAGE_SYSTEM_CONFIGS: 'manageSystemConfigs',
} as const

export type AdminActionAccessKey =
  (typeof ADMIN_ACTION_ACCESS_KEYS)[keyof typeof ADMIN_ACTION_ACCESS_KEYS]

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

export const LEGACY_AVAILABLE_ACTION_KEY_MAP: Record<string, AdminAvailableActionKey> = {
  claimTask: ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_TASK,
  releaseTask: ADMIN_AVAILABLE_ACTION_KEYS.RELEASE_TASK,
  approved: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_APPROVED,
  rejected: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REJECTED,
  supplement_required: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_SUPPLEMENT_REQUIRED,
  transfer_manual_review: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_TRANSFER_MANUAL_REVIEW,
  removed: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_TASK_REMOVED,
  claimReport: ADMIN_AVAILABLE_ACTION_KEYS.CLAIM_REPORT,
  rejectReport: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_REJECTED,
  recordOnly: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RECORD_ONLY,
  removeNotice: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_REMOVE_NOTICE,
  restrictPublish: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_PUBLISH,
  restrictApply: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_RESTRICT_APPLY,
  banAccount: ADMIN_AVAILABLE_ACTION_KEYS.RESOLVE_REPORT_CONFIRMED_BANNED,
}
