import cloud from 'wx-server-sdk'

let initialized = false

export function ensureCloudbaseInitialized() {
  if (initialized) {
    return
  }

  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
  })

  initialized = true
}

export function getCloud() {
  ensureCloudbaseInitialized()
  return cloud
}

export function getDatabase() {
  return getCloud().database()
}

export function getCollection(collectionName: string) {
  return getDatabase().collection(collectionName)
}

export function getWXContext() {
  return getCloud().getWXContext()
}

