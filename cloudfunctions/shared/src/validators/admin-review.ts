import { TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES } from '../contracts/admin/action-payloads'
import { decodeOffsetCursor, normalizePageSize } from '../utils/pagination'
import { createValidationError, requireString } from './common'

const REVIEW_TASK_STATUSES = ['pending', 'processing', 'completed', 'cancelled']
const REVIEW_STAGES = ['initial_review', 'manual_review', 'resubmission_review']
const REVIEW_RESULTS = ['approved', 'rejected', 'supplement_required', 'transfer_manual_review', 'removed']

function optionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalEnum(value: unknown, allowedValues: string[]) {
  const normalized = optionalString(value)

  if (!normalized) {
    return undefined
  }

  if (!allowedValues.includes(normalized)) {
    return undefined
  }

  return normalized
}

function optionalBoolean(value: unknown) {
  if (typeof value !== 'boolean') {
    return undefined
  }

  return value
}

export function validateTaskListPayload(payload: Record<string, unknown> = {}) {
  return {
    taskStatus: optionalEnum(payload.taskStatus, REVIEW_TASK_STATUSES),
    reviewStage: optionalEnum(payload.reviewStage, REVIEW_STAGES),
    city: optionalString(payload.city),
    identityType: optionalString(payload.identityType),
    riskLevel: optionalString(payload.riskLevel),
    pageSize: normalizePageSize(payload.pageSize),
    offset: decodeOffsetCursor(payload.cursor),
  }
}

export function validateTaskDetailPayload(payload: Record<string, unknown> = {}) {
  return {
    reviewTaskId: requireString(payload.reviewTaskId, {
      fieldName: 'reviewTaskId',
    }),
  }
}

export function validateClaimTaskPayload(payload: Record<string, unknown> = {}) {
  return {
    reviewTaskId: requireString(payload.reviewTaskId, {
      fieldName: 'reviewTaskId',
    }),
  }
}

export function validateReleaseTaskPayload(payload: Record<string, unknown> = {}) {
  return {
    reviewTaskId: requireString(payload.reviewTaskId, {
      fieldName: 'reviewTaskId',
    }),
  }
}

export function validateResolveTaskPayload(payload: Record<string, unknown> = {}) {
  const reviewTaskId = requireString(payload.reviewTaskId, {
    fieldName: 'reviewTaskId',
  })
  const reviewResult = requireString(payload.reviewResult, {
    fieldName: 'reviewResult',
  })
  const reasonCategory = optionalString(payload.reasonCategory)
  const reasonText = optionalString(payload.reasonText)
  const notifyUser = optionalBoolean(payload.notifyUser)
  const nextQueueType = optionalString(payload.nextQueueType)

  if (!REVIEW_RESULTS.includes(reviewResult)) {
    throw createValidationError({
      reviewResult: 'reviewResult 不合法',
    })
  }

  if (['rejected', 'supplement_required', 'transfer_manual_review', 'removed'].includes(reviewResult) && !reasonCategory) {
    throw createValidationError({
      reasonCategory: '当前审核结果要求必填 reasonCategory',
    })
  }

  if (reviewResult === 'transfer_manual_review') {
    if (!nextQueueType) {
      throw createValidationError({
        nextQueueType: 'transfer_manual_review 时必须提供 nextQueueType',
      })
    }

    if (!Object.values(TEMP_REVIEW_TASK_NEXT_QUEUE_TYPES).includes(nextQueueType as any)) {
      throw createValidationError({
        nextQueueType: 'nextQueueType 当前仅支持临时枚举口径',
      })
    }
  }

  return {
    reviewTaskId,
    reviewResult,
    reasonCategory,
    reasonText,
    notifyUser: notifyUser ?? false,
    nextQueueType: nextQueueType ?? null,
  }
}
