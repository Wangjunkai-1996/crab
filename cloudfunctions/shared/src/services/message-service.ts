import { COLLECTIONS } from '../constants/collections'
import { ERROR_CODES } from '../constants/error-codes'
import { MessageListResponseData } from '../contracts/miniprogram/message-bff'
import { addDocument, countByWhere, findOneByField, listByWhere, updateDocumentById } from '../db/repository'
import { AppError } from '../errors/app-error'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'
import { createValidationError } from '../validators/common'

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function toIsoString(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return ''
}

function asCount(value: unknown) {
  const total = Number((value as any)?.total)
  return Number.isFinite(total) ? total : 0
}

function buildCursor(offset: number) {
  return offset > 0 ? Buffer.from(JSON.stringify({ offset })).toString('base64') : ''
}

function decodeCursor(cursor: unknown) {
  if (typeof cursor !== 'string' || !cursor.trim()) {
    return 0
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
    const offset = Number(parsed?.offset)
    return Number.isFinite(offset) && offset > 0 ? offset : 0
  } catch (error) {
    return 0
  }
}

function normalizeMessageTypeFilter(messageType: unknown) {
  const normalized = typeof messageType === 'string' ? messageType.trim() : 'all'
  return ['application', 'review', 'system'].includes(normalized) ? normalized : 'all'
}

function matchesMessageTypeFilter(messageType: string, filter: string) {
  if (filter === 'all') {
    return true
  }

  if (filter === 'system') {
    return !messageType.startsWith('application') && !messageType.startsWith('review')
  }

  return messageType.startsWith(filter)
}

async function scanUserMessages(userId: string) {
  const pageSize = 100
  let offset = 0
  const rows: Record<string, any>[] = []

  while (true) {
    const batch = await listByWhere(COLLECTIONS.MESSAGES, {
      receiverUserId: userId,
    }, {
      orderBy: [{ field: 'createdAt', order: 'desc' }],
      limit: pageSize,
      skip: offset,
    })

    if (batch.length === 0) {
      break
    }

    rows.push(...batch)
    offset += batch.length

    if (batch.length < pageSize || rows.length >= 500) {
      break
    }
  }

  return rows
}

export async function getUnreadMessageCount(userId: string) {
  const result = await countByWhere(COLLECTIONS.MESSAGES, {
    receiverUserId: userId,
    isRead: false,
  })

  return asCount(result)
}

export async function createUserMessage(input: {
  receiverUserId: string
  messageType: string
  title: string
  summary: string
  relatedObjectType?: string
  relatedObjectId?: string
}) {
  const currentTime = now()

  await addDocument(COLLECTIONS.MESSAGES, {
    messageId: createResourceId('msg'),
    receiverUserId: input.receiverUserId,
    messageType: input.messageType,
    title: input.title,
    summary: input.summary,
    relatedObjectType: input.relatedObjectType ?? null,
    relatedObjectId: input.relatedObjectId ?? null,
    isRead: false,
    readAt: null,
    createdAt: currentTime,
  })
}

export async function listUserMessages(
  userId: string,
  payload: {
    messageType?: unknown
    cursor?: unknown
    pageSize?: unknown
  } = {},
): Promise<MessageListResponseData> {
  const messageType = normalizeMessageTypeFilter(payload.messageType)
  const offset = decodeCursor(payload.cursor)
  const pageSize = Number.isFinite(Number(payload.pageSize)) && Number(payload.pageSize) > 0
    ? Math.min(Number(payload.pageSize), 50)
    : 50
  const [rows, unreadCount] = await Promise.all([
    scanUserMessages(userId),
    getUnreadMessageCount(userId),
  ])
  const filtered = rows.filter((row) => matchesMessageTypeFilter(asString(row.messageType), messageType))
  const list = filtered.slice(offset, offset + pageSize).map((row) => ({
    messageId: asString(row.messageId),
    messageType: asString(row.messageType),
    title: asString(row.title),
    summary: asString(row.summary),
    relatedObjectType: asNullableString(row.relatedObjectType),
    relatedObjectId: asNullableString(row.relatedObjectId),
    isRead: Boolean(row.isRead),
    createdAt: toIsoString(row.createdAt),
  }))
  const hasMore = filtered.length > offset + pageSize

  return {
    list,
    nextCursor: hasMore ? buildCursor(offset + pageSize) : '',
    hasMore,
    unreadCount,
  }
}

export async function markUserMessageRead(userId: string, messageId: string) {
  const message = await findOneByField(COLLECTIONS.MESSAGES, 'messageId', messageId)

  if (!message) {
    throw createValidationError({
      messageId: 'messageId 不存在',
    })
  }

  if (asString(message.receiverUserId) !== userId) {
    throw new AppError({
      code: ERROR_CODES.OBJECT_FORBIDDEN,
      message: '当前消息不可操作',
    })
  }

  const readAt = message.readAt ?? now()

  if (!message.isRead) {
    await updateDocumentById(COLLECTIONS.MESSAGES, message._id, {
      isRead: true,
      readAt,
    })
  }

  return {
    messageId,
    isRead: true,
    readAt: toIsoString(readAt),
  }
}

export async function markAllUserMessagesRead(userId: string) {
  const unreadMessages = await listByWhere(COLLECTIONS.MESSAGES, {
    receiverUserId: userId,
    isRead: false,
  }, {
    orderBy: [{ field: 'createdAt', order: 'desc' }],
    limit: 200,
  })
  const readAt = now()

  for (const message of unreadMessages) {
    await updateDocumentById(COLLECTIONS.MESSAGES, message._id, {
      isRead: true,
      readAt,
    })
  }

  return {
    updatedCount: unreadMessages.length,
  }
}
