import { COLLECTIONS } from '../constants/collections'
import { DEFAULTS } from '../constants/runtime'
import { ERROR_CODES } from '../constants/error-codes'
import { addDocument, findOneByField, updateDocumentById } from '../db/repository'
import { ACCOUNT_STATUSES } from '../enums/account-status'
import { AppError } from '../errors/app-error'
import { RoleFlags } from '../types'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'

const DEFAULT_ROLE_FLAGS: RoleFlags = {
  publisherEnabled: false,
  creatorEnabled: false,
}

export async function findUserByOpenId(openId: string) {
  return findOneByField(COLLECTIONS.USERS, 'wxOpenId', openId)
}

export async function findUserByUserId(userId: string) {
  return findOneByField(COLLECTIONS.USERS, 'userId', userId)
}

export async function ensurePlatformUser(wxContext: { OPENID?: string; UNIONID?: string }) {
  if (!wxContext.OPENID) {
    throw new AppError({
      code: ERROR_CODES.USER_CONTEXT_MISSING,
      message: '用户上下文获取失败',
    })
  }

  const currentTime = now()
  const existingUser = await findUserByOpenId(wxContext.OPENID)

  if (existingUser) {
    const patch: Record<string, unknown> = {
      lastActiveAt: currentTime,
      updatedAt: currentTime,
    }

    if (!existingUser.wxUnionId && wxContext.UNIONID) {
      patch.wxUnionId = wxContext.UNIONID
    }

    await updateDocumentById(COLLECTIONS.USERS, existingUser._id, patch)

    return {
      ...existingUser,
      ...patch,
    }
  }

  const user = {
    userId: createResourceId('user'),
    wxOpenId: wxContext.OPENID,
    wxUnionId: wxContext.UNIONID ?? null,
    roleFlags: DEFAULT_ROLE_FLAGS,
    accountStatus: ACCOUNT_STATUSES.NORMAL,
    preferredView: DEFAULTS.PREFERRED_VIEW,
    publisherProfileId: null,
    creatorCardId: null,
    lastActiveAt: currentTime,
    createdAt: currentTime,
    updatedAt: currentTime,
  }

  await addDocument(COLLECTIONS.USERS, user)
  return user
}

export async function updatePreferredView(userId: string, preferredView: 'publisher' | 'creator') {
  const currentTime = now()
  const user = await findUserByUserId(userId)

  if (!user) {
    throw new AppError({
      code: ERROR_CODES.USER_CONTEXT_MISSING,
      message: '用户上下文获取失败',
    })
  }

  const patch = {
    preferredView,
    updatedAt: currentTime,
  }

  await updateDocumentById(COLLECTIONS.USERS, user._id, patch)

  return {
    ...user,
    ...patch,
  }
}
