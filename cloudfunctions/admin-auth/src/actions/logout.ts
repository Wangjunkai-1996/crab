import { requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { revokeSessionBySessionId } from '../../../shared/src/services/admin-session-service'
import { writeOperationLog } from '../../../shared/src/services/operation-log-service'
import { getAdminWebSource } from '../../../shared/src/validators/common'

export async function logout(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)

  await revokeSessionBySessionId(adminContext.sessionId, 'manual_logout')
  await writeOperationLog({
    operatorType: 'admin',
    operatorId: adminContext.adminUserId,
    action: 'admin_logout',
    targetType: 'admin_session',
    targetId: adminContext.sessionId,
    requestId: request.requestId,
    remark: '管理员主动登出',
  })

  return {
    success: true,
  }
}
