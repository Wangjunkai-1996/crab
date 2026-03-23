import { CreatorUpsertCardPayload } from '../contracts/miniprogram/creator-bff'
import { createValidationError, requireString } from './common'

function optionalNullableString(value: unknown, fieldName: string) {
  if (typeof value === 'undefined') {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串`,
    })
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function requireStringArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw createValidationError({
      [fieldName]: `${fieldName} 必须为字符串数组`,
    })
  }

  const normalized = value
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (normalized.length === 0) {
    throw createValidationError({
      [fieldName]: `${fieldName} 至少保留 1 项`,
    })
  }

  return normalized
}

export function validateUpsertCreatorCardPayload(payload: Record<string, unknown> = {}): CreatorUpsertCardPayload {
  return {
    nickname: requireString(payload.nickname, {
      fieldName: 'nickname',
      minLength: 1,
      maxLength: 30,
    }),
    avatarUrl: optionalNullableString(payload.avatarUrl, 'avatarUrl'),
    city: requireString(payload.city, {
      fieldName: 'city',
      minLength: 1,
      maxLength: 30,
    }),
    gender: optionalNullableString(payload.gender, 'gender'),
    primaryPlatform: requireString(payload.primaryPlatform, {
      fieldName: 'primaryPlatform',
      minLength: 1,
      maxLength: 30,
    }),
    primaryCategory: requireString(payload.primaryCategory, {
      fieldName: 'primaryCategory',
      minLength: 1,
      maxLength: 30,
    }),
    followerBand: requireString(payload.followerBand, {
      fieldName: 'followerBand',
      minLength: 1,
      maxLength: 30,
    }),
    accountName: optionalNullableString(payload.accountName, 'accountName'),
    accountIdOrLink: optionalNullableString(payload.accountIdOrLink, 'accountIdOrLink'),
    portfolioImages: requireStringArray(payload.portfolioImages, 'portfolioImages'),
    caseDescription: optionalNullableString(payload.caseDescription, 'caseDescription'),
    residentCity: optionalNullableString(payload.residentCity, 'residentCity'),
    contactType: requireString(payload.contactType, {
      fieldName: 'contactType',
      minLength: 1,
      maxLength: 30,
    }),
    contactValue: requireString(payload.contactValue, {
      fieldName: 'contactValue',
      minLength: 1,
      maxLength: 80,
    }),
  }
}
