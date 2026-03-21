import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listPublisherNotices } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateNoticeMyListPayload } from '../../../shared/src/validators/notice-bff'

export async function myList(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateNoticeMyListPayload(request.payload)
  const userContext = await getUserContext()
  return listPublisherNotices(userContext.userId, payload)
}
