import { NoticeDraftInput } from '../contracts/miniprogram/notice-bff'
import { decodeOffsetCursor, normalizePageSize } from '../utils/pagination'
import { createValidationError, requireString } from './common'

function optionalString(value: unknown, fieldName: string) {
  if (typeof value === 'undefined' || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串`,
    })
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalNullableString(value: unknown, fieldName: string) {
  if (typeof value === 'undefined' || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串`,
    })
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function optionalRecruitCount(value: unknown) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined
  }

  const normalized = Number(value)

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw createValidationError({
      recruitCount: 'recruitCount 必须为大于 0 的整数',
    })
  }

  return normalized
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

function optionalDateString(value: unknown, fieldName: string) {
  const normalized = optionalString(value, fieldName)

  if (!normalized) {
    return undefined
  }

  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError({
      [fieldName]: `${fieldName} 不是合法时间`,
    })
  }

  return parsed.toISOString()
}

function requireNoticePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createValidationError({
      notice: 'notice 必须为对象',
    })
  }

  return value as Record<string, unknown>
}

function normalizeNoticeInput(notice: Record<string, unknown>): NoticeDraftInput {
  const settlementType = optionalString(notice.settlementType, 'settlementType')
  let budgetRange = optionalString(notice.budgetRange, 'budgetRange')

  if (settlementType && ['barter', 'free_experience', 'other'].includes(settlementType) && !budgetRange) {
    budgetRange = 'not_applicable'
  }

  return {
    title: optionalString(notice.title, 'title'),
    brandName: optionalNullableString(notice.brandName, 'brandName'),
    cooperationPlatform: optionalString(notice.cooperationPlatform, 'cooperationPlatform'),
    cooperationCategory: optionalString(notice.cooperationCategory, 'cooperationCategory'),
    cooperationType: optionalString(notice.cooperationType, 'cooperationType'),
    city: optionalString(notice.city, 'city'),
    settlementType,
    budgetRange,
    recruitCount: optionalRecruitCount(notice.recruitCount),
    deadlineAt: optionalDateString(notice.deadlineAt, 'deadlineAt'),
    creatorRequirements: optionalString(notice.creatorRequirements, 'creatorRequirements'),
    cooperationDescription: optionalString(notice.cooperationDescription, 'cooperationDescription'),
    attachments: optionalStringArray(notice.attachments, 'attachments'),
  }
}

export function validateNoticeListPayload(payload: Record<string, unknown> = {}) {
  return {
    keyword: optionalString(payload.keyword, 'keyword'),
    cooperationPlatform: optionalString(payload.cooperationPlatform, 'cooperationPlatform'),
    cooperationCategory: optionalString(payload.cooperationCategory, 'cooperationCategory'),
    city: optionalString(payload.city, 'city'),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateNoticeDetailPayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
  }
}

export function validateNoticeMyListPayload(payload: Record<string, unknown> = {}) {
  return {
    status: optionalString(payload.status, 'status'),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateCreateDraftPayload(payload: Record<string, unknown> = {}) {
  return {
    notice: normalizeNoticeInput(requireNoticePayload(payload.notice)),
  }
}

export function validateUpdateDraftPayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
    notice: normalizeNoticeInput(requireNoticePayload(payload.notice)),
  }
}

export function validateSubmitReviewPayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
  }
}

export function validateCloseNoticePayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
  }
}

export function validateRepublishNoticePayload(payload: Record<string, unknown> = {}) {
  return {
    noticeId: requireString(payload.noticeId, {
      fieldName: 'noticeId',
    }),
  }
}
