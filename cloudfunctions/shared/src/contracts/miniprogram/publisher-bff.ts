export const PUBLISHER_PROFILE_EDITABLE_FIELDS = [
  'identityType',
  'displayName',
  'city',
  'contactType',
  'contactValue',
  'intro',
] as const

export type PublisherProfileEditableField = typeof PUBLISHER_PROFILE_EDITABLE_FIELDS[number]

export interface PublisherProfileDto {
  publisherProfileId: string
  userId: string
  identityType: string
  displayName: string
  city: string
  contactType: string
  contactValue: string
  intro: string | null
  profileCompleteness: number
  status: string
}

export interface PublisherGetProfileResponseData {
  publisherProfile: PublisherProfileDto | null
  editableFields: PublisherProfileEditableField[]
  profileCompleteness: number
  missingFieldKeys: PublisherProfileEditableField[]
}

export interface PublisherUpsertProfilePayload {
  identityType: string
  displayName: string
  city: string
  contactType: string
  contactValue: string
  intro?: string | null
}

export interface PublisherUpsertProfileResponseData {
  publisherProfileId: string
  status: string
  profileCompleteness: number
  roleFlags: {
    publisherEnabled: boolean
  }
  missingFieldKeys: PublisherProfileEditableField[]
}
