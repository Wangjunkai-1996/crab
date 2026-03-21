import { createActionRouter } from '../../shared/src/router/create-action-router'
import { bootstrap } from './actions/bootstrap'
import { mine } from './actions/mine'
import { setPreferredView } from './actions/setPreferredView'

export const main = createActionRouter({
  functionName: 'user-bff',
  actions: {
    bootstrap,
    mine,
    setPreferredView,
  },
})
