import type { Paginated } from './api';

export interface MessageItem {
  messageId: string;
  messageType: 'review' | 'application' | 'system';
  title: string;
  summary: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
  timeText: string;
}

export interface MessageListResponse extends Paginated<MessageItem> {
  unreadCount: number;
}
