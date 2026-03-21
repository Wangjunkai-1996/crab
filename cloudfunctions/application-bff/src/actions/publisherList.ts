import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listPublisherApplications } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationListPayload } from '../../../shared/src/validators/application-bff'

export async function publisherList(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationListPayload(request.payload)
  const userContext = await getUserContext()
  return listPublisherApplications(payload.noticeId, userContext, payload)
}
