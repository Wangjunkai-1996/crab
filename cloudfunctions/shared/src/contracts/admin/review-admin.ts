import { AdminAvailableAction, CursorListResult, HistoryLogItemDto, RiskSummaryDto } from './common'

export type ReviewTaskStatus = 'pending' | 'processing' | 'completed' | 'cancelled'
export type ReviewStage = 'initial_review' | 'manual_review' | 'resubmission_review'
export type ReviewResult =
  | 'approved'
  | 'rejected'
  | 'supplement_required'
  | 'transfer_manual_review'
  | 'removed'

export interface ReviewTaskListItemDto {
  reviewTaskId: string
  taskStatus: ReviewTaskStatus
  reviewStage: ReviewStage
  queueType: string
  riskLevel: string | null
  riskFlags: string[]
  createdAt: string
  claimedAt: string | null
  notice: {
    noticeId: string
    title: string
    status: string
    city: string
    cooperationPlatform: string
    settlementType: string
    budgetSummary: string
  }
  publisher: {
    publisherUserId: string
    publisherProfileId: string
    displayName: string
    identityType: string
    city: string
  }
  assignedAdmin: {
    adminUserId: string
    displayName: string
  } | null
}

export interface ReviewTaskListResponseData extends CursorListResult<ReviewTaskListItemDto> {
  summary: {
    pendingCount: number
  }
}

export interface ReviewTaskDetailTaskDto {
  reviewTaskId: string
  objectType: 'notice'
  objectId: string
  noticeStatusSnapshot: string
  reviewStage: ReviewStage
  taskStatus: ReviewTaskStatus
  queueType: string
  riskLevel: string | null
  riskFlags: string[]
  assignedTo: string | null
  assignedAdminName: string | null
  claimedAt: string | null
  completedAt: string | null
  reviewResult: ReviewResult | null
  reasonCategory: string | null
  reasonText: string | null
  nextQueueType: string | null
  createdAt: string
}

export interface ReviewTaskDetailNoticeDto {
  noticeId: string
  publisherUserId: string
  publisherProfileId: string
  title: string
  brandName: string | null
  identityTypeSnapshot: string
  cooperationPlatform: string
  cooperationCategory: string
  cooperationType: string
  city: string
  settlementType: string
  budgetRange: string
  budgetSummary: string
  recruitCount: number | null
  deadlineAt: string
  creatorRequirements: string
  cooperationDescription: string
  attachments: string[]
  status: string
  reviewRoundCount: number
  latestReviewReasonCategory: string | null
  latestReviewReasonText: string | null
  riskFlags: string[]
  applicationCount: number
  publishedAt: string | null
  closedAt: string | null
  removedAt: string | null
}

export interface ReviewTaskDetailPublisherProfileDto {
  publisherProfileId: string
  userId: string
  identityType: string
  displayName: string
  city: string
  contactType: string
  contactValue: string
  intro: string | null
  profileCompleteness: number
  publishCount: number
  approvedPublishCount: number
  violationCount: number
  status: string
}

export interface ReviewTaskDetailResponseData {
  task: ReviewTaskDetailTaskDto
  notice: ReviewTaskDetailNoticeDto
  publisherProfile: ReviewTaskDetailPublisherProfileDto
  riskSummary: RiskSummaryDto
  historyLogs: HistoryLogItemDto[]
  availableActions: AdminAvailableAction[]
}
