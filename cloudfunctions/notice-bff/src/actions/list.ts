import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listDiscoveryNotices } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateNoticeListPayload } from '../../../shared/src/validators/notice-bff'

export async function list(request: any) {
  getMiniprogramSource(request.meta)
  await getUserContext()
  const payload = validateNoticeListPayload(request.payload)
  return listDiscoveryNotices(payload)
}
