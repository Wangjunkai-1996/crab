import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getMineSummary } from '../../../shared/src/services/user-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function mine(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return getMineSummary(userContext)
}
