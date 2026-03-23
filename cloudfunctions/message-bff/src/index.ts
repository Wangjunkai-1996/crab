import { createActionRouter, createNotImplementedHandler } from '../../shared/src/router/create-action-router'

const functionName = 'message-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    list: createNotImplementedHandler(functionName, 'list'),
    markRead: createNotImplementedHandler(functionName, 'markRead'),
    markAllRead: createNotImplementedHandler(functionName, 'markAllRead'),
  },
})
