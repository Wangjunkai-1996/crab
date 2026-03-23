export interface ApplicationSubmitPayload {
  noticeId: string
  selfIntroduction: string
  deliverablePlan: string
  expectedTerms?: string
  portfolioImages?: string[]
  contactType?: string
  contactValue?: string
}

export interface ApplicationSubmitResponseData {
  applicationId: string
  status: string
  noticeId: string
}

export interface ApplicationWithdrawResponseData {
  applicationId: string
  status: string
  withdrawnAt: string
}

export interface ApplicationMyListItemDto {
  applicationId: string
  noticeId: string
  noticeTitle: string
  budgetSummary: string
  city: string
  status: string
  publisherSummary: {
    publisherUserId: string
    displayName: string
  }
  canViewPublisherContact: boolean
  updatedAt?: string
  stageHint?: string
}

export interface ApplicationMyListResponseData {
  list: ApplicationMyListItemDto[]
  nextCursor: string
  hasMore: boolean
}

export interface ApplicationDetailResponseData {
  application: {
    applicationId: string
    noticeId: string
    status: string
    selfIntroduction: string
    deliverablePlan: string
    expectedTerms: string | null
    portfolioImages: string[]
    createdAt: string
  }
  noticeSummary: {
    noticeId: string
    title: string
    city: string
    budgetSummary: string
    status: string
  }
  publisherSummary: {
    publisherUserId: string
    publisherProfileId: string
    displayName: string
    city: string
  }
  permissionState: {
    canViewPublisherContact: boolean
  }
  timeline: Array<{
    key: string
    label: string
    at: string | null
    description?: string
  }>
  publisherContactRevealState: {
    stage: 'hidden' | 'masked' | 'revealed'
    revealedAt: string | null
  }
  maskedOrFullPublisherContact: {
    contactType: string | null
    contactValue: string | null
    isMasked: boolean
  } | null
}

export interface PublisherApplicationListItemDto {
  applicationId: string
  creatorCardSnapshot: {
    nickname: string
    city: string
    primaryPlatform: string
    primaryCategory: string
    followerBand: string
    caseDescription?: string
  }
  status: string
  publisherViewedAt: string | null
  contactRevealState: 'hidden' | 'masked' | 'revealed'
}

export interface PublisherApplicationListResponseData {
  list: PublisherApplicationListItemDto[]
  nextCursor: string
  hasMore: boolean
}

export type PublisherApplicationAction =
  | 'markViewed'
  | 'markContactPending'
  | 'markCommunicating'
  | 'markRejected'
  | 'markCompleted'
  | 'revealCreatorContact'

export interface PublisherApplicationDetailResponseData {
  application: {
    applicationId: string
    status: string
    selfIntroduction: string
    deliverablePlan: string
    expectedTerms: string | null
  }
  creatorSummary: {
    displayName: string
    city: string
    primaryPlatform: string
    primaryCategory: string
    followerBand: string
    caseDescription?: string
  }
  maskedOrFullCreatorContact?: string
  creatorContactRevealState: 'hidden' | 'masked' | 'revealed'
  availableActions: PublisherApplicationAction[]
}

export interface ApplicationStatusMutationResponseData {
  applicationId: string
  status: string
  publisherViewedAt?: string
  publisherContactRevealedAt?: string
  completedAt?: string
  creatorContact?: string
  creatorContactRevealedAt?: string
  withdrawnAt?: string
}
