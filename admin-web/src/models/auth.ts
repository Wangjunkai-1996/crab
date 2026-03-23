import {
  ADMIN_ACTION_ACCESS_KEYS,
  ADMIN_PAGE_ACCESS_KEYS,
  type AdminActionAccessKey,
  type AdminPageAccessKey,
} from '@/constants/admin-contract'

export type RoleCode = 'reviewer' | 'ops_admin' | 'super_admin'

export interface PermissionSummary {
  pageAccess: Record<AdminPageAccessKey, boolean>
  actionAccess: Record<AdminActionAccessKey, boolean>
}

export interface AdminUser {
  adminUserId: string
  displayName: string
  roleCodes: RoleCode[]
}

export interface AdminProfile extends AdminUser {
  status?: string
  permissionSummary?: PermissionSummary
  mustResetPassword: boolean
}

export interface AdminSession {
  adminSessionToken: string
  expiresAt: string
  idleExpireAt: string
  mustResetPassword: boolean
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  adminUser: AdminUser
  session: AdminSession
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

const buildAccessRecord = <TKey extends string>(keys: readonly TKey[]) => {
  return keys.reduce(
    (accumulator, key) => {
      accumulator[key] = false
      return accumulator
    },
    {} as Record<TKey, boolean>,
  )
}

const EMPTY_PAGE_ACCESS = buildAccessRecord(Object.values(ADMIN_PAGE_ACCESS_KEYS) as AdminPageAccessKey[])
const EMPTY_ACTION_ACCESS = buildAccessRecord(Object.values(ADMIN_ACTION_ACCESS_KEYS) as AdminActionAccessKey[])

export const createEmptyPermissionSummary = (): PermissionSummary => ({
  pageAccess: { ...EMPTY_PAGE_ACCESS },
  actionAccess: { ...EMPTY_ACTION_ACCESS },
})

export const normalizePermissionSummary = (permissionSummary?: Partial<PermissionSummary> | null): PermissionSummary => {
  const emptySummary = createEmptyPermissionSummary()

  return {
    pageAccess: {
      ...emptySummary.pageAccess,
      ...(permissionSummary?.pageAccess || {}),
    },
    actionAccess: {
      ...emptySummary.actionAccess,
      ...(permissionSummary?.actionAccess || {}),
    },
  }
}
