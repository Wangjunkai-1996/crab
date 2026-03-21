export interface RequestMeta {
  source?: string
  clientVersion?: string
  adminSessionToken?: string
  ip?: string
  userAgent?: string
  [key: string]: unknown
}

export interface CloudFunctionRequest<TPayload = Record<string, unknown>> {
  action?: string
  payload?: TPayload
  meta?: RequestMeta
  requestId?: string
}

export interface NormalizedRequest<TPayload = Record<string, unknown>> {
  action: string
  payload: TPayload
  meta: RequestMeta
  requestId: string
  rawEvent: CloudFunctionRequest<TPayload>
}

export interface RoleFlags {
  publisherEnabled: boolean
  creatorEnabled: boolean
}

export interface UserContext {
  userId: string
  roleFlags: RoleFlags
  accountStatus: string
  preferredView: 'publisher' | 'creator' | null
  rawUser: Record<string, any>
  wxContext: {
    OPENID?: string
    UNIONID?: string
    APPID?: string
  }
}

export interface AdminContext {
  adminUserId: string
  displayName: string
  roleCodes: string[]
  status: string
  sessionId: string
  mustResetPassword: boolean
  rawAdminUser: Record<string, any>
  rawSession: Record<string, any>
}

export interface OperationLogInput {
  operatorType: string
  operatorId: string
  action: string
  targetType: string
  targetId: string
  requestId: string
  beforeSnapshot?: unknown
  afterSnapshot?: unknown
  remark?: string
}

export type ActionHandler<TPayload = Record<string, unknown>, TResult = unknown> = (
  request: NormalizedRequest<TPayload>,
) => Promise<TResult>

export type ActionMap = Record<string, ActionHandler<any, any>>
