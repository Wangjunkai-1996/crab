import { createActionRouter } from '../../shared/src/router/create-action-router'
import { accountActionList } from './actions/accountActionList'
import { claimReport } from './actions/claimReport'
import { createAccountAction } from './actions/createAccountAction'
import { dashboard } from './actions/dashboard'
import { forceRemoveNotice } from './actions/forceRemoveNotice'
import { operationLogList } from './actions/operationLogList'
import { releaseAccountAction } from './actions/releaseAccountAction'
import { reportDetail } from './actions/reportDetail'
import { reportList } from './actions/reportList'
import { resolveReport } from './actions/resolveReport'

const functionName = 'governance-admin'

export const main = createActionRouter({
  functionName,
  actions: {
    dashboard,
    reportList,
    reportDetail,
    claimReport,
    resolveReport,
    accountActionList,
    createAccountAction,
    releaseAccountAction,
    forceRemoveNotice,
    operationLogList,
  },
})
