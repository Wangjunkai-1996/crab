import { createActionRouter } from '../../shared/src/router/create-action-router'
import { list } from './actions/list'
import { markAllRead } from './actions/markAllRead'
import { markRead } from './actions/markRead'

const functionName = 'message-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    list,
    markRead,
    markAllRead,
  },
})
