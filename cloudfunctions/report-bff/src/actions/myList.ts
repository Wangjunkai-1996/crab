import { getUserContext } from '../../../shared/src/auth/user-auth'
import { listMyReports } from '../../../shared/src/services/report-bff-service'
import { getMiniprogramSource } from '../../../shared/src/validators/common'

export async function myList(request: any) {
  getMiniprogramSource(request.meta)
  const userContext = await getUserContext()
  return listMyReports(userContext, request.payload || {})
}
