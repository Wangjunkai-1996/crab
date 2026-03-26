import { getUserContext } from '../../../shared/src/auth/user-auth'
import { submitReport } from '../../../shared/src/services/report-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'
import { validateSubmitReportPayload } from '../../../shared/src/validators/report-bff'

export async function submit(request: any) {
  getMiniprogramSource(request.meta)
  const payload = validateSubmitReportPayload(request.payload)
  const userContext = await getUserContext()
  return submitReport(payload, userContext, request.requestId)
}
