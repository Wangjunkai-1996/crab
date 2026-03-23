import { defineStore } from 'pinia'

import {
  createEmptyPermissionSummary,
  normalizePermissionSummary,
  type AdminProfile,
  type ChangePasswordPayload,
  type LoginPayload,
  type PermissionSummary,
  type RoleCode,
} from '@/models/auth'
import { adminAuthService } from '@/services/admin-auth.service'
import { clearStoredSessionToken, getStoredSessionToken, setStoredSessionToken } from '@/utils/request'

interface AuthState {
  adminUser: AdminProfile | null
  roleCodes: RoleCode[]
  adminSessionToken: string
  mustResetPassword: boolean
  permissionSummary: PermissionSummary
  sessionExpiresAt: string
  idleExpireAt: string
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    adminUser: null,
    roleCodes: [],
    adminSessionToken: getStoredSessionToken(),
    mustResetPassword: false,
    permissionSummary: createEmptyPermissionSummary(),
    sessionExpiresAt: '',
    idleExpireAt: '',
    initialized: false,
  }),
  actions: {
    applyProfile(profile: AdminProfile) {
      this.adminUser = {
        ...profile,
        permissionSummary: normalizePermissionSummary(profile.permissionSummary),
      }
      this.roleCodes = profile.roleCodes
      this.permissionSummary = normalizePermissionSummary(profile.permissionSummary)
      this.mustResetPassword = profile.mustResetPassword
      this.initialized = true
    },
    applySession(sessionToken: string, expiresAt?: string, idleExpireAt?: string) {
      this.adminSessionToken = sessionToken
      if (sessionToken) {
        setStoredSessionToken(sessionToken)
      }
      this.sessionExpiresAt = expiresAt ?? ''
      this.idleExpireAt = idleExpireAt ?? ''
    },
    clearAuth() {
      this.adminUser = null
      this.roleCodes = []
      this.adminSessionToken = ''
      this.mustResetPassword = false
      this.permissionSummary = createEmptyPermissionSummary()
      this.sessionExpiresAt = ''
      this.idleExpireAt = ''
      this.initialized = true
      clearStoredSessionToken()
    },
    markPasswordResetCompleted() {
      this.mustResetPassword = false

      if (this.adminUser) {
        this.adminUser = {
          ...this.adminUser,
          mustResetPassword: false,
        }
      }
    },
    async login(payload: LoginPayload) {
      const result = await adminAuthService.login(payload)
      this.applySession(result.session.adminSessionToken, result.session.expiresAt, result.session.idleExpireAt)
      this.applyProfile({
        ...result.adminUser,
        permissionSummary: createEmptyPermissionSummary(),
        mustResetPassword: result.session.mustResetPassword,
      })
      try {
        await this.fetchMe()
      } catch (error) {
        this.clearAuth()
        throw error
      }
      return result
    },
    async fetchMe() {
      const profile = await adminAuthService.me()
      this.applyProfile(profile)
      return profile
    },
    async restoreSession() {
      const storedToken = getStoredSessionToken()
      if (!storedToken) {
        this.initialized = true
        return
      }

      this.adminSessionToken = storedToken

      try {
        await this.fetchMe()
      } catch {
        this.clearAuth()
      }
    },
    async logout() {
      try {
        if (this.adminSessionToken) {
          await adminAuthService.logout()
        }
      } finally {
        this.clearAuth()
      }
    },
    async changePassword(payload: ChangePasswordPayload) {
      await adminAuthService.changePassword(payload)
    },
  },
})
