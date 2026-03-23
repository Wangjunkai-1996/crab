import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getNoticeDetail } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateNoticeDetailPayload } from '../../../shared/src/validators/notice-bff'

export async function detail(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateNoticeDetailPayload(request.payload)
  const userContext = await getUserContext()
  return getNoticeDetail(payload.noticeId, userContext)
}
