import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useDictionaryStore } from '@/stores/dictionary.store'
import { useAuthStore } from '@/stores/auth.store'
import '@/styles/tokens.scss'
import '@/styles/element-overrides.scss'
import '@/styles/helpers.scss'

const buildMeta = {
  buildId: __ADMIN_WEB_BUILD_ID__,
  builtAt: __ADMIN_WEB_BUILD_CREATED_AT__,
}

const bootstrap = async () => {
  if (typeof window !== 'undefined') {
    window.__DM_ADMIN_WEB_BUILD__ = buildMeta
    console.info('[admin-web build]', buildMeta)
  }

  const app = createApp(App)
  const pinia = createPinia()

  const dictionaryStore = useDictionaryStore(pinia)
  const authStore = useAuthStore(pinia)

  dictionaryStore.initialize()
  await authStore.restoreSession()

  const router = createAppRouter(pinia)

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)

  await router.isReady()
  app.mount('#app')
}

void bootstrap()
