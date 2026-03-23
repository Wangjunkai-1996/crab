import { ERROR_CODES } from '../constants/error-codes'

interface AppErrorOptions {
  code: number
  message: string
  data?: unknown
  cause?: unknown
}

export class AppError extends Error {
  code: number
  data: unknown
  cause: unknown

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.data = options.data ?? null
    this.cause = options.cause
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError({
      code: ERROR_CODES.SYSTEM_ERROR,
      message: '系统繁忙，请稍后重试',
      cause: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    })
  }

  return new AppError({
    code: ERROR_CODES.SYSTEM_ERROR,
    message: '系统繁忙，请稍后重试',
    cause: error,
  })
}

