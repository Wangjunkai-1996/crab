import { getUserContext } from '../../../shared/src/auth/user-auth'
import { upsertCreatorCard } from '../../../shared/src/services/creator-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateUpsertCreatorCardPayload } from '../../../shared/src/validators/creator-bff'

export async function upsertCard(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateUpsertCreatorCardPayload(request.payload)
  const userContext = await getUserContext()
  return upsertCreatorCard(payload, userContext, request.requestId)
}
