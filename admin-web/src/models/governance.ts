import type { TempAccountActionRestrictionType } from '@/constants/admin-action-payloads'
import type { CursorListResult } from '@/models/common'

export interface DashboardPriorityItem {
  itemType: 'review_task' | 'report' | 'account_action'
  itemId: string
  title: string
  summary: string
  status: string
  riskLevel: string | null
  createdAt: string
  routeKey: string
  routeParams: Record<string, string>
}

export interface DashboardResult {
  reviewPendingCount: number
  reportPendingCount: number
  todayNoticeCount: number
  todayApprovedCount: number
  todayRejectedCount: number
  todayNewBlacklistCount: number
  priorityItems: DashboardPriorityItem[]
}

export interface AccountActionListQuery {
  userId: string
  restrictionType: string
  status: string
  pageSize: number
  cursor?: string
}

export interface AccountActionListItem {
  restrictionId: string
  user: {
    userId: string
    displayName: string
    avatarUrl: string | null
    accountStatus: string
  }
  restrictionType: string
  reasonCategory: string
  reasonText: string | null
  startAt: string
  endAt: string | null
  operator: {
    operatorId: string
    displayName: string
  }
  status: string
  createdAt: string
}

export interface CreateAccountActionPayload {
  userId: string
  restrictionType: TempAccountActionRestrictionType
  reasonCategory: string
  reasonText?: string
  startAt?: string
  endAt?: string
  forceRemoveActiveNotices?: boolean
}

export interface ReleaseAccountActionPayload {
  restrictionId: string
  reasonText?: string
}

export interface OperationLogListQuery {
  targetType: string
  targetId: string
  operatorType: string
  pageSize: number
  cursor?: string
}

export interface OperationLogItem {
  logId: string
  targetType: string
  targetId: string
  action: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  requestId: string
  remark: string
  createdAt: string
  beforeSnapshot: Record<string, unknown> | null
  afterSnapshot: Record<string, unknown> | null
}

export interface AccountActionListResult extends CursorListResult<AccountActionListItem> {}
export interface OperationLogListResult extends CursorListResult<OperationLogItem> {}
