export interface BootstrapUserDto {
  userId: string
  roleFlags: {
    publisherEnabled: boolean
    creatorEnabled: boolean
  }
  accountStatus: string
  preferredView: 'publisher' | 'creator' | null
}

export interface BootstrapResponseData {
  user: BootstrapUserDto
  message: {
    unreadCount: number
  }
}

export interface MineEntryStateDto {
  locked: boolean
  reason?: string
  actionText?: string
}

export interface MineQuickActionDto {
  key: string
  label: string
  route: string
  hint?: string
  badgeText?: string
  locked?: boolean
  lockedReason?: string
}

export interface MineSummaryResponseData {
  userSummary: {
    displayName: string
    avatarText: string
    city: string
  }
  publisherSummary: {
    noticeCount: number
    profileCompleteness: number
  }
  creatorSummary: {
    applicationCount: number
    cardCompleteness: number
  }
  messageSummary: {
    unreadCount: number
  }
  quickActions: MineQuickActionDto[]
  isTourist: boolean
  roleFlags: BootstrapUserDto['roleFlags']
  preferredView: BootstrapUserDto['preferredView']
  restrictionSummary?: {
    type: string
    title: string
    description: string
  }
  entryStates: Record<string, MineEntryStateDto>
}

export interface MiniprogramCloudbaseAccessGuide {
  envFields: string[]
  availableFunctions: Array<{
    name: string
    audience: 'miniprogram' | 'admin-web'
    actions: string[]
  }>
  bootstrap: {
    requestShape: {
      action: 'bootstrap'
      payload: Record<string, never>
      meta: {
        source: 'miniprogram'
        clientVersion: string
      }
    }
    notes: string[]
  }
}
