import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getUnreadMessageCount } from '../../../shared/src/services/message-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function bootstrap(request: any) {
  getMiniprogramSource(request.meta)

  const userContext = await getUserContext()
  const unreadCount = await getUnreadMessageCount(userContext.userId)

  return {
    user: {
      userId: userContext.userId,
      roleFlags: userContext.roleFlags,
      accountStatus: userContext.accountStatus,
      preferredView: userContext.preferredView,
    },
    message: {
      unreadCount,
    },
  }
}
