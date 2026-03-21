import { assertCanApply, getUserContext } from '../../../shared/src/auth/user-auth'
import { submitApplication } from '../../../shared/src/services/application-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateSubmitApplicationPayload } from '../../../shared/src/validators/application-bff'

export async function submit(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateSubmitApplicationPayload(request.payload)
  const userContext = await getUserContext()
  assertCanApply(userContext)
  return submitApplication(payload, userContext, request.requestId)
}
