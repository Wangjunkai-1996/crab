import { assertCanPublish, getUserContext } from '../../../shared/src/auth/user-auth'
import { submitNoticeReview } from '../../../shared/src/services/notice-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateSubmitReviewPayload } from '../../../shared/src/validators/notice-bff'

export async function submitReview(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateSubmitReviewPayload(request.payload)
  const userContext = await getUserContext()
  assertCanPublish(userContext)
  return submitNoticeReview(payload.noticeId, userContext, request.requestId)
}
