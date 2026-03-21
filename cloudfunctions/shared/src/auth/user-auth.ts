import { ERROR_CODES } from '../constants/error-codes'
import { ACCOUNT_STATUSES } from '../enums/account-status'
import { AppError } from '../errors/app-error'
import { UserContext } from '../types'
import { getWXContext } from '../db/cloudbase'
import { ensurePlatformUser } from '../services/user-service'

export async function getUserContext(): Promise<UserContext> {
  const wxContext = getWXContext()

  if (!wxContext.OPENID) {
    throw new AppError({
      code: ERROR_CODES.USER_CONTEXT_MISSING,
      message: '用户上下文获取失败',
    })
  }

  const user = await ensurePlatformUser(wxContext)

  return {
    userId: user.userId,
    roleFlags: user.roleFlags,
    accountStatus: user.accountStatus,
    preferredView: user.preferredView,
    rawUser: user,
    wxContext,
  }
}

export function assertAccountAvailable(userContext: UserContext) {
  if (userContext.accountStatus === ACCOUNT_STATUSES.BANNED) {
    throw new AppError({
      code: ERROR_CODES.ACCOUNT_PUBLISH_RESTRICTED,
      message: '当前账号已被限制使用',
    })
  }
}

export function assertCanPublish(userContext: UserContext) {
  if (userContext.accountStatus === ACCOUNT_STATUSES.RESTRICTED_PUBLISH || userContext.accountStatus === ACCOUNT_STATUSES.BANNED) {
    throw new AppError({
      code: ERROR_CODES.ACCOUNT_PUBLISH_RESTRICTED,
      message: '当前账号已被限制发布',
    })
  }
}

export function assertCanApply(userContext: UserContext) {
  if (userContext.accountStatus === ACCOUNT_STATUSES.RESTRICTED_APPLY || userContext.accountStatus === ACCOUNT_STATUSES.BANNED) {
    throw new AppError({
      code: ERROR_CODES.ACCOUNT_APPLY_RESTRICTED,
      message: '当前账号已被限制报名',
    })
  }
}

