import { createActionRouter } from '../../shared/src/router/create-action-router'
import { changePassword } from './actions/changePassword'
import { login } from './actions/login'
import { logout } from './actions/logout'
import { me } from './actions/me'

export const main = createActionRouter({
  functionName: 'admin-auth',
  actions: {
    login,
    me,
    logout,
    changePassword,
  },
})
