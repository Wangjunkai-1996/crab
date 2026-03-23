import type { MessageItem, MessageListResponse } from '../models/message';
import { formatTimeText } from '../utils/formatter';
import { request } from '../utils/request';

const FUNCTION_NAME = 'message-bff';

interface RawMessageItem {
  messageId: string;
  messageType: string;
  title: string;
  summary: string;
  relatedObjectType?: string | null;
  relatedObjectId?: string | null;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
  timeText?: string;
}

interface RawMessageListResponse {
  list: RawMessageItem[];
  nextCursor?: string;
  hasMore: boolean;
  unreadCount: number;
}

function resolveMessageType(messageType: string): MessageItem['messageType'] {
  if (messageType.startsWith('application')) {
    return 'application';
  }

  if (messageType.startsWith('review')) {
    return 'review';
  }

  return 'system';
}

function mapMessageItem(item: RawMessageItem): MessageItem {
  const createdAt = item.createdAt || item.timeText || '';

  return {
    messageId: item.messageId,
    messageType: resolveMessageType(item.messageType),
    title: item.title,
    summary: item.summary,
    relatedObjectType: item.relatedObjectType || undefined,
    relatedObjectId: item.relatedObjectId || undefined,
    isRead: !!item.isRead,
    readAt: item.readAt,
    createdAt,
    timeText: formatTimeText(item.timeText || createdAt),
  };
}

export function list(messageType = 'all') {
  return request<RawMessageListResponse, { messageType: string }, MessageListResponse>(
    FUNCTION_NAME,
    'list',
    {
      messageType,
    },
    (data) => ({
      list: (data.list || []).map(mapMessageItem),
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
      unreadCount: data.unreadCount,
    }),
  );
}

export function markRead(messageId: string) {
  return request(FUNCTION_NAME, 'markRead', {
    messageId,
  });
}

export function markAllRead() {
  return request(FUNCTION_NAME, 'markAllRead');
}
