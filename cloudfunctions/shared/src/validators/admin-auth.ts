import { requireString } from './common'

export function validateLoginPayload(payload: Record<string, unknown>) {
  return {
    username: requireString(payload.username, {
      fieldName: 'username',
      minLength: 3,
      maxLength: 64,
    }),
    password: requireString(payload.password, {
      fieldName: 'password',
      minLength: 1,
      maxLength: 128,
      trim: false,
    }),
  }
}

export function validateChangePasswordPayload(payload: Record<string, unknown>) {
  return {
    oldPassword: requireString(payload.oldPassword, {
      fieldName: 'oldPassword',
      minLength: 1,
      maxLength: 128,
      trim: false,
    }),
    newPassword: requireString(payload.newPassword, {
      fieldName: 'newPassword',
      minLength: 12,
      maxLength: 128,
      trim: false,
    }),
  }
}

