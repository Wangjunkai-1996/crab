import { AdminPermissionSummary } from './permission-summary'

export interface AdminAuthMeResponseData {
  adminUserId: string
  displayName: string
  roleCodes: string[]
  status: string
  mustResetPassword: boolean
  permissionSummary: AdminPermissionSummary
}
