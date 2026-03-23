import type {
  CreatorCard,
  CreatorCardEditableField,
  CreatorCardResponse,
  CreatorCardUpsertPayload,
  CreatorCardUpsertResponse,
} from '../models/user';
import { request } from '../utils/request';

const FUNCTION_NAME = 'creator-bff';

interface RawCreatorCard {
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
  portfolioImages?: string[];
  caseDescription?: string | null;
  residentCity?: string | null;
  contactType: string;
  contactValue: string;
  profileCompleteness?: number;
  status?: string;
}

interface RawCreatorCardResponse {
  creatorCard: RawCreatorCard | null;
  editableFields: CreatorCardEditableField[];
  profileCompleteness: number;
  missingFieldKeys: CreatorCardEditableField[];
}

function mapCreatorCard(card: RawCreatorCard | null): CreatorCard | null {
  if (!card) {
    return null;
  }

  return {
    creatorCardId: card.creatorCardId,
    userId: card.userId,
    nickname: card.nickname,
    avatarUrl: card.avatarUrl || undefined,
    city: card.city,
    gender: card.gender || undefined,
    primaryPlatform: card.primaryPlatform,
    primaryCategory: card.primaryCategory,
    followerBand: card.followerBand,
    accountName: card.accountName || undefined,
    accountIdOrLink: card.accountIdOrLink || undefined,
    portfolioImages: card.portfolioImages || [],
    caseDescription: card.caseDescription || undefined,
    residentCity: card.residentCity || undefined,
    contactType: card.contactType,
    contactValue: card.contactValue,
    profileCompleteness: card.profileCompleteness,
    status: card.status,
  };
}

export function getCard() {
  return request<RawCreatorCardResponse, Record<string, never>, CreatorCardResponse>(FUNCTION_NAME, 'getCard', {}, (data) => ({
    creatorCard: mapCreatorCard(data.creatorCard),
    editableFields: data.editableFields || [],
    profileCompleteness: data.profileCompleteness,
    missingFieldKeys: data.missingFieldKeys || [],
  }));
}

export function upsertCard(payload: CreatorCardUpsertPayload) {
  return request<CreatorCardUpsertResponse, CreatorCardUpsertPayload>(FUNCTION_NAME, 'upsertCard', payload);
}
