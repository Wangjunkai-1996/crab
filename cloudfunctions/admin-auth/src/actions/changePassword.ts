import { requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { AppError } from '../../../shared/src/errors/app-error'
import { ERROR_CODES } from '../../../shared/src/constants/error-codes'
import {
  assertAdminPasswordPolicy,
  updateAdminPassword,
} from '../../../shared/src/services/admin-user-service'
import { revokeOtherSessions } from '../../../shared/src/services/admin-session-service'
import { writeOperationLog } from '../../../shared/src/services/operation-log-service'
import { hashPassword, verifyPassword } from '../../../shared/src/utils/crypto'
import { createValidationError, getAdminWebSource } from '../../../shared/src/validators/common'
import { validateChangePasswordPayload } from '../../../shared/src/validators/admin-auth'

export async function changePassword(request: any) {
  getAdminWebSource(request.meta)

  const payload = validateChangePasswordPayload(request.payload)
  const adminContext = await requireAdminAuth(request.meta)
  const adminUser = adminContext.rawAdminUser

  if (!verifyPassword(payload.oldPassword, adminUser.passwordHash)) {
    throw createValidationError({
      oldPassword: '旧密码不正确',
    })
  }

  if (payload.oldPassword === payload.newPassword) {
    throw new AppError({
      code: ERROR_CODES.PARAM_INVALID,
      message: '参数校验失败',
      data: {
        errorType: 'validation',
        fieldErrors: {
          newPassword: '新密码不能与旧密码相同',
        },
      },
    })
  }

  assertAdminPasswordPolicy(adminUser.username, payload.newPassword)

  await updateAdminPassword(adminUser, hashPassword(payload.newPassword))
  await revokeOtherSessions(adminContext.adminUserId, adminContext.sessionId, 'password_changed')
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'admin_change_password',
    targetType: 'admin_user',
    targetId: adminContext.adminUserId,
    requestId: request.requestId,
    remark: '管理员修改本人密码',
  })

  return {
    success: true,
    logoutOtherSessions: true,
  }
}
