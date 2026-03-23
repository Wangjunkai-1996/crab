import { assertAdminRole, requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { ADMIN_ROLE_CODES } from '../../../shared/src/enums/admin'
import { createAccountActionRecord } from '../../../shared/src/services/admin-governance-service'
import { getAdminWebSource } from '../../../shared/src/validators/common'
import { validateCreateAccountActionPayload } from '../../../shared/src/validators/governance-admin'

export async function createAccountAction(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)
  assertAdminRole(adminContext, [
    ADMIN_ROLE_CODES.OPS_ADMIN,
    ADMIN_ROLE_CODES.SUPER_ADMIN,
  ])

  const payload = validateCreateAccountActionPayload(request.payload)
  return createAccountActionRecord(payload, adminContext, request.requestId)
}
