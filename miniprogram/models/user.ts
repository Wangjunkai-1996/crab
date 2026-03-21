import type { AccountStatus, NullablePreferredView } from '../constants/enums';

export interface RoleFlags {
  publisherEnabled: boolean;
  creatorEnabled: boolean;
}

export interface BootstrapResponse {
  user: {
    userId: string;
    roleFlags: RoleFlags;
    accountStatus: AccountStatus;
    preferredView: NullablePreferredView;
  };
  message: {
    unreadCount: number;
  };
}

export type PublisherProfileEditableField = 'identityType' | 'displayName' | 'city' | 'contactType' | 'contactValue' | 'intro';
export const PUBLISHER_PROFILE_EDITABLE_FIELDS: PublisherProfileEditableField[] = [
  'identityType',
  'displayName',
  'city',
  'contactType',
  'contactValue',
  'intro',
];

export type CreatorCardEditableField =
  | 'nickname'
  | 'avatarUrl'
  | 'city'
  | 'gender'
  | 'primaryPlatform'
  | 'primaryCategory'
  | 'followerBand'
  | 'accountName'
  | 'accountIdOrLink'
  | 'portfolioImages'
  | 'caseDescription'
  | 'residentCity'
  | 'contactType'
  | 'contactValue';
export const CREATOR_CARD_EDITABLE_FIELDS: CreatorCardEditableField[] = [
  'nickname',
  'avatarUrl',
  'city',
  'gender',
  'primaryPlatform',
  'primaryCategory',
  'followerBand',
  'accountName',
  'accountIdOrLink',
  'portfolioImages',
  'caseDescription',
  'residentCity',
  'contactType',
  'contactValue',
];

export interface PublisherProfile {
  publisherProfileId: string;
  userId?: string;
  identityType: string;
  displayName: string;
  city: string;
  contactType: string;
  contactValue: string;
  intro?: string | null;
  profileCompleteness?: number;
  status?: string;
}

export interface PublisherProfileUpsertPayload {
  identityType: string;
  displayName: string;
  city: string;
  contactType: string;
  contactValue: string;
  intro?: string | null;
}

export interface PublisherProfileResponse {
  publisherProfile: PublisherProfile | null;
  editableFields: PublisherProfileEditableField[];
  profileCompleteness: number;
  missingFieldKeys: PublisherProfileEditableField[];
}

export interface PublisherProfileUpsertResponse {
  publisherProfileId: string;
  status: string;
  profileCompleteness: number;
  roleFlags: {
    publisherEnabled: boolean;
  };
  missingFieldKeys: PublisherProfileEditableField[];
}

export interface CreatorCard {
  creatorCardId: string;
  userId?: string;
  nickname: string;
  avatarUrl?: string | null;
  city: string;
  gender?: string | null;
  primaryPlatform: string;
  primaryCategory: string;
  followerBand: string;
  accountName?: string | null;
  accountIdOrLink?: string | null;
  portfolioImages: string[];
  caseDescription?: string | null;
  residentCity?: string | null;
  contactType: string;
  contactValue: string;
  profileCompleteness?: number;
  status?: string;
}

export interface CreatorCardUpsertPayload {
  nickname: string;
  city: string;
  primaryPlatform: string;
  primaryCategory: string;
  followerBand: string;
  contactType: string;
  contactValue: string;
  avatarUrl?: string;
  gender?: string;
  accountName?: string;
  accountIdOrLink?: string;
  portfolioImages?: string[];
  caseDescription?: string;
  residentCity?: string;
}

export interface CreatorCardResponse {
  creatorCard: CreatorCard | null;
  editableFields: CreatorCardEditableField[];
  profileCompleteness: number;
  missingFieldKeys: CreatorCardEditableField[];
}

export interface CreatorCardUpsertResponse {
  creatorCardId: string;
  status: string;
  profileCompleteness: number;
  roleFlags: {
    creatorEnabled: boolean;
  };
  missingFieldKeys: CreatorCardEditableField[];
}

export interface QuickAction {
  key: string;
  label: string;
  route: string;
  hint?: string;
  badgeText?: string;
  locked?: boolean;
  lockedReason?: string;
}

export interface MineSummaryResponse {
  userSummary: {
    displayName: string;
    avatarText: string;
    city: string;
  };
  publisherSummary: {
    noticeCount: number;
    profileCompleteness: number;
  };
  creatorSummary: {
    applicationCount: number;
    cardCompleteness: number;
  };
  messageSummary: {
    unreadCount: number;
  };
  quickActions: QuickAction[];
  isTourist: boolean;
  roleFlags: RoleFlags;
  preferredView: NullablePreferredView;
  restrictionSummary?: {
    type: AccountStatus;
    title: string;
    description: string;
  };
  entryStates: Record<
    string,
    {
      locked: boolean;
      reason?: string;
      actionText?: string;
    }
  >;
}
