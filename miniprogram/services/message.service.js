"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const formatter_1 = require("../utils/formatter");
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'message-bff';
function resolveMessageType(messageType) {
    if (messageType.startsWith('application')) {
        return 'application';
    }
    if (messageType.startsWith('review')) {
        return 'review';
    }
    return 'system';
}
function mapMessageItem(item) {
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
        timeText: (0, formatter_1.formatTimeText)(item.timeText || createdAt),
    };
}
function list(messageType = 'all') {
    return (0, request_1.request)(FUNCTION_NAME, 'list', {
        messageType,
    }, (data) => ({
        list: (data.list || []).map(mapMessageItem),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        unreadCount: data.unreadCount,
    }));
}
function markRead(messageId) {
    return (0, request_1.request)(FUNCTION_NAME, 'markRead', {
        messageId,
    });
}
function markAllRead() {
    return (0, request_1.request)(FUNCTION_NAME, 'markAllRead');
}
