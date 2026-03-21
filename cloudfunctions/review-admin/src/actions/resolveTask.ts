import { assertAdminRole, requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { ADMIN_ROLE_CODES } from '../../../shared/src/enums/admin'
import { resolveReviewTask } from '../../../shared/src/services/admin-review-service'
import { getAdminWebSource } from '../../../shared/src/validators/common'
import { validateResolveTaskPayload } from '../../../shared/src/validators/admin-review'

export async function resolveTask(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)
  assertAdminRole(adminContext, [
    ADMIN_ROLE_CODES.REVIEWER,
    ADMIN_ROLE_CODES.OPS_ADMIN,
    ADMIN_ROLE_CODES.SUPER_ADMIN,
  ])

  const payload = validateResolveTaskPayload(request.payload)
  return resolveReviewTask(payload, adminContext, request.requestId)
}
