export const COLLECTIONS = {
  USERS: 'dm_users',
  PUBLISHER_PROFILES: 'dm_publisher_profiles',
  CREATOR_CARDS: 'dm_creator_cards',
  NOTICES: 'dm_notices',
  NOTICE_REVIEW_TASKS: 'dm_notice_review_tasks',
  APPLICATIONS: 'dm_applications',
  MESSAGES: 'dm_messages',
  REPORTS: 'dm_reports',
  FEEDBACK_RECORDS: 'dm_feedback_records',
  ACCOUNT_ACTIONS: 'dm_account_actions',
  OPERATION_LOGS: 'dm_operation_logs',
  CONFIGS: 'dm_configs',
  ADMIN_USERS: 'dm_admin_users',
  ADMIN_SESSIONS: 'dm_admin_sessions',
} as const

export const ALL_COLLECTION_NAMES = Object.values(COLLECTIONS)

