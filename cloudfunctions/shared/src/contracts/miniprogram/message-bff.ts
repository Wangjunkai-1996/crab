export interface MessageListItemDto {
  messageId: string
  messageType: string
  title: string
  summary: string
  relatedObjectType: string | null
  relatedObjectId: string | null
  isRead: boolean
  createdAt: string
}

export interface MessageListResponseData {
  list: MessageListItemDto[]
  nextCursor: string
  hasMore: boolean
  unreadCount: number
}
