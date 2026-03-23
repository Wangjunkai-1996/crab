import { ref } from 'vue'

export const useAsyncAction = () => {
  const loading = ref(false)

  const run = async <T>(handler: () => Promise<T>) => {
    loading.value = true
    try {
      return await handler()
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    run,
  }
}
