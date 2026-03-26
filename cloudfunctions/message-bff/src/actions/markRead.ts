import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markUserMessageRead } from '../../../shared/src/services/message-service'
import { getMiniprogramSource, requireString } from '../../../shared/src/validators/common'

export async function markRead(request: any) {
  getMiniprogramSource(request.meta)
  const messageId = requireString(request.payload?.messageId, {
    fieldName: 'messageId',
  })
  const userContext = await getUserContext()
  return markUserMessageRead(userContext.userId, messageId)
}
