import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markAllUserMessagesRead } from '../../../shared/src/services/message-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function markAllRead(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return markAllUserMessagesRead(userContext.userId)
}
