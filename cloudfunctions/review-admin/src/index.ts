import { createActionRouter } from '../../shared/src/router/create-action-router'
import { claimTask } from './actions/claimTask'
import { releaseTask } from './actions/releaseTask'
import { resolveTask } from './actions/resolveTask'
import { taskDetail } from './actions/taskDetail'
import { taskList } from './actions/taskList'

const functionName = 'review-admin'

export const main = createActionRouter({
  functionName,
  actions: {
    taskList,
    taskDetail,
    claimTask,
    releaseTask,
    resolveTask,
  },
})
