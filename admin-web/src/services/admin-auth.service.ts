import { serviceClient } from '@/services/client'
import type { AdminProfile, ChangePasswordPayload, LoginPayload, LoginResult } from '@/models/auth'

export const adminAuthService = {
  login(payload: LoginPayload) {
    return serviceClient.invoke<LoginResult, LoginPayload>('admin-auth', 'login', payload, { requiresAuth: false })
  },
  me() {
    return serviceClient.invoke<AdminProfile>('admin-auth', 'me')
  },
  logout() {
    return serviceClient.invoke<{ success: boolean }>('admin-auth', 'logout')
  },
  changePassword(payload: ChangePasswordPayload) {
    return serviceClient.invoke<{ success: boolean; logoutOtherSessions: boolean }, ChangePasswordPayload>(
      'admin-auth',
      'changePassword',
      payload,
    )
  },
}
