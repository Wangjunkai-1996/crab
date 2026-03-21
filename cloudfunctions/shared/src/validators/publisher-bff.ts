import { PublisherUpsertProfilePayload } from '../contracts/miniprogram/publisher-bff'
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

export function validateUpsertPublisherProfilePayload(payload: Record<string, unknown> = {}): PublisherUpsertProfilePayload {
  return {
    identityType: requireString(payload.identityType, {
      fieldName: 'identityType',
    }),
    displayName: requireString(payload.displayName, {
      fieldName: 'displayName',
      minLength: 2,
      maxLength: 40,
    }),
    city: requireString(payload.city, {
      fieldName: 'city',
      minLength: 1,
      maxLength: 30,
    }),
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
    intro: optionalNullableString(payload.intro, 'intro'),
  }
}
