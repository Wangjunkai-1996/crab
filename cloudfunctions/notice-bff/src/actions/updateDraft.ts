import { assertCanPublish, getUserContext } from '../../../shared/src/auth/user-auth'
import { updateNoticeDraft } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateUpdateDraftPayload } from '../../../shared/src/validators/notice-bff'

export async function updateDraft(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateUpdateDraftPayload(request.payload)
  const userContext = await getUserContext()
  assertCanPublish(userContext)
  return updateNoticeDraft(payload.noticeId, payload.notice, userContext, request.requestId)
}
