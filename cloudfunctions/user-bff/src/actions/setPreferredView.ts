import { getUserContext } from '../../../shared/src/auth/user-auth'
import { updatePreferredView } from '../../../shared/src/services/user-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateSetPreferredViewPayload } from '../../../shared/src/validators/user-bff'

export async function setPreferredView(request: any) {
  getMiniprogramSource(request.meta)

  const payload = validateSetPreferredViewPayload(request.payload)
  const userContext = await getUserContext()
  const user = await updatePreferredView(userContext.userId, payload.preferredView)

  return {
    preferredView: user.preferredView,
  }
}
