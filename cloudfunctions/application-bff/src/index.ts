import { createActionRouter } from '../../shared/src/router/create-action-router'
import { detail } from './actions/detail'
import { markCommunicating } from './actions/markCommunicating'
import { markCompleted } from './actions/markCompleted'
import { markContactPending } from './actions/markContactPending'
import { markRejected } from './actions/markRejected'
import { markViewed } from './actions/markViewed'
import { myList } from './actions/myList'
import { publisherDetail } from './actions/publisherDetail'
import { publisherList } from './actions/publisherList'
import { revealCreatorContact } from './actions/revealCreatorContact'
import { submit } from './actions/submit'
import { withdraw } from './actions/withdraw'

const functionName = 'application-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    submit,
    withdraw,
    myList,
    detail,
    publisherList,
    publisherDetail,
    markViewed,
    markContactPending,
    markCommunicating,
    markRejected,
    markCompleted,
    revealCreatorContact,
  },
})
