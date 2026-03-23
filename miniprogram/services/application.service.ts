import type {
  ApplicationDetailResponse,
  ApplicationListItem,
  ApplicationListPayload,
  ApplicationListResponse,
  ApplicationStatusMutationResponse,
  ApplicationSubmitPayload,
  ApplicationSubmitResponse,
  ApplicationWithdrawResponse,
  ContactRevealState,
  PublisherApplicationAction,
  PublisherApplicationDetailResponse,
  PublisherApplicationListItem,
  PublisherApplicationListPayload,
  PublisherApplicationListResponse,
} from '../models/application';
import { formatApplicationStatus } from '../utils/formatter';
import { request } from '../utils/request';

const FUNCTION_NAME = 'application-bff';
const PUBLISHER_ACTION_KEYS: PublisherApplicationAction[] = [
  'markViewed',
  'markContactPending',
  'markCommunicating',
  'markRejected',
  'markCompleted',
  'revealCreatorContact',
];
const CREATOR_WITHDRAWABLE_STATUSES: Array<ApplicationDetailResponse['application']['status']> = ['applied', 'viewed'];

interface RawApplicationListItem {
  applicationId: string;
  noticeId: string;
  noticeTitle: string;
  budgetSummary: string;
  city: string;
  status: ApplicationListItem['status'];
  publisherSummary?: {
    publisherUserId?: string;
    displayName: string;
  };
  canViewPublisherContact: boolean;
  updatedAt?: string;
  stageHint?: string;
}

interface RawApplicationListResponse {
  list: RawApplicationListItem[];
  nextCursor?: string;
  hasMore: boolean;
}

interface RawApplicationTimelineItem {
  key?: string;
  label: string;
  at?: string | null;
  time?: string;
  description?: string;
}

interface RawApplicationContactInfo {
  contactType?: string | null;
  contactValue?: string | null;
  isMasked?: boolean;
}

