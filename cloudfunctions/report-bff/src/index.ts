import { createActionRouter } from '../../shared/src/router/create-action-router'
import { myList } from './actions/myList'
import { submit } from './actions/submit'

export const main = createActionRouter({
  functionName: 'report-bff',
  actions: {
    submit,
    myList,
  },
})
