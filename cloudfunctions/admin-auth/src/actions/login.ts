import { ERROR_CODES } from '../../../shared/src/constants/error-codes'
import { AppError } from '../../../shared/src/errors/app-error'
import { writeOperationLog } from '../../../shared/src/services/operation-log-service'
import { createAdminSession } from '../../../shared/src/services/admin-session-service'
import {
  assertAdminAvailable,
  findAdminUserByUsername,
  normalizeAdminUserState,
  recordLoginFailure,
  resetLoginFailure,
} from '../../../shared/src/services/admin-user-service'
import { verifyPassword } from '../../../shared/src/utils/crypto'
import { getAdminWebSource } from '../../../shared/src/validators/common'
import { validateLoginPayload } from '../../../shared/src/validators/admin-auth'

export async function login(request: any) {
  getAdminWebSource(request.meta)

  const payload = validateLoginPayload(request.payload)
  let adminUser = await findAdminUserByUsername(payload.username)

  if (!adminUser) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_LOGIN_FAILED,
      message: '用户名或密码错误',
    })
  }

  adminUser = await normalizeAdminUserState(adminUser)
  assertAdminAvailable(adminUser)

  if (!verifyPassword(payload.password, adminUser.passwordHash)) {
    await recordLoginFailure(adminUser)
    await writeOperationLog({
      operatorType: 'system',
      operatorId: 'system',
      action: 'admin_login_failed',
      targetType: 'admin_user',
      targetId: adminUser.adminUserId,
      requestId: request.requestId,
      remark: '用户名或密码错误',
    })

    throw new AppError({
      code: ERROR_CODES.ADMIN_LOGIN_FAILED,
      message: '用户名或密码错误',
    })
  }

  adminUser = await resetLoginFailure(adminUser, request.meta)

  const { plainToken, session } = await createAdminSession(adminUser.adminUserId, request.meta)

  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminUser.adminUserId,
    action: 'admin_login',
    targetType: 'admin_session',
    targetId: session.sessionId,
    requestId: request.requestId,
    remark: '管理员登录成功',
  })

  return {
    adminUser: {
      adminUserId: adminUser.adminUserId,
      displayName: adminUser.displayName,
      roleCodes: adminUser.roleCodes,
    },
    session: {
      adminSessionToken: plainToken,
      expiresAt: session.expiresAt,
      idleExpireAt: session.idleExpireAt,
      mustResetPassword: Boolean(adminUser.mustResetPassword),
    },
  }
}
