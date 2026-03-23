/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_USE_MOCK_SERVICE: string
  readonly VITE_MOCK_NETWORK_DELAY: string
  readonly VITE_CLOUDBASE_ENV_ID: string
  readonly VITE_CLOUDBASE_REGION: string
  readonly VITE_CLOUDBASE_TIMEOUT_MS: string
  readonly VITE_ADMIN_AUTH_FUNCTION_NAME: string
  readonly VITE_REVIEW_ADMIN_FUNCTION_NAME: string
  readonly VITE_GOVERNANCE_ADMIN_FUNCTION_NAME: string
  readonly VITE_ENABLE_REAL_ADMIN_READS: string
  readonly VITE_ENABLE_REAL_ADMIN_WRITES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __ADMIN_WEB_BUILD_ID__: string
declare const __ADMIN_WEB_BUILD_CREATED_AT__: string

interface Window {
  __DM_ADMIN_WEB_BUILD__?: {
    buildId: string
    builtAt: string
  }
}
