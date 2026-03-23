import type { NoticeStatus } from '../constants/enums';
import type { Paginated } from '../models/api';
import type {
  DiscoveryFilter,
  NoticeCardItem,
  NoticeCloseResponse,
  NoticeDetailResponse,
  NoticeDraftInput,
  NoticeDraftMutationResponse,
  NoticeDraftUpdateResponse,
  NoticeListResponse,
  NoticeRepublishResponse,
  NoticeSubmitReviewResponse,
} from '../models/notice';
import { request } from '../utils/request';

const FUNCTION_NAME = 'notice-bff';

interface RawNoticeStatusTag {
  code: string;
  label: string;
}

interface RawNoticeCardDto {
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
  statusTag: RawNoticeStatusTag;
  highlightTag?: string;
  applicationCount?: number;
}

interface RawNoticeListResponse {
  list: RawNoticeCardDto[];
  nextCursor: string;
  hasMore: boolean;
  filterSummary: {
    total: number;
    activeCity: string | null;
    activePlatform: string | null;
    activeCategory: string | null;
  };
  filterEcho: {
    keyword: string;
    cooperationPlatform: string | null;
    cooperationCategory: string | null;
    city: string | null;
  };
}

interface RawNoticeMyListResponse extends Paginated<RawNoticeCardDto> {}

interface RawNoticeDetailResponse {
  notice: {
    noticeId: string;
    title: string;
    brandName: string | null;
    cooperationPlatform: string;
    cooperationCategory: string;
    cooperationType: string;
    city: string;
    settlementType: string;
    budgetRange: string;
    budgetSummary: string;
    recruitCount: number | null;
    deadlineAt: string;
    creatorRequirements: string;
    cooperationDescription: string;
    attachments: string[];
    status: string;
    applicationCount: number;
    publishedAt: string | null;
  };
  publisherSummary: {
    publisherUserId: string;
    publisherProfileId: string;
    displayName: string;
    identityType: string;
    city: string;
    historyLabel?: string;
  };
  permissionState: NoticeDetailResponse['permissionState'];
  ctaState: {
    primaryAction: string;
    primaryText: string;
    disabledReason: string | null;
  };
  maskedOrFullContact: {
    contactType: string | null;
    contactValue: string | null;
    isMasked: boolean;
  } | null;
}

function mapNoticeCardDto(item: RawNoticeCardDto): NoticeCardItem {
  return {
    noticeId: item.noticeId,
    title: item.title,
    cooperationPlatform: item.cooperationPlatform,
    cooperationCategory: item.cooperationCategory,
    cooperationType: item.cooperationType,
    budgetSummary: item.budgetSummary,
    city: item.city,
    deadlineAt: item.deadlineAt,
    createdAt: item.createdAt,
    publisherSummary: {
      displayName: item.publisherSummary.displayName,
      profileCompleteness: item.publisherSummary.profileCompleteness,
    },
    statusTag: item.statusTag.code as NoticeCardItem['statusTag'],
    highlightTag: item.highlightTag,
    applicationCount: item.applicationCount,
  };
}

function mapFilterSummary(filterSummary: RawNoticeListResponse['filterSummary']): NoticeListResponse['filterSummary'] {
  return [filterSummary.activeCity, filterSummary.activePlatform, filterSummary.activeCategory].filter(Boolean) as string[];
}

function mapFilterEcho(filterEcho: RawNoticeListResponse['filterEcho']): DiscoveryFilter {
  return {
    keyword: filterEcho.keyword || undefined,
    cooperationPlatform: filterEcho.cooperationPlatform || undefined,
    cooperationCategory: filterEcho.cooperationCategory || undefined,
    city: filterEcho.city || undefined,
  };
}

function mapContactText(contact: RawNoticeDetailResponse['maskedOrFullContact']) {
  if (!contact?.contactValue) {
    return '';
  }

  return `${contact.contactType || '联系方式'}：${contact.contactValue}`;
}

export function list(payload: DiscoveryFilter = {}) {
  return request<RawNoticeListResponse, DiscoveryFilter, NoticeListResponse>(FUNCTION_NAME, 'list', payload, (data) => ({
    list: (data.list || []).map(mapNoticeCardDto),
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
    filterSummary: mapFilterSummary(data.filterSummary),
    filterEcho: mapFilterEcho(data.filterEcho),
  }));
}

export function detail(noticeId: string) {
  return request<RawNoticeDetailResponse, { noticeId: string }, NoticeDetailResponse>(FUNCTION_NAME, 'detail', { noticeId }, (data) => ({
    notice: {
      ...data.notice,
      status: data.notice.status as NoticeDetailResponse['notice']['status'],
      statusTag: data.notice.status as NoticeDetailResponse['notice']['statusTag'],
      brandName: data.notice.brandName,
      recruitCount: data.notice.recruitCount,
      publishedAt: data.notice.publishedAt,
    },
    publisherSummary: data.publisherSummary,
    permissionState: data.permissionState,
    ctaState: {
      primaryAction: data.ctaState.primaryAction,
      primaryText: data.ctaState.primaryText,
      disabledReason: data.ctaState.disabledReason || undefined,
    },
    maskedOrFullContact: mapContactText(data.maskedOrFullContact),
  }));
}

export function createDraft(notice: NoticeDraftInput) {
  return request<NoticeDraftMutationResponse, { notice: NoticeDraftInput }>(FUNCTION_NAME, 'createDraft', {
    notice,
  });
}

export function updateDraft(noticeId: string, notice: NoticeDraftInput) {
  return request<NoticeDraftUpdateResponse, { noticeId: string; notice: NoticeDraftInput }>(FUNCTION_NAME, 'updateDraft', {
    noticeId,
    notice,
  });
}

export function submitReview(noticeId: string) {
  return request<NoticeSubmitReviewResponse, { noticeId: string }>(FUNCTION_NAME, 'submitReview', {
    noticeId,
  });
}

export function myList(payload: Record<string, unknown> = {}) {
  return request<RawNoticeMyListResponse, Record<string, unknown>, Paginated<NoticeCardItem>>(FUNCTION_NAME, 'myList', payload, (data) => ({
    list: (data.list || []).map(mapNoticeCardDto),
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
  }));
}

export function closeNotice(noticeId: string) {
  return request<NoticeCloseResponse, { noticeId: string }>(FUNCTION_NAME, 'close', {
    noticeId,
  });
}

export function getRepublishBlockReason(status?: NoticeStatus) {
  if (status === 'expired') {
    return '已截止通告补新截止时间的规则仍待拍板，当前暂不开放重新发布。';
  }

  return '';
}

export function republish(noticeId: string, options: { currentStatus?: NoticeStatus } = {}) {
  const blockedReason = getRepublishBlockReason(options.currentStatus);

  if (blockedReason) {
    return Promise.reject(new Error(blockedReason));
  }

  return request<NoticeRepublishResponse, { noticeId: string }>(FUNCTION_NAME, 'republish', {
    noticeId,
  });
}
