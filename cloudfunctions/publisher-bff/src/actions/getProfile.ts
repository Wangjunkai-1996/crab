import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getPublisherProfile } from '../../../shared/src/services/publisher-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function getProfile(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return getPublisherProfile(userContext)
}
