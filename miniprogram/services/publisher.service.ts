import type {
  PublisherProfile,
  PublisherProfileEditableField,
  PublisherProfileResponse,
  PublisherProfileUpsertPayload,
  PublisherProfileUpsertResponse,
} from '../models/user';
import { request } from '../utils/request';

const FUNCTION_NAME = 'publisher-bff';

interface RawPublisherProfile {
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

interface RawPublisherProfileResponse {
  publisherProfile: RawPublisherProfile | null;
  editableFields: PublisherProfileEditableField[];
  profileCompleteness: number;
  missingFieldKeys: PublisherProfileEditableField[];
}

function mapPublisherProfile(profile: RawPublisherProfile | null): PublisherProfile | null {
  if (!profile) {
    return null;
  }

  return {
    publisherProfileId: profile.publisherProfileId,
    userId: profile.userId,
    identityType: profile.identityType,
    displayName: profile.displayName,
    city: profile.city,
    contactType: profile.contactType,
    contactValue: profile.contactValue,
    intro: profile.intro || undefined,
    profileCompleteness: profile.profileCompleteness,
    status: profile.status,
  };
}

export function getProfile() {
  return request<RawPublisherProfileResponse, Record<string, never>, PublisherProfileResponse>(FUNCTION_NAME, 'getProfile', {}, (data) => ({
    publisherProfile: mapPublisherProfile(data.publisherProfile),
    editableFields: data.editableFields || [],
    profileCompleteness: data.profileCompleteness,
    missingFieldKeys: data.missingFieldKeys || [],
  }));
}

export function upsertProfile(payload: PublisherProfileUpsertPayload) {
  return request<PublisherProfileUpsertResponse, PublisherProfileUpsertPayload>(FUNCTION_NAME, 'upsertProfile', payload);
}
