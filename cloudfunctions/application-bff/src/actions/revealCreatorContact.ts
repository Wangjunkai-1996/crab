import { getUserContext } from '../../../shared/src/auth/user-auth'
import { revealApplicationCreatorContact } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validatePublisherApplicationMutationPayload } from '../../../shared/src/validators/application-bff'

export async function revealCreatorContact(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validatePublisherApplicationMutationPayload(request.payload)
  const userContext = await getUserContext()
  return revealApplicationCreatorContact(payload.applicationId, userContext, request.requestId)
}
