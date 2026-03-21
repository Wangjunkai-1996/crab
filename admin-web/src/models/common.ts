export type PageStatus = 'loading' | 'ready' | 'empty' | 'error' | 'submitting' | 'readonly'

export type QueryPrimitive = string | number | boolean | null | undefined

export type QueryRecord = Record<string, QueryPrimitive>

export type ServiceModuleName = 'admin-auth' | 'review-admin' | 'governance-admin'
export type ActionVariant = 'default' | 'primary' | 'danger'

export interface ServiceRequestMeta {
  source: 'admin-web'
  clientVersion: string
  adminSessionToken?: string
}

export interface ServiceRequest<TPayload = Record<string, unknown>> {
  action: string
  payload: TPayload
  meta: ServiceRequestMeta
}

export interface ServiceResponse<TData> {
  code: number
  message: string
  data: TData
  requestId: string
}

export interface CursorListResult<TItem> {
  list: TItem[]
  nextCursor: string
  hasMore: boolean
  summary?: Record<string, unknown>
}

export interface SelectOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

export interface ActionOption {
  key: string
  label: string
  variant: ActionVariant
  disabled: boolean
  disabledReason: string | null
  danger?: boolean
}

export interface DialogFieldSchema {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'switch' | 'datetime'
  placeholder?: string
  required?: boolean
  options?: SelectOption[]
}

export interface ActionDialogSchema {
  title: string
  description: string
  confirmText: string
  danger?: boolean
  fields?: DialogFieldSchema[]
  initialValues?: Record<string, unknown>
}
