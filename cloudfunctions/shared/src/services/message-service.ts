import { COLLECTIONS } from '../constants/collections'
import { addDocument, countByWhere } from '../db/repository'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'

export async function getUnreadMessageCount(userId: string) {
  const result = await countByWhere(COLLECTIONS.MESSAGES, {
    receiverUserId: userId,
    isRead: false,
  })

  return result.total ?? 0
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
