import { COLLECTIONS } from '../constants/collections'
import {
  PUBLISHER_PROFILE_EDITABLE_FIELDS,
  PublisherGetProfileResponseData,
  PublisherProfileDto,
  PublisherProfileEditableField,
  PublisherUpsertProfilePayload,
  PublisherUpsertProfileResponseData,
} from '../contracts/miniprogram/publisher-bff'
import { addDocument, findOneByField, updateDocumentById } from '../db/repository'
import { UserContext } from '../types'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'
import { writeOperationLog } from './operation-log-service'
import { findUserByUserId } from './user-service'

const REQUIRED_PUBLISHER_FIELDS: PublisherProfileEditableField[] = [
  'identityType',
  'displayName',
  'city',
  'contactType',
  'contactValue',
]

function isFilledString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function findPublisherProfileByUserId(userId: string) {
  return findOneByField(COLLECTIONS.PUBLISHER_PROFILES, 'userId', userId)
}

function getPublisherMissingFieldKeys(profile: Record<string, any> | null): PublisherProfileEditableField[] {
  if (!profile) {
    return [...REQUIRED_PUBLISHER_FIELDS]
  }

  return REQUIRED_PUBLISHER_FIELDS.filter((field) => !isFilledString(profile[field]))
}

function computePublisherProfileCompleteness(profile: Record<string, any> | null) {
  if (!profile) {
    return 0
  }

  let completed = 0

  if (isFilledString(profile.identityType)) {
    completed += 1
  }

  if (isFilledString(profile.displayName)) {
    completed += 1
  }

  if (isFilledString(profile.city)) {
    completed += 1
  }

  if (isFilledString(profile.contactType) && isFilledString(profile.contactValue)) {
    completed += 1
  }

  if (isFilledString(profile.intro)) {
    completed += 1
  }

  return Math.round((completed / 5) * 100)
}

function toPublisherProfileDto(profile: Record<string, any>): PublisherProfileDto {
  return {
    publisherProfileId: asString(profile.publisherProfileId),
    userId: asString(profile.userId),
    identityType: asString(profile.identityType),
    displayName: asString(profile.displayName),
    city: asString(profile.city),
    contactType: asString(profile.contactType),
    contactValue: asString(profile.contactValue),
    intro: asNullableString(profile.intro),
    profileCompleteness: computePublisherProfileCompleteness(profile),
    status: asString(profile.status, 'incomplete'),
  }
}

function buildPublisherProfileResponse(profile: Record<string, any> | null): PublisherGetProfileResponseData {
  const missingFieldKeys = getPublisherMissingFieldKeys(profile)
  const profileCompleteness = computePublisherProfileCompleteness(profile)

  return {
    publisherProfile: profile ? toPublisherProfileDto({
      ...profile,
      profileCompleteness,
      status: missingFieldKeys.length === 0 ? 'complete' : 'incomplete',
    }) : null,
    editableFields: [...PUBLISHER_PROFILE_EDITABLE_FIELDS],
    profileCompleteness,
    missingFieldKeys,
  }
}

async function syncUserPublisherState(userId: string, publisherProfileId: string, publisherEnabled: boolean, currentTime: Date) {
  const user = await findUserByUserId(userId)
  const currentCreatorEnabled = Boolean(user?.roleFlags?.creatorEnabled)

  if (user?._id) {
    const nextRoleFlags = {
      publisherEnabled,
      creatorEnabled: currentCreatorEnabled,
    }
    const shouldUpdate = asString(user.publisherProfileId) !== publisherProfileId
      || Boolean(user.roleFlags?.publisherEnabled) !== publisherEnabled

    if (shouldUpdate) {
      await updateDocumentById(COLLECTIONS.USERS, user._id, {
        publisherProfileId,
        roleFlags: nextRoleFlags,
        updatedAt: currentTime,
      })
    }
  }

  return {
    publisherEnabled,
  }
}

export async function getPublisherProfile(userContext: UserContext): Promise<PublisherGetProfileResponseData> {
  const publisherProfile = await findPublisherProfileByUserId(userContext.userId)
  return buildPublisherProfileResponse(publisherProfile)
}

export async function upsertPublisherProfile(
  payload: PublisherUpsertProfilePayload,
  userContext: UserContext,
  requestId: string,
): Promise<PublisherUpsertProfileResponseData> {
  const currentTime = now()
  const existingProfile = await findPublisherProfileByUserId(userContext.userId)
  const publisherProfileId = asString(existingProfile?.publisherProfileId) || createResourceId('pub')
  const intro = typeof payload.intro === 'undefined' ? asNullableString(existingProfile?.intro) : asNullableString(payload.intro)
  const baseDocument = {
    publisherProfileId,
    userId: userContext.userId,
    identityType: payload.identityType,
    displayName: payload.displayName,
    city: payload.city,
    contactType: payload.contactType,
    contactValue: payload.contactValue,
    intro,
    publishCount: asNumber(existingProfile?.publishCount),
    approvedPublishCount: asNumber(existingProfile?.approvedPublishCount),
    violationCount: asNumber(existingProfile?.violationCount),
  }
  const missingFieldKeys = getPublisherMissingFieldKeys(baseDocument)
  const profileCompleteness = computePublisherProfileCompleteness(baseDocument)
  const status = missingFieldKeys.length === 0 ? 'complete' : 'incomplete'
  const patch = {
    ...baseDocument,
    profileCompleteness,
    status,
    updatedAt: currentTime,
  }

  if (existingProfile?._id) {
    await updateDocumentById(COLLECTIONS.PUBLISHER_PROFILES, existingProfile._id, patch)
  } else {
    await addDocument(COLLECTIONS.PUBLISHER_PROFILES, {
      ...patch,
      createdAt: currentTime,
    })
  }

  const roleFlags = await syncUserPublisherState(userContext.userId, publisherProfileId, status === 'complete', currentTime)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'publisher_profile_upsert',
    targetType: 'publisher',
    targetId: publisherProfileId,
    requestId,
    beforeSnapshot: existingProfile ? {
      status: asString(existingProfile.status, 'incomplete'),
      profileCompleteness: computePublisherProfileCompleteness(existingProfile),
      missingFieldKeys: getPublisherMissingFieldKeys(existingProfile),
    } : null,
    afterSnapshot: {
      status,
      profileCompleteness,
      missingFieldKeys,
    },
  })

  return {
    publisherProfileId,
    status,
    profileCompleteness,
    roleFlags,
    missingFieldKeys,
  }
}
