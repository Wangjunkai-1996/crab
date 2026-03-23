import { getUserContext } from '../../../shared/src/auth/user-auth'
import { getCreatorApplicationDetail } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateApplicationDetailPayload } from '../../../shared/src/validators/application-bff'

export async function detail(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateApplicationDetailPayload(request.payload)
  const userContext = await getUserContext()
  return getCreatorApplicationDetail(payload.applicationId, userContext)
}
