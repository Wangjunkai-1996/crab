import { COLLECTIONS } from '../constants/collections'
import { DEFAULTS } from '../constants/runtime'
import { ERROR_CODES } from '../constants/error-codes'
import { addDocument, findOneByField, updateDocumentById } from '../db/repository'
import { ADMIN_USER_STATUSES } from '../enums/admin'
import { AppError } from '../errors/app-error'
import { createValidationError } from '../validators/common'
import { createResourceId } from '../utils/id'
import { addMinutes, isFutureDate, now } from '../utils/time'

export async function findAdminUserByUsername(username: string) {
  return findOneByField(COLLECTIONS.ADMIN_USERS, 'username', username)
}

export async function findAdminUserByAdminUserId(adminUserId: string) {
  return findOneByField(COLLECTIONS.ADMIN_USERS, 'adminUserId', adminUserId)
}

export async function normalizeAdminUserState(adminUser: Record<string, any>) {
  if (
    adminUser.status === ADMIN_USER_STATUSES.LOCKED &&
    adminUser.lockedUntil &&
    !isFutureDate(adminUser.lockedUntil)
  ) {
    const patch = {
      status: ADMIN_USER_STATUSES.ACTIVE,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: now(),
    }

    await updateDocumentById(COLLECTIONS.ADMIN_USERS, adminUser._id, patch)

    return {
      ...adminUser,
      ...patch,
    }
  }

  return adminUser
}

export async function recordLoginFailure(adminUser: Record<string, any>) {
  const currentTime = now()
  const failedLoginCount = Number(adminUser.failedLoginCount || 0) + 1
  const shouldLock = failedLoginCount >= DEFAULTS.ADMIN_LOGIN_FAILURE_LIMIT
  const patch = {
    failedLoginCount,
    lockedUntil: shouldLock ? addMinutes(currentTime, DEFAULTS.ADMIN_LOGIN_LOCK_MINUTES) : adminUser.lockedUntil ?? null,
    status: shouldLock ? ADMIN_USER_STATUSES.LOCKED : adminUser.status,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.ADMIN_USERS, adminUser._id, patch)

  return {
    ...adminUser,
    ...patch,
  }
}

export async function resetLoginFailure(adminUser: Record<string, any>, meta: Record<string, unknown>) {
  const patch = {
    status: ADMIN_USER_STATUSES.ACTIVE,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now(),
    lastLoginIp: typeof meta.ip === 'string' ? meta.ip : '',
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.ADMIN_USERS, adminUser._id, patch)

  return {
    ...adminUser,
    ...patch,
  }
}

export function assertAdminPasswordPolicy(username: string, newPassword: string) {
  const fieldErrors: Record<string, string> = {}

  if (newPassword.length < 12) {
    fieldErrors.newPassword = '新密码长度至少 12 位'
  }

  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    fieldErrors.newPassword = '新密码必须同时包含字母和数字'
  }

  if (newPassword === username) {
    fieldErrors.newPassword = '新密码不能与用户名相同'
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw createValidationError(fieldErrors)
  }
}

export async function updateAdminPassword(adminUser: Record<string, any>, passwordHash: string) {
  const patch = {
    passwordHash,
    mustResetPassword: false,
    updatedAt: now(),
  }

  await updateDocumentById(COLLECTIONS.ADMIN_USERS, adminUser._id, patch)

  return {
    ...adminUser,
    ...patch,
  }
}

export async function createAdminSeedDocument(input: {
  username: string
  displayName: string
  roleCodes: string[]
  passwordHash: string
  notes?: string
}) {
  const currentTime = now()

  const adminUser = {
    adminUserId: createResourceId('admin'),
    username: input.username,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    roleCodes: input.roleCodes,
    status: ADMIN_USER_STATUSES.ACTIVE,
    failedLoginCount: 0,
    lockedUntil: null,
    mustResetPassword: true,
    lastLoginAt: null,
    lastLoginIp: '',
    notes: input.notes ?? '',
    createdAt: currentTime,
    updatedAt: currentTime,
  }

  await addDocument(COLLECTIONS.ADMIN_USERS, adminUser)
  return adminUser
}

export function assertAdminAvailable(adminUser: Record<string, any>) {
  if (adminUser.status === ADMIN_USER_STATUSES.DISABLED) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_ACCOUNT_DISABLED,
      message: '管理员账号已禁用',
    })
  }

  if (adminUser.status === ADMIN_USER_STATUSES.LOCKED && isFutureDate(adminUser.lockedUntil)) {
    throw new AppError({
      code: ERROR_CODES.ADMIN_ACCOUNT_LOCKED,
      message: '管理员账号已锁定',
    })
  }
}

