import { getUserContext } from '../../../shared/src/auth/user-auth'
import { closeNotice } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateCloseNoticePayload } from '../../../shared/src/validators/notice-bff'

export async function close(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateCloseNoticePayload(request.payload)
  const userContext = await getUserContext()
  return closeNotice(payload.noticeId, userContext, request.requestId)
}
