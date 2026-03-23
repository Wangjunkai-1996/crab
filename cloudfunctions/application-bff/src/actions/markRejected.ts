import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markApplicationRejected } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherRejectApplicationPayload } from '../../../shared/src/validators/application-bff'

export async function markRejected(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherRejectApplicationPayload(request.payload)
  const userContext = await getUserContext()
  return markApplicationRejected(payload.applicationId, payload.reasonText, userContext, request.requestId)
}
