import type { AdminPageAccessKey } from '@/constants/admin-contract'
import { ADMIN_PAGE_ACCESS_KEYS } from '@/constants/admin-contract'
import { ALL_ADMIN_ROLES } from '@/constants/roles'
import type { RoleCode } from '@/models/auth'

export const ROUTE_NAMES = {
  ROOT: 'root',
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  REVIEW_LIST: 'review-list',
  REVIEW_DETAIL: 'review-detail',
  REPORT_LIST: 'report-list',
  REPORT_DETAIL: 'report-detail',
  BLACKLIST: 'blacklist',
  LOGS: 'logs',
  FORBIDDEN: 'forbidden',
} as const

export interface NavItemConfig {
  label: string
  routeName: string
  pageKey: AdminPageAccessKey
  allowedRoles: RoleCode[]
}

export const NAV_ITEMS: NavItemConfig[] = [
  { label: '工作台', routeName: ROUTE_NAMES.DASHBOARD, pageKey: ADMIN_PAGE_ACCESS_KEYS.DASHBOARD, allowedRoles: [...ALL_ADMIN_ROLES] },
  { label: '审核列表', routeName: ROUTE_NAMES.REVIEW_LIST, pageKey: ADMIN_PAGE_ACCESS_KEYS.REVIEW_LIST, allowedRoles: [...ALL_ADMIN_ROLES] },
  { label: '举报列表', routeName: ROUTE_NAMES.REPORT_LIST, pageKey: ADMIN_PAGE_ACCESS_KEYS.REPORT_LIST, allowedRoles: [...ALL_ADMIN_ROLES] },
  {
    label: '黑名单与处罚',
    routeName: ROUTE_NAMES.BLACKLIST,
    pageKey: ADMIN_PAGE_ACCESS_KEYS.ACCOUNT_ACTION_LIST,
    allowedRoles: ['ops_admin', 'super_admin'],
  },
  {
    label: '操作日志',
    routeName: ROUTE_NAMES.LOGS,
    pageKey: ADMIN_PAGE_ACCESS_KEYS.OPERATION_LOG_LIST,
    allowedRoles: ['ops_admin', 'super_admin'],
  },
]

export const DEFAULT_HOME_ROUTE = ROUTE_NAMES.DASHBOARD
