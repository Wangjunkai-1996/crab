import { createActionRouter } from '../../shared/src/router/create-action-router'
import { getProfile } from './actions/getProfile'
import { upsertProfile } from './actions/upsertProfile'

const functionName = 'publisher-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    getProfile,
    upsertProfile,
  },
})
