import { buildPermissionSummary, requireAdminAuth } from '../../../shared/src/auth/admin-auth'
import { getAdminWebSource } from '../../../shared/src/validators/common'

export async function me(request: any) {
  getAdminWebSource(request.meta)

  const adminContext = await requireAdminAuth(request.meta)

  return {
    adminUserId: adminContext.adminUserId,
    displayName: adminContext.displayName,
    roleCodes: adminContext.roleCodes,
    status: adminContext.status,
    mustResetPassword: adminContext.mustResetPassword,
    permissionSummary: buildPermissionSummary(adminContext.roleCodes),
  }
}
