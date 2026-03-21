import { computed, type Ref } from 'vue'
import type { ActionOption } from '@/models/common'

interface ResolvedActionState {
  disabled: boolean
  disabledReason?: string | null
}

interface UseDetailActionPanelOptions<TDetail> {
  detail: Ref<TDetail | null>
  getAvailableActions: (detail: TDetail) => ActionOption[]
  resolveActionState: (action: ActionOption) => ResolvedActionState
  resolveReadonlyReason: (detail: TDetail, panelActions: ActionOption[]) => string
}

export const useDetailActionPanel = <TDetail>(options: UseDetailActionPanelOptions<TDetail>) => {
  const panelActions = computed<ActionOption[]>(() => {
    const currentDetail = options.detail.value
    if (!currentDetail) {
      return []
    }

    return options.getAvailableActions(currentDetail).map((action) => {
      const actionState = options.resolveActionState(action)
      return {
        ...action,
        disabled: actionState.disabled,
        disabledReason: actionState.disabledReason ?? null,
      }
    })
  })

  const isReadonly = computed(() => panelActions.value.length === 0 || panelActions.value.every((action) => action.disabled))

  const readonlyReason = computed(() => {
    const currentDetail = options.detail.value
    if (!currentDetail) {
      return ''
    }

    return options.resolveReadonlyReason(currentDetail, panelActions.value)
  })

  return {
    panelActions,
    isReadonly,
    readonlyReason,
  }
}
