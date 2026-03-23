import { assertAdminRole, requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { ADMIN_ROLE_CODES } from '../../../shared/src/enums/admin'
import { getReviewTaskDetail } from '../../../shared/src/services/admin-review-service'
import { getAdminWebSource } from '../../../shared/src/validators/common'
import { validateTaskDetailPayload } from '../../../shared/src/validators/admin-review'

export async function taskDetail(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)
  assertAdminRole(adminContext, [
    ADMIN_ROLE_CODES.REVIEWER,
    ADMIN_ROLE_CODES.OPS_ADMIN,
    ADMIN_ROLE_CODES.SUPER_ADMIN,
  ])

  const payload = validateTaskDetailPayload(request.payload)
  return getReviewTaskDetail(payload.reviewTaskId, adminContext)
}
