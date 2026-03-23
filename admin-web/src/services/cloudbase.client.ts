import cloudbase from '@cloudbase/js-sdk'

import {
  ADMIN_AUTH_FUNCTION_NAME,
  CLOUDBASE_ENV_ID,
  CLOUDBASE_REGION,
  CLOUDBASE_TIMEOUT_MS,
  GOVERNANCE_ADMIN_FUNCTION_NAME,
  REVIEW_ADMIN_FUNCTION_NAME,
} from '@/constants/ui'
import type { ServiceModuleName, ServiceRequest, ServiceResponse } from '@/models/common'

let appInstance: ReturnType<typeof cloudbase.init> | null = null
let anonymousLoginPromise: Promise<void> | null = null

const FUNCTION_NAME_MAP: Record<ServiceModuleName, string> = {
  'admin-auth': ADMIN_AUTH_FUNCTION_NAME,
  'review-admin': REVIEW_ADMIN_FUNCTION_NAME,
  'governance-admin': GOVERNANCE_ADMIN_FUNCTION_NAME,
}

const createCloudbaseApp = () => {
  if (!CLOUDBASE_ENV_ID) {
    throw new Error('未配置 VITE_CLOUDBASE_ENV_ID，无法启用真实 CloudBase transport')
  }

  if (!appInstance) {
    appInstance = cloudbase.init({
      env: CLOUDBASE_ENV_ID,
      region: CLOUDBASE_REGION || undefined,
      timeout: CLOUDBASE_TIMEOUT_MS,
    })
    appInstance.auth({ persistence: 'session' })
  }

  return appInstance
}

const normalizeFunctionResult = <TData>(result: unknown, requestId: string) => {
  const parsed = typeof result === 'string' ? JSON.parse(result) : result

  if (
    parsed &&
    typeof parsed === 'object' &&
    'code' in parsed &&
    'message' in parsed &&
    'data' in parsed
  ) {
    const typedResult = parsed as ServiceResponse<TData>
    return {
      ...typedResult,
      requestId: typedResult.requestId || requestId,
    }
  }

  return {
    code: 0,
    message: 'ok',
    data: parsed as TData,
    requestId,
  }
}

const ensureAnonymousLogin = async () => {
  if (anonymousLoginPromise) {
    return anonymousLoginPromise
  }

  anonymousLoginPromise = (async () => {
    const app = createCloudbaseApp()
    const auth = app.auth()
    const loginState = auth.hasLoginState() ?? (await auth.getLoginState())

    if (!loginState) {
      await auth.signInAnonymously()
    }
  })()

  try {
    await anonymousLoginPromise
  } finally {
    anonymousLoginPromise = null
  }
}

const resolveFunctionName = (moduleName: ServiceModuleName) => {
  const functionName = FUNCTION_NAME_MAP[moduleName]
  if (!functionName) {
    throw new Error(`未配置模块 ${moduleName} 对应的云函数名`)
  }
  return functionName
}

export const isCloudbaseTransportEnabled = () => Boolean(CLOUDBASE_ENV_ID)
export const isRealAdminAuthEnabled = isCloudbaseTransportEnabled

export const invokeCloudbaseService = async <TData>(
  moduleName: ServiceModuleName,
  request: ServiceRequest<Record<string, any>>,
) => {
  await ensureAnonymousLogin()

  const app = createCloudbaseApp()
  const response = await app.callFunction({
    name: resolveFunctionName(moduleName),
    data: request,
    parse: true,
  })

  return normalizeFunctionResult<TData>(response.result, response.requestId)
}

export const invokeRealAdminAuth = async <TData>(request: ServiceRequest<Record<string, any>>) => {
  return invokeCloudbaseService<TData>('admin-auth', request)
}
