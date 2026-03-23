import type {
  TempAccountActionRestrictionType,
  TempResolveReportNoticeAction,
  TempResolveReportResultAction,
} from '@/constants/admin-action-payloads'
import type { ActionOption, CursorListResult } from '@/models/common'

export interface ReportListQuery {
  status: string
  targetType: string
  reasonCode: string
  pageSize: number
  cursor?: string
}

export interface ReportListItem {
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

export interface ReportHistoryRecord {
  reportId: string
  reasonCode: string
  status: string
  reporterUserId: string
  createdAt: string
}

export interface ReportHistoryAction {
  action: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  remark: string
  createdAt: string
  targetType: string
  targetId: string
}

export interface ReportRiskSummary {
  riskLevel: string | null
  riskFlags: string[]
  suggestedTags: string[]
}

export interface ReportDetailResult {
  report: {
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
  targetSnapshot: {
    targetType: string
    targetId: string
    displayName: string
    status: string
    ownerUserId: string
    city: string | null
    summary: string
    riskSummary: ReportRiskSummary
  }
  historyReports: ReportHistoryRecord[]
  historyActions: ReportHistoryAction[]
  availableActions: ActionOption[]
}

export interface ResolveReportPayload {
  reportId: string
  result: 'confirmed' | 'rejected'
  resultAction?: TempResolveReportResultAction
  resultRemark?: string
  noticeAction?: TempResolveReportNoticeAction
  accountAction?: {
    userId: string
    restrictionType: TempAccountActionRestrictionType
    reasonCategory: string
    reasonText?: string
    endAt?: string
    forceRemoveActiveNotices?: boolean
  }
}

export interface ReportListResult extends CursorListResult<ReportListItem> {}
