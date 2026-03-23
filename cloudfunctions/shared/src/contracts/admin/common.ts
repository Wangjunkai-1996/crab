import { AdminAvailableActionKey } from './action-keys'

export interface CursorListResult<TItem> {
  list: TItem[]
  nextCursor: string
  hasMore: boolean
}

export interface AdminAvailableAction {
  key: AdminAvailableActionKey
  label: string
  variant: 'default' | 'primary' | 'danger'
  disabled: boolean
  disabledReason: string | null
}

export interface AdminOperatorSummary {
  operatorType: string
  operatorId: string
  displayName: string
}

export interface AdminUserSummary {
  adminUserId: string
  displayName: string
}

export interface UserSummaryDto {
  userId: string
  displayName: string
  avatarUrl: string | null
  accountStatus: string
}

export interface RiskSummaryDto {
  riskLevel: string | null
  riskFlags: string[]
  suggestedTags: string[]
}

export interface HistoryLogItemDto {
  action: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  remark: string
  createdAt: string
}