interface RawApplicationDetailResponse {
  application: {
    applicationId: string;
    noticeId?: string;
    status: ApplicationDetailResponse['application']['status'];
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
  timeline: RawApplicationTimelineItem[];
  publisherContactRevealState:
    | string
    | {
        stage?: string;
        revealedAt?: string | null;
      };
  maskedOrFullPublisherContact?: string | RawApplicationContactInfo;
}

interface RawPublisherApplicationListItem {
  applicationId: string;
  creatorCardSnapshot: {
    nickname: string;
    city: string;
    primaryPlatform: string;
    primaryCategory: string;
    followerBand: string;
    caseDescription?: string;
  };
  status: PublisherApplicationListItem['status'];
  publisherViewedAt: string | null;
  contactRevealState: ContactRevealState;
}

interface RawPublisherApplicationListResponse {
  list: RawPublisherApplicationListItem[];
  nextCursor: string;
  hasMore: boolean;
}

interface RawPublisherApplicationDetailResponse {
  application: {
    applicationId: string;
    status: PublisherApplicationDetailResponse['application']['status'];
    selfIntroduction: string;
    deliverablePlan: string;
    expectedTerms: string | null;
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

function mapApplicationListItem(item: RawApplicationListItem): ApplicationListItem {
  return {
    applicationId: item.applicationId,
    noticeId: item.noticeId,
    noticeTitle: item.noticeTitle,
    budgetSummary: item.budgetSummary,
    city: item.city,
    status: item.status,
    publisherSummary: {
      publisherUserId: item.publisherSummary?.publisherUserId,
      displayName: item.publisherSummary?.displayName || '',
    },
    canViewPublisherContact: !!item.canViewPublisherContact,
    updatedAt: item.updatedAt,
    stageHint: item.stageHint || formatApplicationStatus(item.status),
  };
}

function mapContactText(contact?: string | RawApplicationContactInfo) {
  if (typeof contact === 'string') {
    return contact;
  }

  if (!contact?.contactValue) {
    return '';
  }

  return `${contact.contactType || '联系方式'}：${contact.contactValue}`;
}

function mapTimelineItem(item: RawApplicationTimelineItem) {
  return {
    key: item.key,
    label: item.label,
    time: item.time || item.at || '待更新',
    description: item.description,
  };
}

function mapRevealState(state: RawApplicationDetailResponse['publisherContactRevealState']): ContactRevealState {
  const code = typeof state === 'string' ? state : state?.stage;
  return code === 'revealed' || code === 'masked' || code === 'hidden' ? code : 'hidden';
}

function mapApplicationDetail(data: RawApplicationDetailResponse): ApplicationDetailResponse {
  return {
    application: {
      applicationId: data.application.applicationId,
      noticeId: data.application.noticeId,
      status: data.application.status,
      selfIntroduction: data.application.selfIntroduction,
      deliverablePlan: data.application.deliverablePlan,
      expectedTerms: data.application.expectedTerms,
      portfolioImages: data.application.portfolioImages || [],
      createdAt: data.application.createdAt,
    },
    noticeSummary: {
      noticeId: data.noticeSummary.noticeId,
      title: data.noticeSummary.title,
      city: data.noticeSummary.city,
      budgetSummary: data.noticeSummary.budgetSummary,
      status: data.noticeSummary.status,
    },
    publisherSummary: {
      publisherUserId: data.publisherSummary.publisherUserId,
      publisherProfileId: data.publisherSummary.publisherProfileId,
      displayName: data.publisherSummary.displayName,
      city: data.publisherSummary.city,
    },
    permissionState: {
      canViewPublisherContact: !!data.permissionState.canViewPublisherContact,
    },
    timeline: (data.timeline || []).map(mapTimelineItem),
    publisherContactRevealState: mapRevealState(data.publisherContactRevealState),
    maskedOrFullPublisherContact: mapContactText(data.maskedOrFullPublisherContact),
  };
}

function mapPublisherListItem(item: RawPublisherApplicationListItem): PublisherApplicationListItem {
  return {
    applicationId: item.applicationId,
    creatorCardSnapshot: item.creatorCardSnapshot,
    status: item.status,
    publisherViewedAt: item.publisherViewedAt || undefined,
    contactRevealState: item.contactRevealState,
  };
}

function mapAvailableActions(actions: PublisherApplicationAction[]): PublisherApplicationAction[] {
  return (actions || []).filter((action): action is PublisherApplicationAction => PUBLISHER_ACTION_KEYS.includes(action));
}

function mapPublisherDetail(data: RawPublisherApplicationDetailResponse): PublisherApplicationDetailResponse {
  return {
    application: {
      applicationId: data.application.applicationId,
      status: data.application.status,
      selfIntroduction: data.application.selfIntroduction,
      deliverablePlan: data.application.deliverablePlan,
      expectedTerms: data.application.expectedTerms || undefined,
    },
    creatorSummary: data.creatorSummary,
    maskedOrFullCreatorContact: data.maskedOrFullCreatorContact,
    creatorContactRevealState: data.creatorContactRevealState,
    availableActions: mapAvailableActions(data.availableActions),
  };
}

export function getWithdrawBlockReason(status?: ApplicationDetailResponse['application']['status']) {
  if (!status) {
    return '';
  }

  if (!CREATOR_WITHDRAWABLE_STATUSES.includes(status)) {
    return '当前报名已进入处理阶段，暂不支持撤回。';
  }

  return '';
}

export function submit(payload: ApplicationSubmitPayload) {
  return request<ApplicationSubmitResponse, ApplicationSubmitPayload>(FUNCTION_NAME, 'submit', payload);
}

export function withdraw(applicationId: string, options: { currentStatus?: ApplicationDetailResponse['application']['status'] } = {}) {
  const blockedReason = getWithdrawBlockReason(options.currentStatus);

  if (blockedReason) {
    return Promise.reject(new Error(blockedReason));
  }

  return request<ApplicationWithdrawResponse, { applicationId: string }>(FUNCTION_NAME, 'withdraw', {
    applicationId,
  });
}

export function myList(payload: ApplicationListPayload = {}) {
  return request<RawApplicationListResponse, ApplicationListPayload, ApplicationListResponse>(FUNCTION_NAME, 'myList', payload, (data) => ({
    list: (data.list || []).map(mapApplicationListItem),
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
  }));
}

export function detail(applicationId: string) {
  return request<RawApplicationDetailResponse, { applicationId: string }, ApplicationDetailResponse>(
    FUNCTION_NAME,
    'detail',
    {
      applicationId,
    },
    mapApplicationDetail,
  );
}

export function publisherList(payload: PublisherApplicationListPayload) {
  return request<RawPublisherApplicationListResponse, PublisherApplicationListPayload, PublisherApplicationListResponse>(
    FUNCTION_NAME,
    'publisherList',
    payload,
    (data) => ({
      list: (data.list || []).map(mapPublisherListItem),
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    }),
  );
}

export function publisherDetail(applicationId: string) {
  return request<RawPublisherApplicationDetailResponse, { applicationId: string }, PublisherApplicationDetailResponse>(
    FUNCTION_NAME,
    'publisherDetail',
    {
      applicationId,
    },
    mapPublisherDetail,
  );
}

export function markViewed(applicationId: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string }>(FUNCTION_NAME, 'markViewed', {
    applicationId,
  });
}

export function markContactPending(applicationId: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string }>(FUNCTION_NAME, 'markContactPending', {
    applicationId,
  });
}

export function markCommunicating(applicationId: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string }>(FUNCTION_NAME, 'markCommunicating', {
    applicationId,
  });
}

export function markRejected(applicationId: string, reasonText?: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string; reasonText?: string }>(FUNCTION_NAME, 'markRejected', {
    applicationId,
    reasonText,
  });
}

export function markCompleted(applicationId: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string }>(FUNCTION_NAME, 'markCompleted', {
    applicationId,
  });
}

export function revealCreatorContact(applicationId: string) {
  return request<ApplicationStatusMutationResponse, { applicationId: string }>(FUNCTION_NAME, 'revealCreatorContact', {
    applicationId,
  });
}
