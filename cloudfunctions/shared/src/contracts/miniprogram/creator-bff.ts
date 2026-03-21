export const CREATOR_CARD_EDITABLE_FIELDS = [
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
] as const

export type CreatorCardEditableField = typeof CREATOR_CARD_EDITABLE_FIELDS[number]

export interface CreatorCardDto {
  creatorCardId: string
  userId: string
  nickname: string
  avatarUrl: string | null
  city: string
  gender: string | null
  primaryPlatform: string
  primaryCategory: string
  followerBand: string
  accountName: string | null
  accountIdOrLink: string | null
  portfolioImages: string[]
  caseDescription: string | null
  residentCity: string | null
  contactType: string
  contactValue: string
  profileCompleteness: number
  status: string
}

export interface CreatorGetCardResponseData {
  creatorCard: CreatorCardDto | null
  editableFields: CreatorCardEditableField[]
  profileCompleteness: number
  missingFieldKeys: CreatorCardEditableField[]
}

export interface CreatorUpsertCardPayload {
  nickname: string
  avatarUrl?: string | null
  city: string
  gender?: string | null
  primaryPlatform: string
  primaryCategory: string
  followerBand: string
  accountName?: string | null
  accountIdOrLink?: string | null
  portfolioImages: string[]
  caseDescription?: string | null
  residentCity?: string | null
  contactType: string
  contactValue: string
}

export interface CreatorUpsertCardResponseData {
  creatorCardId: string
  status: string
  profileCompleteness: number
  roleFlags: {
    creatorEnabled: boolean
  }
  missingFieldKeys: CreatorCardEditableField[]
}
