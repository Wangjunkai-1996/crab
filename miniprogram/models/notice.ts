import type { NoticeStatus } from '../constants/enums';
import type { Paginated } from './api';

export interface DiscoveryFilter {
  keyword?: string;
  cooperationPlatform?: string;
  cooperationCategory?: string;
  city?: string;
}

export interface NoticeCardItem {
  noticeId: string;
  title: string;
  cooperationPlatform: string;
  cooperationCategory: string;
  cooperationType?: string;
  budgetSummary: string;
  city: string;
  deadlineAt: string;
  createdAt?: string;
  publisherSummary: {
    displayName: string;
    profileCompleteness?: number;
  };
  statusTag: NoticeStatus;
  highlightTag?: string;
  applicationCount?: number;
}

export interface NoticeListResponse extends Paginated<NoticeCardItem> {
  filterSummary: string[];
  filterEcho: DiscoveryFilter;
}

export interface NoticeDetail {
  noticeId: string;
  title: string;
  brandName: string | null;
  cooperationPlatform: string;
  cooperationCategory: string;
  cooperationType: string;
  settlementType: string;
  budgetRange: string;
  budgetSummary: string;
  city: string;
  deadlineAt: string;
  creatorRequirements: string;
  cooperationDescription: string;
  attachments: string[];
  status: NoticeStatus;
  statusTag: NoticeStatus;
  recruitCount: number | null;
  applicationCount?: number;
  publishedAt?: string | null;
}

export interface NoticeDetailResponse {
  notice: NoticeDetail;
  publisherSummary: {
    publisherUserId?: string;
    publisherProfileId?: string;
    displayName: string;
    identityType?: string;
    city: string;
    historyLabel?: string;
  };
  permissionState: {
    canApply: boolean;
    canViewPublisherContact: boolean;
    hasApplied: boolean;
    isOwner: boolean;
  };
  ctaState: {
    primaryAction: 'complete_creator_card' | 'apply' | 'view_application' | 'view_applications' | 'disabled' | string;
    primaryText: string;
    disabledReason?: string | null;
  };
  maskedOrFullContact?: string;
}

export interface NoticeDraftInput {
  title?: string;
  brandName?: string | null;
  cooperationPlatform?: string;
  cooperationCategory?: string;
  cooperationType?: string;
  city?: string;
  settlementType?: string;
  budgetRange?: string;
  recruitCount?: number | null;
  deadlineAt?: string;
  creatorRequirements?: string;
  cooperationDescription?: string;
  attachments?: string[];
}

export interface NoticeDraftMutationResponse {
  noticeId: string;
  status: NoticeStatus;
}

export interface NoticeDraftUpdateResponse extends NoticeDraftMutationResponse {
  updatedAt: string;
}

export interface NoticeSubmitReviewResponse extends NoticeDraftMutationResponse {
  reviewRoundCount: number;
  currentReviewTaskId: string;
}

export interface NoticeCloseResponse {
  noticeId: string;
  status: NoticeStatus;
  closedAt: string | null;
}

export interface NoticeRepublishResponse {
  noticeId: string;
  status: NoticeStatus;
  reviewRoundCount: number;
  currentReviewTaskId: string;
}
