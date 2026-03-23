import { REQUEST_SOURCES } from '../constants/runtime'
import { ERROR_CODES } from '../constants/error-codes'
import { AppError } from '../errors/app-error'

type StringOptions = {
  fieldName: string
  minLength?: number
  maxLength?: number
  trim?: boolean
  allowEmpty?: boolean
}

export function createValidationError(fieldErrors: Record<string, string>, message = '参数校验失败') {
  return new AppError({
    code: ERROR_CODES.PARAM_INVALID,
    message,
    data: {
      errorType: 'validation',
      fieldErrors,
    },
  })
}

export function requireString(value: unknown, options: StringOptions) {
  if (typeof value !== 'string') {
    throw createValidationError({
      [options.fieldName]: `${options.fieldName} 必须为字符串`,
    })
  }

  const normalizedValue = options.trim === false ? value : value.trim()

  if (!options.allowEmpty && normalizedValue.length === 0) {
    throw createValidationError({
      [options.fieldName]: `${options.fieldName} 不能为空`,
    })
  }

  if (options.minLength && normalizedValue.length < options.minLength) {
    throw createValidationError({
      [options.fieldName]: `${options.fieldName} 长度不能少于 ${options.minLength}`,
    })
  }

  if (options.maxLength && normalizedValue.length > options.maxLength) {
    throw createValidationError({
      [options.fieldName]: `${options.fieldName} 长度不能超过 ${options.maxLength}`,
    })
  }

  return normalizedValue
}

export function assertSource(meta: Record<string, unknown>, allowedSources: string[]) {
  const source = typeof meta.source === 'string' ? meta.source : ''

  if (!allowedSources.includes(source)) {
    throw createValidationError({
      source: `meta.source 仅支持 ${allowedSources.join(' / ')}`,
    })
  }

  return source
}

export function validatePreferredView(preferredView: unknown): 'publisher' | 'creator' {
  const normalizedValue = requireString(preferredView, {
    fieldName: 'preferredView',
  })

  if (normalizedValue !== 'publisher' && normalizedValue !== 'creator') {
    throw createValidationError({
      preferredView: 'preferredView 仅支持 publisher / creator',
    })
  }

  return normalizedValue
}

export function getMiniprogramSource(meta: Record<string, unknown>) {
  return assertSource(meta, [REQUEST_SOURCES.MINIPROGRAM])
}

export function getAdminWebSource(meta: Record<string, unknown>) {
  return assertSource(meta, [REQUEST_SOURCES.ADMIN_WEB])
}
