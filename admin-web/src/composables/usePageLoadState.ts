import { ref } from 'vue'

const toErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '加载失败'
}

export const usePageLoadState = () => {
  const loading = ref(false)
  const error = ref('')

  const runPageLoad = async <T>(handler: () => Promise<T>) => {
    loading.value = true
    error.value = ''

    try {
      return await handler()
    } catch (loadError) {
      error.value = toErrorMessage(loadError)
      throw loadError
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    runPageLoad,
  }
}
