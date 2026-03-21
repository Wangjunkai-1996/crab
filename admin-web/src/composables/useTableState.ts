import { computed, type Ref } from 'vue'
import type { PageStatus } from '@/models/common'

export const useTableState = <T>(loading: Ref<boolean>, error: Ref<string>, list: Ref<T[]>) => {
  return computed<PageStatus>(() => {
    if (loading.value) {
      return 'loading'
    }

    if (error.value) {
      return 'error'
    }

    if (list.value.length === 0) {
      return 'empty'
    }

    return 'ready'
  })
}
