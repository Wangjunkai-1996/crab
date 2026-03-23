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
