import type { ApplicationStatus } from '../constants/enums';
import type { Paginated } from './api';

export interface ApplicationSubmitPayload {
  noticeId: string;
  selfIntroduction: string;
  deliverablePlan: string;
  expectedTerms?: string;
  portfolioImages?: string[];
  contactType?: string;
  contactValue?: string;
}

export interface ApplicationSubmitResponse {
  applicationId: string;
  status: ApplicationStatus;
  noticeId: string;
}

export interface ApplicationWithdrawResponse {
  applicationId: string;
  status: 'withdrawn';
  withdrawnAt: string;
}

export interface ApplicationListPayload {
  status?: ApplicationStatus | 'all';
  pageSize?: number;
  cursor?: string;
}

export interface ApplicationListItem {
  applicationId: string;
  noticeId: string;
  noticeTitle: string;
  budgetSummary: string;
  city: string;
  status: ApplicationStatus;
  publisherSummary: {
    publisherUserId?: string;
    displayName: string;
  };
  canViewPublisherContact: boolean;
  updatedAt?: string;
  stageHint?: string;
}

export interface ApplicationDetailResponse {
  application: {
    applicationId: string;
    noticeId?: string;
    status: ApplicationStatus;
    selfIntroduction: string;
    deliverablePlan: string;
    expectedTerms?: string | null;
    portfolioImages?: string[];
    createdAt?: string;
  };
  noticeSummary: {
    noticeId: string;
    title: string;
    city?: string;
    budgetSummary: string;
    status?: string;
  };
  publisherSummary: {
    publisherUserId?: string;
    publisherProfileId?: string;
    displayName: string;
    city?: string;
  };
  permissionState: {
    canViewPublisherContact: boolean;
  };
  timeline: Array<{
    key?: string;
    label: string;
    time: string;
    description?: string;
  }>;
  publisherContactRevealState: string;
  maskedOrFullPublisherContact?: string;
}

export interface ApplicationListResponse extends Paginated<ApplicationListItem> {}

export type ContactRevealState = 'hidden' | 'masked' | 'revealed';
export type PublisherApplicationAction =
  | 'markViewed'
  | 'markContactPending'
  | 'markCommunicating'
  | 'markRejected'
  | 'markCompleted'
  | 'revealCreatorContact';

export interface PublisherApplicationListPayload {
  noticeId: string;
  status?: ApplicationStatus;
  pageSize?: number;
  cursor?: string;
}

export interface PublisherApplicationListItem {
  applicationId: string;
  creatorCardSnapshot: {
    nickname: string;
    city: string;
    primaryPlatform: string;
    primaryCategory: string;
    followerBand: string;
    caseDescription?: string;
  };
  status: ApplicationStatus;
  publisherViewedAt?: string;
  contactRevealState: ContactRevealState;
}

export interface PublisherApplicationListResponse extends Paginated<PublisherApplicationListItem> {}

export interface PublisherApplicationDetailResponse {
  application: {
    applicationId: string;
    status: ApplicationStatus;
    selfIntroduction: string;
    deliverablePlan: string;
    expectedTerms?: string;
  };
  creatorSummary: {
    displayName: string;
    city: string;
    primaryPlatform: string;
    primaryCategory: string;
    followerBand: string;
    caseDescription?: string;
  };
  maskedOrFullCreatorContact?: string;
  creatorContactRevealState: ContactRevealState;
  availableActions: PublisherApplicationAction[];
}

export interface ApplicationStatusMutationResponse {
  applicationId: string;
  status: ApplicationStatus;
  publisherViewedAt?: string;
  publisherContactRevealedAt?: string;
  completedAt?: string;
  creatorContact?: string;
  creatorContactRevealedAt?: string;
  withdrawnAt?: string;
}
