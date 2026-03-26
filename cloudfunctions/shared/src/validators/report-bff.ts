import { ReportSubmitPayload } from '../contracts/miniprogram/report-bff'
import { createValidationError, requireString } from './common'

function optionalString(value: unknown, fieldName: string, maxLength?: number) {
  if (typeof value === 'undefined' || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串`,
    })
  }

  const normalized = value.trim()

  if (maxLength && normalized.length > maxLength) {
    throw createValidationError({
      [fieldName]: `${fieldName} 长度不能超过 ${maxLength}`,
    })
  }

  return normalized.length > 0 ? normalized : undefined
}

function optionalStringArray(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value === 'undefined' || value === null) {
    return undefined
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串数组`,
    })
  }

  if (value.length > maxLength) {
    throw createValidationError({
      [fieldName]: `${fieldName} 最多 ${maxLength} 项`,
    })
  }

  return value.map((item) => item.trim()).filter(Boolean)
}

export function validateSubmitReportPayload(payload: Record<string, unknown> = {}): ReportSubmitPayload {
  return {
    targetType: requireString(payload.targetType, {
      fieldName: 'targetType',
    }),
    targetId: optionalString(payload.targetId, 'targetId'),
    targetSummary: requireString(payload.targetSummary, {
      fieldName: 'targetSummary',
      minLength: 1,
      maxLength: 100,
    }),
    reasonCode: requireString(payload.reasonCode, {
      fieldName: 'reasonCode',
    }),
    description: optionalString(payload.description, 'description', 200),
    evidenceImages: optionalStringArray(payload.evidenceImages, 'evidenceImages', 6),
  }
}
