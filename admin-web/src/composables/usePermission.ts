import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { hasActionAccess, hasPageAccess } from '@/utils/permission'
import type { ActionOption } from '@/models/common'
import type { RoleCode } from '@/models/auth'
import type { AdminActionAccessKey } from '@/constants/admin-contract'

export const usePermission = () => {
  const authStore = useAuthStore()

  const canAccessPage = (pageKey?: string, allowedRoles?: RoleCode[]) =>
    hasPageAccess({
      ownedRoles: authStore.roleCodes,
      allowedRoles,
      pageKey,
      permissionSummary: authStore.permissionSummary,
    })

  const canAccessAction = (actionKey?: AdminActionAccessKey) =>
    hasActionAccess({
      ownedRoles: authStore.roleCodes,
      actionKey,
      permissionSummary: authStore.permissionSummary,
    })

  const resolveActionState = (action: ActionOption) => {
    if (authStore.mustResetPassword) {
      return {
        visible: true,
        disabled: true,
        disabledReason: '请先完成首次改密后再执行处理动作',
      }
    }

    return {
      visible: true,
      disabled: Boolean(action.disabled),
      disabledReason: action.disabledReason,
    }
  }

  return {
    canAccessPage,
    canAccessAction,
    resolveActionState,
    mustResetPassword: computed(() => authStore.mustResetPassword),
  }
}
