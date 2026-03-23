import type { RoleCode } from '@/models/auth'

export const ALL_ADMIN_ROLES: RoleCode[] = ['reviewer', 'ops_admin', 'super_admin']

export const ROLE_LABEL_MAP: Record<RoleCode, string> = {
  reviewer: '审核员',
  ops_admin: '运营管理员',
  super_admin: '超级管理员',
}
