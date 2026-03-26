export interface ReportSubmitPayload {
  targetType: string
  targetId?: string
  targetSummary: string
  reasonCode: string
  description?: string
  evidenceImages?: string[]
}

export interface ReportSubmitResponseData {
  reportId: string
  status: string
}

export interface ReportListItemDto {
  reportId: string
  targetType: string
  targetId?: string
  reasonCode: string
  status: string
  resultAction?: string
}

export interface ReportListResponseData {
  list: ReportListItemDto[]
  nextCursor: string
  hasMore: boolean
}
