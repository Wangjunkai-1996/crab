import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markApplicationContactPending } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationMutationPayload } from '../../../shared/src/validators/application-bff'

export async function markContactPending(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationMutationPayload(request.payload)
  const userContext = await getUserContext()
  return markApplicationContactPending(payload.applicationId, userContext, request.requestId)
}
