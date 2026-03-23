import { createActionRouter } from '../../shared/src/router/create-action-router'
import { getCard } from './actions/getCard'
import { upsertCard } from './actions/upsertCard'

const functionName = 'creator-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    getCard,
    upsertCard,
  },
})
