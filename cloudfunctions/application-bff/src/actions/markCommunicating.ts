import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markApplicationCommunicating } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationMutationPayload } from '../../../shared/src/validators/application-bff'

export async function markCommunicating(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationMutationPayload(request.payload)
  const userContext = await getUserContext()
  return markApplicationCommunicating(payload.applicationId, userContext, request.requestId)
}
