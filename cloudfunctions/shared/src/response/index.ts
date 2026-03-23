import { toAppError } from '../errors/app-error'

export function successResponse(data: unknown, requestId: string) {
  return {
    code: 0,
    message: 'ok',
    data,
    requestId,
  }
}

export function errorResponse(error: unknown, requestId: string) {
  const appError = toAppError(error)

  return {
    code: appError.code,
    message: appError.message,
    data: appError.data ?? null,
    requestId,
  }
}

