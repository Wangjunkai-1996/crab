import { getUserContext } from '../../../shared/src/auth/user-auth'
import { withdrawApplication } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateWithdrawApplicationPayload } from '../../../shared/src/validators/application-bff'

export async function withdraw(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateWithdrawApplicationPayload(request.payload)
  const userContext = await getUserContext()
  return withdrawApplication(payload.applicationId, userContext, request.requestId)
}
