import { createActionRouter } from '../../shared/src/router/create-action-router'
import { close } from './actions/close'
import { createDraft } from './actions/createDraft'
import { detail } from './actions/detail'
import { list } from './actions/list'
import { myList } from './actions/myList'
import { republish } from './actions/republish'
import { submitReview } from './actions/submitReview'
import { updateDraft } from './actions/updateDraft'

const functionName = 'notice-bff'

export const main = createActionRouter({
  functionName,
  actions: {
    list,
    detail,
    createDraft,
    updateDraft,
    submitReview,
    myList,
    close,
    republish,
  },
})
