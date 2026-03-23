export const APP_SOURCE = 'admin-web' as const
export const APP_CLIENT_VERSION = '1.0.0'
export const ADMIN_SESSION_STORAGE_KEY = 'dm-admin-session-token'
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20]
export const MOCK_NETWORK_DELAY = Number(import.meta.env.VITE_MOCK_NETWORK_DELAY ?? '0')
export const CLOUDBASE_ENV_ID = (import.meta.env.VITE_CLOUDBASE_ENV_ID ?? '').trim()
export const CLOUDBASE_REGION = (import.meta.env.VITE_CLOUDBASE_REGION ?? '').trim()
export const CLOUDBASE_TIMEOUT_MS = Number(import.meta.env.VITE_CLOUDBASE_TIMEOUT_MS ?? '15000')
export const ADMIN_AUTH_FUNCTION_NAME = (import.meta.env.VITE_ADMIN_AUTH_FUNCTION_NAME ?? 'admin-auth').trim() || 'admin-auth'
export const REVIEW_ADMIN_FUNCTION_NAME = (import.meta.env.VITE_REVIEW_ADMIN_FUNCTION_NAME ?? 'review-admin').trim() || 'review-admin'
export const GOVERNANCE_ADMIN_FUNCTION_NAME =
  (import.meta.env.VITE_GOVERNANCE_ADMIN_FUNCTION_NAME ?? 'governance-admin').trim() || 'governance-admin'
export const ENABLE_REAL_ADMIN_READS = import.meta.env.VITE_ENABLE_REAL_ADMIN_READS === 'true'
export const ENABLE_REAL_ADMIN_WRITES = import.meta.env.VITE_ENABLE_REAL_ADMIN_WRITES === 'true'
export const REAL_ADMIN_WRITE_READONLY_REASON = '当前已开启真实读取，提交类操作暂未开放，请先查看详情与历史记录。'
