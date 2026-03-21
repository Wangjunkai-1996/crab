import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getPublisherApplicationDetail } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationDetailPayload } from '../../../shared/src/validators/application-bff'

export async function publisherDetail(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationDetailPayload(request.payload)
  const userContext = await getUserContext()
  return getPublisherApplicationDetail(payload.applicationId, userContext)
}
