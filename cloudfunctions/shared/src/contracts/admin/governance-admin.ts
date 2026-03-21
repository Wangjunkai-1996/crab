import { AdminAvailableAction, CursorListResult, HistoryLogItemDto, RiskSummaryDto, UserSummaryDto } from './common'

export interface DashboardPriorityItemDto {
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

export interface GovernanceDashboardResponseData {
  reviewPendingCount: number
  reportPendingCount: number
  todayNoticeCount: number
  todayApprovedCount: number
  todayRejectedCount: number
  todayNewBlacklistCount: number
  priorityItems: DashboardPriorityItemDto[]
}

export interface ReportListItemDto {
  reportId: string
  targetType: string
  targetId: string
  targetDisplayName: string
  reasonCode: string
  status: string
  aggregatedReportCount: number
  isHighRisk: boolean
  createdAt: string
  handlerId: string | null
  resultAction: string | null
}

export interface ReportListResponseData extends CursorListResult<ReportListItemDto> {}

export interface ReportDetailReportDto {
  reportId: string
  reporterUserId: string
  targetType: string
  targetId: string
  reasonCode: string
  reasonText: string | null
  evidenceImages: string[]
  status: string
  handlerId: string | null
  resultAction: string | null
  resultRemark: string | null
  createdAt: string
}

export interface ReportTargetSnapshotDto {
  targetType: string
  targetId: string
  displayName: string
  status: string
  ownerUserId: string
  city: string | null
  summary: string
  riskSummary: RiskSummaryDto
}

export interface ReportHistoryItemDto {
  reportId: string
  reasonCode: string
  status: string
  reporterUserId: string
  createdAt: string
}

export interface ReportHistoryActionItemDto extends HistoryLogItemDto {
  targetType: string
  targetId: string
}

export interface ReportDetailResponseData {
  report: ReportDetailReportDto
  targetSnapshot: ReportTargetSnapshotDto
  historyReports: ReportHistoryItemDto[]
  historyActions: ReportHistoryActionItemDto[]
  availableActions: AdminAvailableAction[]
}

export interface AccountActionListItemDto {
  restrictionId: string
  user: UserSummaryDto
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

export interface AccountActionListResponseData extends CursorListResult<AccountActionListItemDto> {}

export interface OperationLogListItemDto {
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

export interface OperationLogListResponseData extends CursorListResult<OperationLogListItemDto> {}
