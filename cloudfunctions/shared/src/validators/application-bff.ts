import { ApplicationSubmitPayload } from '../contracts/miniprogram/application-bff'
import { decodeOffsetCursor, normalizePageSize } from '../utils/pagination'
import { createValidationError, requireString } from './common'

function optionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalStringArray(value: unknown, fieldName: string) {
  if (typeof value === 'undefined' || value === null) {
    return undefined
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串数组`,
    })
  }

  return value.filter((item) => item.trim().length > 0)
}

export function validateSubmitApplicationPayload(payload: Record<string, unknown> = {}): ApplicationSubmitPayload {
  const noticeId = requireString(payload.noticeId, {
    fieldName: 'noticeId',
  })
  const selfIntroduction = requireString(payload.selfIntroduction, {
    fieldName: 'selfIntroduction',
    minLength: 2,
  })
  const deliverablePlan = requireString(payload.deliverablePlan, {
    fieldName: 'deliverablePlan',
    minLength: 2,
  })
  const expectedTerms = optionalString(payload.expectedTerms)
  const portfolioImages = optionalStringArray(payload.portfolioImages, 'portfolioImages')
  const contactType = optionalString(payload.contactType)
  const contactValue = optionalString(payload.contactValue)

  if ((contactType && !contactValue) || (!contactType && contactValue)) {
    throw createValidationError({
      contactType: 'contactType 与 contactValue 需同时提供',
      contactValue: 'contactType 与 contactValue 需同时提供',
    })
  }

  return {
    noticeId,
    selfIntroduction,
    deliverablePlan,
    expectedTerms,
    portfolioImages,
    contactType,
    contactValue,
  }
}

export function validateWithdrawApplicationPayload(payload: Record<string, unknown> = {}) {
  return {
    applicationId: requireString(payload.applicationId, {
      fieldName: 'applicationId',
    }),
  }
}

export function validateApplicationMyListPayload(payload: Record<string, unknown> = {}) {
  const status = optionalString(payload.status)

  return {
    status: status === 'all' ? undefined : status,
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateApplicationDetailPayload(payload: Record<string, unknown> = {}) {
  return {
    applicationId: requireString(payload.applicationId, {
      fieldName: 'applicationId',
    }),
  }
}

export function validatePublisherApplicationListPayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
    status: optionalString(payload.status),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validatePublisherApplicationDetailPayload(payload: Record<string, unknown> = {}) {
  return {
    applicationId: requireString(payload.applicationId, {
      fieldName: 'applicationId',
    }),
  }
}

export function validatePublisherApplicationMutationPayload(payload: Record<string, unknown> = {}) {
  return {
    applicationId: requireString(payload.applicationId, {
      fieldName: 'applicationId',
    }),
  }
}

export function validatePublisherRejectApplicationPayload(payload: Record<string, unknown> = {}) {
  const applicationId = requireString(payload.applicationId, {
    fieldName: 'applicationId',
  })

  const reasonText = optionalString(payload.reasonText)

  if (typeof payload.reasonText !== 'undefined' && typeof payload.reasonText !== 'string') {
    throw createValidationError({
      reasonText: 'reasonText 必须为字符串',
    })
  }

  return {
    applicationId,
    reasonText,
  }
}
