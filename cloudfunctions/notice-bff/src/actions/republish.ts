import { assertCanPublish, getUserContext } from '../../../shared/src/auth/user-auth'
import { republishNotice } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateRepublishNoticePayload } from '../../../shared/src/validators/notice-bff'

export async function republish(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateRepublishNoticePayload(request.payload)
  const userContext = await getUserContext()
  assertCanPublish(userContext)
  return republishNotice(payload.noticeId, userContext, request.requestId)
}
