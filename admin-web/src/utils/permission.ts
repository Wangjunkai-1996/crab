import { ADMIN_PAGE_ACCESS_KEYS, type AdminActionAccessKey, type AdminPageAccessKey } from '@/constants/admin-contract'
import type { PermissionSummary, RoleCode } from '@/models/auth'

interface PageAccessOptions {
  ownedRoles: RoleCode[]
  allowedRoles?: RoleCode[]
  pageKey?: string
  permissionSummary?: PermissionSummary
}

interface ActionAccessOptions {
  ownedRoles: RoleCode[]
  actionKey?: AdminActionAccessKey
  permissionSummary?: PermissionSummary
}

export const hasAnyRole = (ownedRoles: RoleCode[], allowedRoles?: RoleCode[]) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true
  }

  return allowedRoles.some((role) => ownedRoles.includes(role))
}

const KNOWN_PAGE_ACCESS_KEYS = new Set<string>(Object.values(ADMIN_PAGE_ACCESS_KEYS))

const isKnownPageAccessKey = (pageKey?: string): pageKey is AdminPageAccessKey => {
  return Boolean(pageKey && KNOWN_PAGE_ACCESS_KEYS.has(pageKey))
}

export const hasPageAccess = ({ ownedRoles, allowedRoles, pageKey, permissionSummary }: PageAccessOptions) => {
  if (permissionSummary && isKnownPageAccessKey(pageKey)) {
    return Boolean(permissionSummary.pageAccess[pageKey])
  }

  return hasAnyRole(ownedRoles, allowedRoles)
}

export const hasActionAccess = ({ ownedRoles, actionKey, permissionSummary }: ActionAccessOptions) => {
  if (permissionSummary && actionKey) {
    return Boolean(permissionSummary.actionAccess[actionKey])
  }

  return ownedRoles.length > 0
}
