import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listUserMessages } from '../../../shared/src/services/message-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function list(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return listUserMessages(userContext.userId, request.payload || {})
}
