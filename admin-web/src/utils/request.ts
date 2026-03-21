import { ADMIN_SESSION_STORAGE_KEY, APP_CLIENT_VERSION, APP_SOURCE } from '@/constants/ui'
import type { ServiceRequestMeta } from '@/models/common'

export class ServiceError extends Error {
  code: number
  requestId?: string
  detail?: unknown

  constructor(message: string, code: number, requestId?: string, detail?: unknown) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.requestId = requestId
    this.detail = detail
  }
}

export const getStoredSessionToken = () => sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ?? ''

export const setStoredSessionToken = (token: string) => {
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token)
}

export const clearStoredSessionToken = () => {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
}

export const buildRequestMeta = (requiresAuth = true): ServiceRequestMeta => {
  const meta: ServiceRequestMeta = {
    source: APP_SOURCE,
    clientVersion: APP_CLIENT_VERSION,
  }

  const token = getStoredSessionToken()
  if (requiresAuth && token) {
    meta.adminSessionToken = token
  }

  return meta
}

export const getFieldErrorsFromError = (error: unknown) => {
  if (!(error instanceof ServiceError) || !error.detail || typeof error.detail !== 'object') {
    return {}
  }

  const fieldErrors = (error.detail as Record<string, unknown>).fieldErrors
  if (!fieldErrors || typeof fieldErrors !== 'object') {
    return {}
  }

  return fieldErrors as Record<string, string>
}
