import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getCreatorCard } from '../../../shared/src/services/creator-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function getCard(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return getCreatorCard(userContext)
}
