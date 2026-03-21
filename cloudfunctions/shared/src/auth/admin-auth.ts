import { ERROR_CODES } from '../constants/error-codes'
import { ADMIN_ROLE_CODES, ADMIN_SESSION_STATUSES } from '../enums/admin'
import { AppError } from '../errors/app-error'
import { AdminPermissionSummary } from '../contracts/admin/permission-summary'
import { AdminContext, RequestMeta } from '../types'
import { expireSession, findSessionByToken, touchAdminSession } from '../services/admin-session-service'
import {
  assertAdminAvailable,
  findAdminUserByAdminUserId,
  normalizeAdminUserState,
} from '../services/admin-user-service'
import { toDate } from '../utils/time'

export async function requireAdminAuth(meta: RequestMeta): Promise<AdminContext> {
  const token = typeof meta.adminSessionToken === 'string' ? meta.adminSessionToken.trim() : ''

  if (!token) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }

  const session = await findSessionByToken(token)

  if (!session || session.status !== ADMIN_SESSION_STATUSES.ACTIVE) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }

  const currentTime = new Date()
  const expiresAt = toDate(session.expiresAt)
  const idleExpireAt = toDate(session.idleExpireAt)

  if (expiresAt.getTime() <= currentTime.getTime() || idleExpireAt.getTime() <= currentTime.getTime()) {
    await expireSession(session, 'session_expired')
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }

  const rawAdminUser = await findAdminUserByAdminUserId(session.adminUserId)

  if (!rawAdminUser) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_SESSION_INVALID,
      message: '后台登录态失效',
    })
  }

  const adminUser = await normalizeAdminUserState(rawAdminUser)
  assertAdminAvailable(adminUser)

  const touchedSession = await touchAdminSession(session)

  return {
    adminUserId: adminUser.adminUserId,
    displayName: adminUser.displayName,
    roleCodes: adminUser.roleCodes ?? [],
    status: adminUser.status,
    sessionId: session.sessionId,
    mustResetPassword: Boolean(adminUser.mustResetPassword),
    rawAdminUser: adminUser,
    rawSession: touchedSession,
  }
}

export function assertAdminRole(adminContext: AdminContext, allowedRoles: string[]) {
  const matched = adminContext.roleCodes.some((roleCode) => allowedRoles.includes(roleCode))

  if (!matched) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_ROLE_FORBIDDEN,
      message: '后台角色权限不足',
    })
  }
}

export function buildPermissionSummary(roleCodes: string[]): AdminPermissionSummary {
  const isReviewer = roleCodes.includes(ADMIN_ROLE_CODES.REVIEWER)
  const isOpsAdmin = roleCodes.includes(ADMIN_ROLE_CODES.OPS_ADMIN)
  const isSuperAdmin = roleCodes.includes(ADMIN_ROLE_CODES.SUPER_ADMIN)
  const canReview = isReviewer || isOpsAdmin || isSuperAdmin
  const canGovernReports = isReviewer || isOpsAdmin || isSuperAdmin
  const canManageRestrictions = isOpsAdmin || isSuperAdmin
  const canManageAdmins = isSuperAdmin
  const canManageConfigs = isOpsAdmin || isSuperAdmin

  return {
    pageAccess: {
      dashboard: canReview || canGovernReports,
      reviewList: canReview,
      reviewDetail: canReview,
      reportList: canGovernReports,
      reportDetail: canGovernReports,
      accountActionList: canManageRestrictions,
      operationLogList: canManageRestrictions,
      adminUserManagement: canManageAdmins,
      systemConfigManagement: canManageConfigs,
    },
    actionAccess: {
      claimReviewTask: canReview,
      releaseReviewTask: canReview,
      resolveReviewTask: canReview,
      claimReport: canGovernReports,
      resolveReportBasic: canGovernReports,
      createWatchlist: canManageRestrictions,
      createRestrictedPublish: canManageRestrictions,
      createRestrictedApply: canManageRestrictions,
      createBanned: canManageRestrictions,
      createAccountAction: canManageRestrictions,
      releaseAccountAction: canManageRestrictions,
      forceRemoveNotice: canManageRestrictions,
      viewOperationLogList: canManageRestrictions,
      manageAdminUsers: canManageAdmins,
      manageSystemConfigs: canManageConfigs,
    },
  }
}
