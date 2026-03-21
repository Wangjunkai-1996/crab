import { assertCanPublish, getUserContext } from '../../../shared/src/auth/user-auth'
import { createNoticeDraft } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateCreateDraftPayload } from '../../../shared/src/validators/notice-bff'

export async function createDraft(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateCreateDraftPayload(request.payload)
  const userContext = await getUserContext()
  assertCanPublish(userContext)
  return createNoticeDraft(payload.notice, userContext, request.requestId)
}
