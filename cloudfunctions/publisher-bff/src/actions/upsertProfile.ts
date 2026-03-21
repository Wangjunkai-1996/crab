import { getUserContext } from '../../../shared/src/auth/user-auth'
import { upsertPublisherProfile } from '../../../shared/src/services/publisher-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateUpsertPublisherProfilePayload } from '../../../shared/src/validators/publisher-bff'

export async function upsertProfile(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateUpsertPublisherProfilePayload(request.payload)
  const userContext = await getUserContext()
  return upsertPublisherProfile(payload, userContext, request.requestId)
}
