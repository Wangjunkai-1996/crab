import { getUserContext } from '../../../shared/src/auth/user-auth'
import { markApplicationViewed } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationMutationPayload } from '../../../shared/src/validators/application-bff'

export async function markViewed(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationMutationPayload(request.payload)
  const userContext = await getUserContext()
  return markApplicationViewed(payload.applicationId, userContext, request.requestId)
}
