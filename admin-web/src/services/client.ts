import { ENABLE_REAL_ADMIN_READS } from '@/constants/ui'
import type { ServiceModuleName, ServiceResponse } from '@/models/common'
import { invokeCloudbaseService, isCloudbaseTransportEnabled } from '@/services/cloudbase.client'
import { dispatchMockRequest } from '@/services/mock'
import { buildRequestMeta, clearStoredSessionToken, ServiceError } from '@/utils/request'

interface InvokeOptions {
  requiresAuth?: boolean
}

const isMockEnabled = import.meta.env.VITE_USE_MOCK_SERVICE === 'true'

type AdminAuthDebugRecord = {
  action: string
  code: number
  message: string
  data: unknown
  requestId?: string
  capturedAt: string
}

const maybeRecordAdminAuthDebug = (moduleName: ServiceModuleName, action: string, response: ServiceResponse<unknown>) => {
  if (moduleName !== 'admin-auth' || !['login', 'changePassword', 'me'].includes(action) || typeof window === 'undefined') {
    return
  }

  const debugWindow = window as Window & {
    __DM_ENABLE_ADMIN_AUTH_DEBUG__?: boolean
    __DM_ADMIN_AUTH_DEBUG_LAST__?: AdminAuthDebugRecord
    __DM_ADMIN_AUTH_DEBUG_LOG__?: AdminAuthDebugRecord[]
  }

  if (!debugWindow.__DM_ENABLE_ADMIN_AUTH_DEBUG__) {
    return
  }

  const record: AdminAuthDebugRecord = {
    action,
    code: response.code,
    message: response.message,
    data: response.data ?? null,
    requestId: response.requestId,
    capturedAt: new Date().toISOString(),
  }

  const history = Array.isArray(debugWindow.__DM_ADMIN_AUTH_DEBUG_LOG__)
    ? [...debugWindow.__DM_ADMIN_AUTH_DEBUG_LOG__]
    : []

  history.push(record)
  debugWindow.__DM_ADMIN_AUTH_DEBUG_LAST__ = record
  debugWindow.__DM_ADMIN_AUTH_DEBUG_LOG__ = history.slice(-10)
}

const REAL_TRANSPORT_ACTIONS: Record<ServiceModuleName, ReadonlySet<string>> = {
  'admin-auth': new Set(['login', 'me', 'logout', 'changePassword']),
  'review-admin': new Set(['taskList', 'taskDetail']),
  'governance-admin': new Set(['dashboard', 'reportList', 'reportDetail', 'accountActionList', 'operationLogList']),
}

const shouldUseRealTransport = (moduleName: ServiceModuleName, action: string) => {
  if (!isCloudbaseTransportEnabled()) {
    return false
  }

  if (moduleName === 'admin-auth') {
    return REAL_TRANSPORT_ACTIONS[moduleName].has(action)
  }

  if (!ENABLE_REAL_ADMIN_READS) {
    return false
  }

  return REAL_TRANSPORT_ACTIONS[moduleName].has(action)
}

export const serviceClient = {
  async invoke<TData, TPayload = Record<string, unknown>>(
    moduleName: ServiceModuleName,
    action: string,
    payload = {} as TPayload,
    options: InvokeOptions = {},
  ) {
    const requiresAuth = options.requiresAuth ?? true
    const request = {
      action,
      payload: (payload ?? {}) as Record<string, any>,
      meta: buildRequestMeta(requiresAuth),
    }

    let response: ServiceResponse<TData>

    if (shouldUseRealTransport(moduleName, action)) {
      response = await invokeCloudbaseService<TData>(moduleName, request)
    } else if (isMockEnabled) {
      response = (await dispatchMockRequest({
        moduleName,
        request,
      })) as ServiceResponse<TData>
    } else {
      throw new Error(`当前模块 ${moduleName}.${action} 未配置可用 transport`)
    }

    maybeRecordAdminAuthDebug(moduleName, action, response)

    if (response.code !== 0) {
      if (response.code === 30002) {
        clearStoredSessionToken()
      }
      throw new ServiceError(response.message, response.code, response.requestId, response.data)
    }

    return response.data
  },
}
