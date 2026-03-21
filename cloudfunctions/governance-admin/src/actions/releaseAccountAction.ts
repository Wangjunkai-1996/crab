import { assertAdminRole, requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { ADMIN_ROLE_CODES } from '../../../shared/src/enums/admin'
import { releaseAccountActionRecord } from '../../../shared/src/services/admin-governance-service'
import { getAdminWebSource } from '../../../shared/src/validators/common'
import { validateReleaseAccountActionPayload } from '../../../shared/src/validators/governance-admin'

export async function releaseAccountAction(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)
  assertAdminRole(adminContext, [
    ADMIN_ROLE_CODES.OPS_ADMIN,
    ADMIN_ROLE_CODES.SUPER_ADMIN,
  ])

  const payload = validateReleaseAccountActionPayload(request.payload)
  return releaseAccountActionRecord(payload.restrictionId, payload.reasonText, adminContext, request.requestId)
}
