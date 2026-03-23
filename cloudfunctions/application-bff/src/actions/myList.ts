import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listCreatorApplications } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateApplicationMyListPayload } from '../../../shared/src/validators/application-bff'

export async function myList(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateApplicationMyListPayload(request.payload)
  const userContext = await getUserContext()
  return listCreatorApplications(userContext.userId, payload)
}
