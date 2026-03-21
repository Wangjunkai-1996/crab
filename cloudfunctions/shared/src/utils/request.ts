import { ERROR_CODES } from '../constants/error-codes'
import { AppError } from '../errors/app-error'
import { CloudFunctionRequest, NormalizedRequest, RequestMeta } from '../types'
import { createRequestId } from './id'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeRequest<TPayload = Record<string, unknown>>(
  event: CloudFunctionRequest<TPayload> | undefined,
): NormalizedRequest<TPayload> {
  const rawEvent = isPlainObject(event) ? event : {}
  const action = typeof rawEvent.action === 'string' ? rawEvent.action.trim() : ''

  if (!action) {
    throw new AppError({
      code: ERROR_CODES.PARAM_INVALID,
      message: '参数校验失败',
      data: {
        errorType: 'validation',
        fieldErrors: {
          action: 'action 为必填项',
        },
      },
    })
  }

  const payload = isPlainObject(rawEvent.payload) ? (rawEvent.payload as TPayload) : ({} as TPayload)
  const meta = isPlainObject(rawEvent.meta) ? (rawEvent.meta as RequestMeta) : {}
  const requestId = typeof rawEvent.requestId === 'string' && rawEvent.requestId.trim()
    ? rawEvent.requestId.trim()
    : createRequestId()

  return {
    action,
    payload,
    meta,
    requestId,
    rawEvent,
  }
}

export function getFallbackRequestId(event: unknown) {
  if (typeof event === 'object' && event !== null && 'requestId' in event && typeof (event as any).requestId === 'string') {
    return (event as any).requestId
  }

  return createRequestId()
}

