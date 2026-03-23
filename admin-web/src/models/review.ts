import type { TempReviewTaskNextQueueType } from '@/constants/admin-action-payloads'
import type { ActionOption, CursorListResult } from '@/models/common'

export type ReviewTaskStatus = 'pending' | 'processing' | 'completed' | 'cancelled'
export type ReviewStage = 'initial_review' | 'manual_review' | 'resubmission_review'
export type ReviewResult = 'approved' | 'rejected' | 'supplement_required' | 'transfer_manual_review' | 'removed'

export interface ReviewListQuery {
  taskStatus: string
  reviewStage: string
  city: string
  identityType: string
  riskLevel: string
  pageSize: number
  cursor?: string
}

export interface ReviewTaskListItem {
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

export interface ReviewTaskListResult extends CursorListResult<ReviewTaskListItem> {
  summary: {
    pendingCount: number
  }
}

export interface ReviewTaskDetailTask {
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
  nextQueueType: TempReviewTaskNextQueueType | null
  createdAt: string
}

export interface ReviewTaskDetailNotice {
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

export interface ReviewTaskDetailPublisherProfile {
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

export interface ReviewRiskSummary {
  riskLevel: string | null
  riskFlags: string[]
  suggestedTags: string[]
}

export interface ReviewHistoryLog {
  action: string
  operatorType: string
  operatorId: string
  operatorDisplayName: string
  remark: string
  createdAt: string
}

export interface ReviewDetailResult {
  task: ReviewTaskDetailTask
  notice: ReviewTaskDetailNotice
  publisherProfile: ReviewTaskDetailPublisherProfile
  riskSummary: ReviewRiskSummary
  historyLogs: ReviewHistoryLog[]
  availableActions: ActionOption[]
}

export interface ResolveTaskPayload {
  reviewTaskId: string
  reviewResult: ReviewResult
  reasonCategory?: string
  reasonText?: string
  notifyUser?: boolean
  nextQueueType?: TempReviewTaskNextQueueType
}
