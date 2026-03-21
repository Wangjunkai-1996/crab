import { createActionRouter, createNotImplementedHandler } from '../../shared/src/router/create-action-router'

const functionName = 'cron-jobs'

export const main = createActionRouter({
  functionName,
  actions: {
    expireNotices: createNotImplementedHandler(functionName, 'expireNotices'),
    releaseExpiredAccountActions: createNotImplementedHandler(functionName, 'releaseExpiredAccountActions'),
    repairCounters: createNotImplementedHandler(functionName, 'repairCounters'),
    slaMonitor: createNotImplementedHandler(functionName, 'slaMonitor'),
    archiveMessages: createNotImplementedHandler(functionName, 'archiveMessages'),
  },
})
