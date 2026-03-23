import { COLLECTIONS } from '../constants/collections'
import {
  CREATOR_CARD_EDITABLE_FIELDS,
  CreatorCardDto,
  CreatorCardEditableField,
  CreatorGetCardResponseData,
  CreatorUpsertCardPayload,
  CreatorUpsertCardResponseData,
} from '../contracts/miniprogram/creator-bff'
import { addDocument, findOneByField, updateDocumentById } from '../db/repository'
import { UserContext } from '../types'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'
import { writeOperationLog } from './operation-log-service'
import { findUserByUserId } from './user-service'

const REQUIRED_CREATOR_FIELDS: CreatorCardEditableField[] = [
  'nickname',
  'city',
  'primaryPlatform',
  'primaryCategory',
  'followerBand',
  'portfolioImages',
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

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

function findCreatorCardByUserId(userId: string) {
  return findOneByField(COLLECTIONS.CREATOR_CARDS, 'userId', userId)
}

function getCreatorMissingFieldKeys(card: Record<string, any> | null): CreatorCardEditableField[] {
  if (!card) {
    return [...REQUIRED_CREATOR_FIELDS]
  }

  const missingFieldKeys: CreatorCardEditableField[] = []

  if (!isFilledString(card.nickname)) {
    missingFieldKeys.push('nickname')
  }

  if (!isFilledString(card.city)) {
    missingFieldKeys.push('city')
  }

  if (!isFilledString(card.primaryPlatform)) {
    missingFieldKeys.push('primaryPlatform')
  }

  if (!isFilledString(card.primaryCategory)) {
    missingFieldKeys.push('primaryCategory')
  }

  if (!isFilledString(card.followerBand)) {
    missingFieldKeys.push('followerBand')
  }

  if (asStringArray(card.portfolioImages).length === 0) {
    missingFieldKeys.push('portfolioImages')
  }

  if (!isFilledString(card.contactType)) {
    missingFieldKeys.push('contactType')
  }

  if (!isFilledString(card.contactValue)) {
    missingFieldKeys.push('contactValue')
  }

  return missingFieldKeys
}

function computeCreatorCardCompleteness(card: Record<string, any> | null) {
  if (!card) {
    return 0
  }

  let completed = 0

  if (isFilledString(card.nickname)) {
    completed += 1
  }

  if (isFilledString(card.city)) {
    completed += 1
  }

  if (isFilledString(card.primaryPlatform)) {
    completed += 1
  }

  if (isFilledString(card.primaryCategory)) {
    completed += 1
  }

  if (isFilledString(card.followerBand)) {
    completed += 1
  }

  if (asStringArray(card.portfolioImages).length > 0) {
    completed += 1
  }

  if (isFilledString(card.contactType) && isFilledString(card.contactValue)) {
    completed += 1
  }

  return Math.round((completed / 7) * 100)
}

function toCreatorCardDto(card: Record<string, any>): CreatorCardDto {
  return {
    creatorCardId: asString(card.creatorCardId),
    userId: asString(card.userId),
    nickname: asString(card.nickname),
    avatarUrl: asNullableString(card.avatarUrl),
    city: asString(card.city),
    gender: asNullableString(card.gender),
    primaryPlatform: asString(card.primaryPlatform),
    primaryCategory: asString(card.primaryCategory),
    followerBand: asString(card.followerBand),
    accountName: asNullableString(card.accountName),
    accountIdOrLink: asNullableString(card.accountIdOrLink),
    portfolioImages: asStringArray(card.portfolioImages),
    caseDescription: asNullableString(card.caseDescription),
    residentCity: asNullableString(card.residentCity),
    contactType: asString(card.contactType),
    contactValue: asString(card.contactValue),
    profileCompleteness: computeCreatorCardCompleteness(card),
    status: asString(card.status, 'incomplete'),
  }
}

function buildCreatorCardResponse(card: Record<string, any> | null): CreatorGetCardResponseData {
  const missingFieldKeys = getCreatorMissingFieldKeys(card)
  const profileCompleteness = computeCreatorCardCompleteness(card)

  return {
    creatorCard: card ? toCreatorCardDto({
      ...card,
      profileCompleteness,
      status: missingFieldKeys.length === 0 ? 'complete' : 'incomplete',
    }) : null,
    editableFields: [...CREATOR_CARD_EDITABLE_FIELDS],
    profileCompleteness,
    missingFieldKeys,
  }
}

async function syncUserCreatorState(userId: string, creatorCardId: string, creatorEnabled: boolean, currentTime: Date) {
  const user = await findUserByUserId(userId)
  const currentPublisherEnabled = Boolean(user?.roleFlags?.publisherEnabled)

  if (user?._id) {
    const nextRoleFlags = {
      publisherEnabled: currentPublisherEnabled,
      creatorEnabled,
    }
    const shouldUpdate = asString(user.creatorCardId) !== creatorCardId
      || Boolean(user.roleFlags?.creatorEnabled) !== creatorEnabled

    if (shouldUpdate) {
      await updateDocumentById(COLLECTIONS.USERS, user._id, {
        creatorCardId,
        roleFlags: nextRoleFlags,
        updatedAt: currentTime,
      })
    }
  }

  return {
    creatorEnabled,
  }
}

export async function getCreatorCard(userContext: UserContext): Promise<CreatorGetCardResponseData> {
  const creatorCard = await findCreatorCardByUserId(userContext.userId)
  return buildCreatorCardResponse(creatorCard)
}

export async function upsertCreatorCard(
  payload: CreatorUpsertCardPayload,
  userContext: UserContext,
  requestId: string,
): Promise<CreatorUpsertCardResponseData> {
  const currentTime = now()
  const existingCard = await findCreatorCardByUserId(userContext.userId)
  const creatorCardId = asString(existingCard?.creatorCardId) || createResourceId('creator')
  const baseDocument = {
    creatorCardId,
    userId: userContext.userId,
    nickname: payload.nickname,
    avatarUrl: typeof payload.avatarUrl === 'undefined' ? asNullableString(existingCard?.avatarUrl) : asNullableString(payload.avatarUrl),
    city: payload.city,
    gender: typeof payload.gender === 'undefined' ? asNullableString(existingCard?.gender) : asNullableString(payload.gender),
    primaryPlatform: payload.primaryPlatform,
    primaryCategory: payload.primaryCategory,
    followerBand: payload.followerBand,
    accountName: typeof payload.accountName === 'undefined' ? asNullableString(existingCard?.accountName) : asNullableString(payload.accountName),
    accountIdOrLink: typeof payload.accountIdOrLink === 'undefined' ? asNullableString(existingCard?.accountIdOrLink) : asNullableString(payload.accountIdOrLink),
    portfolioImages: payload.portfolioImages,
    caseDescription: typeof payload.caseDescription === 'undefined' ? asNullableString(existingCard?.caseDescription) : asNullableString(payload.caseDescription),
    residentCity: typeof payload.residentCity === 'undefined' ? asNullableString(existingCard?.residentCity) : asNullableString(payload.residentCity),
    contactType: payload.contactType,
    contactValue: payload.contactValue,
  }
  const missingFieldKeys = getCreatorMissingFieldKeys(baseDocument)
  const profileCompleteness = computeCreatorCardCompleteness(baseDocument)
  const status = missingFieldKeys.length === 0 ? 'complete' : 'incomplete'
  const patch = {
    ...baseDocument,
    profileCompleteness,
    status,
    updatedAt: currentTime,
  }

  if (existingCard?._id) {
    await updateDocumentById(COLLECTIONS.CREATOR_CARDS, existingCard._id, patch)
  } else {
    await addDocument(COLLECTIONS.CREATOR_CARDS, {
      ...patch,
      createdAt: currentTime,
    })
  }

  const roleFlags = await syncUserCreatorState(userContext.userId, creatorCardId, status === 'complete', currentTime)

  await writeOperationLog({
    operatorType: 'user',
    operatorId: userContext.userId,
    action: 'creator_card_upsert',
    targetType: 'creator',
    targetId: creatorCardId,
    requestId,
    beforeSnapshot: existingCard ? {
      status: asString(existingCard.status, 'incomplete'),
      profileCompleteness: computeCreatorCardCompleteness(existingCard),
      missingFieldKeys: getCreatorMissingFieldKeys(existingCard),
    } : null,
    afterSnapshot: {
      status,
      profileCompleteness,
      missingFieldKeys,
    },
  })

  return {
    creatorCardId,
    status,
    profileCompleteness,
    roleFlags,
    missingFieldKeys,
  }
}
