import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'

import { DEFAULT_HOME_ROUTE, ROUTE_NAMES } from '@/constants/routes'
import type { RoleCode } from '@/models/auth'
import { useAuthStore } from '@/stores/auth.store'
import { hasPageAccess } from '@/utils/permission'
import { ServiceError } from '@/utils/request'

export const setupRouterGuards = (router: Router, pinia: Pinia) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore(pinia)
    const requiresAuth = to.meta.requiresAuth !== false
    const hasToken = Boolean(authStore.adminSessionToken)

    if (requiresAuth && !hasToken) {
      return {
        name: ROUTE_NAMES.LOGIN,
        query: { redirect: to.fullPath },
      }
    }

    if (hasToken && !authStore.adminUser) {
      try {
        await authStore.fetchMe()
      } catch (error) {
        if (error instanceof ServiceError && error.code === 30003) {
          return { name: ROUTE_NAMES.FORBIDDEN }
        }

        authStore.clearAuth()
        if (requiresAuth) {
          return {
            name: ROUTE_NAMES.LOGIN,
            query: { redirect: to.fullPath },
          }
        }
      }
    }

    if (to.name === ROUTE_NAMES.LOGIN && authStore.adminUser) {
      return { name: DEFAULT_HOME_ROUTE }
    }

    const allowedRoles = to.meta.allowedRoles as RoleCode[] | undefined
    const pageKey = typeof to.meta.pageKey === 'string' ? to.meta.pageKey : undefined
    if (
      requiresAuth &&
      !hasPageAccess({
        ownedRoles: authStore.roleCodes,
        allowedRoles,
        pageKey,
        permissionSummary: authStore.permissionSummary,
      })
    ) {
      return { name: ROUTE_NAMES.FORBIDDEN }
    }

    return true
  })
}
