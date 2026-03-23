export interface NoticeCardDto {
  noticeId: string
  title: string
  cooperationPlatform: string
  cooperationCategory: string
  cooperationType?: string
  budgetSummary: string
  city: string
  deadlineAt: string
  createdAt?: string
  publisherSummary: {
    displayName: string
    profileCompleteness?: number
  }
  statusTag: {
    code: string
    label: string
  }
  highlightTag?: string
  applicationCount?: number
}

export interface NoticeListResponseData {
  list: NoticeCardDto[]
  nextCursor: string
  hasMore: boolean
  filterSummary: {
    total: number
    activeCity: string | null
    activePlatform: string | null
    activeCategory: string | null
  }
  filterEcho: {
    keyword: string
    cooperationPlatform: string | null
    cooperationCategory: string | null
    city: string | null
  }
}

export interface NoticeMyListResponseData {
  list: NoticeCardDto[]
  nextCursor: string
  hasMore: boolean
}

export interface NoticeDetailResponseData {
  notice: {
    noticeId: string
    title: string
    brandName: string | null
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
    applicationCount: number
    publishedAt: string | null
  }
  publisherSummary: {
    publisherUserId: string
    publisherProfileId: string
    displayName: string
    identityType: string
    city: string
    historyLabel?: string
  }
  permissionState: {
    canApply: boolean
    canViewPublisherContact: boolean
    hasApplied: boolean
    isOwner: boolean
  }
  ctaState: {
    primaryAction: string
    primaryText: string
    disabledReason: string | null
  }
  maskedOrFullContact: {
    contactType: string | null
    contactValue: string | null
    isMasked: boolean
  } | null
}

export interface NoticeDraftInput {
  title?: string
  brandName?: string | null
  cooperationPlatform?: string
  cooperationCategory?: string
  cooperationType?: string
  city?: string
  settlementType?: string
  budgetRange?: string
  recruitCount?: number | null
  deadlineAt?: string
  creatorRequirements?: string
  cooperationDescription?: string
  attachments?: string[]
}

export interface NoticeDraftMutationResponseData {
  noticeId: string
  status: string
}

export interface NoticeDraftUpdateResponseData {
  noticeId: string
  status: string
  updatedAt: string
}

export interface NoticeSubmitReviewResponseData {
  noticeId: string
  status: string
  reviewRoundCount: number
  currentReviewTaskId: string
}

export interface NoticeCloseResponseData {
  noticeId: string
  status: string
  closedAt: string | null
}

export interface NoticeRepublishResponseData {
  noticeId: string
  status: string
  reviewRoundCount: number
  currentReviewTaskId: string
}
